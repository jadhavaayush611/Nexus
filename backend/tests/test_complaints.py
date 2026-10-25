from datetime import datetime, timezone
from fastapi.testclient import TestClient


def _create_test_institution(client: TestClient, name: str = "Test Academy") -> int:
    res = client.post("/api/institutions", json={"name": name})
    assert res.status_code == 201
    return res.json()["id"]


def test_create_and_get_complaint(client: TestClient):
    """Verify filing a valid complaint and retrieving it by ID."""
    inst_id = _create_test_institution(client, "Complaint Test Institute")
    payload = {
        "institution_id": inst_id,
        "bureau": "Disciplinary Cell",
        "description": "Fictional noise disturbance in hostel block A.",
        "category": "Hostel Life",
        "external_ref": "CASE-1001",
        "status": "open",
        "next_action": "Issue notice to floor warden",
    }
    create_res = client.post("/api/complaints", json=payload)
    assert create_res.status_code == 201
    data = create_res.json()
    assert data["id"] is not None
    assert data["institution_id"] == inst_id
    assert data["institution_name"] == "Complaint Test Institute"
    assert data["bureau"] == "Disciplinary Cell"
    assert data["status"] == "open"
    assert data["created_at"] is not None
    assert data["updated_at"] is not None

    complaint_id = data["id"]
    get_res = client.get(f"/api/complaints/{complaint_id}")
    assert get_res.status_code == 200
    assert get_res.json()["description"] == "Fictional noise disturbance in hostel block A."


def test_create_complaint_nonexistent_institution_returns_404(client: TestClient):
    """Verify that filing a complaint against an unverified institution returns 404."""
    payload = {
        "institution_id": 999999,
        "bureau": "Anti-Ragging Cell",
        "description": "Fictional incident description.",
        "status": "open",
    }
    res = client.post("/api/complaints", json=payload)
    assert res.status_code == 404
    assert "not found" in res.json()["detail"].lower()


def test_create_complaint_validation_errors(client: TestClient):
    """Verify rejection of empty fields and unsupported status values."""
    inst_id = _create_test_institution(client)

    # Empty bureau
    r1 = client.post(
        "/api/complaints",
        json={"institution_id": inst_id, "bureau": "   ", "description": "Valid desc"},
    )
    assert r1.status_code == 422

    # Empty description
    r2 = client.post(
        "/api/complaints",
        json={"institution_id": inst_id, "bureau": "Valid Bureau", "description": "   "},
    )
    assert r2.status_code == 422

    # Invalid status
    r3 = client.post(
        "/api/complaints",
        json={
            "institution_id": inst_id,
            "bureau": "Valid Bureau",
            "description": "Valid desc",
            "status": "non_existent_status",
        },
    )
    assert r3.status_code == 422


def test_repeated_external_ref_is_allowed(client: TestClient):
    """Verify that external_ref is non-unique and can be reused across complaints."""
    inst_id = _create_test_institution(client)
    p1 = {
        "institution_id": inst_id,
        "bureau": "Bureau Alpha",
        "description": "Complaint A",
        "external_ref": "SHARED-REF-2026",
    }
    p2 = {
        "institution_id": inst_id,
        "bureau": "Bureau Beta",
        "description": "Complaint B",
        "external_ref": "SHARED-REF-2026",
    }
    r1 = client.post("/api/complaints", json=p1)
    r2 = client.post("/api/complaints", json=p2)
    assert r1.status_code == 201
    assert r2.status_code == 201
    assert r1.json()["id"] != r2.json()["id"]


def test_get_complaint_not_found(client: TestClient):
    """Verify 404 response when querying nonexistent complaint."""
    res = client.get("/api/complaints/999999")
    assert res.status_code == 404


def test_list_complaints_with_filters_and_pagination(client: TestClient):
    """Verify multi-criteria filtering, stable ordering, and pagination."""
    inst1 = _create_test_institution(client, "Filter Test Inst 1")
    inst2 = _create_test_institution(client, "Filter Test Inst 2")

    # Seed 3 distinct complaints
    client.post(
        "/api/complaints",
        json={
            "institution_id": inst1,
            "bureau": "Cell A",
            "category": "Safety",
            "description": "Incident 1",
            "status": "open",
        },
    )
    client.post(
        "/api/complaints",
        json={
            "institution_id": inst1,
            "bureau": "Cell B",
            "category": "Hygiene",
            "description": "Incident 2",
            "status": "under_investigation",
        },
    )
    client.post(
        "/api/complaints",
        json={
            "institution_id": inst2,
            "bureau": "Cell A",
            "category": "Safety",
            "description": "Incident 3",
            "status": "open",
        },
    )

    # Filter by institution_id
    res_inst = client.get(f"/api/complaints?institution_id={inst1}")
    assert res_inst.status_code == 200
    assert len(res_inst.json()["items"]) == 2

    # Filter by bureau
    res_bureau = client.get("/api/complaints?bureau=Cell B")
    assert res_bureau.status_code == 200
    assert len(res_bureau.json()["items"]) == 1

    # Filter by status
    res_status = client.get("/api/complaints?status=under_investigation")
    assert res_status.status_code == 200
    assert len(res_status.json()["items"]) == 1

    # Filter by category
    res_cat = client.get("/api/complaints?category=Safety")
    assert res_cat.status_code == 200
    assert len(res_cat.json()["items"]) == 2

    # Combine filters: inst1 + Cell A + Safety
    res_combined = client.get(
        f"/api/complaints?institution_id={inst1}&bureau=Cell A&category=Safety"
    )
    assert res_combined.status_code == 200
    assert len(res_combined.json()["items"]) == 1
    assert res_combined.json()["items"][0]["description"] == "Incident 1"

    # Pagination
    res_paged = client.get("/api/complaints?limit=1&offset=0")
    assert res_paged.status_code == 200
    assert len(res_paged.json()["items"]) == 1
    assert res_paged.json()["total"] >= 3


def test_update_complaint_patch(client: TestClient):
    """Verify updating mutable fields of a complaint via PATCH."""
    inst_id = _create_test_institution(client)
    create_res = client.post(
        "/api/complaints",
        json={
            "institution_id": inst_id,
            "bureau": "Original Bureau",
            "description": "Original Description",
            "status": "open",
        },
    )
    complaint_id = create_res.json()["id"]

    patch_payload = {
        "bureau": "Updated Bureau",
        "status": "resolved",
        "next_action": "Marked resolved after hearing",
    }
    patch_res = client.patch(f"/api/complaints/{complaint_id}", json=patch_payload)
    assert patch_res.status_code == 200
    updated_data = patch_res.json()
    assert updated_data["bureau"] == "Updated Bureau"
    assert updated_data["status"] == "resolved"
    assert updated_data["next_action"] == "Marked resolved after hearing"
    assert updated_data["institution_id"] == inst_id  # unmodifiable


def test_update_complaint_not_found(client: TestClient):
    """Verify 404 response when patching nonexistent complaint."""
    res = client.patch("/api/complaints/999999", json={"status": "resolved"})
    assert res.status_code == 404
