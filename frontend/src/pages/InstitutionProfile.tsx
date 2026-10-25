import React, { useMemo } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import {
  ArrowLeft,
  FileText,
  GitCompare,
  RefreshCw,
  Tag,
  MapPin,
  CheckCircle2,
  History,
} from 'lucide-react';
import { PageHeader } from '../components/common/PageHeader.tsx';
import { StatusBadge } from '../components/common/StatusBadge.tsx';
import { Button } from '../components/common/Button.tsx';
import { Card } from '../components/common/Card.tsx';
import { ErrorMessage } from '../components/common/ErrorMessage.tsx';
import { LoadingSkeleton } from '../components/common/LoadingSkeleton.tsx';
import { apiClient } from '../services/apiClient.ts';
import { useApi } from '../hooks/useApi.ts';
import { Complaint, Relationship } from '../types/entities.ts';
import { formatDate, formatDateTime, getDueStatus } from '../utils/dateUtils.ts';
import './InstitutionProfile.css';

// Helper to extract items
function extractItems<T>(res: unknown): T[] {
  if (!res) return [];
  if (Array.isArray(res)) return res as T[];
  if (typeof res === 'object' && res !== null && 'items' in res && Array.isArray((res as { items: unknown[] }).items)) {
    return (res as { items: T[] }).items;
  }
  return [];
}

interface ChronologyEvent {
  id: string;
  type: 'complaint_submitted' | 'relationship_decision' | 'action_milestone';
  timestamp: string;
  title: string;
  bureau?: string;
  actor?: string;
  description: string;
  badgeLabel?: string;
  badgeVariant?: 'neutral' | 'success' | 'warning' | 'error' | 'info';
}

export const InstitutionProfile: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  // 1. Fetch Institution Identity
  const {
    data: institution,
    isLoading: isLoadingInst,
    error: instError,
    refetch: refetchInst,
  } = useApi(() => (id ? apiClient.getInstitutionById(id) : Promise.reject(new Error('Missing ID'))), [id]);

  // 2. Fetch Complaints associated with this Institution
  const {
    data: complaintsRaw,
    isLoading: isLoadingComplaints,
    error: complaintsError,
    refetch: refetchComplaints,
  } = useApi(
    () => (id ? apiClient.getComplaints({ institution_id: id }) : Promise.resolve([])),
    [id]
  );

  // 3. Fetch Candidate Relationships involving this Institution
  const {
    data: relsRaw,
    isLoading: isLoadingRels,
    error: relsError,
    refetch: refetchRels,
  } = useApi(
    () => (id ? apiClient.getRelationships({ institution_id: id }) : Promise.resolve([])),
    [id]
  );

  const complaints: Complaint[] = useMemo(() => extractItems<Complaint>(complaintsRaw), [complaintsRaw]);
  const relationships: Relationship[] = useMemo(() => extractItems<Relationship>(relsRaw), [relsRaw]);

  // Group Relationships by Status
  const groupedRelationships = useMemo(() => {
    return {
      suggested: relationships.filter((r) => r.state === 'suggested'),
      confirmed: relationships.filter((r) => r.state === 'confirmed'),
      dismissed: relationships.filter((r) => r.state === 'dismissed'),
      needs_info: relationships.filter((r) => r.state === 'needs_info'),
    };
  }, [relationships]);

  // Synthesize Chronology from actual timestamps
  const chronology: ChronologyEvent[] = useMemo(() => {
    const events: ChronologyEvent[] = [];

    // Add complaint submissions
    for (const c of complaints) {
      events.push({
        id: `complaint-${c.id}`,
        type: 'complaint_submitted',
        timestamp: c.submitted_at,
        title: `Complaint Registered: ${c.external_reference}`,
        bureau: c.bureau,
        description: `${c.category} — ${c.description.slice(0, 140)}...`,
        badgeLabel: c.bureau,
        badgeVariant: 'info',
      });
    }

    // Add relationship review decisions
    for (const r of relationships) {
      if (r.state !== 'suggested') {
        const time = r.updated_at || r.created_at;
        events.push({
          id: `rel-${r.id}`,
          type: 'relationship_decision',
          timestamp: time,
          title: `Relationship ${r.state.toUpperCase()}: ${r.complaint_a?.external_reference || 'A'} ↔ ${r.complaint_b?.external_reference || 'B'}`,
          actor: r.reviewed_by_demo_role || 'Bureau Officer',
          description: r.reviewer_reason
            ? `Reviewer Reason: ${r.reviewer_reason}`
            : 'Human review decision recorded in persistent audit ledger.',
          badgeLabel: r.state.toUpperCase(),
          badgeVariant: r.state === 'confirmed' ? 'success' : r.state === 'dismissed' ? 'neutral' : 'warning',
        });
      }
    }

    // Sort descending by timestamp
    return events.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
  }, [complaints, relationships]);

  const handleRefreshAll = () => {
    refetchInst();
    refetchComplaints();
    refetchRels();
  };

  if (isLoadingInst) {
    return (
      <div className="page-container cw-profile-page">
        <LoadingSkeleton variant="text" count={2} />
        <div style={{ height: '24px' }} />
        <LoadingSkeleton variant="card" count={3} />
      </div>
    );
  }

  if (instError || !institution) {
    return (
      <div className="page-container cw-profile-page">
        <div style={{ marginBottom: 'var(--space-4)' }}>
          <Link to="/institutions">
            <Button variant="secondary" size="sm" icon={<ArrowLeft size={14} />}>
              Back to Institutions Directory
            </Button>
          </Link>
        </div>
        <ErrorMessage
          error={instError || 'Institution profile not found'}
          title="Institution Record Unavailable"
          onRetry={handleRefreshAll}
        />
      </div>
    );
  }

  return (
    <div className="page-container cw-profile-page">
      {/* Back button */}
      <div className="cw-profile-back">
        <Link to="/institutions">
          <Button variant="tertiary" size="sm" icon={<ArrowLeft size={14} />}>
            Back to Institutions Directory
          </Button>
        </Link>
      </div>

      <PageHeader
        eyebrow="Institution Profile"
        title={institution.canonical_name}
        description={`Permanent ID: ${institution.normalized_identifier || 'Unverified'} · Consolidated cross-bureau view`}
        badge={<StatusBadge label="SYNTHETIC PROFILE" variant="neutral" />}
        actions={
          <Button
            variant="tertiary"
            size="sm"
            icon={<RefreshCw size={13} />}
            onClick={handleRefreshAll}
          >
            Refresh
          </Button>
        }
      />

      {/* Surface non-blocking errors */}
      {(complaintsError || relsError) && (
        <ErrorMessage
          error={complaintsError || relsError}
          title="Partial Data Warning"
          onRetry={handleRefreshAll}
        />
      )}

      {/* 1. Identity Block */}
      <section className="cw-profile-section" aria-label="Institution Identity Block">
        <Card title="Institution Identity & Registered Metadata" padding="md">
          <div className="cw-profile-identity-grid">
            <div className="cw-profile-id-item">
              <span className="cw-profile-id-label">Canonical Name</span>
              <span className="cw-profile-id-val cw-profile-id-val--strong">
                {institution.canonical_name}
              </span>
            </div>

            <div className="cw-profile-id-item">
              <span className="cw-profile-id-label">Normalized Identifier</span>
              {institution.normalized_identifier ? (
                <span className="ref-mono cw-profile-id-code">
                  {institution.normalized_identifier}
                </span>
              ) : (
                <span className="cw-profile-unverified">Unverified / Raw Only</span>
              )}
            </div>

            <div className="cw-profile-id-item">
              <span className="cw-profile-id-label">Region / State</span>
              <div className="cw-profile-id-val">
                <MapPin size={13} aria-hidden="true" />
                <span>{institution.region || 'Not specified'}</span>
              </div>
            </div>

            <div className="cw-profile-id-item">
              <span className="cw-profile-id-label">Institution Type</span>
              <span>{institution.type || 'Technical / Engineering'}</span>
            </div>
          </div>

          <div className="cw-profile-aliases-block">
            <span className="cw-profile-id-label">Known Aliases / Informal Variations:</span>
            {institution.aliases && institution.aliases.length > 0 ? (
              <div className="cw-profile-alias-pills">
                {institution.aliases.map((alias, i) => (
                  <span key={i} className="cw-profile-alias-pill">
                    <Tag size={11} aria-hidden="true" />
                    {alias}
                  </span>
                ))}
              </div>
            ) : (
              <span className="cw-profile-muted">No alternate names recorded</span>
            )}
          </div>
        </Card>
      </section>

      {/* 2. Complaints: Separate Record Cards */}
      <section className="cw-profile-section" aria-label="Complaints Filed Under Institution">
        <div className="cw-profile-section-header">
          <div className="cw-profile-section-title-wrap">
            <FileText size={18} className="cw-profile-section-icon" aria-hidden="true" />
            <h2 className="cw-profile-section-title">
              Complaint Records ({complaints.length})
            </h2>
          </div>
          <span className="cw-profile-distinct-notice">
            *Cases remain distinct physical files under separate bureau authority.
          </span>
        </div>

        {isLoadingComplaints ? (
          <LoadingSkeleton variant="card" count={2} />
        ) : complaints.length === 0 ? (
          <Card padding="md">
            <p className="cw-profile-empty-text">
              Zero complaints currently filed against this institution in the dataset.
            </p>
          </Card>
        ) : (
          <div className="cw-profile-complaints-list">
            {complaints.map((c) => {
              const due = getDueStatus(c.due_at);
              return (
                <article key={c.id} className="cw-profile-complaint-card">
                  <div className="cw-profile-complaint-header">
                    <div className="cw-profile-complaint-header-left">
                      <span className="ref-mono cw-profile-complaint-ref">
                        {c.external_reference}
                      </span>
                      <span className="cw-profile-complaint-bureau">{c.bureau}</span>
                      <StatusBadge
                        label={c.status}
                        variant={
                          c.status === 'open'
                            ? 'warning'
                            : c.status === 'resolved'
                            ? 'success'
                            : 'info'
                        }
                        size="sm"
                      />
                    </div>
                    <span className="cw-profile-complaint-date">
                      Submitted: {formatDate(c.submitted_at)}
                    </span>
                  </div>

                  <p className="cw-profile-complaint-desc">{c.description}</p>

                  <div className="cw-profile-complaint-footer">
                    <div className="cw-profile-complaint-meta">
                      <span className="cw-profile-complaint-cat">Category: {c.category}</span>
                      <span className="cw-profile-complaint-owner">Owner: {c.assigned_role}</span>
                    </div>

                    <div className="cw-profile-complaint-due">
                      <span className="cw-profile-complaint-action-text">
                        Action: <strong>{c.next_action || 'None scheduled'}</strong>
                      </span>
                      {c.due_at && (
                        <StatusBadge
                          label={due.label}
                          variant={
                            due.status === 'overdue'
                              ? 'error'
                              : due.status === 'due_soon'
                              ? 'warning'
                              : 'neutral'
                          }
                          size="sm"
                        />
                      )}
                    </div>
                  </div>
                </article>
              );
            })}
          </div>
        )}
      </section>

      {/* 3. Relationship Context Across Complaints */}
      <section className="cw-profile-section" aria-label="Cross-Bureau Relationships">
        <div className="cw-profile-section-header">
          <div className="cw-profile-section-title-wrap">
            <GitCompare size={18} className="cw-profile-section-icon" aria-hidden="true" />
            <h2 className="cw-profile-section-title">
              Cross-Bureau Relationship Context ({relationships.length})
            </h2>
          </div>
        </div>

        {isLoadingRels ? (
          <LoadingSkeleton variant="card" count={2} />
        ) : relationships.length === 0 ? (
          <Card padding="md">
            <p className="cw-profile-empty-text">
              No cross-bureau complaint relationships detected for this institution.
            </p>
          </Card>
        ) : (
          <div className="cw-profile-rels-grid">
            {/* Suggested Candidates */}
            <div className="cw-profile-rel-group">
              <h3 className="cw-profile-rel-group-title cw-profile-rel-group-title--suggested">
                Suggested Awaiting Review ({groupedRelationships.suggested.length})
              </h3>
              {groupedRelationships.suggested.length === 0 ? (
                <p className="cw-profile-rel-empty">No pending suggestions</p>
              ) : (
                groupedRelationships.suggested.map((r) => (
                  <div key={r.id} className="cw-profile-rel-card">
                    <div className="cw-profile-rel-card-pair">
                      <span className="ref-mono">{r.complaint_a?.external_reference || r.complaint_a_id.slice(0, 8)}</span>
                      <span>↔</span>
                      <span className="ref-mono">{r.complaint_b?.external_reference || r.complaint_b_id.slice(0, 8)}</span>
                    </div>
                    <div className="cw-profile-rel-card-meta">
                      <StatusBadge label={`${r.score_band} Band (${Math.round(r.score * 100)}%)`} variant="warning" size="sm" />
                      <Button
                        variant="secondary"
                        size="sm"
                        onClick={() => navigate(`/relationships?id=${r.id}`)}
                      >
                        Review
                      </Button>
                    </div>
                  </div>
                ))
              )}
            </div>

            {/* Confirmed Relationships */}
            <div className="cw-profile-rel-group">
              <h3 className="cw-profile-rel-group-title cw-profile-rel-group-title--confirmed">
                Confirmed Related ({groupedRelationships.confirmed.length})
              </h3>
              {groupedRelationships.confirmed.length === 0 ? (
                <p className="cw-profile-rel-empty">No confirmed pairs</p>
              ) : (
                groupedRelationships.confirmed.map((r) => (
                  <div key={r.id} className="cw-profile-rel-card cw-profile-rel-card--confirmed">
                    <div className="cw-profile-rel-card-pair">
                      <span className="ref-mono">{r.complaint_a?.external_reference || r.complaint_a_id.slice(0, 8)}</span>
                      <span>↔</span>
                      <span className="ref-mono">{r.complaint_b?.external_reference || r.complaint_b_id.slice(0, 8)}</span>
                    </div>
                    <span className="cw-profile-confirmed-tag">Confirmed Human Decision</span>
                  </div>
                ))
              )}
            </div>

            {/* Dismissed Suggestions */}
            <div className="cw-profile-rel-group">
              <h3 className="cw-profile-rel-group-title cw-profile-rel-group-title--dismissed">
                Dismissed Suggestions ({groupedRelationships.dismissed.length})
              </h3>
              {groupedRelationships.dismissed.length === 0 ? (
                <p className="cw-profile-rel-empty">None dismissed</p>
              ) : (
                groupedRelationships.dismissed.map((r) => (
                  <div key={r.id} className="cw-profile-rel-card cw-profile-rel-card--dismissed">
                    <div className="cw-profile-rel-card-pair">
                      <span className="ref-mono">{r.complaint_a?.external_reference || r.complaint_a_id.slice(0, 8)}</span>
                      <span>↔</span>
                      <span className="ref-mono">{r.complaint_b?.external_reference || r.complaint_b_id.slice(0, 8)}</span>
                    </div>
                    {r.reviewer_reason && (
                      <p className="cw-profile-dismiss-reason">
                        Dismissal Reason: “{r.reviewer_reason}”
                      </p>
                    )}
                  </div>
                ))
              )}
            </div>
          </div>
        )}
      </section>

      {/* 4. Chronology Timeline */}
      <section className="cw-profile-section" aria-label="Institution Chronology">
        <div className="cw-profile-section-header">
          <div className="cw-profile-section-title-wrap">
            <History size={18} className="cw-profile-section-icon" aria-hidden="true" />
            <h2 className="cw-profile-section-title">
              Operational Chronology ({chronology.length} Events)
            </h2>
          </div>
        </div>

        {chronology.length === 0 ? (
          <Card padding="md">
            <p className="cw-profile-empty-text">No chronology events logged.</p>
          </Card>
        ) : (
          <Card padding="md">
            <ul className="cw-profile-timeline">
              {chronology.map((event) => (
                <li key={event.id} className="cw-profile-timeline-item">
                  <div className="cw-profile-timeline-marker" aria-hidden="true">
                    {event.type === 'complaint_submitted' ? (
                      <FileText size={14} />
                    ) : (
                      <CheckCircle2 size={14} />
                    )}
                  </div>
                  <div className="cw-profile-timeline-body">
                    <div className="cw-profile-timeline-top">
                      <span className="cw-profile-timeline-title">{event.title}</span>
                      <span className="cw-profile-timeline-time">
                        {formatDateTime(event.timestamp)}
                      </span>
                    </div>
                    <p className="cw-profile-timeline-desc">{event.description}</p>
                    {event.badgeLabel && (
                      <StatusBadge
                        label={event.badgeLabel}
                        variant={event.badgeVariant || 'neutral'}
                        size="sm"
                      />
                    )}
                  </div>
                </li>
              ))}
            </ul>
          </Card>
        )}
      </section>
    </div>
  );
};
