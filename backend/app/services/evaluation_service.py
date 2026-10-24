from datetime import datetime, timezone
from typing import Dict, List, NamedTuple, Tuple
from app.models.complaint import Complaint
from app.schemas.evaluation import ConfusionMatrix, EvaluationSummaryResponse
from app.services.matching_service import REVIEW_CANDIDATE_THRESHOLD, score_complaint_pair


class SyntheticEvaluationPair(NamedTuple):
    label: int  # 1 for positive (same underlying issue), 0 for negative
    c1: Complaint
    c2: Complaint
    notes: str


def get_labelled_synthetic_dataset() -> List[SyntheticEvaluationPair]:
    """
    Returns an explicit, deterministic benchmark dataset of labelled synthetic complaint pairs.
    Includes positive pairs and hard negatives to test algorithm differentiation.
    """
    now = datetime(2026, 10, 24, 12, 0, 0, tzinfo=timezone.utc)

    dataset: List[SyntheticEvaluationPair] = [
        # --- POSITIVE PAIR 1: Same issue, different bureaus, same institution ---
        SyntheticEvaluationPair(
            label=1,
            c1=Complaint(
                id=101,
                institution_id=1,
                bureau="Anti-Ragging Cell",
                category="Disciplinary & Safety",
                description="Late-night harassment and unauthorized entry reported by first-year students in hostel block C.",
                status="open",
                created_at=now,
            ),
            c2=Complaint(
                id=102,
                institution_id=1,
                bureau="Student Welfare Cell",
                category="Disciplinary & Safety",
                description="Hostel block C junior residents report intimidation and late night disturbances by seniors.",
                status="open",
                created_at=now,
            ),
            notes="True Positive: Shared institution, same incident reported to two separate cells.",
        ),

        # --- POSITIVE PAIR 2: Same facility failure, differing references, same institution ---
        SyntheticEvaluationPair(
            label=1,
            c1=Complaint(
                id=103,
                institution_id=2,
                bureau="Student Welfare Cell",
                category="Infrastructure",
                description="Water filtration system in North Campus dining hall is broken, producing contaminated water.",
                status="under_investigation",
                created_at=now,
            ),
            c2=Complaint(
                id=104,
                institution_id=2,
                bureau="Disciplinary Cell",
                category="Infrastructure",
                description="Drinking water coolers in North Campus mess hall are malfunctioning and dispensing unhygienic water.",
                status="open",
                created_at=now,
            ),
            notes="True Positive: Shared institution, clear infrastructure issue with overlapping terminology.",
        ),

        # --- POSITIVE PAIR 3: Exam discrepancy, same institution ---
        SyntheticEvaluationPair(
            label=1,
            c1=Complaint(
                id=105,
                institution_id=3,
                bureau="Examinations Bureau",
                category="Academics",
                description="Internal assessment marksheets for final semester mechanical engineering are missing on portal.",
                status="open",
                created_at=now,
            ),
            c2=Complaint(
                id=106,
                institution_id=3,
                bureau="Student Welfare Cell",
                category="Academics",
                description="Final year mechanical students report assessment grades not uploaded to university exam portal.",
                status="open",
                created_at=now,
            ),
            notes="True Positive: Exam portal grade upload discrepancy.",
        ),

        # --- HARD NEGATIVE 1: Same institution, completely unrelated issues ---
        SyntheticEvaluationPair(
            label=0,
            c1=Complaint(
                id=107,
                institution_id=1,
                bureau="Fee Regulation Cell",
                category="Finance",
                description="Tuition fee refund request submitted four months ago has not been credited to bank account.",
                status="open",
                created_at=now,
            ),
            c2=Complaint(
                id=108,
                institution_id=1,
                bureau="Anti-Ragging Cell",
                category="Disciplinary & Safety",
                description="Verbal bullying incident inside department seminar hall during orientation week.",
                status="open",
                created_at=now,
            ),
            notes="Hard Negative: Same institution alone must not generate a match.",
        ),

        # --- HARD NEGATIVE 2: Different institutions, nearly identical descriptions ---
        SyntheticEvaluationPair(
            label=0,
            c1=Complaint(
                id=109,
                institution_id=1,  # Institution A
                bureau="Anti-Ragging Cell",
                category="Disciplinary & Safety",
                description="Hostel mess food quality has deteriorated significantly with unhygienic cooking conditions.",
                status="open",
                created_at=now,
            ),
            c2=Complaint(
                id=110,
                institution_id=2,  # Institution B (DIFFERENT)
                bureau="Student Welfare Cell",
                category="Disciplinary & Safety",
                description="Hostel mess food quality has deteriorated significantly with unhygienic cooking conditions.",
                status="open",
                created_at=now,
            ),
            notes="Hard Negative: Cross-institution linking is prohibited in initial prototype.",
        ),

        # --- HARD NEGATIVE 3: Same institution, different categories and issues ---
        SyntheticEvaluationPair(
            label=0,
            c1=Complaint(
                id=111,
                institution_id=2,
                bureau="Campus Security Desk",
                category="Security",
                description="Bicycle theft reported from east parking stand near library.",
                status="open",
                created_at=now,
            ),
            c2=Complaint(
                id=112,
                institution_id=2,
                bureau="Examinations Bureau",
                category="Academics",
                description="Supplementary examination admit card barcode scan failure at exam center.",
                status="open",
                created_at=now,
            ),
            notes="Hard Negative: Same campus, entirely distinct operational problems.",
        ),
    ]

    return dataset


def evaluate_matching_pipeline(
    threshold: float = REVIEW_CANDIDATE_THRESHOLD,
) -> EvaluationSummaryResponse:
    """
    Evaluates the deterministic matching scoring pipeline against the labelled synthetic dataset.
    Computes precision, recall, F1, and confusion matrix counts safely.
    """
    dataset = get_labelled_synthetic_dataset()

    tp = 0
    fp = 0
    tn = 0
    fn = 0
    positive_count = 0
    negative_count = 0

    for pair in dataset:
        if pair.label == 1:
            positive_count += 1
        else:
            negative_count += 1

        score, band, evidence, explanation = score_complaint_pair(pair.c1, pair.c2)
        predicted_match = score >= threshold

        if pair.label == 1:
            if predicted_match:
                tp += 1
            else:
                fn += 1
        else:
            if predicted_match:
                fp += 1
            else:
                tn += 1

    # Safe metric calculations with zero denominator guards
    precision = tp / (tp + fp) if (tp + fp) > 0 else 0.0
    recall = tp / (tp + fn) if (tp + fn) > 0 else 0.0
    f1 = (2.0 * precision * recall / (precision + recall)) if (precision + recall) > 0 else 0.0

    return EvaluationSummaryResponse(
        synthetic_evaluation=True,
        positive_pairs=positive_count,
        negative_pairs=negative_count,
        threshold=round(threshold, 2),
        precision=round(precision, 4),
        recall=round(recall, 4),
        f1_score=round(f1, 4),
        confusion_matrix=ConfusionMatrix(
            true_positives=tp,
            false_positives=fp,
            true_negatives=tn,
            false_negatives=fn,
        ),
    )
