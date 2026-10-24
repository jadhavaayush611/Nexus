from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy import func
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session
from app.db.session import get_db
from app.models.complaint import Complaint
from app.models.institution import Institution
from app.schemas.institution import (
    InstitutionCreate,
    InstitutionListResponse,
    InstitutionResponse,
)

router = APIRouter(prefix="/institutions", tags=["Institutions"])


@router.get(
    "",
    response_model=InstitutionListResponse,
    summary="List institutions",
    description="Retrieve a paginated list of institutions with optional case-insensitive name search.",
)
def list_institutions(
    limit: int = Query(50, ge=1, le=100, description="Max items to return (1-100)."),
    offset: int = Query(0, ge=0, description="Number of items to skip."),
    search: Optional[str] = Query(None, description="Optional search term to filter by institution name."),
    db: Session = Depends(get_db),
) -> InstitutionListResponse:
    query = db.query(Institution)

    if search:
        trimmed = search.strip()
        if trimmed:
            query = query.filter(Institution.name.ilike(f"%{trimmed}%"))

    total = query.count()
    institutions = (
        query.order_by(Institution.name.asc(), Institution.id.asc())
        .offset(offset)
        .limit(limit)
        .all()
    )

    # Compute complaint count for the returned items
    inst_ids = [inst.id for inst in institutions]
    complaint_counts = {}
    if inst_ids:
        counts_query = (
            db.query(Complaint.institution_id, func.count(Complaint.id))
            .filter(Complaint.institution_id.in_(inst_ids))
            .group_by(Complaint.institution_id)
            .all()
        )
        complaint_counts = dict(counts_query)

    items: List[InstitutionResponse] = []
    for inst in institutions:
        inst_dict = {
            "id": inst.id,
            "name": inst.name,
            "normalized_id": inst.normalized_id,
            "aliases": inst.aliases or [],
            "created_at": inst.created_at,
            "complaint_count": complaint_counts.get(inst.id, 0),
        }
        items.append(InstitutionResponse.model_validate(inst_dict))

    return InstitutionListResponse(
        items=items,
        total=total,
        limit=limit,
        offset=offset,
    )


@router.get(
    "/{institution_id}",
    response_model=InstitutionResponse,
    summary="Get institution by ID",
    description="Retrieve detailed profile for a specific institution.",
)
def get_institution(
    institution_id: int,
    db: Session = Depends(get_db),
) -> InstitutionResponse:
    inst = db.get(Institution, institution_id)
    if not inst:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Institution with id {institution_id} not found.",
        )

    count = (
        db.query(func.count(Complaint.id))
        .filter(Complaint.institution_id == institution_id)
        .scalar()
        or 0
    )

    inst_dict = {
        "id": inst.id,
        "name": inst.name,
        "normalized_id": inst.normalized_id,
        "aliases": inst.aliases or [],
        "created_at": inst.created_at,
        "complaint_count": count,
    }
    return InstitutionResponse.model_validate(inst_dict)


@router.post(
    "",
    response_model=InstitutionResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Create institution",
    description="Register a new educational/monitored institution.",
)
def create_institution(
    payload: InstitutionCreate,
    db: Session = Depends(get_db),
) -> InstitutionResponse:
    # Check for duplicate normalized_id conflict if normalized_id is provided
    if payload.normalized_id:
        existing = (
            db.query(Institution)
            .filter(Institution.normalized_id == payload.normalized_id)
            .first()
        )
        if existing:
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail=f"Institution with normalized_id '{payload.normalized_id}' already exists.",
            )

    institution = Institution(
        name=payload.name,
        normalized_id=payload.normalized_id,
        aliases=payload.aliases,
    )
    db.add(institution)
    try:
        db.commit()
    except IntegrityError as exc:
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Conflict saving institution: An institution with this identifier already exists.",
        ) from exc

    db.refresh(institution)
    inst_dict = {
        "id": institution.id,
        "name": institution.name,
        "normalized_id": institution.normalized_id,
        "aliases": institution.aliases or [],
        "created_at": institution.created_at,
        "complaint_count": 0,
    }
    return InstitutionResponse.model_validate(inst_dict)
