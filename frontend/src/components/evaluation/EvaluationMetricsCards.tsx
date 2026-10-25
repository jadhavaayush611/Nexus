import React from 'react';
import type { EvaluationSummary } from '../../types/entities.ts';
import './EvaluationMetricsCards.css';

export interface EvaluationMetricsCardsProps {
  summary: EvaluationSummary;
}

function formatRate(value: number | undefined | null): { text: string; isAvailable: boolean } {
  if (value === undefined || value === null || isNaN(value)) {
    return { text: 'Unavailable', isAvailable: false };
  }
  return { text: `${(value * 100).toFixed(1)}%`, isAvailable: true };
}

export const EvaluationMetricsCards: React.FC<EvaluationMetricsCardsProps> = ({ summary }) => {
  const precision = formatRate(summary.precision);
  const recall = formatRate(summary.recall);
  const f1 = formatRate(summary.f1_score);

  const cm = summary.confusion_matrix;
  const tp = cm?.true_positives ?? 0;
  const fp = cm?.false_positives ?? 0;
  const fn = cm?.false_negatives ?? 0;
  const total = summary.total_labelled_pairs ?? (tp + fp + fn + (cm?.true_negatives ?? 0));

  return (
    <div className="cw-eval-metrics-grid" role="region" aria-label="Evaluation metric summary">
      {/* Precision Card */}
      <div className="cw-eval-metric-card">
        <div className="cw-eval-metric-card__header">
          <span className="cw-eval-metric-card__title">Precision</span>
          <span className="cw-eval-metric-card__badge">Quality of Suggestions</span>
        </div>
        <div className="cw-eval-metric-card__value-row">
          <span
            className={`cw-eval-metric-card__val ${
              !precision.isAvailable ? 'cw-eval-metric-card__val--unavailable' : ''
            }`}
          >
            {precision.text}
          </span>
          {cm && tp + fp > 0 && (
            <span className="cw-eval-metric-card__count ref-mono">
              {tp} / {tp + fp} pairs
            </span>
          )}
        </div>
        <p className="cw-eval-metric-card__formula">
          Formula: <code>TP / (TP + FP)</code>
        </p>
        <p className="cw-eval-metric-card__def">
          Of all candidate links suggested by CaseWeave, how many were verified as genuinely related
          in the labelled benchmark?
        </p>
      </div>

      {/* Recall Card */}
      <div className="cw-eval-metric-card">
        <div className="cw-eval-metric-card__header">
          <span className="cw-eval-metric-card__title">Recall</span>
          <span className="cw-eval-metric-card__badge">Coverage of Overlaps</span>
        </div>
        <div className="cw-eval-metric-card__value-row">
          <span
            className={`cw-eval-metric-card__val ${
              !recall.isAvailable ? 'cw-eval-metric-card__val--unavailable' : ''
            }`}
          >
            {recall.text}
          </span>
          {cm && tp + fn > 0 && (
            <span className="cw-eval-metric-card__count ref-mono">
              {tp} / {tp + fn} pairs
            </span>
          )}
        </div>
        <p className="cw-eval-metric-card__formula">
          Formula: <code>TP / (TP + FN)</code>
        </p>
        <p className="cw-eval-metric-card__def">
          Of all known related pairs in the labelled ground truth, what proportion was successfully
          retrieved and presented for human review?
        </p>
      </div>

      {/* F1 Score Card */}
      <div className="cw-eval-metric-card">
        <div className="cw-eval-metric-card__header">
          <span className="cw-eval-metric-card__title">F1 Score</span>
          <span className="cw-eval-metric-card__badge">Harmonic Mean</span>
        </div>
        <div className="cw-eval-metric-card__value-row">
          <span
            className={`cw-eval-metric-card__val ${
              !f1.isAvailable ? 'cw-eval-metric-card__val--unavailable' : ''
            }`}
          >
            {f1.text}
          </span>
          <span className="cw-eval-metric-card__count ref-mono">
            {summary.dataset_name || 'Synthetic Testset'}
          </span>
        </div>
        <p className="cw-eval-metric-card__formula">
          Formula: <code>2 × (P × R) / (P + R)</code>
        </p>
        <p className="cw-eval-metric-card__def">
          Balanced benchmark score that penalizes both spurious false alarms (low precision) and
          missed cross-bureau links (low recall).
        </p>
      </div>

      {/* Total Sample Card */}
      <div className="cw-eval-metric-card cw-eval-metric-card--sample">
        <div className="cw-eval-metric-card__header">
          <span className="cw-eval-metric-card__title">Benchmark Sample Size</span>
          <span className="cw-eval-metric-card__badge">Labelled Pairs</span>
        </div>
        <div className="cw-eval-metric-card__value-row">
          <span className="cw-eval-metric-card__val ref-mono">{total}</span>
          <span className="cw-eval-metric-card__count">evaluated candidate pairs</span>
        </div>
        <p className="cw-eval-metric-card__formula">
          Ground Truth: <code>Labelled Synthetic Pairs</code>
        </p>
        <p className="cw-eval-metric-card__def">
          All metrics are derived from verifiable test instances. Rates are always displayed with
          exact sample counts to prevent misleading claims.
        </p>
      </div>
    </div>
  );
};
