from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy import or_
from sqlalchemy.orm import Session, joinedload
from app.db.session import get_db
from app.models.relationship import Relationship
from app.schemas.matching import ComplaintSummary
from app.schemas.relationship import (
    RelationshipListResponse,
    RelationshipResponse,
    RelationshipReviewRequest,
)
from app.services.review_service import review_relationship

router = APIRouter(prefix="/relationships", tags=["Relationships"])


def _to_relationship_response(rel: Relationship) -> RelationshipResponse:
    """Formats Relationship ORM object into response schema including complaint summaries."""
    comp_a_summary = None
    if rel.complaint_a:
        comp_a_summary = ComplaintSummary(
            id=rel.complaint_a.id,
            institution_id=rel.complaint_a.institution_id,
            institution_name=rel.complaint_a.institution.name if rel.complaint_a.institution else None,
            bureau=rel.complaint_a.bureau,
            category=rel.complaint_a.category,
            description=rel.complaint_a.description,
            status=rel.complaint_a.status,
        )

    comp_b_summary = None
    if rel.complaint_b:
        comp_b_summary = ComplaintSummary(
            id=rel.complaint_b.id,
            institution_id=rel.complaint_b.institution_id,
            institution_name=rel.complaint_b.institution.name if rel.complaint_b.institution else None,
            bureau=rel.complaint_b.bureau,
            category=rel.complaint_b.category,
            description=rel.complaint_b.description,
            status=rel.complaint_b.status,
        )

    return RelationshipResponse(
        id=rel.id,
        complaint_a_id=rel.complaint_a_id,
        complaint_b_id=rel.complaint_b_id,
        complaint_a=comp_a_summary,
        complaint_b=comp_b_summary,
        score=rel.score,
        evidence=rel.evidence,
        state=rel.state,
        review_reason=rel.review_reason,
        created_at=rel.created_at,
        updated_at=rel.updated_at,
    )


@router.get(
    "",
    response_model=RelationshipListResponse,
    summary="List relationships",
    description="Retrieve paginated relationship links with optional filtering by review state or linked complaint ID.",
)
def list_relationships(
    state: Optional[str] = Query(None, description="Filter by review state: suggested, confirmed, dismissed, needs_info."),
    complaint_id: Optional[int] = Query(None, description="Filter for relationships involving a specific complaint ID."),
    limit: int = Query(50, ge=1, le=100, description="Page limit."),
    offset: int = Query(0, ge=0, description="Page offset."),
    db: Session = Depends(get_db),
) -> RelationshipListResponse:
    query = (
        db.query(Relationship)
        .options(
            joinedload(Relationship.complaint_a),
            joinedload(Relationship.complaint_b),
        )
    )

    if state:
        clean_state = state.strip().lower()
        query = query.filter(Relationship.state == clean_state)

    if complaint_id is not None:
        query = query.filter(
            or_(
                Relationship.complaint_a_id == complaint_id,
                Relationship.complaint_b_id == complaint_id,
            )
        )

    total = query.count()
    items_orm = (
        query.order_by(Relationship.created_at.desc(), Relationship.id.desc())
        .offset(offset)
        .limit(limit)
        .all()
    )

    items = [_to_relationship_response(r) for r in items_orm]

    return RelationshipListResponse(
        items=items,
        total=total,
        limit=limit,
        offset=offset,
    )


@router.get(
    "/{relationship_id}",
    response_model=RelationshipResponse,
    summary="Get relationship details",
    description="Retrieve full details for a relationship link including score, evidence, complaint summaries, and review state.",
)
def get_relationship(
    relationship_id: int,
    db: Session = Depends(get_db),
) -> RelationshipResponse:
    rel = (
        db.query(Relationship)
        .options(
            joinedload(Relationship.complaint_a),
            joinedload(Relationship.complaint_b),
        )
        .filter(Relationship.id == relationship_id)
        .first()
    )
    if not rel:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Relationship with id {relationship_id} not found.",
        )
    return _to_relationship_response(rel)


@router.post(
    "/{relationship_id}/review",
    response_model=RelationshipResponse,
    summary="Submit human review decision",
    description="Record an auditable review decision (confirmed, dismissed, needs_info) for a candidate relationship. Dismissal requires a reason.",
)
def review_relationship_decision(
    relationship_id: int,
    payload: RelationshipReviewRequest,
    db: Session = Depends(get_db),
) -> RelationshipResponse:
    try:
        updated_rel = review_relationship(
            db=db,
            relationship_id=relationship_id,
            decision=payload.decision,
            review_reason=payload.review_reason,
            actor=payload.actor,
        )
    except ValueError as ve:
        err_msg = str(ve)
        if "not found" in err_msg.lower():
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=err_msg) from ve
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=err_msg) from ve

    return _to_relationship_response(updated_rel)
