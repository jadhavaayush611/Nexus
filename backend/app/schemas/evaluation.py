from typing import Dict
from pydantic import BaseModel, Field


class ConfusionMatrix(BaseModel):
    """Confusion matrix metrics for synthetic benchmark evaluation."""

    true_positives: int = Field(..., ge=0)
    false_positives: int = Field(..., ge=0)
    true_negatives: int = Field(..., ge=0)
    false_negatives: int = Field(..., ge=0)


class EvaluationSummaryResponse(BaseModel):
    """
    Transparent performance report on a labelled synthetic evaluation dataset.
    Discloses precision, recall, F1, and threshold behavior without fabricating ML claims.
    """

    synthetic_evaluation: bool = True
    positive_pairs: int = Field(..., ge=0)
    negative_pairs: int = Field(..., ge=0)
    threshold: float = Field(..., ge=0.0, le=1.0)
    precision: float = Field(..., ge=0.0, le=1.0)
    recall: float = Field(..., ge=0.0, le=1.0)
    f1_score: float = Field(..., ge=0.0, le=1.0)
    confusion_matrix: ConfusionMatrix
    disclaimer: str = (
        "Evaluation metrics are calculated on an explicit synthetic test fixture containing "
        "labelled positive and hard-negative pairs. This prototype does not claim custom model "
        "training or real-world accuracy guarantees."
    )
