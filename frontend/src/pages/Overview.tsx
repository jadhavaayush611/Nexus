import React, { useState } from 'react';
import {
  FileText,
  GitCompare,
  Clock,
  Layers,
  RefreshCw,
  Database,
  History,
} from 'lucide-react';
import { PageHeader } from '../components/common/PageHeader.tsx';
import { StatusBadge } from '../components/common/StatusBadge.tsx';
import { Button } from '../components/common/Button.tsx';
import { Card } from '../components/common/Card.tsx';
import { ErrorMessage } from '../components/common/ErrorMessage.tsx';
import { MetricCard } from '../components/overview/MetricCard.tsx';
import { PendingReviewQueue } from '../components/overview/PendingReviewQueue.tsx';
import { OverdueActionsList } from '../components/overview/OverdueActionsList.tsx';
import { apiClient } from '../services/apiClient.ts';
import { useApi } from '../hooks/useApi.ts';
import { Complaint, Relationship } from '../types/entities.ts';
import { formatDateTime } from '../utils/dateUtils.ts';
import './Overview.css';

// Helper to extract items from either an enveloped PaginatedResponse or a raw Array
function extractItems<T>(res: unknown): T[] {
  if (!res) return [];
  if (Array.isArray(res)) return res as T[];
  if (typeof res === 'object' && res !== null && 'items' in res && Array.isArray((res as { items: unknown[] }).items)) {
    return (res as { items: T[] }).items;
  }
  return [];
}

export const Overview: React.FC = () => {
  const [isResetting, setIsResetting] = useState(false);
  const [resetMessage, setResetMessage] = useState<string | null>(null);

  // 1. Fetch Summary Aggregate Metrics
  const {
    data: summary,
    isLoading: isLoadingSummary,
    error: summaryError,
    refetch: refetchSummary,
  } = useApi(() => apiClient.getDashboardSummary());

  // 2. Fetch Top Candidates Awaiting Review
  const {
    data: relationshipsRaw,
    isLoading: isLoadingRelationships,
    error: relationshipsError,
    refetch: refetchRelationships,
  } = useApi(() => apiClient.getRelationships({ state: 'suggested', limit: 5 }));

  // 3. Fetch Overdue Next Actions
  const {
    data: complaintsRaw,
    isLoading: isLoadingComplaints,
    error: complaintsError,
    refetch: refetchComplaints,
  } = useApi(() => apiClient.getComplaints({ due_status: 'overdue', limit: 5 }));

  const relationships: Relationship[] = extractItems<Relationship>(relationshipsRaw);
  const overdueComplaints: Complaint[] = extractItems<Complaint>(complaintsRaw);

  const handleRefreshAll = async () => {
    await Promise.all([refetchSummary(), refetchRelationships(), refetchComplaints()]);
  };

  const handleLoadDemoDataset = async () => {
    setIsResetting(true);
    setResetMessage(null);
    try {
      const res = await apiClient.importDemoData();
      setResetMessage(`Demo dataset successfully reloaded (${res.rows_accepted} records processed).`);
      await handleRefreshAll();
    } catch (err: unknown) {
      setResetMessage(`Failed to reset dataset: ${(err as Error).message}`);
    } finally {
      setIsResetting(false);
    }
  };

  const hasAnyError = Boolean(summaryError || relationshipsError || complaintsError);

  return (
    <div className="page-container cw-overview">
      <PageHeader
        eyebrow="Operations Console"
        title="Overview"
        description="Current workload, cross-bureau review candidates, and pending administrative milestones."
        badge={<StatusBadge label="SYNTHETIC DEMO DATA" variant="warning" />}
        actions={
          <div className="cw-overview__header-actions">
            <Button
              variant="tertiary"
              size="sm"
              icon={<RefreshCw size={13} />}
              onClick={handleRefreshAll}
              aria-label="Refresh operations workload"
            >
              Refresh
            </Button>
            <Button
              variant="secondary"
              size="sm"
              icon={<Database size={13} />}
              isLoading={isResetting}
              onClick={handleLoadDemoDataset}
              title="Reset database to deterministic synthetic fixture records"
            >
              Reload Demo Data
            </Button>
          </div>
        }
      />

      {/* Dataset Reset Notification */}
      {resetMessage && (
        <div className="cw-overview__banner cw-overview__banner--notice" role="status">
          <span>{resetMessage}</span>
          <button
            type="button"
            className="cw-overview__banner-dismiss"
            onClick={() => setResetMessage(null)}
          >
            ×
          </button>
        </div>
      )}

      {/* Surface Backend Error / Disconnection State Honestly */}
      {hasAnyError && (
        <ErrorMessage
          error={summaryError || relationshipsError || complaintsError}
          title="Backend Service Notice"
          onRetry={handleRefreshAll}
        />
      )}

      {/* Database-Derived Figures Grid */}
      <section className="cw-overview__metrics" aria-label="Key Operational Metrics">
        <div className="cw-overview__metrics-grid">
          <MetricCard
            label="Open Complaints"
            value={summary?.open_complaints_count}
            caption="Active cases registered across AICTE bureaus"
            badgeLabel="Active Cases"
            badgeVariant="neutral"
            targetRoute="/complaints?status=open"
            icon={<FileText size={18} />}
            isLoading={isLoadingSummary}
          />

          <MetricCard
            label="Relationships Awaiting Review"
            value={summary?.relationships_awaiting_review_count}
            caption="Cross-bureau candidates requiring human review"
            badgeLabel="Action Required"
            badgeVariant="warning"
            targetRoute="/relationships?state=suggested"
            icon={<GitCompare size={18} />}
            isLoading={isLoadingSummary}
          />

          <MetricCard
            label="Overdue Next Actions"
            value={summary?.overdue_next_actions_count}
            caption="Case milestones exceeding scheduled due date"
            badgeLabel={
              summary && summary.overdue_next_actions_count > 0 ? 'Urgent Follow-up' : 'On Schedule'
            }
            badgeVariant={
              summary && summary.overdue_next_actions_count > 0 ? 'error' : 'success'
            }
            targetRoute="/complaints?due_status=overdue"
            icon={<Clock size={18} />}
            isLoading={isLoadingSummary}
          />

          <MetricCard
            label="Potential Cross-Bureau Links"
            value={summary?.cross_bureau_links_count}
            caption="Identified complaint overlaps across bureau cells"
            badgeLabel="Cross-Bureau"
            badgeVariant="info"
            targetRoute="/relationships"
            icon={<Layers size={18} />}
            isLoading={isLoadingSummary}
          />
        </div>
      </section>

      {/* Main Section: Candidate Queue Awaiting Review */}
      <section className="cw-overview__section" aria-label="Relationship Review Queue">
        <PendingReviewQueue
          relationships={relationships}
          totalCount={summary?.relationships_awaiting_review_count}
          isLoading={isLoadingRelationships}
        />
      </section>

      {/* Secondary Section: Overdue Next Actions */}
      <section className="cw-overview__section" aria-label="Overdue Next Actions">
        <OverdueActionsList
          complaints={overdueComplaints}
          totalOverdueCount={summary?.overdue_next_actions_count}
          isLoading={isLoadingComplaints}
        />
      </section>

      {/* Optional Recent Activity Timeline (Rendered ONLY if provided by real backend summary) */}
      {summary?.recent_activity && summary.recent_activity.length > 0 && (
        <section className="cw-overview__section" aria-label="Recent Administrative Activity">
          <Card
            title="Recent Audit Activity"
            subtitle="Persisted administrative milestones and review decisions"
            padding="md"
          >
            <ul className="cw-overview__timeline">
              {summary.recent_activity.map((event) => (
                <li key={event.id} className="cw-overview__timeline-item">
                  <div className="cw-overview__timeline-marker">
                    <History size={14} aria-hidden="true" />
                  </div>
                  <div className="cw-overview__timeline-content">
                    <span className="cw-overview__timeline-title">{event.event_type}</span>
                    <span className="cw-overview__timeline-actor">
                      by {event.actor_demo_role} · {formatDateTime(event.occurred_at)}
                    </span>
                  </div>
                </li>
              ))}
            </ul>
          </Card>
        </section>
      )}
    </div>
  );
};
