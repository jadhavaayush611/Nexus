import React, { useState, useMemo } from 'react';
import type { EvaluationSamplePair } from '../../types/entities.ts';
import { StatusBadge } from '../common/StatusBadge.tsx';
import './ErrorInspectionList.css';

export interface ErrorInspectionListProps {
  samples: EvaluationSamplePair[];
}

export const ErrorInspectionList: React.FC<ErrorInspectionListProps> = ({ samples }) => {
  const [filterClass, setFilterClass] = useState<'ALL' | 'FP' | 'FN' | 'TP'>('ALL');

  const filteredSamples = useMemo(() => {
    if (filterClass === 'ALL') return samples;
    return samples.filter((s) => s.classification === filterClass);
  }, [samples, filterClass]);

  const fpCount = samples.filter((s) => s.classification === 'FP').length;
  const fnCount = samples.filter((s) => s.classification === 'FN').length;
  const tpCount = samples.filter((s) => s.classification === 'TP').length;

  if (!samples || samples.length === 0) {
    return (
      <div className="cw-error-inspect-wrapper cw-error-inspect-wrapper--empty">
        <h3 className="cw-error-inspect-title">Error Inspection Samples</h3>
        <p className="cw-error-inspect-empty-text">
          No diagnostic error inspection instances were attached to this evaluation summary payload.
        </p>
      </div>
    );
  }

  return (
    <div className="cw-error-inspect-wrapper" role="region" aria-label="Error Inspection Analysis">
      <div className="cw-error-inspect-header">
        <div>
          <h3 className="cw-error-inspect-title">Error Inspection & Failure Cases</h3>
          <p className="cw-error-inspect-subtitle">
            Transparently analyzing where the matcher succeeded and where it generated false alarms
            or missed connections.
          </p>
        </div>

        {/* Filter Pills */}
        <div className="cw-error-inspect-tabs" role="tablist" aria-label="Filter error samples">
          <button
            type="button"
            className={`cw-error-inspect-tab ${filterClass === 'ALL' ? 'cw-error-inspect-tab--active' : ''}`}
            onClick={() => setFilterClass('ALL')}
          >
            All Instances ({samples.length})
          </button>
          <button
            type="button"
            className={`cw-error-inspect-tab ${filterClass === 'FP' ? 'cw-error-inspect-tab--active' : ''}`}
            onClick={() => setFilterClass('FP')}
          >
            False Positives ({fpCount})
          </button>
          <button
            type="button"
            className={`cw-error-inspect-tab ${filterClass === 'FN' ? 'cw-error-inspect-tab--active' : ''}`}
            onClick={() => setFilterClass('FN')}
          >
            Missed Links / FN ({fnCount})
          </button>
          <button
            type="button"
            className={`cw-error-inspect-tab ${filterClass === 'TP' ? 'cw-error-inspect-tab--active' : ''}`}
            onClick={() => setFilterClass('TP')}
          >
            True Positives ({tpCount})
          </button>
        </div>
      </div>

      <div className="cw-error-inspect-list" role="list">
        {filteredSamples.map((sample) => {
          const badgeVariant =
            sample.classification === 'FP'
              ? 'error'
              : sample.classification === 'FN'
              ? 'warning'
              : sample.classification === 'TP'
              ? 'success'
              : 'neutral';

          const classLabel =
            sample.classification === 'FP'
              ? 'False Positive (False Alarm)'
              : sample.classification === 'FN'
              ? 'False Negative (Missed Link)'
              : sample.classification === 'TP'
              ? 'True Positive (Correct Suggestion)'
              : 'True Negative (Correct Rejection)';

          return (
            <div
              key={sample.pair_id}
              role="listitem"
              className={`cw-error-inspect-card cw-error-inspect-card--${sample.classification.toLowerCase()}`}
            >
              <div className="cw-error-inspect-card__top">
                <div className="cw-error-inspect-card__refs">
                  <span className="ref-mono cw-error-inspect-card__ref">
                    {sample.complaint_a_ref}
                  </span>
                  <span className="cw-error-inspect-card__vs" aria-hidden="true">
                    ↔
                  </span>
                  <span className="ref-mono cw-error-inspect-card__ref">
                    {sample.complaint_b_ref}
                  </span>
                </div>
                <StatusBadge label={classLabel} variant={badgeVariant} size="sm" />
              </div>

              <div className="cw-error-inspect-card__inst">
                <span className="cw-error-inspect-card__inst-name">
                  {sample.institution_name}
                </span>
                <span className="cw-error-inspect-card__score ref-mono">
                  Engine Score: {Math.round(sample.score * 100)}%
                </span>
              </div>

              <div className="cw-error-inspect-card__reason">
                <span className="cw-error-inspect-card__reason-label">Failure / Success Analysis:</span>
                <p className="cw-error-inspect-card__reason-text">{sample.reason}</p>
              </div>

              <div className="cw-error-inspect-card__meta">
                <span className="cw-error-inspect-card__meta-item">
                  Ground Truth: <strong>{sample.true_label}</strong>
                </span>
                <span className="cw-error-inspect-card__meta-item">
                  Engine Output: <strong>{sample.predicted_state}</strong>
                </span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
