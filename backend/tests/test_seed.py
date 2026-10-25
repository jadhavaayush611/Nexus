from sqlalchemy.orm import Session
from app.db.seed import seed_demo_data
from app.models.complaint import Complaint
from app.models.institution import Institution


def test_seed_demo_data_creation_and_idempotency(db_session: Session):
    """Verify that seed_demo_data populates records and is strictly idempotent."""
    # 1. Initial run creates records
    res1 = seed_demo_data(session=db_session)
    assert res1["institutions_created"] == 5
    assert res1["complaints_created"] == 10
    assert res1["skipped_records"] == 0

    assert db_session.query(Institution).count() == 5
    assert db_session.query(Complaint).count() == 10

    # 2. Repeated run skips existing records without duplicating
    res2 = seed_demo_data(session=db_session)
    assert res2["institutions_created"] == 0
    assert res2["complaints_created"] == 0
    assert res2["skipped_records"] == 15

    assert db_session.query(Institution).count() == 5
    assert db_session.query(Complaint).count() == 10


def test_seed_preserves_unrelated_user_records(db_session: Session):
    """Verify that seeding never deletes or alters pre-existing user records."""
    user_inst = Institution(
        name="Independent User Academy",
        normalized_id="USER-IND-01",
    )
    db_session.add(user_inst)
    db_session.commit()

    user_comp = Complaint(
        institution_id=user_inst.id,
        bureau="User Grievance Desk",
        description="User pre-existing complaint.",
        external_ref="USER-REF-999",
        status="open",
    )
    db_session.add(user_comp)
    db_session.commit()

    # Run seed
    seed_demo_data(session=db_session)

    # Verify user record is untouched
    refreshed_inst = db_session.get(Institution, user_inst.id)
    refreshed_comp = db_session.get(Complaint, user_comp.id)
    assert refreshed_inst is not None
    assert refreshed_inst.name == "Independent User Academy"
    assert refreshed_comp is not None
    assert refreshed_comp.description == "User pre-existing complaint."
