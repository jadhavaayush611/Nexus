import React, { useState } from 'react';
import {
  Check,
  XCircle,
  HelpCircle,
  ShieldCheck,
  AlertCircle,
  RotateCcw,
  Clock,
} from 'lucide-react';
import type { Relationship } from '../../types/entities.ts';
import { Button } from '../common/Button.tsx';
import { StatusBadge } from '../common/StatusBadge.tsx';
import { apiClient } from '../../services/apiClient.ts';
import { formatDateTime } from '../../utils/dateUtils.ts';
import './ReviewDecisionPanel.css';

export interface ReviewDecisionPanelProps {
  relationship: Relationship;
  onReviewSuccess: (updated: Relationship) => void;
}

export const ReviewDecisionPanel: React.FC<ReviewDecisionPanelProps> = ({
  relationship,
  onReviewSuccess,
}) => {
  const [activeMode, setActiveMode] = useState<'idle' | 'confirm' | 'dismiss' | 'needs_info'>('idle');
  const [dismissReason, setDismissReason] = useState(relationship.reviewer_reason || '');
  const [needsInfoNote, setNeedsInfoNote] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [validationError, setValidationError] = useState<string | null>(null);
  const [isReevaluating, setIsReevaluating] = useState(false);

  const isDecided = relationship.state !== 'suggested' && !isReevaluating;

  const handleSubmitDecision = async (
    decision: 'confirmed' | 'dismissed' | 'needs_info',
    reason?: string
  ) => {
    // 1. Client-side dismissal validation guard
    if (decision === 'dismissed') {
      if (!reason || !reason.trim()) {
        setValidationError('A non-empty reviewer reason is strictly required to dismiss a candidate link.');
        return;
      }
    }

    setValidationError(null);
    setErrorMsg(null);
    setIsSubmitting(true);

    try {
      const response = await apiClient.reviewRelationship(relationship.id, {
        decision,
        reviewer_reason: reason?.trim() || undefined,
        demo_role: 'Senior Bureau Coordinator',
      });

      // Update parent with the returned persisted entity
      if (response && response.relationship) {
        onReviewSuccess(response.relationship);
      } else {
        // Fallback optimistic update with exact shape if response wrapped differently
        const updated: Relationship = {
          ...relationship,
          state: decision,
          reviewer_reason: reason?.trim() || null,
          reviewed_by_demo_role: 'Senior Bureau Coordinator',
          updated_at: new Date().toISOString(),
        };
        onReviewSuccess(updated);
      }

      setActiveMode('idle');
      setIsReevaluating(false);
    } catch (err: unknown) {
      if (err && typeof err === 'object' && 'message' in err) {
        setErrorMsg(String((err as { message: string }).message));
      } else {
        setErrorMsg('Failed to record review decision with server. Please try again.');
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  // Receipt view when relationship already has a persisted human decision
  if (isDecided) {
    const stateVariant =
      relationship.state === 'confirmed'
        ? 'success'
        : relationship.state === 'dismissed'
        ? 'neutral'
        : 'warning';

    const stateLabel =
      relationship.state === 'confirmed'
        ? 'Confirmed Related'
        : relationship.state === 'dismissed'
        ? 'Suggestion Dismissed'
        : 'Needs More Information';

    return (
      <div className="cw-decision-panel cw-decision-panel--receipt" aria-label="Persisted review receipt">
        <div className="cw-decision-receipt__header">
          <div className="cw-decision-receipt__title-row">
            <ShieldCheck size={16} className="cw-decision-receipt__icon" aria-hidden="true" />
            <h3 className="cw-decision-receipt__title">Persisted Review Receipt</h3>
          </div>
          <StatusBadge label={stateLabel} variant={stateVariant} />
        </div>

        <div className="cw-decision-receipt__body">
          <div className="cw-decision-receipt__row">
            <span className="cw-decision-receipt__label">Decision Outcome</span>
            <span className="cw-decision-receipt__val">
              {relationship.state === 'confirmed' &&
                'Cross-bureau reference recorded. Complaints remain distinct cases.'}
              {relationship.state === 'dismissed' &&
                'Candidate suggestion dismissed with recorded reason.'}
              {relationship.state === 'needs_info' &&
                'Flagged for additional evidentiary context.'}
            </span>
          </div>

          {relationship.reviewer_reason && (
            <div className="cw-decision-receipt__row">
              <span className="cw-decision-receipt__label">Recorded Reviewer Reason</span>
              <p className="cw-decision-receipt__reason">{relationship.reviewer_reason}</p>
            </div>
          )}

          <div className="cw-decision-receipt__meta-row">
            <div className="cw-decision-receipt__meta-item">
              <span className="cw-decision-receipt__meta-label">Reviewer Role</span>
              <span className="cw-decision-receipt__meta-val">
                {relationship.reviewed_by_demo_role || 'Senior Bureau Coordinator'}
              </span>
            </div>
            <div className="cw-decision-receipt__meta-item">
              <span className="cw-decision-receipt__meta-label">Decided At</span>
              <span className="cw-decision-receipt__meta-val">
                <Clock size={11} aria-hidden="true" />
                {formatDateTime(relationship.updated_at || relationship.created_at)}
              </span>
            </div>
          </div>

          <div className="cw-decision-receipt__actions">
            <Button
              variant="tertiary"
              size="sm"
              icon={<RotateCcw size={13} />}
              onClick={() => setIsReevaluating(true)}
              aria-label="Re-evaluate this decision"
            >
              Re-evaluate decision
            </Button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="cw-decision-panel" aria-label="Human review actions">
      <div className="cw-decision-panel__header">
        <h3 className="cw-decision-panel__title">Record Review Decision</h3>
        <span className="cw-decision-panel__status-hint">
          State: <strong>{relationship.state.replace('_', ' ')}</strong>
        </span>
      </div>

      {/* Surface Server Error honestly */}
      {errorMsg && (
        <div className="cw-decision-panel__error" role="alert">
          <AlertCircle size={14} aria-hidden="true" />
          <span>{errorMsg}</span>
        </div>
      )}

      {/* Active Form Mode: Confirm Confirmation */}
      {activeMode === 'confirm' && (
        <div className="cw-decision-form cw-decision-form--confirm">
          <p className="cw-decision-form__prompt">
            Confirm that these two complaints relate to overlapping institutional events.
          </p>
          <p className="cw-decision-form__subtext">
            Both complaints will remain separate records in their respective bureaus.
          </p>
          <div className="cw-decision-form__btn-row">
            <Button
              variant="primary"
              size="sm"
              icon={<Check size={13} />}
              isLoading={isSubmitting}
              onClick={() => handleSubmitDecision('confirmed')}
            >
              Yes, confirm related
            </Button>
            <Button
              variant="tertiary"
              size="sm"
              disabled={isSubmitting}
              onClick={() => setActiveMode('idle')}
            >
              Cancel
            </Button>
          </div>
        </div>
      )}

      {/* Active Form Mode: Dismiss with mandatory reason */}
      {activeMode === 'dismiss' && (
        <div className="cw-decision-form cw-decision-form--dismiss">
          <label htmlFor="dismiss-reason-textarea" className="cw-decision-form__label">
            Reviewer Reason <span className="cw-decision-form__req">(Strictly Required)</span>
          </label>
          <textarea
            id="dismiss-reason-textarea"
            className={`cw-decision-form__textarea ${
              validationError ? 'cw-decision-form__textarea--invalid' : ''
            }`}
            rows={3}
            placeholder="e.g. Unrelated facility issues; distinct student cohorts; different academic years..."
            value={dismissReason}
            onChange={(e) => {
              setDismissReason(e.target.value);
              if (validationError) setValidationError(null);
            }}
            disabled={isSubmitting}
            aria-required="true"
          />
          {validationError && (
            <span className="cw-decision-form__error-text" role="alert">
              {validationError}
            </span>
          )}
          <div className="cw-decision-form__btn-row">
            <Button
              variant="secondary"
              size="sm"
              icon={<XCircle size={13} />}
              isLoading={isSubmitting}
              onClick={() => handleSubmitDecision('dismissed', dismissReason)}
            >
              Confirm dismissal
            </Button>
            <Button
              variant="tertiary"
              size="sm"
              disabled={isSubmitting}
              onClick={() => {
                setActiveMode('idle');
                setValidationError(null);
              }}
            >
              Cancel
            </Button>
          </div>
        </div>
      )}

      {/* Active Form Mode: Needs Info */}
      {activeMode === 'needs_info' && (
        <div className="cw-decision-form cw-decision-form--needs-info">
          <label htmlFor="needs-info-textarea" className="cw-decision-form__label">
            Information Needed <span className="cw-decision-form__opt">(Optional note)</span>
          </label>
          <textarea
            id="needs-info-textarea"
            className="cw-decision-form__textarea"
            rows={2}
            placeholder="e.g. Awaiting clarification from Student Welfare regarding hostel block number..."
            value={needsInfoNote}
            onChange={(e) => setNeedsInfoNote(e.target.value)}
            disabled={isSubmitting}
          />
          <div className="cw-decision-form__btn-row">
            <Button
              variant="secondary"
              size="sm"
              icon={<HelpCircle size={13} />}
              isLoading={isSubmitting}
              onClick={() => handleSubmitDecision('needs_info', needsInfoNote)}
            >
              Submit flag
            </Button>
            <Button
              variant="tertiary"
              size="sm"
              disabled={isSubmitting}
              onClick={() => setActiveMode('idle')}
            >
              Cancel
            </Button>
          </div>
        </div>
      )}

      {/* Default Idle Buttons */}
      {activeMode === 'idle' && (
        <div className="cw-decision-actions">
          <Button
            variant="primary"
            size="md"
            icon={<Check size={14} />}
            disabled={isSubmitting}
            onClick={() => setActiveMode('confirm')}
            aria-label="Confirm these complaints are related"
          >
            Confirm related
          </Button>

          <Button
            variant="secondary"
            size="md"
            icon={<XCircle size={14} />}
            disabled={isSubmitting}
            onClick={() => setActiveMode('dismiss')}
            aria-label="Dismiss this suggestion"
          >
            Dismiss suggestion
          </Button>

          <Button
            variant="tertiary"
            size="md"
            icon={<HelpCircle size={14} />}
            disabled={isSubmitting}
            onClick={() => setActiveMode('needs_info')}
            aria-label="Flag as needing more information"
          >
            Needs more info
          </Button>

          {isReevaluating && (
            <button
              type="button"
              className="cw-decision-cancel-reeval"
              onClick={() => setIsReevaluating(false)}
            >
              Cancel re-evaluation
            </button>
          )}
        </div>
      )}
    </div>
  );
};
