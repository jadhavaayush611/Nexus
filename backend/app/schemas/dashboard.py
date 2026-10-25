from typing import Dict
from pydantic import BaseModel, Field


class DashboardSummaryResponse(BaseModel):
    """
    Real-time database-derived aggregate operational statistics for the dashboard.
    """

    total_institutions: int = Field(
        ...,
        ge=0,
        description="Total registered institutions.",
        examples=[5],
    )
    total_complaints: int = Field(
        ...,
        ge=0,
        description="Total filed complaint records.",
        examples=[12],
    )
    status_counts: Dict[str, int] = Field(
        default_factory=dict,
        description="Complaint distribution grouped by lifecycle status.",
        examples=[{"open": 7, "under_investigation": 3, "resolved": 2}],
    )
    bureau_counts: Dict[str, int] = Field(
        default_factory=dict,
        description="Complaint distribution grouped by originating bureau/cell.",
        examples=[{"Anti-Ragging Cell": 4, "Student Welfare Cell": 5}],
    )
    overdue_complaints: int = Field(
        ...,
        ge=0,
        description="Active (non-terminal) complaints whose due date has passed in UTC.",
        examples=[2],
    )
