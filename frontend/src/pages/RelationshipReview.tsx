import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { useSearchParams } from 'react-router-dom';
import {
  GitCompare,
  RefreshCw,
  ArrowLeft,
  SlidersHorizontal,
} from 'lucide-react';
import { PageHeader } from '../components/common/PageHeader.tsx';
import { StatusBadge } from '../components/common/StatusBadge.tsx';
import { Button } from '../components/common/Button.tsx';
import { ErrorMessage } from '../components/common/ErrorMessage.tsx';
import { EmptyState } from '../components/common/EmptyState.tsx';
import { RelationshipQueue } from '../components/review/RelationshipQueue.tsx';
import { ComplaintComparison } from '../components/review/ComplaintComparison.tsx';
import { EvidenceLedger } from '../components/review/EvidenceLedger.tsx';
import { ReviewDecisionPanel } from '../components/review/ReviewDecisionPanel.tsx';
import { AuditHistoryList } from '../components/review/AuditHistoryList.tsx';
import { apiClient } from '../services/apiClient.ts';
import { useApi } from '../hooks/useApi.ts';
import type { Relationship, RelationshipState, Complaint } from '../types/entities.ts';
import './RelationshipReview.css';

// Helper to extract items from paginated envelope or raw array
function extractItems<T>(res: unknown): T[] {
  if (!res) return [];
  if (Array.isArray(res)) return res as T[];
  if (typeof res === 'object' && res !== null && 'items' in res && Array.isArray((res as { items: unknown[] }).items)) {
    return (res as { items: T[] }).items;
  }
  return [];
}

export const RelationshipReview: React.FC = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const urlId = searchParams.get('id');
  const urlState = (searchParams.get('state') as RelationshipState | 'all') || 'suggested';

  const [stateFilter, setStateFilter] = useState<RelationshipState | 'all'>(urlState);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedRelId, setSelectedRelId] = useState<string | null>(urlId);

  // Local mobile view mode: 'queue' or 'review'
  const [mobileTab, setMobileTab] = useState<'queue' | 'review'>('queue');

  // Hydrated complaints state (when complaints are fetched separately)
  const [complaintA, setComplaintA] = useState<Complaint | null>(null);
  const [complaintB, setComplaintB] = useState<Complaint | null>(null);
  const [isLoadingComplaints, setIsLoadingComplaints] = useState(false);

  // 1. Fetch Relationships from backend
  const {
    data: rawRelationships,
    isLoading: isLoadingQueue,
    error: queueError,
    refetch: refetchQueue,
  } = useApi(
    () =>
      apiClient.getRelationships({
        state: stateFilter !== 'all' ? stateFilter : undefined,
      }),
    [stateFilter]
  );

  // Local relationships list that can be updated in-place when a review decision succeeds
  const [relationshipsList, setRelationshipsList] = useState<Relationship[]>([]);

  useEffect(() => {
    if (rawRelationships) {
      const items = extractItems<Relationship>(rawRelationships);
      setRelationshipsList(items);
    }
  }, [rawRelationships]);

  // Sync state filter with URL
  const handleStateFilterChange = useCallback((newState: RelationshipState | 'all') => {
    setStateFilter(newState);
    setSearchParams((prev) => {
      const next = new URLSearchParams(prev);
      if (newState === 'all') {
        next.delete('state');
      } else {
        next.set('state', newState);
      }
      return next;
    });
  }, [setSearchParams]);

  // Determine currently active relationship
  const currentRelationship = useMemo(() => {
    if (!relationshipsList || relationshipsList.length === 0) return null;
    if (selectedRelId) {
      const found = relationshipsList.find((r) => r.id === selectedRelId);
      if (found) return found;
    }
    return relationshipsList[0];
  }, [relationshipsList, selectedRelId]);

  // Set default selection when data loads or URL specifies ID
  useEffect(() => {
    if (urlId) {
      setSelectedRelId(urlId);
      setMobileTab('review');
    } else if (currentRelationship && !selectedRelId) {
      setSelectedRelId(currentRelationship.id);
    }
  }, [urlId, currentRelationship, selectedRelId]);

  // Handle selecting a relationship from queue
  const handleSelectRelationship = useCallback((rel: Relationship) => {
    setSelectedRelId(rel.id);
    setMobileTab('review');
    setSearchParams((prev) => {
      const next = new URLSearchParams(prev);
      next.set('id', rel.id);
      return next;
    });
  }, [setSearchParams]);

  // 2. Hydrate complaints for the selected relationship if missing from payload
  useEffect(() => {
    if (!currentRelationship) {
      setComplaintA(null);
      setComplaintB(null);
      return;
    }

    // Check if complaints are already embedded
    if (currentRelationship.complaint_a && currentRelationship.complaint_b) {
      setComplaintA(currentRelationship.complaint_a);
      setComplaintB(currentRelationship.complaint_b);
      return;
    }

    // Otherwise, fetch complaints by ID
    let isCancelled = false;
    setIsLoadingComplaints(true);

    Promise.all([
      currentRelationship.complaint_a
        ? Promise.resolve(currentRelationship.complaint_a)
        : apiClient.getComplaintById(currentRelationship.complaint_a_id).catch(() => null),
      currentRelationship.complaint_b
        ? Promise.resolve(currentRelationship.complaint_b)
        : apiClient.getComplaintById(currentRelationship.complaint_b_id).catch(() => null),
    ])
      .then(([cA, cB]) => {
        if (!isCancelled) {
          setComplaintA(cA);
          setComplaintB(cB);
          setIsLoadingComplaints(false);
        }
      })
      .catch(() => {
        if (!isCancelled) {
          setIsLoadingComplaints(false);
        }
      });

    return () => {
      isCancelled = true;
    };
  }, [currentRelationship]);

  // Handle successful human review decision
  const handleReviewSuccess = useCallback((updatedRel: Relationship) => {
    setRelationshipsList((prev) =>
      prev.map((r) => (r.id === updatedRel.id ? updatedRel : r))
    );
  }, []);

  const pendingCount = useMemo(() => {
    return relationshipsList.filter((r) => r.state === 'suggested').length;
  }, [relationshipsList]);

  return (
    <div className="page-container cw-review-page">
      {/* Page Header */}
      <PageHeader
        eyebrow="Signature Screen · Operational Review Studio"
        title="Relationship Review"
        description="Inspect candidate complaint pairs, verify matching evidence, and record human decisions without merging records."
        badge={
          <StatusBadge
            label={
              pendingCount > 0
                ? `${pendingCount} PENDING SUGGESTIONS`
                : 'SYNTHETIC REVIEW STUDIO'
            }
            variant={pendingCount > 0 ? 'warning' : 'neutral'}
          />
        }
        actions={
          <Button
            variant="tertiary"
            size="sm"
            icon={<RefreshCw size={13} />}
            onClick={() => refetchQueue()}
            aria-label="Refresh relationship candidates"
          >
            Refresh
          </Button>
        }
      />

      {/* Surface API Error Honestly */}
      {queueError && (
        <ErrorMessage
          error={queueError}
          title="Relationship Queue Unavailable"
          onRetry={() => refetchQueue()}
        />
      )}

      {/* Mobile / Tablet Screen Mode Switcher */}
      <div className="cw-review-mobile-nav" role="navigation" aria-label="Mobile view switcher">
        <button
          type="button"
          className={`cw-review-mobile-tab ${
            mobileTab === 'queue' ? 'cw-review-mobile-tab--active' : ''
          }`}
          onClick={() => setMobileTab('queue')}
        >
          <SlidersHorizontal size={13} aria-hidden="true" />
          <span>Candidate Queue ({relationshipsList.length})</span>
        </button>
        <button
          type="button"
          className={`cw-review-mobile-tab ${
            mobileTab === 'review' ? 'cw-review-mobile-tab--active' : ''
          }`}
          onClick={() => setMobileTab('review')}
          disabled={!currentRelationship}
        >
          <GitCompare size={13} aria-hidden="true" />
          <span>Case Review</span>
        </button>
      </div>

      {/* Main Three-Column Workspace */}
      <div className="cw-review-workspace">
        {/* COLUMN 1: Relationship Queue (Left) */}
        <div
          className={`cw-review-workspace__col cw-review-workspace__col--queue ${
            mobileTab !== 'queue' ? 'cw-review-workspace__col--mobile-hidden' : ''
          }`}
        >
          <RelationshipQueue
            relationships={relationshipsList}
            selectedId={currentRelationship?.id || null}
            onSelect={handleSelectRelationship}
            stateFilter={stateFilter}
            onStateFilterChange={handleStateFilterChange}
            searchQuery={searchQuery}
            onSearchChange={setSearchQuery}
            isLoading={isLoadingQueue}
            pendingCount={pendingCount}
          />
        </div>

        {/* COLUMN 2 & 3: Comparison, Evidence & Decision (Center & Right) */}
        {currentRelationship ? (
          <>
            {/* Mobile "Back to Queue" Bar */}
            <div className="cw-review-mobile-back-bar">
              <button
                type="button"
                className="cw-review-mobile-back-btn"
                onClick={() => setMobileTab('queue')}
                aria-label="Back to candidate queue"
              >
                <ArrowLeft size={14} aria-hidden="true" />
                <span>Back to Candidate Queue</span>
              </button>
              <StatusBadge
                label={`${currentRelationship.score_band} Band`}
                variant={
                  currentRelationship.score_band === 'High'
                    ? 'warning'
                    : currentRelationship.score_band === 'Review'
                    ? 'info'
                    : 'neutral'
                }
                size="sm"
              />
            </div>

            {/* COLUMN 2: Side-by-side Complaint Comparison (Center) */}
            <div
              className={`cw-review-workspace__col cw-review-workspace__col--comparison ${
                mobileTab !== 'review' ? 'cw-review-workspace__col--mobile-hidden' : ''
              }`}
            >
              <ComplaintComparison
                complaintA={complaintA}
                complaintB={complaintB}
                isLoading={isLoadingComplaints}
              />
            </div>

            {/* COLUMN 3: Evidence Ledger & Review Decision Panel (Right) */}
            <div
              className={`cw-review-workspace__col cw-review-workspace__col--evidence ${
                mobileTab !== 'review' ? 'cw-review-workspace__col--mobile-hidden' : ''
              }`}
            >
              <div className="cw-review-right-stack">
                <EvidenceLedger relationship={currentRelationship} />
                <ReviewDecisionPanel
                  relationship={currentRelationship}
                  onReviewSuccess={handleReviewSuccess}
                />
                <AuditHistoryList relationship={currentRelationship} />
              </div>
            </div>
          </>
        ) : (
          !isLoadingQueue && (
            <div className="cw-review-workspace__empty">
              <EmptyState
                title="No relationship selected"
                description="Select a candidate pair from the queue or adjust your filter to view matching evidence."
              />
            </div>
          )
        )}
      </div>
    </div>
  );
};
