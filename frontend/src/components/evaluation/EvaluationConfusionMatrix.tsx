import React from 'react';
import type { EvaluationConfusionMatrix as ConfusionMatrixType } from '../../types/entities.ts';
import './EvaluationConfusionMatrix.css';

export interface EvaluationConfusionMatrixProps {
  confusionMatrix: ConfusionMatrixType;
}

export const EvaluationConfusionMatrix: React.FC<EvaluationConfusionMatrixProps> = ({
  confusionMatrix,
}) => {
  const { true_positives, false_positives, true_negatives, false_negatives } =
    confusionMatrix;

  const total = true_positives + false_positives + true_negatives + false_negatives;

  const calcPct = (count: number) => {
    if (total === 0) return '0%';
    return `${((count / total) * 100).toFixed(1)}%`;
  };

  return (
    <div className="cw-cm-wrapper" role="region" aria-label="Confusion Matrix Analysis">
      <div className="cw-cm-header">
        <div>
          <h3 className="cw-cm-title">Confusion Matrix</h3>
          <p className="cw-cm-subtitle">
            Ground truth vs algorithm predictions on the labelled synthetic test set.
          </p>
        </div>
        <span className="cw-cm-total-badge ref-mono">Total: {total} instances</span>
      </div>

      <div className="cw-cm-table-container">
        <table className="cw-cm-table">
          <thead>
            <tr>
              <th className="cw-cm-th cw-cm-th--corner" aria-label="Quadrant axis">
                <span className="cw-cm-axis-label">Actual ↓ / Predicted →</span>
              </th>
              <th className="cw-cm-th cw-cm-th--col-header">
                <span className="cw-cm-col-title">Predicted: Related</span>
                <span className="cw-cm-col-sub">(Suggested by CaseWeave)</span>
              </th>
              <th className="cw-cm-th cw-cm-th--col-header">
                <span className="cw-cm-col-title">Predicted: Unrelated</span>
                <span className="cw-cm-col-sub">(Rejected / Filtered out)</span>
              </th>
            </tr>
          </thead>
          <tbody>
            {/* Row 1: Actual Related */}
            <tr>
              <th className="cw-cm-th cw-cm-th--row-header" scope="row">
                <span className="cw-cm-row-title">Actual: Related</span>
                <span className="cw-cm-row-sub">(Labelled ground truth)</span>
              </th>
              <td className="cw-cm-td cw-cm-td--tp">
                <div className="cw-cm-cell">
                  <div className="cw-cm-cell__top">
                    <span className="cw-cm-cell__tag cw-cm-cell__tag--tp">True Positive (TP)</span>
                    <span className="cw-cm-cell__pct">{calcPct(true_positives)}</span>
                  </div>
                  <span className="cw-cm-cell__count ref-mono">{true_positives}</span>
                  <p className="cw-cm-cell__desc">
                    Correctly surfaced for human review. Cross-bureau evidence successfully connected.
                  </p>
                </div>
              </td>
              <td className="cw-cm-td cw-cm-td--fn">
                <div className="cw-cm-cell">
                  <div className="cw-cm-cell__top">
                    <span className="cw-cm-cell__tag cw-cm-cell__tag--fn">False Negative (FN)</span>
                    <span className="cw-cm-cell__pct">{calcPct(false_negatives)}</span>
                  </div>
                  <span className="cw-cm-cell__count ref-mono">{false_negatives}</span>
                  <p className="cw-cm-cell__desc">
                    Missed connections. Complaints were related, but fell below the review threshold.
                  </p>
                </div>
              </td>
            </tr>

            {/* Row 2: Actual Unrelated */}
            <tr>
              <th className="cw-cm-th cw-cm-th--row-header" scope="row">
                <span className="cw-cm-row-title">Actual: Unrelated</span>
                <span className="cw-cm-row-sub">(Labelled ground truth)</span>
              </th>
              <td className="cw-cm-td cw-cm-td--fp">
                <div className="cw-cm-cell">
                  <div className="cw-cm-cell__top">
                    <span className="cw-cm-cell__tag cw-cm-cell__tag--fp">False Positive (FP)</span>
                    <span className="cw-cm-cell__pct">{calcPct(false_positives)}</span>
                  </div>
                  <span className="cw-cm-cell__count ref-mono">{false_positives}</span>
                  <p className="cw-cm-cell__desc">
                    False alarms. Unrelated complaints incorrectly suggested (e.g. shared generic words).
                  </p>
                </div>
              </td>
              <td className="cw-cm-td cw-cm-td--tn">
                <div className="cw-cm-cell">
                  <div className="cw-cm-cell__top">
                    <span className="cw-cm-cell__tag cw-cm-cell__tag--tn">True Negative (TN)</span>
                    <span className="cw-cm-cell__pct">{calcPct(true_negatives)}</span>
                  </div>
                  <span className="cw-cm-cell__count ref-mono">{true_negatives}</span>
                  <p className="cw-cm-cell__desc">
                    Correctly rejected unrelated complaint pairs without cluttering officer queues.
                  </p>
                </div>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  );
};
