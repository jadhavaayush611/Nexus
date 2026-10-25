from fastapi.testclient import TestClient


def test_create_and_get_institution(client: TestClient):
    """Verify creating a new institution and retrieving it by ID."""
    payload = {
        "name": "St. Jude Institute of Technology",
        "normalized_id": "SJIT-001",
        "aliases": ["SJIT", "St Jude Tech"],
    }
    response = client.post("/api/institutions", json=payload)
    assert response.status_code == 201
    data = response.json()
    assert data["id"] is not None
    assert data["name"] == "St. Jude Institute of Technology"
    assert data["normalized_id"] == "SJIT-001"
    assert data["aliases"] == ["SJIT", "St Jude Tech"]
    assert data["complaint_count"] == 0

    inst_id = data["id"]
    get_res = client.get(f"/api/institutions/{inst_id}")
    assert get_res.status_code == 200
    assert get_res.json()["name"] == "St. Jude Institute of Technology"


def test_create_institution_duplicate_normalized_id_returns_409(client: TestClient):
    """Verify that duplicate non-null normalized_id returns HTTP 409 Conflict."""
    payload = {"name": "First University", "normalized_id": "UNI-DUP-01"}
    r1 = client.post("/api/institutions", json=payload)
    assert r1.status_code == 201

    payload_dup = {"name": "Second University", "normalized_id": "UNI-DUP-01"}
    r2 = client.post("/api/institutions", json=payload_dup)
    assert r2.status_code == 409
    assert "already exists" in r2.json()["detail"]


def test_create_institution_multiple_null_normalized_ids_permitted(client: TestClient):
    """Verify that multiple institutions can have None/null normalized_id."""
    r1 = client.post("/api/institutions", json={"name": "Academy Without Code 1", "normalized_id": None})
    r2 = client.post("/api/institutions", json={"name": "Academy Without Code 2", "normalized_id": None})
    assert r1.status_code == 201
    assert r2.status_code == 201


def test_create_institution_rejects_empty_name(client: TestClient):
    """Verify that empty or whitespace-only name returns 422 Unprocessable Entity."""
    r = client.post("/api/institutions", json={"name": "   ", "normalized_id": "TEST"})
    assert r.status_code == 422


def test_get_institution_not_found_returns_404(client: TestClient):
    """Verify that querying a nonexistent institution returns HTTP 404."""
    response = client.get("/api/institutions/999999")
    assert response.status_code == 404
    assert "not found" in response.json()["detail"].lower()


def test_list_and_paginate_institutions(client: TestClient):
    """Verify listing institutions with pagination."""
    for i in range(5):
        client.post("/api/institutions", json={"name": f"Polytechnic Campus {chr(65+i)}"})

    res = client.get("/api/institutions?limit=2&offset=0")
    assert res.status_code == 200
    data = res.json()
    assert len(data["items"]) == 2
    assert data["total"] >= 5
    assert data["limit"] == 2
    assert data["offset"] == 0

    res_offset = client.get("/api/institutions?limit=2&offset=2")
    assert res_offset.status_code == 200
    assert len(res_offset.json()["items"]) == 2


def test_search_institutions_by_name(client: TestClient):
    """Verify filtering institutions with case-insensitive name search."""
    client.post("/api/institutions", json={"name": "Hogwarts School of Magic"})
    client.post("/api/institutions", json={"name": "Brakebills University"})

    res = client.get("/api/institutions?search=hogwarts")
    assert res.status_code == 200
    items = res.json()["items"]
    assert len(items) == 1
    assert items[0]["name"] == "Hogwarts School of Magic"
