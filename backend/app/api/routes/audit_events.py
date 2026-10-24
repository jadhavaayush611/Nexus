from typing import Optional
from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session
from app.db.session import get_db
from app.models.audit_event import AuditEvent
from app.schemas.audit_event import AuditEventListResponse, AuditEventResponse

router = APIRouter(prefix="/audit-events", tags=["Audit Events"])


@router.get(
    "",
    response_model=AuditEventListResponse,
    summary="List audit events",
    description="Retrieve paginated, immutable audit trail events with optional filtering by entity type, entity ID, or action.",
)
def list_audit_events(
    entity_type: Optional[str] = Query(None, description="Filter by entity type (e.g. relationship, complaint)."),
    entity_id: Optional[str] = Query(None, description="Filter by target entity ID."),
    action: Optional[str] = Query(None, description="Filter by action description (e.g. relationship_confirmed)."),
    limit: int = Query(50, ge=1, le=100, description="Page limit."),
    offset: int = Query(0, ge=0, description="Page offset."),
    db: Session = Depends(get_db),
) -> AuditEventListResponse:
    query = db.query(AuditEvent)

    if entity_type:
        query = query.filter(AuditEvent.entity_type == entity_type.strip())

    if entity_id:
        query = query.filter(AuditEvent.entity_id == entity_id.strip())

    if action:
        query = query.filter(AuditEvent.action == action.strip())

    total = query.count()
    events = (
        query.order_by(AuditEvent.created_at.desc(), AuditEvent.id.desc())
        .offset(offset)
        .limit(limit)
        .all()
    )

    items = [AuditEventResponse.model_validate(e) for e in events]

    return AuditEventListResponse(
        items=items,
        total=total,
        limit=limit,
        offset=offset,
    )
