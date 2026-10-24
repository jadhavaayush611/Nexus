import io
from fastapi.testclient import TestClient
from sqlalchemy.orm import Session
from app.models.complaint import Complaint
from app.models.institution import Institution


def test_import_csv_valid_file(client: TestClient, db_session: Session):
    """Verify importing valid complaints from a well-formed CSV file."""
    inst = Institution(name="CSV Test Campus", normalized_id="CSV-CAMPUS-01")
    db_session.add(inst)
    db_session.commit()

    csv_content = (
        "institution_id,bureau,category,description,external_ref,status\n"
        f"{inst.id},Anti-Ragging Cell,Safety,First imported complaint description,EXT-101,open\n"
        f"{inst.id},Student Welfare Cell,Hostel,Second imported complaint description,EXT-102,under_investigation\n"
    )

    files = {"file": ("complaints.csv", io.BytesIO(csv_content.encode("utf-8")), "text/csv")}
    res = client.post("/api/import/csv", files=files)
    assert res.status_code == 200
    data = res.json()
    assert data["total_rows"] == 2
    assert data["imported_rows"] == 2
    assert data["skipped_rows"] == 0
    assert len(data["errors"]) == 0

    # Verify complaints exist in DB
    count = db_session.query(Complaint).filter(Complaint.institution_id == inst.id).count()
    assert count == 2


def test_import_csv_using_normalized_id(client: TestClient, db_session: Session):
    """Verify complaints can resolve institutions via 'normalized_id' header column."""
    inst = Institution(name="Normalized Campus", normalized_id="NORM-CAMP-99")
    db_session.add(inst)
    db_session.commit()

    csv_content = (
        "normalized_id,bureau,description\n"
        "NORM-CAMP-99,Examination Bureau,Grade card mismatch on portal\n"
    )
    files = {"file": ("data.csv", io.BytesIO(csv_content.encode("utf-8")), "text/csv")}
    res = client.post("/api/import/csv", files=files)
    assert res.status_code == 200
    assert res.json()["imported_rows"] == 1


def test_import_csv_missing_required_headers(client: TestClient):
    """Verify rejection when required header columns are missing."""
    csv_missing_bureau = "institution_id,description\n1,Some description\n"
    files = {"file": ("test.csv", io.BytesIO(csv_missing_bureau.encode("utf-8")), "text/csv")}
    res = client.post("/api/import/csv", files=files)
    assert res.status_code == 400
    assert "missing required columns" in res.json()["detail"].lower()


def test_import_csv_invalid_extension(client: TestClient):
    """Verify rejection when uploaded file does not have .csv extension."""
    files = {"file": ("complaints.txt", io.BytesIO(b"data"), "text/plain")}
    res = client.post("/api/import/csv", files=files)
    assert res.status_code == 400
    assert "must have a .csv extension" in res.json()["detail"].lower()


def test_import_csv_row_level_validation_errors(client: TestClient, db_session: Session):
    """
    Verify that an invalid row (e.g. unknown institution, empty description) is reported
    with its row number and does not cancel/corrupt valid rows in the batch.
    """
    inst = Institution(name="Partial Import Campus", normalized_id="PART-01")
    db_session.add(inst)
    db_session.commit()

    csv_mixed = (
        "institution_id,bureau,description,status\n"
        f"{inst.id},Cell A,Valid complaint description,open\n"
        "999999,Cell B,Unknown institution complaint,open\n"          # Row 3: Unknown inst
        f"{inst.id},Cell C,  ,open\n"                                    # Row 4: Empty description
        f"{inst.id},Cell D,Invalid status description,not_a_status\n"   # Row 5: Bad status
        f"{inst.id},Cell E,Another valid complaint,resolved\n"          # Row 6: Valid
    )

    files = {"file": ("mixed.csv", io.BytesIO(csv_mixed.encode("utf-8")), "text/csv")}
    res = client.post("/api/import/csv", files=files)
    assert res.status_code == 200
    data = res.json()
    assert data["total_rows"] == 5
    assert data["imported_rows"] == 2
    assert data["skipped_rows"] == 3
    assert len(data["errors"]) == 3

    # Check error line numbers
    error_rows = [err["row"] for err in data["errors"]]
    assert 3 in error_rows
    assert 4 in error_rows
    assert 5 in error_rows


def test_import_csv_file_size_exceeded(client: TestClient):
    """Verify that uploading a CSV exceeding 2 MB is rejected with HTTP 400."""
    oversized_bytes = b"a" * (2 * 1024 * 1024 + 10)
    files = {"file": ("large.csv", io.BytesIO(oversized_bytes), "text/csv")}
    res = client.post("/api/import/csv", files=files)
    assert res.status_code == 400
    assert "exceeds maximum allowed size" in res.json()["detail"].lower()


def test_import_csv_row_limit_enforced(client: TestClient, db_session: Session):
    """Verify that CSV files with more than 500 data rows are bounded and flagged."""
    inst = Institution(name="High Volume Campus", normalized_id="HVC-01")
    db_session.add(inst)
    db_session.commit()

    lines = ["institution_id,bureau,description"]
    # Generate 505 data rows
    for i in range(1, 506):
        lines.append(f"{inst.id},Bureau A,Complaint test description {i}")
    csv_data = "\n".join(lines)

    files = {"file": ("bulk.csv", io.BytesIO(csv_data.encode("utf-8")), "text/csv")}
    res = client.post("/api/import/csv", files=files)
    assert res.status_code == 200
    data = res.json()
    assert data["imported_rows"] == 500
    assert data["skipped_rows"] == 1
    assert any("exceeded maximum limit of 500 rows" in err["error"].lower() for err in data["errors"])
