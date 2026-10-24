from datetime import datetime
from typing import List, Optional, Set
from pydantic import BaseModel, ConfigDict, Field, field_validator

# Canonical set of supported complaint lifecycle statuses
VALID_COMPLAINT_STATUSES: Set[str] = {
    "open",
    "under_investigation",
    "resolved",
    "dismissed",
    "closed",
}

# Terminal statuses where a complaint is considered concluded
TERMINAL_STATUSES: Set[str] = {
    "resolved",
    "dismissed",
    "closed",
}


class ComplaintBase(BaseModel):
    """Base complaint schema with common attributes."""

    bureau: str = Field(
        ...,
        min_length=1,
        max_length=100,
        description="Name of the ombudsman cell or bureau handling the complaint.",
        examples=["Anti-Ragging Cell"],
    )
    description: str = Field(
        ...,
        min_length=1,
        description="Detailed text describing the grievance or complaint incident.",
        examples=["Grievance regarding hostel water filtration maintenance delay."],
    )
    external_ref: Optional[str] = Field(
        None,
        max_length=100,
        description="External case identifier assigned by the originating bureau (non-unique).",
        examples=["ARC-2026-0042"],
    )
    category: Optional[str] = Field(
        None,
        max_length=100,
        description="Category classification (e.g. Infrastructure, Safety, Academic).",
        examples=["Infrastructure & Maintenance"],
    )
    status: str = Field(
        default="open",
        description="Lifecycle status: open, under_investigation, resolved, dismissed, closed.",
        examples=["open"],
    )
    next_action: Optional[str] = Field(
        None,
        description="Next operational or administrative step planned for this case.",
        examples=["Dispatch inspection notice to campus facilities"],
    )
    due_date: Optional[datetime] = Field(
        None,
        description="Target completion or follow-up deadline in UTC.",
    )

    @field_validator("bureau", mode="before")
    @classmethod
    def validate_bureau(cls, value: str) -> str:
        if isinstance(value, str):
            trimmed = value.strip()
            if not trimmed:
                raise ValueError("Bureau name cannot be empty or whitespace only.")
            return trimmed
        raise ValueError("Bureau must be a string.")

    @field_validator("description", mode="before")
    @classmethod
    def validate_description(cls, value: str) -> str:
        if isinstance(value, str):
            trimmed = value.strip()
            if not trimmed:
                raise ValueError("Complaint description cannot be empty or whitespace only.")
            return trimmed
        raise ValueError("Description must be a string.")

    @field_validator("external_ref", mode="before")
    @classmethod
    def normalize_external_ref(cls, value: Optional[str]) -> Optional[str]:
        if value is None:
            return None
        if isinstance(value, str):
            trimmed = value.strip()
            return trimmed if trimmed else None
        return str(value).strip() or None

    @field_validator("category", mode="before")
    @classmethod
    def normalize_category(cls, value: Optional[str]) -> Optional[str]:
        if value is None:
            return None
        if isinstance(value, str):
            trimmed = value.strip()
            return trimmed if trimmed else None
        return str(value).strip() or None

    @field_validator("status", mode="before")
    @classmethod
    def validate_status(cls, value: str) -> str:
        if isinstance(value, str):
            normalized = value.strip().lower()
            if normalized not in VALID_COMPLAINT_STATUSES:
                allowed = ", ".join(sorted(VALID_COMPLAINT_STATUSES))
                raise ValueError(f"Invalid status '{value}'. Allowed statuses are: {allowed}.")
            return normalized
        raise ValueError("Status must be a string.")

    @field_validator("next_action", mode="before")
    @classmethod
    def normalize_next_action(cls, value: Optional[str]) -> Optional[str]:
        if value is None:
            return None
        if isinstance(value, str):
            trimmed = value.strip()
            return trimmed if trimmed else None
        return str(value).strip() or None


class ComplaintCreate(ComplaintBase):
    """Schema for filing/creating a new complaint record."""

    institution_id: int = Field(
        ...,
        gt=0,
        description="ID of the institution this complaint is filed against.",
        examples=[1],
    )


class ComplaintUpdate(BaseModel):
    """
    Schema for updating an existing complaint record.
    Primary key 'id' and 'institution_id' cannot be modified.
    """

    bureau: Optional[str] = Field(None, min_length=1, max_length=100)
    category: Optional[str] = Field(None, max_length=100)
    description: Optional[str] = Field(None, min_length=1)
    status: Optional[str] = None
    next_action: Optional[str] = None
    due_date: Optional[datetime] = None

    @field_validator("bureau", mode="before")
    @classmethod
    def validate_optional_bureau(cls, value: Optional[str]) -> Optional[str]:
        if value is None:
            return None
        if isinstance(value, str):
            trimmed = value.strip()
            if not trimmed:
                raise ValueError("Bureau name cannot be empty or whitespace only.")
            return trimmed
        raise ValueError("Bureau must be a string.")

    @field_validator("description", mode="before")
    @classmethod
    def validate_optional_description(cls, value: Optional[str]) -> Optional[str]:
        if value is None:
            return None
        if isinstance(value, str):
            trimmed = value.strip()
            if not trimmed:
                raise ValueError("Complaint description cannot be empty or whitespace only.")
            return trimmed
        raise ValueError("Description must be a string.")

    @field_validator("status", mode="before")
    @classmethod
    def validate_optional_status(cls, value: Optional[str]) -> Optional[str]:
        if value is None:
            return None
        if isinstance(value, str):
            normalized = value.strip().lower()
            if normalized not in VALID_COMPLAINT_STATUSES:
                allowed = ", ".join(sorted(VALID_COMPLAINT_STATUSES))
                raise ValueError(f"Invalid status '{value}'. Allowed statuses are: {allowed}.")
            return normalized
        raise ValueError("Status must be a string.")


class ComplaintResponse(ComplaintBase):
    """Public representation of a Complaint record."""

    id: int = Field(..., description="Unique database identifier.")
    institution_id: int = Field(..., description="ID of the associated institution.")
    institution_name: Optional[str] = Field(None, description="Name of the associated institution.")
    created_at: datetime = Field(..., description="Creation timestamp in UTC.")
    updated_at: datetime = Field(..., description="Last modification timestamp in UTC.")

    model_config = ConfigDict(from_attributes=True)


class ComplaintListResponse(BaseModel):
    """Paginated list of complaints."""

    items: List[ComplaintResponse] = Field(..., description="Page items.")
    total: int = Field(..., ge=0, description="Total number of matching complaints.")
    limit: int = Field(..., ge=1, description="Page limit applied.")
    offset: int = Field(..., ge=0, description="Page offset applied.")
