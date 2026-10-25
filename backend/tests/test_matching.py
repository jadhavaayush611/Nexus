from datetime import datetime, timezone
from fastapi.testclient import TestClient
from sqlalchemy.orm import Session
from app.models.complaint import Complaint
from app.models.institution import Institution
from app.models.relationship import Relationship
from app.services.matching_service import (
    compute_category_similarity,
    compute_temporal_similarity,
    compute_text_similarity,
    score_complaint_pair,
)


def _setup_matching_data(db_session: Session):
    now = datetime(2026, 10, 24, 12, 0, 0, tzinfo=timezone.utc)

    inst1 = Institution(name="Matching Campus One", normalized_id="MCO-01")
    inst2 = Institution(name="Matching Campus Two", normalized_id="MCO-02")
    db_session.add_all([inst1, inst2])
    db_session.commit()

    # Pair A: Same institution, overlapping description, different bureaus
    c1 = Complaint(
        institution_id=inst1.id,
        bureau="Anti-Ragging Cell",
        category="Safety",
        external_ref="BUR-A-101",
        description="Late night ragging and harassment reported in freshmen hostel block B.",
        status="open",
        created_at=now,
    )
    c2 = Complaint(
        institution_id=inst1.id,
        bureau="Student Welfare Cell",
        category="Safety",
        external_ref="BUR-B-999",  # Completely different reference
        description="Freshmen hostel block B residents report intimidation and night ragging by seniors.",
        status="open",
        created_at=now,
    )

    # Pair B: Same institution, totally unrelated issue
    c3 = Complaint(
        institution_id=inst1.id,
        bureau="Fee Regulation Cell",
        category="Finance",
        external_ref="BUR-C-301",
        description="Excess lab caution deposit refund dispute for graduate student.",
        status="open",
        created_at=now,
    )

    # Pair C: Different institution, but similar description text
    c4 = Complaint(
        institution_id=inst2.id,
        bureau="Anti-Ragging Cell",
        category="Safety",
        external_ref="BUR-D-401",
        description="Late night ragging and harassment reported in freshmen hostel block B.",
        status="open",
        created_at=now,
    )

    db_session.add_all([c1, c2, c3, c4])
    db_session.commit()
    return inst1, inst2, c1, c2, c3, c4


def test_text_similarity_computation():
    """Verify TF-IDF cosine similarity behaves deterministically and handles edge cases."""
    t1 = "Hostel water filtration pipeline is completely damaged."
    t2 = "Hostel water filter pipe is damaged and leaking."
    t3 = "Tuition fee structure dispute for mechanical department."

    sim_high = compute_text_similarity(t1, t2)
    sim_low = compute_text_similarity(t1, t3)

    assert sim_high > sim_low
    assert 0.0 <= sim_high <= 1.0
    assert 0.0 <= sim_low <= 1.0

    # Edge cases
    assert compute_text_similarity("", "valid text") == 0.0
    assert compute_text_similarity("exact same", "exact same") == 1.0


def test_category_and_temporal_similarity():
    """Verify category matching and temporal proximity scoring."""
    # Category
    score_match, is_match = compute_category_similarity("Infrastructure", "infrastructure")
    assert score_match == 1.0
    assert is_match is True

    score_diff, is_diff = compute_category_similarity("Infrastructure", "Finance")
    assert score_diff == 0.0
    assert is_diff is False

    score_neutral, is_neutral = compute_category_similarity(None, "Finance")
    assert score_neutral == 0.5
    assert is_neutral is False

    # Temporal
    now = datetime(2026, 10, 24, 12, 0, 0, tzinfo=timezone.utc)
    t_close, days_close = compute_temporal_similarity(now, now)
    assert t_close == 1.0
    assert days_close == 0.0

    t_neutral, days_none = compute_temporal_similarity(None, now)
    assert t_neutral == 0.5
    assert days_none is None


def test_matching_gate_and_scoring(db_session: Session):
    """
    Verify:
    1. Same institution + similar descriptions produces a high match score.
    2. Different institutions produces 0.0 (institution identity gate).
    3. Same institution + unrelated issues produces low score.
    """
    inst1, inst2, c1, c2, c3, c4 = _setup_matching_data(db_session)

    # 1. Related complaints at same institution
    score_rel, band_rel, evidence_rel, expl_rel = score_complaint_pair(c1, c2)
    assert score_rel >= 0.60
    assert evidence_rel["institution_match"] is True
    assert evidence_rel["category_match"] is True
    assert "signals" in evidence_rel
    assert len(evidence_rel["signals"]) > 0

    # 2. Similar description but DIFFERENT institution -> 0.0
    score_diff_inst, band_diff, evidence_diff, _ = score_complaint_pair(c1, c4)
    assert score_diff_inst == 0.0
    assert evidence_diff["institution_match"] is False

    # 3. Unrelated issue at same institution
    score_unrel, band_unrel, _, _ = score_complaint_pair(c1, c3)
    assert score_unrel < score_rel


def test_api_matching_suggest_single(client: TestClient, db_session: Session):
    """Verify POST /api/matching/suggest/{complaint_id} endpoint."""
    inst1, inst2, c1, c2, c3, c4 = _setup_matching_data(db_session)

    # Generate suggestions for c1
    res = client.post(f"/api/matching/suggest/{c1.id}")
    assert res.status_code == 200
    data = res.json()
    assert data["source_complaint_id"] == c1.id
    assert data["total_candidates"] >= 1

    candidate = data["candidates"][0]
    assert candidate["complaint"]["id"] == c2.id
    assert candidate["score"] >= 0.45
    assert "evidence" in candidate
    assert candidate["evidence"]["category_match"] is True
    assert candidate["explanation"] != ""

    # Verify a Relationship record was persisted with state 'suggested'
    rel = (
        db_session.query(Relationship)
        .filter(Relationship.complaint_a_id == min(c1.id, c2.id))
        .first()
    )
    assert rel is not None
    assert rel.state == "suggested"


def test_api_matching_suggest_nonexistent_complaint(client: TestClient):
    """Verify 404 response when generating suggestions for missing complaint."""
    res = client.post("/api/matching/suggest/999999")
    assert res.status_code == 404


def test_api_matching_suggest_does_not_overwrite_human_review(client: TestClient, db_session: Session):
    """Verify that regenerating suggestions preserves confirmed or dismissed human decisions."""
    inst1, inst2, c1, c2, c3, c4 = _setup_matching_data(db_session)

    # Establish an already confirmed relationship
    comp_a = min(c1.id, c2.id)
    comp_b = max(c1.id, c2.id)
    existing_rel = Relationship(
        complaint_a_id=comp_a,
        complaint_b_id=comp_b,
        score=0.88,
        state="confirmed",
        review_reason="Confirmed by chief ombudsman officer",
    )
    db_session.add(existing_rel)
    db_session.commit()

    # Re-run suggestion API
    res = client.post(f"/api/matching/suggest/{c1.id}")
    assert res.status_code == 200

    # Ensure state remains 'confirmed'
    refreshed = db_session.get(Relationship, existing_rel.id)
    assert refreshed.state == "confirmed"
    assert refreshed.review_reason == "Confirmed by chief ombudsman officer"


def test_api_matching_suggest_all_batch(client: TestClient, db_session: Session):
    """Verify POST /api/matching/suggest-all batch suggestion pipeline."""
    _setup_matching_data(db_session)

    res = client.post("/api/matching/suggest-all?max_complaints=50")
    assert res.status_code == 200
    data = res.json()
    assert data["evaluated_complaints"] >= 4
    assert data["candidates_considered"] >= 1
    assert data["suggestions_created"] >= 1

    # Re-running is idempotent: suggestions_created should be 0 and reused >= 1
    res_repeat = client.post("/api/matching/suggest-all?max_complaints=50")
    assert res_repeat.status_code == 200
    data_repeat = res_repeat.json()
    assert data_repeat["suggestions_created"] == 0
    assert data_repeat["suggestions_reused"] >= 1


def test_extract_matched_terms_and_short_text():
    """Verify keyword overlap extraction and robust handling of short/whitespace strings."""
    from app.services.matching_service import extract_matched_terms, compute_text_similarity

    t1 = "Severe ragging and harassment reported by hostel freshmen."
    t2 = "Freshmen hostel residents report late-night harassment."

    terms = extract_matched_terms(t1, t2)
    assert "freshmen" in terms
    assert "harassment" in terms
    assert "hostel" in terms
    # Stopwords like 'and', 'by' must be excluded
    assert "and" not in terms
    assert "by" not in terms

    # Edge cases
    assert compute_text_similarity("abc", "valid text here") == 0.0
    assert compute_text_similarity("   ", "   ") == 0.0
    assert extract_matched_terms("", "any text") == []


def test_reference_similarity_behavior():
    """Verify reference comparison logic."""
    from app.services.matching_service import compute_reference_similarity

    # Exact match
    score_exact, desc_exact = compute_reference_similarity("CASE-2026-101", "CASE-2026-101")
    assert score_exact == 1.0
    assert "Identical" in desc_exact

    # Shared root
    score_root, desc_root = compute_reference_similarity("AICTE-REV-101", "AICTE-REV-101-SUPP")
    assert score_root == 0.7
    assert "Shared reference root" in desc_root

    # Distinct references (cross-bureau expected)
    score_diff, desc_diff = compute_reference_similarity("BUR-A-101", "BUR-B-999")
    assert score_diff == 0.0
    assert "Distinct references" in desc_diff

    # Missing reference
    score_none, desc_none = compute_reference_similarity(None, "BUR-A-101")
    assert score_none == 0.0


def test_baseline_matcher_vs_caseweave_matcher():
    """Verify that simple baseline matcher computes Jaccard and handles mismatches."""
    from app.services.matching_service import baseline_score_complaint_pair

    now = datetime(2026, 10, 24, 12, 0, 0, tzinfo=timezone.utc)
    c1 = Complaint(
        institution_id=1,
        bureau="Cell A",
        description="Ragging incident in campus hostel block.",
        created_at=now,
    )
    c2 = Complaint(
        institution_id=1,
        bureau="Cell B",
        description="Ragging incident in hostel rooms.",
        created_at=now,
    )
    c_diff_inst = Complaint(
        institution_id=2,
        bureau="Cell A",
        description="Ragging incident in campus hostel block.",
        created_at=now,
    )

    base_score, base_band, base_ev, _ = baseline_score_complaint_pair(c1, c2)
    assert base_score > 0.0
    assert base_ev["method"] == "simple_keyword_baseline"

    # Different institutions rejected by baseline as well
    score_diff, _, ev_diff, _ = baseline_score_complaint_pair(c1, c_diff_inst)
    assert score_diff == 0.0
    assert ev_diff["institution_match"] is False


def test_frontend_evidence_payload_compatibility(db_session: Session):
    """Verify that the evidence dictionary contains all sub-objects required by the frontend EvidencePayload."""
    inst1, inst2, c1, c2, c3, c4 = _setup_matching_data(db_session)
    score, band, ev, expl = score_complaint_pair(c1, c2)

    # Check frontend-required keys
    assert "category_compatibility" in ev
    assert "date_proximity" in ev
    assert "text_similarity" in ev
    assert "signals_list" in ev
    assert "summary_reasoning" in ev
    assert "matched_terms" in ev

    assert ev["category_compatibility"]["compatible"] is True
    assert ev["text_similarity"]["method"] == "tfidf_cosine"
    assert isinstance(ev["signals_list"], list)
    assert len(ev["signals_list"]) >= 4
