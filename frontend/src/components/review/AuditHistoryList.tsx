import React from 'react';
import { History, Shield, CheckCircle, XCircle, HelpCircle } from 'lucide-react';
import type { Relationship } from '../../types/entities.ts';
import { formatDateTime } from '../../utils/dateUtils.ts';
import './AuditHistoryList.css';

export interface AuditHistoryListProps {
  relationship: Relationship;
}

export const AuditHistoryList: React.FC<AuditHistoryListProps> = ({ relationship }) => {
  // Construct audit events strictly from backend-persisted fields
  const events = [];

  // Event 1: Candidate Relationship Suggested
  if (relationship.created_at) {
    events.push({
      id: 'evt-created',
      title: 'Candidate Suggested by Matching Service',
      description: `Matched with ${relationship.score_band} priority band (${Math.round(
        relationship.score * 100
      )}% similarity).`,
      actor: 'CaseWeave Similarity Engine',
      timestamp: relationship.created_at,
      icon: <Shield size={12} className="cw-audit-icon cw-audit-icon--system" />,
    });
  }

  // Event 2: Human Decision Record (if decided)
  if (relationship.state !== 'suggested' && relationship.updated_at) {
    let icon = <CheckCircle size={12} className="cw-audit-icon cw-audit-icon--success" />;
    let title = 'Relationship Confirmed by Human Reviewer';

    if (relationship.state === 'dismissed') {
      icon = <XCircle size={12} className="cw-audit-icon cw-audit-icon--neutral" />;
      title = 'Suggestion Dismissed by Human Reviewer';
    } else if (relationship.state === 'needs_info') {
      icon = <HelpCircle size={12} className="cw-audit-icon cw-audit-icon--warning" />;
      title = 'Flagged: Needs Additional Information';
    }

    events.push({
      id: 'evt-decided',
      title,
      description: relationship.reviewer_reason
        ? `Reason: "${relationship.reviewer_reason}"`
        : 'Decision recorded without additional notes.',
      actor: relationship.reviewed_by_demo_role || 'Senior Bureau Coordinator',
      timestamp: relationship.updated_at,
      icon,
    });
  }

  return (
    <div className="cw-audit-list" aria-label="Relationship audit timeline">
      <div className="cw-audit-list__header">
        <History size={13} className="cw-audit-list__icon" aria-hidden="true" />
        <h4 className="cw-audit-list__title">Traceable Audit History</h4>
      </div>
      <div className="cw-audit-list__timeline">
        {events.map((evt, idx) => (
          <div key={evt.id} className="cw-audit-item">
            <div className="cw-audit-item__marker">
              <span className="cw-audit-item__icon-wrap">{evt.icon}</span>
              {idx < events.length - 1 && <span className="cw-audit-item__line" aria-hidden="true" />}
            </div>
            <div className="cw-audit-item__content">
              <div className="cw-audit-item__title-row">
                <span className="cw-audit-item__title">{evt.title}</span>
                <span className="cw-audit-item__time" title={evt.timestamp}>
                  {formatDateTime(evt.timestamp)}
                </span>
              </div>
              <p className="cw-audit-item__desc">{evt.description}</p>
              <span className="cw-audit-item__actor">Recorded by: {evt.actor}</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
