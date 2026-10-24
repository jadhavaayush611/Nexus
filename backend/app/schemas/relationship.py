from datetime import datetime
from typing import Any, Dict, Optional
from pydantic import BaseModel, ConfigDict, Field


class RelationshipBase(BaseModel):
    """Base schema for case similarity / link representations."""

    complaint_a_id: int = Field(..., gt=0, description="Canonical first complaint ID (lower).")
    complaint_b_id: int = Field(..., gt=0, description="Canonical second complaint ID (higher).")
    score: Optional[float] = Field(None, ge=0.0, le=1.0, description="Similarity score between 0.0 and 1.0.")
    evidence: Optional[Dict[str, Any]] = Field(None, description="Structured explanation of similarity signals.")
    state: str = Field(default="suggested", description="Review state: suggested, reviewed, confirmed, rejected.")
    review_reason: Optional[str] = Field(None, description="Human reviewer rationale.")


class RelationshipCreate(BaseModel):
    """Input payload for proposing a relationship between two complaints."""

    complaint_1_id: int = Field(..., gt=0, description="First complaint ID.")
    complaint_2_id: int = Field(..., gt=0, description="Second complaint ID.")
    score: Optional[float] = None
    evidence: Optional[Dict[str, Any]] = None
    state: str = "suggested"
    review_reason: Optional[str] = None


class RelationshipResponse(RelationshipBase):
    """Public representation of a verified or suggested relationship."""

    id: int
    created_at: datetime
    updated_at: datetime

    model_config = ConfigDict(from_attributes=True)
