from fastapi.testclient import TestClient
from app.services.evaluation_service import evaluate_matching_pipeline


def test_api_evaluation_summary(client: TestClient):
    """Verify GET /api/evaluation/summary returns deterministic synthetic metrics."""
    res = client.get("/api/evaluation/summary?threshold=0.45")
    assert res.status_code == 200
    data = res.json()

    assert data["synthetic_evaluation"] is True
    assert data["positive_pairs"] == 3
    assert data["negative_pairs"] == 3
    assert data["threshold"] == 0.45

    # Check metric bounds
    assert 0.0 <= data["precision"] <= 1.0
    assert 0.0 <= data["recall"] <= 1.0
    assert 0.0 <= data["f1_score"] <= 1.0

    cm = data["confusion_matrix"]
    assert cm["true_positives"] + cm["false_negatives"] == 3
    assert cm["true_negatives"] + cm["false_positives"] == 3

    assert "disclaimer" in data
    assert "prototype" in data["disclaimer"].lower()


def test_evaluation_repeatability_and_determinism():
    """Verify that repeated evaluation calls yield strictly identical figures."""
    eval1 = evaluate_matching_pipeline(threshold=0.50)
    eval2 = evaluate_matching_pipeline(threshold=0.50)

    assert eval1.precision == eval2.precision
    assert eval1.recall == eval2.recall
    assert eval1.f1_score == eval2.f1_score
    assert eval1.confusion_matrix.true_positives == eval2.confusion_matrix.true_positives
