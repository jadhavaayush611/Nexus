from datetime import datetime
from typing import Any, Dict, List, Optional
from pydantic import BaseModel, ConfigDict, Field


class AuditEventResponse(BaseModel):
    """Public representation of an immutable audit trail entry."""

    id: int
    entity_type: str = Field(..., description="Target entity category (e.g. relationship, complaint).")
    entity_id: str = Field(..., description="Target entity ID.")
    action: str = Field(..., description="Operation performed (e.g. relationship_confirmed).")
    actor: Optional[str] = Field(None, description="User, role, or system agent that triggered the action.")
    details: Optional[Dict[str, Any]] = Field(None, description="Contextual details of the event.")
    created_at: datetime = Field(..., description="Timestamp when the event occurred in UTC.")

    model_config = ConfigDict(from_attributes=True)


class AuditEventListResponse(BaseModel):
    """Paginated list of audit events."""

    items: List[AuditEventResponse]
    total: int
    limit: int
    offset: int
