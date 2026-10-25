from datetime import datetime
from typing import List, Optional
from pydantic import BaseModel, ConfigDict, Field, field_validator


class InstitutionBase(BaseModel):
    """Base institution schema containing shared attributes."""

    name: str = Field(
        ...,
        min_length=1,
        max_length=255,
        description="Canonical name of the educational or monitored institution.",
        examples=["Apex Institute of Technology & Science"],
    )
    normalized_id: Optional[str] = Field(
        None,
        max_length=100,
        description="Normalized unique identifier or institution code (optional).",
        examples=["AITS-DEMO-001"],
    )
    aliases: Optional[List[str]] = Field(
        default_factory=list,
        description="Known alternative names, abbreviations, or acronyms.",
        examples=[["AITS", "Apex Tech"]],
    )

    @field_validator("name", mode="before")
    @classmethod
    def validate_name(cls, value: str) -> str:
        if isinstance(value, str):
            trimmed = value.strip()
            if not trimmed:
                raise ValueError("Institution name cannot be empty or whitespace only.")
            return trimmed
        raise ValueError("Institution name must be a string.")

    @field_validator("normalized_id", mode="before")
    @classmethod
    def normalize_identifier(cls, value: Optional[str]) -> Optional[str]:
        if value is None:
            return None
        if isinstance(value, str):
            trimmed = value.strip()
            return trimmed if trimmed else None
        return str(value).strip() or None

    @field_validator("aliases", mode="before")
    @classmethod
    def validate_aliases(cls, value: Optional[List[str]]) -> List[str]:
        if value is None:
            return []
        if isinstance(value, list):
            cleaned = []
            for item in value:
                if isinstance(item, str):
                    s = item.strip()
                    if s:
                        cleaned.append(s)
            return cleaned
        return []


class InstitutionCreate(InstitutionBase):
    """Schema for creating a new Institution record."""
    pass


class InstitutionUpdate(BaseModel):
    """Schema for updating an existing Institution record."""

    name: Optional[str] = Field(None, min_length=1, max_length=255)
    normalized_id: Optional[str] = Field(None, max_length=100)
    aliases: Optional[List[str]] = None

    @field_validator("name", mode="before")
    @classmethod
    def validate_optional_name(cls, value: Optional[str]) -> Optional[str]:
        if value is None:
            return None
        if isinstance(value, str):
            trimmed = value.strip()
            if not trimmed:
                raise ValueError("Institution name cannot be empty or whitespace only.")
            return trimmed
        raise ValueError("Institution name must be a string.")

    @field_validator("normalized_id", mode="before")
    @classmethod
    def normalize_optional_identifier(cls, value: Optional[str]) -> Optional[str]:
        if value is None:
            return None
        if isinstance(value, str):
            trimmed = value.strip()
            return trimmed if trimmed else None
        return str(value).strip() or None


class InstitutionResponse(InstitutionBase):
    """Public representation of an Institution record."""

    id: int = Field(..., description="Unique database identifier.")
    created_at: datetime = Field(..., description="Creation timestamp in UTC.")
    complaint_count: int = Field(0, description="Total number of complaints linked to this institution.")

    model_config = ConfigDict(from_attributes=True)


class InstitutionListResponse(BaseModel):
    """Paginated list of institution records."""

    items: List[InstitutionResponse] = Field(..., description="Page items.")
    total: int = Field(..., ge=0, description="Total number of matching institutions.")
    limit: int = Field(..., ge=1, description="Page limit applied.")
    offset: int = Field(..., ge=0, description="Page offset applied.")
