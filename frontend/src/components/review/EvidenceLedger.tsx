import React from 'react';
import {
  CheckCircle2,
  AlertTriangle,
  HelpCircle,
  FileQuestion,
  Info,
} from 'lucide-react';
import type { Relationship } from '../../types/entities.ts';
import { StatusBadge } from '../common/StatusBadge.tsx';
import { categorizeEvidence, EvaluatedSignal } from '../../utils/evidenceUtils.ts';
import './EvidenceLedger.css';

export interface EvidenceLedgerProps {
  relationship: Relationship;
}

export const EvidenceLedger: React.FC<EvidenceLedgerProps> = ({ relationship }) => {
  const categorized = React.useMemo(
    () =>
      categorizeEvidence(
        relationship.evidence_json,
        relationship.score_band,
        relationship.score
      ),
    [relationship]
  );

  const pct = Math.round(relationship.score * 100);
  const bandVariant =
    relationship.score_band === 'High'
      ? 'warning'
      : relationship.score_band === 'Review'
      ? 'info'
      : 'neutral';

  const renderSignalItem = (sig: EvaluatedSignal, type: 'support' | 'conflict' | 'unavailable') => {
    return (
      <div key={sig.name} className={`cw-signal-item cw-signal-item--${type}`}>
        <div className="cw-signal-item__header">
          <div className="cw-signal-item__title-row">
            {type === 'support' && (
              <CheckCircle2 size={13} className="cw-signal-icon cw-signal-icon--support" aria-hidden="true" />
            )}
            {type === 'conflict' && (
              <AlertTriangle size={13} className="cw-signal-icon cw-signal-icon--conflict" aria-hidden="true" />
            )}
            {type === 'unavailable' && (
              <FileQuestion size={13} className="cw-signal-icon cw-signal-icon--unavailable" aria-hidden="true" />
            )}
            <span className="cw-signal-item__label">{sig.label}</span>
          </div>
          <span className="cw-signal-item__val ref-mono">{sig.observedValue}</span>
        </div>
        <p className="cw-signal-item__exp">{sig.explanation}</p>
      </div>
    );
  };

  return (
    <div className="cw-evidence-ledger" aria-label="Evidence ledger and matching signals">
      {/* Priority Band Card */}
      <div className="cw-evidence-priority">
        <div className="cw-evidence-priority__header">
          <span className="cw-evidence-priority__title">Review Priority</span>
          <StatusBadge
            label={`${relationship.score_band} Band`}
            variant={bandVariant}
            size="sm"
          />
        </div>
        <div className="cw-evidence-priority__score-row">
          <span className="cw-evidence-priority__pct">{pct}%</span>
          <span className="cw-evidence-priority__metric-name">
            multi-signal correspondence score
          </span>
        </div>
        <p className="cw-evidence-priority__caption">
          Score bands prioritize operational review order. They represent algorithmic signal
          correlations and do not constitute an automated verdict or legal finding.
        </p>
      </div>

      {/* Backend Summary Reasoning (if supplied) */}
      {categorized.summaryReasoning && (
        <div className="cw-evidence-summary">
          <div className="cw-evidence-summary__header">
            <Info size={13} className="cw-evidence-summary__icon" aria-hidden="true" />
            <span className="cw-evidence-summary__title">Engine Synthesis</span>
          </div>
          <p className="cw-evidence-summary__text">{categorized.summaryReasoning}</p>
        </div>
      )}

      {/* Group 1: Supporting Signals */}
      <div className="cw-evidence-group">
        <div className="cw-evidence-group__header cw-evidence-group__header--support">
          <h4 className="cw-evidence-group__title">Supports a Relationship</h4>
          <span className="cw-evidence-group__count">
            {categorized.supportingSignals.length}
          </span>
        </div>
        {categorized.supportingSignals.length > 0 ? (
          <div className="cw-evidence-group__list">
            {categorized.supportingSignals.map((sig) => renderSignalItem(sig, 'support'))}
          </div>
        ) : (
          <p className="cw-evidence-group__none">No explicit supporting signals detected.</p>
        )}
      </div>

      {/* Group 2: Conflicting Context / Scrutiny Required */}
      <div className="cw-evidence-group">
        <div className="cw-evidence-group__header cw-evidence-group__header--conflict">
          <h4 className="cw-evidence-group__title">Needs Scrutiny / Discrepancies</h4>
          <span className="cw-evidence-group__count">
            {categorized.conflictingSignals.length}
          </span>
        </div>
        {categorized.conflictingSignals.length > 0 ? (
          <div className="cw-evidence-group__list">
            {categorized.conflictingSignals.map((sig) => renderSignalItem(sig, 'conflict'))}
          </div>
        ) : (
          <p className="cw-evidence-group__none">No conflicting attributes recorded.</p>
        )}
      </div>

      {/* Group 3: Unavailable / Not Provided */}
      {categorized.unavailableSignals.length > 0 && (
        <div className="cw-evidence-group">
          <div className="cw-evidence-group__header cw-evidence-group__header--unavailable">
            <h4 className="cw-evidence-group__title">Unavailable Information</h4>
            <span className="cw-evidence-group__count">
              {categorized.unavailableSignals.length}
            </span>
          </div>
          <div className="cw-evidence-group__list">
            {categorized.unavailableSignals.map((sig) => renderSignalItem(sig, 'unavailable'))}
          </div>
        </div>
      )}

      {/* Guiding Principle Footnote */}
      <div className="cw-evidence-principles">
        <HelpCircle size={13} className="cw-evidence-principles__icon" aria-hidden="true" />
        <span className="cw-evidence-principles__text">
          Different references do not disprove relevance. Identical institutions do not prove
          overlap. All decisions require human verification.
        </span>
      </div>
    </div>
  );
};
