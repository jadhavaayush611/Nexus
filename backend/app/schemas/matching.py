from typing import Any, Dict, List, Optional
from pydantic import BaseModel, ConfigDict, Field


class ComplaintSummary(BaseModel):
    """Concise representation of a complaint used in relationship displays."""

    id: int
    institution_id: int
    institution_name: Optional[str] = None
    bureau: str
    category: Optional[str] = None
    description: str
    status: str

    model_config = ConfigDict(from_attributes=True)


class CandidateSuggestion(BaseModel):
    """Candidate match suggestion with explainable evidence."""

    complaint: ComplaintSummary
    score: float = Field(..., ge=0.0, le=1.0)
    score_band: str = Field(..., description="High, Review, or Weak")
    evidence: Dict[str, Any]
    explanation: str


class SuggestResponse(BaseModel):
    """Response containing generated candidate suggestions for a source complaint."""

    source_complaint_id: int
    total_candidates: int
    candidates: List[CandidateSuggestion]


class SuggestAllResponse(BaseModel):
    """Summary metrics of a batch suggestion generation pass."""

    evaluated_complaints: int
    candidates_considered: int
    suggestions_created: int
    suggestions_reused: int
    candidates_rejected: int
