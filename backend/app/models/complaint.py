from datetime import datetime, timezone
from typing import Optional
from sqlalchemy import DateTime, ForeignKey, Integer, String, Text
from sqlalchemy.orm import Mapped, mapped_column, relationship
from app.db.base import Base


class Complaint(Base):
    """
    Complaint entity representing an incident or inquiry reported to a bureau or cell.

    external_ref is deliberately non-unique because different bureaus or cells
    may generate overlapping identifier schemes.
    """

    __tablename__ = "complaints"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    external_ref: Mapped[Optional[str]] = mapped_column(
        String(100), nullable=True, index=True
    )
    institution_id: Mapped[int] = mapped_column(
        Integer,
        ForeignKey("institutions.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    bureau: Mapped[str] = mapped_column(String(100), nullable=False, index=True)
    category: Mapped[Optional[str]] = mapped_column(
        String(100), nullable=True, index=True
    )
    description: Mapped[str] = mapped_column(Text, nullable=False)
    status: Mapped[str] = mapped_column(
        String(50), nullable=False, default="open", index=True
    )
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
    next_action: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    due_date: Mapped[Optional[datetime]] = mapped_column(
        DateTime(timezone=True), nullable=True
    )

    # Relationships
    institution: Mapped["Institution"] = relationship(  # type: ignore # noqa: F821
        "Institution",
        back_populates="complaints",
    )

    def __repr__(self) -> str:
        return (
            f"<Complaint(id={self.id}, bureau='{self.bureau}', "
            f"institution_id={self.institution_id}, status='{self.status}')>"
        )
