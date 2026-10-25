import React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { GitCompare, ArrowRight } from 'lucide-react';
import { Relationship } from '../../types/entities.ts';
import { Card } from '../common/Card.tsx';
import { StatusBadge } from '../common/StatusBadge.tsx';
import { Button } from '../common/Button.tsx';
import { DataTable, ColumnDef } from '../common/DataTable.tsx';
import { formatRelativeTime } from '../../utils/dateUtils.ts';
import './PendingReviewQueue.css';

export interface PendingReviewQueueProps {
  relationships: Relationship[];
  totalCount?: number;
  isLoading?: boolean;
}

export const PendingReviewQueue: React.FC<PendingReviewQueueProps> = ({
  relationships,
  totalCount,
  isLoading = false,
}) => {
  const navigate = useNavigate();

  const columns: ColumnDef<Relationship>[] = [
    {
      key: 'institution',
      header: 'Institution Context',
      render: (rel) => {
        const instName =
          rel.complaint_a?.institution?.canonical_name ||
          rel.complaint_a?.institution_name_raw ||
          rel.complaint_b?.institution?.canonical_name ||
          rel.complaint_b?.institution_name_raw ||
          'Unresolved Institution';

        const instId =
          rel.complaint_a?.institution?.normalized_identifier ||
          rel.complaint_b?.institution?.normalized_identifier;

        return (
          <div className="cw-queue-inst">
            <span className="cw-queue-inst__name" title={instName}>
              {instName}
            </span>
            {instId && <span className="cw-queue-inst__id ref-mono">{instId}</span>}
          </div>
        );
      },
    },
    {
      key: 'pair',
      header: 'Complaint Pair (Cross-Bureau)',
      render: (rel) => (
        <div className="cw-queue-pair">
          <div className="cw-queue-pair__row">
            <span className="cw-queue-pair__ref ref-mono">
              {rel.complaint_a?.external_reference || rel.complaint_a_id.slice(0, 8)}
            </span>
            <span className="cw-queue-pair__bureau">
              {rel.complaint_a?.bureau || 'Bureau A'}
            </span>
          </div>
          <div className="cw-queue-pair__divider" aria-hidden="true" />
          <div className="cw-queue-pair__row">
            <span className="cw-queue-pair__ref ref-mono">
              {rel.complaint_b?.external_reference || rel.complaint_b_id.slice(0, 8)}
            </span>
            <span className="cw-queue-pair__bureau cw-queue-pair__bureau--secondary">
              {rel.complaint_b?.bureau || 'Bureau B'}
            </span>
          </div>
        </div>
      ),
    },
    {
      key: 'score_band',
      header: 'Match Priority',
      width: '140px',
      render: (rel) => {
        const variant =
          rel.score_band === 'High'
            ? 'warning'
            : rel.score_band === 'Review'
            ? 'info'
            : 'neutral';

        const pct = Math.round(rel.score * 100);

        return (
          <div className="cw-queue-score">
            <StatusBadge
              label={`${rel.score_band} Band`}
              variant={variant}
              size="sm"
            />
            <span className="cw-queue-score__pct">{pct}% similarity score</span>
          </div>
        );
      },
    },
    {
      key: 'age',
      header: 'Generated',
      width: '110px',
      render: (rel) => (
        <span className="cw-queue-age" title={rel.created_at}>
          {formatRelativeTime(rel.created_at)}
        </span>
      ),
    },
    {
      key: 'action',
      header: 'Review Action',
      width: '130px',
      align: 'right',
      render: (rel) => (
        <Button
          variant="secondary"
          size="sm"
          icon={<ArrowRight size={13} />}
          iconPosition="right"
          onClick={(e) => {
            e.stopPropagation();
            navigate(`/relationships?id=${encodeURIComponent(rel.id)}`);
          }}
          aria-label={`Inspect relationship between complaints for ${rel.id}`}
        >
          Review
        </Button>
      ),
    },
  ];

  const headerActions = (
    <Link to="/relationships?state=suggested" className="cw-queue-header-link">
      <span>View all candidates</span>
      {totalCount !== undefined && <span className="cw-queue-header-count">({totalCount})</span>}
      <ArrowRight size={14} aria-hidden="true" />
    </Link>
  );

  return (
    <Card
      title="Needs Relationship Review"
      subtitle="Candidates identified across bureaus awaiting administrative confirmation"
      actions={headerActions}
      padding="none"
      className="cw-review-queue-card"
    >
      <DataTable
        columns={columns}
        data={relationships}
        keyExtractor={(item) => item.id}
        isLoading={isLoading}
        loadingRowCount={4}
        onRowClick={(item) => navigate(`/relationships?id=${encodeURIComponent(item.id)}`)}
        caption="Candidate relationship review queue"
        emptyMessage={
          <div className="cw-queue-empty">
            <GitCompare size={24} className="cw-queue-empty__icon" aria-hidden="true" />
            <p className="cw-queue-empty__title">No pending relationship suggestions</p>
            <p className="cw-queue-empty__desc">
              All currently identified complaint candidates have been reviewed, or no new candidate links were detected in the synthetic dataset.
            </p>
          </div>
        }
      />
    </Card>
  );
};
