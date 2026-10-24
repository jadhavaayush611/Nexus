from datetime import datetime, timezone
from typing import Any, Dict, Optional
from sqlalchemy import (
    CheckConstraint,
    DateTime,
    Float,
    ForeignKey,
    Integer,
    JSON,
    String,
    Text,
    UniqueConstraint,
)
from sqlalchemy.orm import Mapped, mapped_column, relationship
from app.db.base import Base


class Relationship(Base):
    """
    Represents a suggested or reviewed relationship/link between two complaint records.

    This record establishes a similarity or association link; it NEVER merges
    or modifies the underlying complaint records.

    State lifecycle:
      - 'suggested': Automated/heuristic similarity candidate awaiting manual review.
      - 'reviewed': Actively being evaluated by a bureau officer.
      - 'confirmed': Manually verified as a genuine cross-cell related incident.
      - 'rejected': Determined to be unrelated or a false positive.

    Evidence structure:
      Structured JSON payload containing algorithmic or heuristic match justifications,
      e.g. {"method": "tfidf_cosine", "matched_terms": ["ragging", "hostel"], "confidence": 0.85}.
    """

    __tablename__ = "relationships"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    complaint_a_id: Mapped[int] = mapped_column(
        Integer,
        ForeignKey("complaints.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    complaint_b_id: Mapped[int] = mapped_column(
        Integer,
        ForeignKey("complaints.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    score: Mapped[Optional[float]] = mapped_column(Float, nullable=True)
    evidence: Mapped[Optional[Dict[str, Any]]] = mapped_column(JSON, nullable=True)
    state: Mapped[str] = mapped_column(
        String(50),
        nullable=False,
        default="suggested",
        index=True,
    )
    review_reason: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        default=lambda: datetime.now(timezone.utc),
        nullable=False,
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        default=lambda: datetime.now(timezone.utc),
        onupdate=lambda: datetime.now(timezone.utc),
        nullable=False,
    )

    # Relationships to Complaint records
    complaint_a: Mapped["Complaint"] = relationship(  # type: ignore # noqa: F821
        "Complaint",
        foreign_keys=[complaint_a_id],
    )
    complaint_b: Mapped["Complaint"] = relationship(  # type: ignore # noqa: F821
        "Complaint",
        foreign_keys=[complaint_b_id],
    )

    __table_args__ = (
        # Ensure canonical ordering: complaint_a_id must be strictly less than complaint_b_id.
        # This constraint prevents self-referential relationships (a == b) AND enforces
        # canonical ordering, rendering reverse pairs (b, a) impossible at the database level.
        CheckConstraint(
            "complaint_a_id < complaint_b_id",
            name="check_complaint_canonical_order",
        ),
        # Prevent duplicate link pairs between the same complaints
        UniqueConstraint(
            "complaint_a_id",
            "complaint_b_id",
            name="uq_complaint_pair",
        ),
    )

    def __repr__(self) -> str:
        return (
            f"<Relationship(id={self.id}, complaint_a={self.complaint_a_id}, "
            f"complaint_b={self.complaint_b_id}, state='{self.state}', score={self.score})>"
        )
