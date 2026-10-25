from typing import List, Optional
from pydantic import BaseModel, Field


class ConfusionMatrix(BaseModel):
    """Confusion matrix metrics for synthetic benchmark evaluation."""

    true_positives: int = Field(..., ge=0)
    false_positives: int = Field(..., ge=0)
    true_negatives: int = Field(..., ge=0)
    false_negatives: int = Field(..., ge=0)


class BaselineComparison(BaseModel):
    """Comparative metrics against a simple exact/keyword baseline matcher."""

    baseline_name: str = "Exact Match & Keyword Baseline"
    precision: float = Field(..., ge=0.0, le=1.0)
    recall: float = Field(..., ge=0.0, le=1.0)
    f1_score: float = Field(..., ge=0.0, le=1.0)
    true_positives: int = Field(..., ge=0)
    false_positives: int = Field(..., ge=0)
    true_negatives: int = Field(..., ge=0)
    false_negatives: int = Field(..., ge=0)


class EvaluationSamplePair(BaseModel):
    """Diagnostic sample pair representing a true positive, false positive, false negative, or true negative."""

    pair_id: str
    complaint_a_ref: str
    complaint_b_ref: str
    institution_name: str
    true_label: str  # "related" | "unrelated"
    predicted_state: str  # "suggested" | "rejected"
    score: float
    classification: str  # "TP" | "FP" | "TN" | "FN"
    reason: str


class EvaluationSummaryResponse(BaseModel):
    """
    Transparent performance report on a labelled synthetic evaluation dataset.
    Discloses precision, recall, F1, threshold behavior, baseline comparison, and failure cases.
    """

    # Authoritative frontend contract fields
    dataset_name: str = "Synthetic AICTE Cross-Bureau Benchmark v1.0"
    total_labelled_pairs: int = Field(..., ge=0)
    precision: float = Field(..., ge=0.0, le=1.0)
    recall: float = Field(..., ge=0.0, le=1.0)
    f1_score: float = Field(..., ge=0.0, le=1.0)
    confusion_matrix: ConfusionMatrix
    baseline_comparison: Optional[BaselineComparison] = None
    error_inspection_samples: Optional[List[EvaluationSamplePair]] = None
    methodology_notes: Optional[List[str]] = None

    # Preserved backend fields for backward compatibility
    synthetic_evaluation: bool = True
    positive_pairs: int = Field(..., ge=0)
    negative_pairs: int = Field(..., ge=0)
    threshold: float = Field(..., ge=0.0, le=1.0)
    disclaimer: str = (
        "Evaluation metrics are calculated on an explicit synthetic test fixture containing "
        "labelled positive and hard-negative pairs. This prototype does not claim custom model "
        "training or real-world accuracy guarantees."
    )
