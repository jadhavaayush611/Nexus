import React, { useState } from 'react';
import { Copy, Check, ShieldAlert, ChevronDown, ChevronUp } from 'lucide-react';
import type { Complaint } from '../../types/entities.ts';
import { StatusBadge } from '../common/StatusBadge.tsx';
import { formatDate, formatRelativeTime, getDueStatus } from '../../utils/dateUtils.ts';
import './ComplaintComparison.css';

export interface ComplaintComparisonProps {
  complaintA: Complaint | null | undefined;
  complaintB: Complaint | null | undefined;
  isLoading?: boolean;
}

export const ComplaintComparison: React.FC<ComplaintComparisonProps> = ({
  complaintA,
  complaintB,
  isLoading = false,
}) => {
  const [copiedField, setCopiedField] = useState<string | null>(null);
  const [expandedA, setExpandedA] = useState(false);
  const [expandedB, setExpandedB] = useState(false);

  const handleCopy = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedField(id);
    setTimeout(() => setCopiedField(null), 2000);
  };

  if (isLoading) {
    return (
      <div className="cw-comparison cw-comparison--loading">
        <div className="cw-comparison__skeleton-header" />
        <div className="cw-comparison__skeleton-grid">
          <div className="cw-comparison__skeleton-col" />
          <div className="cw-comparison__skeleton-col" />
        </div>
      </div>
    );
  }

  if (!complaintA && !complaintB) {
    return (
      <div className="cw-comparison cw-comparison--empty">
        <p>No complaint records selected for comparison.</p>
      </div>
    );
  }

  const renderComplaintCard = (
    c: Complaint | null | undefined,
    label: string,
    tag: string,
    expanded: boolean,
    setExpanded: (val: boolean) => void,
    side: 'a' | 'b'
  ) => {
    if (!c) {
      return (
        <div className="cw-comparison__col cw-comparison__col--missing">
          <div className="cw-comparison__col-header">
            <span className="cw-comparison__col-tag">{tag}</span>
            <h3 className="cw-comparison__col-title">{label}</h3>
          </div>
          <div className="cw-comparison__col-missing-msg">
            <ShieldAlert size={20} aria-hidden="true" />
            <p>Full complaint record not supplied by matching payload.</p>
          </div>
        </div>
      );
    }

    const dueStatus = getDueStatus(c.due_at);
    const isOverdue = dueStatus.isOverdue;
    const isLongDesc = c.description && c.description.length > 220;

    return (
      <div className={`cw-comparison__col cw-comparison__col--${side}`}>
        <div className="cw-comparison__col-header">
          <div className="cw-comparison__col-badge-row">
            <span className="cw-comparison__col-tag">{tag}</span>
            <StatusBadge label={c.bureau} variant="info" size="sm" />
          </div>
          <div className="cw-comparison__ref-row">
            <span className="ref-mono cw-comparison__ref-text" title={c.external_reference}>
              {c.external_reference}
            </span>
            <button
              type="button"
              className="cw-comparison__copy-btn"
              onClick={() => handleCopy(c.external_reference, `ref-${side}`)}
              title="Copy reference number"
              aria-label={`Copy reference ${c.external_reference}`}
            >
              {copiedField === `ref-${side}` ? (
                <Check size={13} className="cw-comparison__copied-icon" />
              ) : (
                <Copy size={13} />
              )}
            </button>
          </div>
        </div>

        {/* Aligned Field Rows */}
        <div className="cw-comparison__fields">
          {/* Institution Identity */}
          <div className="cw-comparison__field">
            <span className="cw-comparison__label">Institution</span>
            <div className="cw-comparison__val-block">
              <span
                className="cw-comparison__inst-name"
                title={c.institution?.canonical_name || c.institution_name_raw}
              >
                {c.institution?.canonical_name || c.institution_name_raw}
              </span>
              {c.institution?.normalized_identifier ? (
                <span className="ref-mono cw-comparison__inst-id" title="Permanent Institute ID">
                  {c.institution.normalized_identifier}
                </span>
              ) : (
                <span className="cw-comparison__inst-unverified">
                  Unverified / Raw Name Only
                </span>
              )}
            </div>
          </div>

          {/* Grievance Category */}
          <div className="cw-comparison__field">
            <span className="cw-comparison__label">Category</span>
            <span className="cw-comparison__val">{c.category || 'General Grievance'}</span>
          </div>

          {/* Complaint Status */}
          <div className="cw-comparison__field">
            <span className="cw-comparison__label">Status</span>
            <div className="cw-comparison__val">
              <StatusBadge
                label={c.status.replace(/_/g, ' ')}
                variant={
                  c.status === 'resolved'
                    ? 'success'
                    : c.status === 'escalated'
                    ? 'error'
                    : c.status === 'under_review'
                    ? 'warning'
                    : 'info'
                }
                size="sm"
              />
            </div>
          </div>

          {/* Submitted Date */}
          <div className="cw-comparison__field">
            <span className="cw-comparison__label">Submitted</span>
            <span className="cw-comparison__val" title={c.submitted_at}>
              {formatDate(c.submitted_at)} ({formatRelativeTime(c.submitted_at)})
            </span>
          </div>

          {/* Assigned Officer / Bureau Role */}
          <div className="cw-comparison__field">
            <span className="cw-comparison__label">Assigned Role</span>
            <span className="cw-comparison__val">{c.assigned_role || 'Unassigned'}</span>
          </div>

          {/* Next Action & Due Date */}
          <div className="cw-comparison__field">
            <span className="cw-comparison__label">Next Action</span>
            <div className="cw-comparison__val-block">
              <span className="cw-comparison__action-text">{c.next_action || 'Pending review'}</span>
              {c.due_at && (
                <span
                  className={`cw-comparison__due-tag ${
                    isOverdue ? 'cw-comparison__due-tag--overdue' : ''
                  }`}
                >
                  {isOverdue ? 'Overdue: ' : 'Due: '}
                  {formatDate(c.due_at)}
                </span>
              )}
            </div>
          </div>

          {/* Full Grievance Description */}
          <div className="cw-comparison__field cw-comparison__field--desc">
            <div className="cw-comparison__desc-header">
              <span className="cw-comparison__label">Grievance Description</span>
              {isLongDesc && (
                <button
                  type="button"
                  className="cw-comparison__expand-btn"
                  onClick={() => setExpanded(!expanded)}
                  aria-expanded={expanded}
                >
                  <span>{expanded ? 'Show less' : 'Show full text'}</span>
                  {expanded ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
                </button>
              )}
            </div>
            <div
              className={`cw-comparison__desc-box ${
                isLongDesc && !expanded ? 'cw-comparison__desc-box--truncated' : ''
              }`}
            >
              <p className="cw-comparison__desc-text">{c.description}</p>
            </div>
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="cw-comparison" aria-label="Side-by-side complaint comparison">
      {/* Notice Banner */}
      <div className="cw-comparison__notice" role="note">
        <span className="cw-comparison__notice-title">Independent Legal Cases:</span>
        <span className="cw-comparison__notice-text">
          AICTE bureaus retain separate statutory responsibility. Reviewing a relationship
          verifies cross-case relevance; it does <strong>not</strong> merge records, transfer cases,
          or alter complaint workflows.
        </span>
      </div>

      {/* Side-by-side grid */}
      <div className="cw-comparison__grid">
        {renderComplaintCard(
          complaintA,
          'Lead Complaint Record',
          'Complaint A',
          expandedA,
          setExpandedA,
          'a'
        )}
        {renderComplaintCard(
          complaintB,
          'Candidate Match Record',
          'Complaint B',
          expandedB,
          setExpandedB,
          'b'
        )}
      </div>
    </div>
  );
};
