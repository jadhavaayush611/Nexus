import pytest
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session
from app.models.complaint import Complaint
from app.models.institution import Institution
from app.models.relationship import Relationship
from app.services.relationship_service import (
    create_or_get_relationship,
    normalize_relationship_pair,
)


def _setup_complaints(db_session: Session) -> tuple[Complaint, Complaint]:
    inst = Institution(name="Link Test Institute", normalized_id="LTI-01")
    db_session.add(inst)
    db_session.commit()

    c1 = Complaint(institution_id=inst.id, bureau="Cell 1", description="Incident A", status="open")
    c2 = Complaint(institution_id=inst.id, bureau="Cell 2", description="Incident B", status="open")
    db_session.add_all([c1, c2])
    db_session.commit()
    return c1, c2


def test_self_pairs_rejected_at_service_and_db_level(db_session: Session):
    """Verify self-pairs (complaint_a_id == complaint_b_id) are rejected."""
    c1, _ = _setup_complaints(db_session)

    # 1. Service layer rejection
    with pytest.raises(ValueError, match="Self-referential"):
        normalize_relationship_pair(c1.id, c1.id)

    with pytest.raises(ValueError, match="Self-referential"):
        create_or_get_relationship(db_session, c1.id, c1.id)

    # 2. Database check constraint rejection
    invalid_rel = Relationship(complaint_a_id=c1.id, complaint_b_id=c1.id, state="suggested")
    db_session.add(invalid_rel)
    with pytest.raises(IntegrityError):
        db_session.commit()
    db_session.rollback()


def test_reverse_order_pairs_normalized_and_db_constrained(db_session: Session):
    """
    Verify that:
    1. Direct insertion of reverse order (c2, c1 where c2 > c1) violates canonical order check constraint.
    2. Service layer normalizes (c2, c1) to (c1, c2) and returns the identical relationship record.
    """
    c1, c2 = _setup_complaints(db_session)
    assert c1.id < c2.id

    # Direct database insertion with reverse order violates check_complaint_canonical_order
    reverse_direct = Relationship(complaint_a_id=c2.id, complaint_b_id=c1.id, state="suggested")
    db_session.add(reverse_direct)
    with pytest.raises(IntegrityError):
        db_session.commit()
    db_session.rollback()

    # Persistence through service layer: first call with (c1, c2)
    rel1, created1 = create_or_get_relationship(
        db_session, c1.id, c2.id, score=0.85, state="suggested"
    )
    assert created1 is True
    assert rel1.complaint_a_id == c1.id
    assert rel1.complaint_b_id == c2.id

    # Second call with reverse order (c2, c1) -> normalizes and returns existing
    rel2, created2 = create_or_get_relationship(
        db_session, c2.id, c1.id, score=0.85, state="suggested"
    )
    assert created2 is False
    assert rel2.id == rel1.id
    assert rel2.complaint_a_id == c1.id
    assert rel2.complaint_b_id == c2.id

    # Verify only 1 relationship record exists in the table
    count = db_session.query(Relationship).count()
    assert count == 1


def test_relationship_creation_preserves_complaint_independence(db_session: Session):
    """Verify establishing a relationship does not alter or merge the linked complaints."""
    c1, c2 = _setup_complaints(db_session)

    rel, _ = create_or_get_relationship(
        db_session,
        c1.id,
        c2.id,
        score=0.91,
        evidence={"keywords": ["harassment", "hostel"]},
        state="suggested",
    )

    # Both complaints exist unchanged
    refreshed_c1 = db_session.get(Complaint, c1.id)
    refreshed_c2 = db_session.get(Complaint, c2.id)
    assert refreshed_c1 is not None
    assert refreshed_c2 is not None
    assert refreshed_c1.description == "Incident A"
    assert refreshed_c2.description == "Incident B"
    assert refreshed_c1.id != refreshed_c2.id

    # Deleting relationship does not delete complaints
    db_session.delete(rel)
    db_session.commit()

    assert db_session.get(Complaint, c1.id) is not None
    assert db_session.get(Complaint, c2.id) is not None
