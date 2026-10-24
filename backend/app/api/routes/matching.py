from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session
from app.db.session import get_db
from app.schemas.matching import SuggestAllResponse, SuggestResponse
from app.services.matching_service import (
    REVIEW_CANDIDATE_THRESHOLD,
    suggest_all_complaints,
    suggest_for_complaint,
)

router = APIRouter(prefix="/matching", tags=["Matching"])


@router.post(
    "/suggest/{complaint_id}",
    response_model=SuggestResponse,
    summary="Generate candidate suggestions for a complaint",
    description="Identifies potential cross-bureau matching candidates for a source complaint using explainable text, category, and temporal signals.",
)
def generate_suggestions_for_complaint(
    complaint_id: int,
    min_threshold: float = Query(
        REVIEW_CANDIDATE_THRESHOLD,
        ge=0.0,
        le=1.0,
        description="Minimum score threshold required to surface a suggestion.",
    ),
    db: Session = Depends(get_db),
) -> SuggestResponse:
    try:
        source, suggestions = suggest_for_complaint(
            db=db,
            complaint_id=complaint_id,
            min_threshold=min_threshold,
        )
    except ValueError as ve:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=str(ve),
        ) from ve

    return SuggestResponse(
        source_complaint_id=source.id,
        total_candidates=len(suggestions),
        candidates=suggestions,
    )


@router.post(
    "/suggest-all",
    response_model=SuggestAllResponse,
    summary="Generate candidate suggestions across complaints batch",
    description="Controlled, bounded execution generating cross-bureau relationship candidates across complaints in the database.",
)
def generate_all_suggestions(
    max_complaints: int = Query(
        100,
        ge=1,
        le=500,
        description="Maximum number of complaints to evaluate in one batch.",
    ),
    min_threshold: float = Query(
        REVIEW_CANDIDATE_THRESHOLD,
        ge=0.0,
        le=1.0,
        description="Minimum score threshold.",
    ),
    db: Session = Depends(get_db),
) -> SuggestAllResponse:
    counts = suggest_all_complaints(
        db=db,
        max_complaints=max_complaints,
        min_threshold=min_threshold,
    )
    return SuggestAllResponse(**counts)
