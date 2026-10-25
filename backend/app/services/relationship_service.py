from typing import Any, Dict, Optional, Tuple
from sqlalchemy.orm import Session
from app.models.relationship import Relationship


def normalize_relationship_pair(complaint_id_1: int, complaint_id_2: int) -> Tuple[int, int]:
    """
    Normalizes a complaint pair into canonical order (lower_id, higher_id).
    Rejects self-referential relationships.
    """
    if complaint_id_1 == complaint_id_2:
        raise ValueError("Self-referential relationships between the same complaint are not permitted.")

    return min(complaint_id_1, complaint_id_2), max(complaint_id_1, complaint_id_2)


def create_or_get_relationship(
    db: Session,
    complaint_id_1: int,
    complaint_id_2: int,
    score: Optional[float] = None,
    evidence: Optional[Dict[str, Any]] = None,
    state: str = "suggested",
    review_reason: Optional[str] = None,
) -> Tuple[Relationship, bool]:
    """
    Persists a canonical relationship link between two complaints.

    Normalizes the pair order (lower ID first) prior to insertion to prevent
    duplicate reverse pairs. If a relationship record already exists between
    the two complaints, returns the existing record and False.
    Otherwise creates, persists, and returns the new Relationship and True.
    """
    comp_a, comp_b = normalize_relationship_pair(complaint_id_1, complaint_id_2)

    existing = (
        db.query(Relationship)
        .filter(
            Relationship.complaint_a_id == comp_a,
            Relationship.complaint_b_id == comp_b,
        )
        .first()
    )
    if existing:
        return existing, False

    relationship = Relationship(
        complaint_a_id=comp_a,
        complaint_b_id=comp_b,
        score=score,
        evidence=evidence,
        state=state,
        review_reason=review_reason,
    )
    db.add(relationship)
    db.commit()
    db.refresh(relationship)
    return relationship, True
