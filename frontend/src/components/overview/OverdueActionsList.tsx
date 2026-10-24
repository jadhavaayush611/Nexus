import React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { ArrowRight, Clock } from 'lucide-react';
import { Complaint } from '../../types/entities.ts';
import { Card } from '../common/Card.tsx';
import { StatusBadge } from '../common/StatusBadge.tsx';
import { Button } from '../common/Button.tsx';
import { DataTable, ColumnDef } from '../common/DataTable.tsx';
import { getDueStatus } from '../../utils/dateUtils.ts';
import './OverdueActionsList.css';

export interface OverdueActionsListProps {
  complaints: Complaint[];
  totalOverdueCount?: number;
  isLoading?: boolean;
}

export const OverdueActionsList: React.FC<OverdueActionsListProps> = ({
  complaints,
  totalOverdueCount,
  isLoading = false,
}) => {
  const navigate = useNavigate();

  const columns: ColumnDef<Complaint>[] = [
    {
      key: 'case',
      header: 'Complaint Reference & Institution',
      render: (c) => (
        <div className="cw-action-case">
          <div className="cw-action-case__top">
            <span className="cw-action-case__ref ref-mono">{c.external_reference}</span>
            <span className="cw-action-case__bureau">{c.bureau}</span>
          </div>
          <span className="cw-action-case__inst" title={c.institution_name_raw}>
            {c.institution?.canonical_name || c.institution_name_raw}
          </span>
        </div>
      ),
    },
    {
      key: 'next_action',
      header: 'Pending Next Action',
      render: (c) => (
        <div className="cw-action-desc">
          <span className="cw-action-desc__text">{c.next_action || 'No action specified'}</span>
          <span className="cw-action-desc__role">Owner: {c.assigned_role}</span>
        </div>
      ),
    },
    {
      key: 'due_date',
      header: 'Schedule & Due State',
      width: '180px',
      render: (c) => {
        const due = getDueStatus(c.due_at);
        const variant =
          due.status === 'overdue'
            ? 'error'
            : due.status === 'due_soon'
            ? 'warning'
            : 'neutral';

        return (
          <div className="cw-action-due">
            <StatusBadge
              label={due.label}
              variant={variant}
              size="sm"
            />
          </div>
        );
      },
    },
    {
      key: 'action',
      header: 'Case Record',
      width: '120px',
      align: 'right',
      render: (c) => (
        <Button
          variant="secondary"
          size="sm"
          icon={<ArrowRight size={13} />}
          iconPosition="right"
          onClick={(e) => {
            e.stopPropagation();
            navigate(`/complaints?id=${encodeURIComponent(c.id)}`);
          }}
          aria-label={`Open complaint ${c.external_reference}`}
        >
          Inspect
        </Button>
      ),
    },
  ];

  const headerActions = (
    <Link to="/complaints?due_status=overdue" className="cw-actions-header-link">
      <span>View all overdue</span>
      {totalOverdueCount !== undefined && (
        <span className="cw-actions-header-count">({totalOverdueCount})</span>
      )}
      <ArrowRight size={14} aria-hidden="true" />
    </Link>
  );

  return (
    <Card
      title="Overdue & Imminent Next Actions"
      subtitle="Administrative milestones requiring officer follow-up"
      actions={headerActions}
      padding="none"
      className="cw-overdue-card"
    >
      <DataTable
        columns={columns}
        data={complaints}
        keyExtractor={(item) => item.id}
        isLoading={isLoading}
        loadingRowCount={3}
        onRowClick={(item) =>
          navigate(`/complaints?id=${encodeURIComponent(item.id)}`)
        }
        caption="Pending and overdue next actions"
        emptyMessage={
          <div className="cw-actions-empty">
            <Clock size={24} className="cw-actions-empty__icon" aria-hidden="true" />
            <p className="cw-actions-empty__title">No overdue administrative actions</p>
            <p className="cw-actions-empty__desc">
              All complaints currently tracked in the dataset are within their scheduled response timelines.
            </p>
          </div>
        }
      />
    </Card>
  );
};
