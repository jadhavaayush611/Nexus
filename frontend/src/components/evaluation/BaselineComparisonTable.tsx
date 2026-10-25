import React from 'react';
import type { EvaluationSummary } from '../../types/entities.ts';
import './BaselineComparisonTable.css';

export interface BaselineComparisonTableProps {
  summary: EvaluationSummary;
}

export const BaselineComparisonTable: React.FC<BaselineComparisonTableProps> = ({ summary }) => {
  const baseline = summary.baseline_comparison;

  if (!baseline) {
    return (
      <div className="cw-baseline-wrapper cw-baseline-wrapper--empty">
        <h3 className="cw-baseline-title">Baseline Comparison</h3>
        <p className="cw-baseline-empty-text">
          No comparative baseline dataset attached to this evaluation summary payload.
        </p>
      </div>
    );
  }

  const pCurrent = summary.precision;
  const pBase = baseline.precision;
  const deltaP = pCurrent - pBase;

  const rCurrent = summary.recall;
  const rBase = baseline.recall;
  const deltaR = rCurrent - rBase;

  const fCurrent = summary.f1_score;
  const fBase = baseline.f1_score;
  const deltaF = fCurrent - fBase;

  const formatDelta = (val: number) => {
    const pct = (val * 100).toFixed(1);
    if (val > 0) return `+${pct}%`;
    return `${pct}%`;
  };

  return (
    <div className="cw-baseline-wrapper" role="region" aria-label="Baseline Comparison">
      <div className="cw-baseline-header">
        <div>
          <h3 className="cw-baseline-title">Comparative Performance vs Simple Baseline</h3>
          <p className="cw-baseline-subtitle">
            Evaluating the CaseWeave multi-signal matcher against a traditional exact-match / keyword
            retrieval baseline on the identical test set.
          </p>
        </div>
      </div>

      <div className="cw-baseline-table-container">
        <table className="cw-baseline-table">
          <thead>
            <tr>
              <th scope="col" className="cw-baseline-th">System Architecture</th>
              <th scope="col" className="cw-baseline-th">Precision</th>
              <th scope="col" className="cw-baseline-th">Recall</th>
              <th scope="col" className="cw-baseline-th">F1 Score</th>
              <th scope="col" className="cw-baseline-th">Operational Advantage</th>
            </tr>
          </thead>
          <tbody>
            {/* Row 1: Simple Baseline */}
            <tr className="cw-baseline-row cw-baseline-row--baseline">
              <td className="cw-baseline-td cw-baseline-td--name">
                <span className="cw-baseline-name">{baseline.baseline_name}</span>
                <span className="cw-baseline-sub">Exact Institute & Keyword Matches</span>
              </td>
              <td className="cw-baseline-td ref-mono">{(pBase * 100).toFixed(1)}%</td>
              <td className="cw-baseline-td ref-mono">{(rBase * 100).toFixed(1)}%</td>
              <td className="cw-baseline-td ref-mono">{(fBase * 100).toFixed(1)}%</td>
              <td className="cw-baseline-td cw-baseline-td--desc">
                High precision on identical strings, but misses typos, aliases, and synonymous phrasing.
              </td>
            </tr>

            {/* Row 2: CaseWeave Prototype */}
            <tr className="cw-baseline-row cw-baseline-row--caseweave">
              <td className="cw-baseline-td cw-baseline-td--name">
                <span className="cw-baseline-name cw-baseline-name--active">
                  CaseWeave Multi-Signal Pipeline
                </span>
                <span className="cw-baseline-sub">Permanent ID + Temporal + TF-IDF Cosine</span>
              </td>
              <td className="cw-baseline-td ref-mono cw-baseline-td--highlight">
                {(pCurrent * 100).toFixed(1)}%
                <span className="cw-baseline-delta cw-baseline-delta--pos">
                  ({formatDelta(deltaP)})
                </span>
              </td>
              <td className="cw-baseline-td ref-mono cw-baseline-td--highlight">
                {(rCurrent * 100).toFixed(1)}%
                <span className="cw-baseline-delta cw-baseline-delta--pos">
                  ({formatDelta(deltaR)})
                </span>
              </td>
              <td className="cw-baseline-td ref-mono cw-baseline-td--highlight">
                {(fCurrent * 100).toFixed(1)}%
                <span className="cw-baseline-delta cw-baseline-delta--pos">
                  ({formatDelta(deltaF)})
                </span>
              </td>
              <td className="cw-baseline-td cw-baseline-td--desc">
                Substantially higher recall across differing bureau wording and unresolved aliases.
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  );
};
