from fastapi.testclient import TestClient
from app.services.evaluation_service import evaluate_matching_pipeline, get_labelled_synthetic_dataset


def test_api_evaluation_summary(client: TestClient):
    """Verify GET /api/evaluation/summary returns deterministic synthetic metrics matching both frontend and backend contracts."""
    res = client.get("/api/evaluation/summary?threshold=0.45")
    assert res.status_code == 200
    data = res.json()

    # Core identification and counts
    assert data["synthetic_evaluation"] is True
    assert data["dataset_name"] == "Synthetic AICTE Cross-Bureau Benchmark v1.0"
    assert data["total_labelled_pairs"] == 22
    assert data["positive_pairs"] == 10
    assert data["negative_pairs"] == 12
    assert data["threshold"] == 0.45

    # Check metric bounds
    assert 0.0 <= data["precision"] <= 1.0
    assert 0.0 <= data["recall"] <= 1.0
    assert 0.0 <= data["f1_score"] <= 1.0

    # Check confusion matrix totals
    cm = data["confusion_matrix"]
    assert cm["true_positives"] + cm["false_negatives"] == 10
    assert cm["true_negatives"] + cm["false_positives"] == 12

    # Verify baseline comparison is attached
    assert "baseline_comparison" in data
    baseline = data["baseline_comparison"]
    assert baseline["baseline_name"] == "Simple Keyword Jaccard Baseline"
    assert 0.0 <= baseline["precision"] <= 1.0
    assert 0.0 <= baseline["recall"] <= 1.0
    assert 0.0 <= baseline["f1_score"] <= 1.0
    # Multi-signal matcher recall should outperform simple baseline
    assert data["recall"] >= baseline["recall"]

    # Verify error inspection diagnostic samples
    assert "error_inspection_samples" in data
    samples = data["error_inspection_samples"]
    assert len(samples) == 22
    for s in samples:
        assert "pair_id" in s
        assert "complaint_a_ref" in s
        assert "complaint_b_ref" in s
        assert "institution_name" in s
        assert s["classification"] in {"TP", "FP", "TN", "FN"}
        assert s["true_label"] in {"related", "unrelated"}
        assert s["predicted_state"] in {"suggested", "rejected"}
        assert "reason" in s

    # Verify methodology notes
    assert "methodology_notes" in data
    assert len(data["methodology_notes"]) >= 5

    # Disclaimer
    assert "disclaimer" in data
    assert "prototype" in data["disclaimer"].lower()


def test_evaluation_repeatability_and_determinism():
    """Verify that repeated evaluation calls yield strictly identical figures."""
    eval1 = evaluate_matching_pipeline(threshold=0.45)
    eval2 = evaluate_matching_pipeline(threshold=0.45)

    assert eval1.precision == eval2.precision
    assert eval1.recall == eval2.recall
    assert eval1.f1_score == eval2.f1_score
    assert eval1.confusion_matrix.true_positives == eval2.confusion_matrix.true_positives
    assert eval1.confusion_matrix.true_negatives == eval2.confusion_matrix.true_negatives
    assert len(eval1.error_inspection_samples) == len(eval2.error_inspection_samples)


def test_labelled_dataset_integrity():
    """Verify that every test pair in the benchmark has distinct complaints and valid properties."""
    dataset = get_labelled_synthetic_dataset()
    assert len(dataset) == 22

    seen_ids = set()
    for pair in dataset:
        assert pair.pair_id not in seen_ids
        seen_ids.add(pair.pair_id)

        assert pair.label in (0, 1)
        assert pair.c1 is not None and pair.c2 is not None
        assert pair.c1.id != pair.c2.id
        assert pair.c1.description and pair.c2.description
        assert len(pair.institution_name) > 0
        assert len(pair.diagnostic_rationale) > 0
