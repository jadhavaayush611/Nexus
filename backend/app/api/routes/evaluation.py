from fastapi import APIRouter, Query
from app.schemas.evaluation import EvaluationSummaryResponse
from app.services.evaluation_service import evaluate_matching_pipeline
from app.services.matching_service import REVIEW_CANDIDATE_THRESHOLD

router = APIRouter(prefix="/evaluation", tags=["Evaluation"])


@router.get(
    "/summary",
    response_model=EvaluationSummaryResponse,
    summary="Synthetic Evaluation Benchmark Metrics",
    description="Returns precision, recall, F1, and confusion matrix metrics computed on an explicit labelled synthetic dataset.",
)
def get_evaluation_summary(
    threshold: float = Query(
        REVIEW_CANDIDATE_THRESHOLD,
        ge=0.0,
        le=1.0,
        description="Candidate match decision threshold.",
    ),
) -> EvaluationSummaryResponse:
    return evaluate_matching_pipeline(threshold=threshold)
