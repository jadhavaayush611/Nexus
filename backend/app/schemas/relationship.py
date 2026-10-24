from datetime import datetime
from typing import Any, Dict, List, Optional
from pydantic import BaseModel, ConfigDict, Field, field_validator
from app.schemas.matching import ComplaintSummary

VALID_REVIEW_DECISIONS = {"confirmed", "dismissed", "needs_info"}


class RelationshipBase(BaseModel):
    """Base schema for case similarity / link representations."""

    complaint_a_id: int = Field(..., gt=0, description="Canonical first complaint ID (lower).")
    complaint_b_id: int = Field(..., gt=0, description="Canonical second complaint ID (higher).")
    score: Optional[float] = Field(None, ge=0.0, le=1.0, description="Similarity score between 0.0 and 1.0.")
    evidence: Optional[Dict[str, Any]] = Field(None, description="Structured explanation of similarity signals.")
    state: str = Field(default="suggested", description="Review state: suggested, confirmed, dismissed, needs_info.")
    review_reason: Optional[str] = Field(None, description="Human reviewer rationale.")


class RelationshipCreate(BaseModel):
    """Input payload for proposing a relationship between two complaints."""

    complaint_1_id: int = Field(..., gt=0, description="First complaint ID.")
    complaint_2_id: int = Field(..., gt=0, description="Second complaint ID.")
    score: Optional[float] = None
    evidence: Optional[Dict[str, Any]] = None
    state: str = "suggested"
    review_reason: Optional[str] = None


class RelationshipReviewRequest(BaseModel):
    """Input payload for recording a human review decision on a relationship."""

    decision: str = Field(..., description="Review outcome: confirmed, dismissed, needs_info.")
    review_reason: Optional[str] = Field(None, description="Mandatory for 'dismissed'; optional for others.")
    actor: Optional[str] = Field(default="demo-reviewer", description="Identifier or role of the reviewer.")

    @field_validator("decision", mode="before")
    @classmethod
    def validate_decision(cls, value: str) -> str:
        if isinstance(value, str):
            normalized = value.strip().lower()
            if normalized not in VALID_REVIEW_DECISIONS:
                allowed = ", ".join(sorted(VALID_REVIEW_DECISIONS))
                raise ValueError(f"Invalid decision '{value}'. Allowed decisions: {allowed}.")
            return normalized
        raise ValueError("Decision must be a string.")

    @field_validator("review_reason", mode="before")
    @classmethod
    def normalize_reason(cls, value: Optional[str]) -> Optional[str]:
        if value is None:
            return None
        if isinstance(value, str):
            trimmed = value.strip()
            return trimmed if trimmed else None
        return str(value).strip() or None


class RelationshipResponse(RelationshipBase):
    """Public representation of a verified or suggested relationship."""

    id: int
    complaint_a: Optional[ComplaintSummary] = None
    complaint_b: Optional[ComplaintSummary] = None
    created_at: datetime
    updated_at: datetime

    model_config = ConfigDict(from_attributes=True)


class RelationshipListResponse(BaseModel):
    """Paginated list of relationship records."""

    items: List[RelationshipResponse]
    total: int
    limit: int
    offset: int
