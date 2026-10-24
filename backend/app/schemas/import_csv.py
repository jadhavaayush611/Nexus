from typing import List
from pydantic import BaseModel, Field


class RowError(BaseModel):
    """Details of a rejected CSV row."""

    row: int = Field(..., description="Line number of the failed row (1-indexed).")
    error: str = Field(..., description="Validation failure explanation.")


class ImportSummaryResponse(BaseModel):
    """Outcome summary of a CSV complaints import operation."""

    total_rows: int = Field(..., ge=0, description="Total data rows read from the CSV file.")
    imported_rows: int = Field(..., ge=0, description="Count of successfully persisted complaints.")
    skipped_rows: int = Field(..., ge=0, description="Count of skipped or rejected invalid rows.")
    errors: List[RowError] = Field(default_factory=list, description="Row-by-row error details.")
