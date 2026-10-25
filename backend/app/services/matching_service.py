from datetime import datetime
import re
from typing import Any, Dict, List, Optional, Set, Tuple
from sklearn.feature_extraction.text import ENGLISH_STOP_WORDS, TfidfVectorizer
from sklearn.metrics.pairwise import cosine_similarity
from sqlalchemy.orm import Session
from app.models.audit_event import AuditEvent
from app.models.complaint import Complaint
from app.models.relationship import Relationship
from app.schemas.matching import CandidateSuggestion, ComplaintSummary
from app.services.relationship_service import normalize_relationship_pair

# Centrally configured prototype matching weights and score bands
WEIGHT_DESCRIPTION: float = 0.55
WEIGHT_CATEGORY: float = 0.25
WEIGHT_TEMPORAL: float = 0.15
WEIGHT_REFERENCE: float = 0.05

HIGH_CONFIDENCE_THRESHOLD: float = 0.75
REVIEW_CANDIDATE_THRESHOLD: float = 0.45

# Minimum characters needed for meaningful TF-IDF comparison
MIN_TEXT_LENGTH_FOR_TFIDF: int = 5


def compute_text_similarity(text1: str, text2: str) -> float:
    """
    Compute bounded TF-IDF cosine similarity between two descriptions.
    Returns 0.0 when either description is empty or too short.
    """
    t1 = (text1 or "").strip()
    t2 = (text2 or "").strip()

    if (
        len(t1) < MIN_TEXT_LENGTH_FOR_TFIDF
        or len(t2) < MIN_TEXT_LENGTH_FOR_TFIDF
    ):
        return 0.0

    if t1.lower() == t2.lower():
        return 1.0

    try:
        vectorizer = TfidfVectorizer(
            lowercase=True,
            stop_words="english",
            sublinear_tf=True,
        )
        matrix = vectorizer.fit_transform([t1, t2])
        score = cosine_similarity(matrix[0:1], matrix[1:2])[0][0]
        return max(0.0, min(1.0, float(score)))
    except ValueError:
        return 0.0



def extract_matched_terms(text1: str, text2: str, max_terms: int = 6) -> List[str]:
    """
    Extracts informative overlapping vocabulary tokens between two texts.
    Ignores common English stopwords and short tokens (<3 chars).
    """
    t1 = (text1 or "").lower()
    t2 = (text2 or "").lower()
    tokens1 = set(re.findall(r"\b[a-z]{3,}\b", t1))
    tokens2 = set(re.findall(r"\b[a-z]{3,}\b", t2))
    overlap = tokens1.intersection(tokens2) - set(ENGLISH_STOP_WORDS)
    return sorted(list(overlap))[:max_terms]




def compute_reference_similarity(
    ref1: Optional[str], ref2: Optional[str]
) -> Tuple[float, str]:
    """
    Evaluate exact references and explicit shared reference roots.
    Arbitrary numeric-prefix overlap is not considered a match.
    """
    r1 = (ref1 or "").strip().upper()
    r2 = (ref2 or "").strip().upper()

    if not r1 or not r2:
        return 0.0, "Reference unassigned or not provided on one/both records"

    if r1 == r2:
        return 1.0, f"Identical external reference '{r1}'"

    # Recognize a root followed by an explicit suffix such as SUPP or REV.
    # Do not match identifiers that differ only by additional digits.
    def is_shared_root(root: str, extended: str) -> bool:
        if not extended.startswith(root):
            return False

        suffix = extended[len(root):]
        if not suffix or suffix[0] not in "-_/":
            return False

        suffix = suffix.lstrip("-_/")
        return bool(suffix) and not suffix[0].isdigit()

    if is_shared_root(r1, r2) or is_shared_root(r2, r1):
        return 0.7, f"Shared reference root between '{r1}' and '{r2}'"

    return 0.0, f"Distinct references ('{r1}' vs '{r2}'); cross-bureau difference expected"


def compute_category_similarity(cat1: Optional[str], cat2: Optional[str]) -> Tuple[float, bool]:
    """
    Evaluates category agreement between complaints.
    Returns (similarity_score, is_exact_match).
    """
    if cat1 is None or cat2 is None:
        return 0.5, False  # Neutral weight when category is unspecified
    c1 = cat1.strip().lower()
    c2 = cat2.strip().lower()
    if c1 == c2:
        return 1.0, True
    return 0.0, False


def compute_temporal_similarity(d1: Optional[datetime], d2: Optional[datetime]) -> Tuple[float, Optional[float]]:
    """
    Evaluates temporal proximity between two complaints based on filing timestamp.
    Returns (proximity_score, days_difference).
    """
    if d1 is None or d2 is None:
        return 0.5, None

    diff_days = abs((d1 - d2).total_seconds()) / 86400.0
    if diff_days <= 7.0:
        score = 1.0
    elif diff_days <= 30.0:
        score = 0.7
    elif diff_days <= 90.0:
        score = 0.4
    else:
        score = 0.1

    return score, round(diff_days, 1)


def determine_score_band(score: float) -> str:
    """Classifies a match score into standard operational bands."""
    if score >= HIGH_CONFIDENCE_THRESHOLD:
        return "High"
    if score >= REVIEW_CANDIDATE_THRESHOLD:
        return "Review"
    return "Weak"


def score_complaint_pair(c1: Complaint, c2: Complaint) -> Tuple[float, str, Dict[str, Any], str]:
    """
    Calculates deterministic explainable similarity between two complaints.
    Institution identity acts as a strict primary gate.
    Returns (overall_score, score_band, evidence_dict, explanation).
    """
    # Gate: Different institutions cannot match in this prototype
    if c1.institution_id != c2.institution_id:
        return (
            0.0,
            "Weak",
            {
                "institution_match": False,
                "overall_score": 0.0,
                "score_band": "Weak",
                "signals": ["Institution mismatch: complaints belong to separate educational institutions."],
            },
            "Institutions do not match.",
        )

    # 1. Text description similarity
    desc_sim = compute_text_similarity(c1.description, c2.description)
    matched_terms = extract_matched_terms(c1.description, c2.description)

    # 2. Category agreement
    cat_sim, cat_match = compute_category_similarity(c1.category, c2.category)

    # 3. Temporal proximity
    time_sim, days_diff = compute_temporal_similarity(c1.created_at, c2.created_at)

    # 4. Reference compatibility
    ref_sim, ref_desc = compute_reference_similarity(
        getattr(c1, "external_ref", None), getattr(c2, "external_ref", None)
    )

    # Combined bounded score with centralized weights
    raw_score = (
        (WEIGHT_DESCRIPTION * desc_sim)
        + (WEIGHT_CATEGORY * cat_sim)
        + (WEIGHT_TEMPORAL * time_sim)
        + (WEIGHT_REFERENCE * ref_sim)
    )
    overall_score = round(max(0.0, min(1.0, raw_score)), 4)
    band = determine_score_band(overall_score)

    signals: List[str] = [
        f"Institution identity match (ID {c1.institution_id})",
        f"Description text similarity: {desc_sim:.2f}",
    ]
    if matched_terms:
        signals.append(f"Overlapping terminology: {', '.join(matched_terms)}")

    if cat_match:
        signals.append(f"Matching category: '{c1.category}'")
    elif c1.category and c2.category:
        signals.append(f"Differing categories: '{c1.category}' vs '{c2.category}'")

    if days_diff is not None:
        signals.append(f"Filed {days_diff} days apart")

    signals.append(ref_desc)

    # Structured signal items for UI presentation
    signals_list = [
        {
            "name": "Institution Verification",
            "score": 1.0,
            "direction": "supports",
            "explanation": f"Both records filed under Institution ID {c1.institution_id}",
            "observed_value": str(c1.institution_id),
        },
        {
            "name": "Text Similarity (TF-IDF)",
            "score": round(desc_sim, 2),
            "direction": "supports" if desc_sim >= 0.35 else "neutral",
            "explanation": f"Linguistic cosine overlap of {desc_sim:.2f} using domain TF-IDF",
            "observed_value": ", ".join(matched_terms) if matched_terms else "No distinct overlap",
        },
        {
            "name": "Category Compatibility",
            "score": round(cat_sim, 2),
            "direction": "supports" if cat_match else "neutral",
            "explanation": f"Category agreement between '{c1.category}' and '{c2.category}'",
            "observed_value": c1.category or "Unspecified",
        },
        {
            "name": "Temporal Proximity",
            "score": round(time_sim, 2),
            "direction": "supports" if time_sim >= 0.7 else "neutral",
            "explanation": f"Filed {days_diff} days apart" if days_diff is not None else "Timestamp unverified",
            "observed_value": f"{days_diff} days" if days_diff is not None else "N/A",
        },
    ]

    # Concise human-readable explanation rationale
    explanation = (
        f"{band}-confidence candidate ({overall_score:.2f}) at same institution. "
        f"Description similarity is {desc_sim:.2f} across bureaus '{c1.bureau}' and '{c2.bureau}'."
    )

    evidence: Dict[str, Any] = {
        "overall_score": overall_score,
        "score_band": band,
        "description_similarity": round(desc_sim, 4),
        "matched_terms": matched_terms,
        "category_match": cat_match,
        "category_similarity": round(cat_sim, 2),
        "temporal_proximity_days": days_diff,
        "temporal_similarity": round(time_sim, 2),
        "reference_similarity": round(ref_sim, 2),
        "reference_note": ref_desc,
        "institution_match": True,
        "signals": signals,
        "signals_list": signals_list,
        "summary_reasoning": explanation,
        "weights": {
            "description": WEIGHT_DESCRIPTION,
            "category": WEIGHT_CATEGORY,
            "temporal": WEIGHT_TEMPORAL,
            "reference": WEIGHT_REFERENCE,
        },
        # Frontend EvidencePayload structured compatibility sub-objects
        "category_compatibility": {
            "compatible": cat_match,
            "category_a": c1.category or "",
            "category_b": c2.category or "",
            "similarity": cat_sim,
        },
        "date_proximity": {
            "days_apart": days_diff if days_diff is not None else 0,
            "score": time_sim,
        },
        "text_similarity": {
            "score": round(desc_sim, 4),
            "method": "tfidf_cosine",
            "excerpt_overlap": matched_terms,
        },
    }

    return overall_score, band, evidence, explanation


def baseline_score_complaint_pair(c1: Complaint, c2: Complaint) -> Tuple[float, str, Dict[str, Any], str]:
    """
    Simple keyword & exact-match baseline matcher for comparative benchmarking.
    Does NOT use TF-IDF, sublinear scaling, category weights, or temporal proximity.
    Relies purely on token intersection (Jaccard similarity on raw words) and exact institution match.
    """
    if c1.institution_id != c2.institution_id:
        return 0.0, "Weak", {"institution_match": False, "method": "simple_keyword_baseline"}, "Different institutions"

    t1 = set(re.findall(r"\b[a-z]{3,}\b", (c1.description or "").lower()))
    t2 = set(re.findall(r"\b[a-z]{3,}\b", (c2.description or "").lower()))

    if not t1 or not t2:
        return 0.0, "Weak", {"method": "simple_keyword_baseline"}, "Empty text"

    jaccard = len(t1 & t2) / len(t1 | t2)
    score = round(max(0.0, min(1.0, jaccard)), 4)
    band = "High" if score >= 0.50 else "Review" if score >= 0.25 else "Weak"

    evidence = {
        "overall_score": score,
        "score_band": band,
        "method": "simple_keyword_baseline",
        "jaccard_similarity": score,
        "overlapping_word_count": len(t1 & t2),
    }
    explanation = f"Baseline keyword Jaccard overlap of {score:.2f}."
    return score, band, evidence, explanation


def suggest_for_complaint(
    db: Session,
    complaint_id: int,
    min_threshold: float = REVIEW_CANDIDATE_THRESHOLD,
    candidate_limit: int = 50,
) -> Tuple[Complaint, List[CandidateSuggestion]]:
    """
    Generates explainable candidate suggestions for a single source complaint.
    Persists unreviewed suggestions idempotently without overwriting human decisions.
    """
    source = db.get(Complaint, complaint_id)
    if not source:
        raise ValueError(f"Complaint with id {complaint_id} not found.")

    # Query all potential candidates belonging to the same institution
    candidates = (
        db.query(Complaint)
        .filter(
            Complaint.institution_id == source.institution_id,
            Complaint.id != source.id,
        )
        .order_by(Complaint.id.asc())
        .limit(candidate_limit)
        .all()
    )

    scored_candidates: List[Tuple[Complaint, float, str, Dict[str, Any], str]] = []
    for cand in candidates:
        score, band, evidence, explanation = score_complaint_pair(source, cand)
        if score >= min_threshold:
            scored_candidates.append((cand, score, band, evidence, explanation))

    # Sort descending by score, tie-breaking deterministically by candidate ID
    scored_candidates.sort(key=lambda x: (-x[1], x[0].id))

    results: List[CandidateSuggestion] = []

    for cand, score, band, evidence, explanation in scored_candidates:
        comp_a, comp_b = normalize_relationship_pair(source.id, cand.id)

        # Check existing relationship
        existing = (
            db.query(Relationship)
            .filter(
                Relationship.complaint_a_id == comp_a,
                Relationship.complaint_b_id == comp_b,
            )
            .first()
        )

        if existing:
            # Preserve human-reviewed relationships (confirmed, dismissed, needs_info)
            if existing.state == "suggested":
                existing.score = score
                existing.evidence = evidence
                existing.updated_at = datetime.now()
                db.add(existing)
        else:
            # Create new suggested relationship
            new_rel = Relationship(
                complaint_a_id=comp_a,
                complaint_b_id=comp_b,
                score=score,
                evidence=evidence,
                state="suggested",
            )
            db.add(new_rel)
            db.flush()

            # Record audit event for suggestion creation
            audit = AuditEvent(
                entity_type="relationship",
                entity_id=str(new_rel.id),
                action="suggestion_generated",
                actor="matching_engine",
                details={
                    "complaint_a_id": comp_a,
                    "complaint_b_id": comp_b,
                    "score": score,
                    "score_band": band,
                },
            )
            db.add(audit)

        cand_summary = ComplaintSummary(
            id=cand.id,
            institution_id=cand.institution_id,
            institution_name=cand.institution.name if cand.institution else None,
            bureau=cand.bureau,
            category=cand.category,
            description=cand.description,
            status=cand.status,
        )
        results.append(
            CandidateSuggestion(
                complaint=cand_summary,
                score=score,
                score_band=band,
                evidence=evidence,
                explanation=explanation,
            )
        )

    db.commit()
    return source, results


def suggest_all_complaints(
    db: Session,
    max_complaints: int = 100,
    min_threshold: float = REVIEW_CANDIDATE_THRESHOLD,
) -> Dict[str, int]:
    """
    Evaluates pairs across complaints up to max_complaints, creating candidate suggestions.
    Guarantees idempotency and bounded execution without background workers.
    """
    complaints = db.query(Complaint).order_by(Complaint.id.asc()).limit(max_complaints).all()

    evaluated_complaints = len(complaints)
    candidates_considered = 0
    suggestions_created = 0
    suggestions_reused = 0
    candidates_rejected = 0

    evaluated_pairs: Set[Tuple[int, int]] = set()

    for i in range(len(complaints)):
        for j in range(i + 1, len(complaints)):
            c1 = complaints[i]
            c2 = complaints[j]

            # Primary gate: must share the same institution
            if c1.institution_id != c2.institution_id:
                continue

            pair = normalize_relationship_pair(c1.id, c2.id)
            if pair in evaluated_pairs:
                continue
            evaluated_pairs.add(pair)
            candidates_considered += 1

            score, band, evidence, explanation = score_complaint_pair(c1, c2)
            if score < min_threshold:
                candidates_rejected += 1
                continue

            comp_a, comp_b = pair
            existing = (
                db.query(Relationship)
                .filter(
                    Relationship.complaint_a_id == comp_a,
                    Relationship.complaint_b_id == comp_b,
                )
                .first()
            )

            if existing:
                suggestions_reused += 1
                if existing.state == "suggested":
                    existing.score = score
                    existing.evidence = evidence
                    db.add(existing)
            else:
                new_rel = Relationship(
                    complaint_a_id=comp_a,
                    complaint_b_id=comp_b,
                    score=score,
                    evidence=evidence,
                    state="suggested",
                )
                db.add(new_rel)
                db.flush()

                audit = AuditEvent(
                    entity_type="relationship",
                    entity_id=str(new_rel.id),
                    action="suggestion_generated",
                    actor="matching_engine",
                    details={
                        "complaint_a_id": comp_a,
                        "complaint_b_id": comp_b,
                        "score": score,
                        "score_band": band,
                    },
                )
                db.add(audit)
                suggestions_created += 1

    db.commit()

    return {
        "evaluated_complaints": evaluated_complaints,
        "candidates_considered": candidates_considered,
        "suggestions_created": suggestions_created,
        "suggestions_reused": suggestions_reused,
        "candidates_rejected": candidates_rejected,
    }
