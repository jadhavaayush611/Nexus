from datetime import datetime, timezone
from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session, joinedload
from app.db.session import get_db
from app.models.complaint import Complaint
from app.models.institution import Institution
from app.schemas.complaint import (
    VALID_COMPLAINT_STATUSES,
    ComplaintCreate,
    ComplaintListResponse,
    ComplaintResponse,
    ComplaintUpdate,
)

router = APIRouter(prefix="/complaints", tags=["Complaints"])


def _to_complaint_response(complaint: Complaint) -> ComplaintResponse:
    """Helper converting Complaint ORM instance to ComplaintResponse schema."""
    return ComplaintResponse(
        id=complaint.id,
        institution_id=complaint.institution_id,
        institution_name=complaint.institution.name if complaint.institution else None,
        bureau=complaint.bureau,
        description=complaint.description,
        external_ref=complaint.external_ref,
        category=complaint.category,
        status=complaint.status,
        next_action=complaint.next_action,
        due_date=complaint.due_date,
        created_at=complaint.created_at,
        updated_at=complaint.updated_at,
    )


@router.get(
    "",
    response_model=ComplaintListResponse,
    summary="List complaints",
    description="Retrieve complaints with optional multi-attribute filters, stable ordering, and pagination.",
)
def list_complaints(
    institution_id: Optional[int] = Query(None, description="Filter complaints by institution ID."),
    bureau: Optional[str] = Query(None, description="Filter complaints by bureau or cell."),
    status_filter: Optional[str] = Query(None, alias="status", description="Filter by lifecycle status."),
    category: Optional[str] = Query(None, description="Filter complaints by category."),
    limit: int = Query(50, ge=1, le=100, description="Page limit (1-100)."),
    offset: int = Query(0, ge=0, description="Page offset."),
    db: Session = Depends(get_db),
) -> ComplaintListResponse:
    query = db.query(Complaint).options(joinedload(Complaint.institution))

    if institution_id is not None:
        query = query.filter(Complaint.institution_id == institution_id)

    if bureau:
        trimmed_bureau = bureau.strip()
        if trimmed_bureau:
            query = query.filter(Complaint.bureau == trimmed_bureau)

    if status_filter:
        normalized_status = status_filter.strip().lower()
        if normalized_status not in VALID_COMPLAINT_STATUSES:
            allowed = ", ".join(sorted(VALID_COMPLAINT_STATUSES))
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Invalid status filter '{status_filter}'. Allowed statuses: {allowed}.",
            )
        query = query.filter(Complaint.status == normalized_status)

    if category:
        trimmed_cat = category.strip()
        if trimmed_cat:
            query = query.filter(Complaint.category == trimmed_cat)

    total = query.count()
    # Stable ordering: newest first with ID tiebreaker
    complaints = (
        query.order_by(Complaint.created_at.desc(), Complaint.id.desc())
        .offset(offset)
        .limit(limit)
        .all()
    )

    items: List[ComplaintResponse] = [_to_complaint_response(c) for c in complaints]

    return ComplaintListResponse(
        items=items,
        total=total,
        limit=limit,
        offset=offset,
    )


@router.get(
    "/{complaint_id}",
    response_model=ComplaintResponse,
    summary="Get complaint by ID",
    description="Retrieve full details for a single complaint record.",
)
def get_complaint(
    complaint_id: int,
    db: Session = Depends(get_db),
) -> ComplaintResponse:
    complaint = (
        db.query(Complaint)
        .options(joinedload(Complaint.institution))
        .filter(Complaint.id == complaint_id)
        .first()
    )
    if not complaint:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Complaint with id {complaint_id} not found.",
        )
    return _to_complaint_response(complaint)


@router.post(
    "",
    response_model=ComplaintResponse,
    status_code=status.HTTP_201_CREATED,
    summary="File new complaint",
    description="Register a new complaint filed with a bureau against a verified institution.",
)
def create_complaint(
    payload: ComplaintCreate,
    db: Session = Depends(get_db),
) -> ComplaintResponse:
    # Verify referenced institution exists
    inst = db.get(Institution, payload.institution_id)
    if not inst:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Institution with id {payload.institution_id} not found.",
        )

    complaint = Complaint(
        institution_id=payload.institution_id,
        bureau=payload.bureau,
        description=payload.description,
        external_ref=payload.external_ref,
        category=payload.category,
        status=payload.status,
        next_action=payload.next_action,
        due_date=payload.due_date,
    )
    db.add(complaint)
    db.commit()
    db.refresh(complaint)

    # Attach institution for response mapping
    complaint.institution = inst
    return _to_complaint_response(complaint)


@router.patch(
    "/{complaint_id}",
    response_model=ComplaintResponse,
    summary="Update complaint",
    description="Update mutable fields of a complaint (bureau, category, description, status, next_action, due_date).",
)
def update_complaint(
    complaint_id: int,
    payload: ComplaintUpdate,
    db: Session = Depends(get_db),
) -> ComplaintResponse:
    complaint = (
        db.query(Complaint)
        .options(joinedload(Complaint.institution))
        .filter(Complaint.id == complaint_id)
        .first()
    )
    if not complaint:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Complaint with id {complaint_id} not found.",
        )

    # Apply only provided fields
    update_data = payload.model_dump(exclude_unset=True)
    if not update_data:
        return _to_complaint_response(complaint)

    for field, val in update_data.items():
        setattr(complaint, field, val)

    complaint.updated_at = datetime.now(timezone.utc)

    db.add(complaint)
    db.commit()
    db.refresh(complaint)
    return _to_complaint_response(complaint)
