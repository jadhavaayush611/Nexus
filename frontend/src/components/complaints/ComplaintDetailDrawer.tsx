import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  X,
  Building2,
  Calendar,
  User,
  Clock,
  GitCompare,
  Edit2,
  CheckCircle2,
  FileText,
  ArrowRight,
} from 'lucide-react';
import { Complaint, Relationship } from '../../types/entities.ts';
import { apiClient, ApiError } from '../../services/apiClient.ts';
import { StatusBadge } from '../common/StatusBadge.tsx';
import { Button } from '../common/Button.tsx';
import { ErrorMessage } from '../common/ErrorMessage.tsx';
import { LoadingSkeleton } from '../common/LoadingSkeleton.tsx';
import { formatDate, formatDateTime, getDueStatus } from '../../utils/dateUtils.ts';
import './ComplaintDetailDrawer.css';

export interface ComplaintDetailDrawerProps {
  complaintId: string | null;
  onClose: () => void;
  onComplaintUpdated?: (updated: Complaint) => void;
}

export const ComplaintDetailDrawer: React.FC<ComplaintDetailDrawerProps> = ({
  complaintId,
  onClose,
  onComplaintUpdated,
}) => {
  const navigate = useNavigate();
  const [complaint, setComplaint] = useState<Complaint | null>(null);
  const [relationships, setRelationships] = useState<Relationship[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<ApiError | null>(null);

  // Edit Mode State
  const [isEditing, setIsEditing] = useState<boolean>(false);
  const [editStatus, setEditStatus] = useState<string>('open');
  const [editRole, setEditRole] = useState<string>('');
  const [editNextAction, setEditNextAction] = useState<string>('');
  const [editDueAt, setEditDueAt] = useState<string>('');
  const [isSaving, setIsSaving] = useState<boolean>(false);
  const [saveSuccess, setSaveSuccess] = useState<boolean>(false);
  const [saveError, setSaveError] = useState<ApiError | null>(null);

  // Load complaint data when complaintId changes
  useEffect(() => {
    if (!complaintId) {
      setComplaint(null);
      setIsEditing(false);
      return;
    }

    let isMounted = true;
    const fetchDetail = async () => {
      setIsLoading(true);
      setError(null);
      setIsEditing(false);
      setSaveSuccess(false);

      try {
        const data = await apiClient.getComplaintById(complaintId);
        if (!isMounted) return;
        setComplaint(data);
        setEditStatus(data.status || 'open');
        setEditRole(data.assigned_role || '');
        setEditNextAction(data.next_action || '');
        setEditDueAt(data.due_at ? data.due_at.split('T')[0] : '');

        // Fetch related candidate relationships
        try {
          const relsData = await apiClient.getRelationships({
            institution_id: data.institution_id || undefined,
          });
          if (isMounted) {
            const items = Array.isArray(relsData)
              ? relsData
              : (relsData as { items?: Relationship[] })?.items || [];
            // Filter to relationships involving this specific complaint
            const matched = items.filter(
              (r) => r.complaint_a_id === data.id || r.complaint_b_id === data.id
            );
            setRelationships(matched);
          }
        } catch {
          // Non-blocking; relationships can remain empty if endpoint is not seeded
          if (isMounted) setRelationships([]);
        }
      } catch (err: unknown) {
        if (!isMounted) return;
        setError(
          err instanceof ApiError
            ? err
            : new ApiError({
                message: 'Failed to retrieve complaint record.',
                status: 0,
                statusText: 'Error',
                endpoint: `/complaints/${complaintId}`,
                rawBody: err,
              })
        );
      } finally {
        if (isMounted) setIsLoading(false);
      }
    };

    fetchDetail();
    return () => {
      isMounted = false;
    };
  }, [complaintId]);

  // Handle keyboard Escape to close drawer
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };
    if (complaintId) {
      window.addEventListener('keydown', handleKeyDown);
      return () => window.removeEventListener('keydown', handleKeyDown);
    }
  }, [complaintId, onClose]);

  const handleSaveChanges = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!complaint) return;

    setIsSaving(true);
    setSaveError(null);
    setSaveSuccess(false);

    try {
      const updated = await apiClient.updateComplaint(complaint.id, {
        status: editStatus,
        assigned_role: editRole,
        next_action: editNextAction,
        due_at: editDueAt ? new Date(editDueAt).toISOString() : null,
      });

      setComplaint(updated);
      setIsEditing(false);
      setSaveSuccess(true);
      onComplaintUpdated?.(updated);
    } catch (err: unknown) {
      setSaveError(
        err instanceof ApiError
          ? err
          : new ApiError({
              message: 'Failed to update complaint record.',
              status: 0,
              statusText: 'Error',
              endpoint: `/complaints/${complaint.id}`,
              rawBody: err,
            })
      );
    } finally {
      setIsSaving(false);
    }
  };

  if (!complaintId) return null;

  const due = complaint ? getDueStatus(complaint.due_at) : null;

  return (
    <>
      <div className="cw-drawer-backdrop" onClick={onClose} aria-hidden="true" />
      <aside
        className="cw-drawer"
        role="dialog"
        aria-labelledby="drawer-title"
        aria-modal="true"
      >
        {/* Header */}
        <div className="cw-drawer__header">
          <div className="cw-drawer__header-left">
            <span className="cw-drawer__eyebrow">COMPLAINT RECORD</span>
            <h2 id="drawer-title" className="cw-drawer__title ref-mono">
              {complaint ? complaint.external_reference : 'Loading reference...'}
            </h2>
          </div>
          <button
            type="button"
            className="cw-drawer__close-btn"
            onClick={onClose}
            aria-label="Close complaint detail drawer"
          >
            <X size={20} aria-hidden="true" />
          </button>
        </div>

        {/* Content Body */}
        <div className="cw-drawer__body">
          {isLoading ? (
            <div className="cw-drawer__loading">
              <LoadingSkeleton variant="text" count={3} />
              <div style={{ height: '16px' }} />
              <LoadingSkeleton variant="card" count={2} />
            </div>
          ) : error ? (
            <ErrorMessage
              error={error}
              title="Failed to Load Complaint Details"
              onRetry={() => {
                if (!complaintId) return;
                setIsLoading(true);
                setError(null);
                apiClient
                  .getComplaintById(complaintId)
                  .then(setComplaint)
                  .catch(setError)
                  .finally(() => setIsLoading(false));
              }}
            />
          ) : complaint ? (
            <div className="cw-drawer__content">
              {/* Success Notification */}
              {saveSuccess && (
                <div className="cw-drawer__success-banner" role="status">
                  <CheckCircle2 size={16} aria-hidden="true" />
                  <span>Complaint record updated successfully.</span>
                </div>
              )}

              {/* Status & Key Attributes */}
              <section className="cw-drawer__card" aria-label="Complaint Status & Bureau">
                <div className="cw-drawer__status-grid">
                  <div className="cw-drawer__stat-item">
                    <span className="cw-drawer__stat-label">Bureau Ownership</span>
                    <span className="cw-drawer__bureau-tag">{complaint.bureau}</span>
                  </div>

                  <div className="cw-drawer__stat-item">
                    <span className="cw-drawer__stat-label">Complaint Status</span>
                    <StatusBadge
                      label={complaint.status}
                      variant={
                        complaint.status === 'open'
                          ? 'warning'
                          : complaint.status === 'resolved'
                          ? 'success'
                          : 'info'
                      }
                    />
                  </div>

                  <div className="cw-drawer__stat-item">
                    <span className="cw-drawer__stat-label">Category</span>
                    <span className="cw-drawer__stat-val">{complaint.category}</span>
                  </div>

                  <div className="cw-drawer__stat-item">
                    <span className="cw-drawer__stat-label">Submitted Date</span>
                    <div className="cw-drawer__stat-val-icon">
                      <Calendar size={13} aria-hidden="true" />
                      <span>{formatDate(complaint.submitted_at)}</span>
                    </div>
                  </div>
                </div>
              </section>

              {/* Institution Identity */}
              <section className="cw-drawer__card" aria-label="Institution Details">
                <h3 className="cw-drawer__section-title">
                  <Building2 size={15} aria-hidden="true" />
                  Institution Context
                </h3>
                <div className="cw-drawer__inst-box">
                  <div className="cw-drawer__inst-name">
                    {complaint.institution?.canonical_name || complaint.institution_name_raw}
                  </div>
                  {complaint.institution?.normalized_identifier ? (
                    <div className="cw-drawer__inst-id">
                      Permanent ID: <span className="ref-mono">{complaint.institution.normalized_identifier}</span>
                    </div>
                  ) : (
                    <div className="cw-drawer__inst-unverified">
                      Raw name: “{complaint.institution_name_raw}” (Identifier unverified)
                    </div>
                  )}

                  {complaint.institution_id && (
                    <div style={{ marginTop: 'var(--space-3)' }}>
                      <Button
                        variant="secondary"
                        size="sm"
                        icon={<ArrowRight size={13} />}
                        iconPosition="right"
                        onClick={() => {
                          onClose();
                          navigate(`/institutions/${complaint.institution_id}`);
                        }}
                      >
                        View Full Institution Profile
                      </Button>
                    </div>
                  )}
                </div>
              </section>

              {/* Description */}
              <section className="cw-drawer__card" aria-label="Complaint Narrative">
                <h3 className="cw-drawer__section-title">
                  <FileText size={15} aria-hidden="true" />
                  Grievance Description
                </h3>
                <p className="cw-drawer__description">{complaint.description}</p>
              </section>

              {/* Administrative Workflow & Next Action */}
              <section className="cw-drawer__card" aria-label="Administrative Workflow">
                <div className="cw-drawer__card-header-row">
                  <h3 className="cw-drawer__section-title">
                    <Clock size={15} aria-hidden="true" />
                    Next Action & Ownership
                  </h3>
                  {!isEditing && (
                    <Button
                      variant="tertiary"
                      size="sm"
                      icon={<Edit2 size={13} />}
                      onClick={() => setIsEditing(true)}
                    >
                      Update
                    </Button>
                  )}
                </div>

                {isEditing ? (
                  <form onSubmit={handleSaveChanges} className="cw-drawer__edit-form">
                    {saveError && <ErrorMessage error={saveError} />}

                    <div className="cw-drawer__form-field">
                      <label htmlFor="edit-status">Complaint Status</label>
                      <select
                        id="edit-status"
                        value={editStatus}
                        onChange={(e) => setEditStatus(e.target.value)}
                        className="cw-drawer__select"
                      >
                        <option value="open">Open</option>
                        <option value="under_review">Under Review</option>
                        <option value="resolved">Resolved</option>
                        <option value="escalated">Escalated</option>
                      </select>
                    </div>

                    <div className="cw-drawer__form-field">
                      <label htmlFor="edit-role">Assigned Officer / Role</label>
                      <input
                        id="edit-role"
                        type="text"
                        value={editRole}
                        onChange={(e) => setEditRole(e.target.value)}
                        className="cw-drawer__input"
                        placeholder="e.g. Regional Officer - Bureau Approval"
                      />
                    </div>

                    <div className="cw-drawer__form-field">
                      <label htmlFor="edit-next-action">Next Action Required</label>
                      <textarea
                        id="edit-next-action"
                        rows={2}
                        value={editNextAction}
                        onChange={(e) => setEditNextAction(e.target.value)}
                        className="cw-drawer__textarea"
                        placeholder="State specific administrative next action..."
                      />
                    </div>

                    <div className="cw-drawer__form-field">
                      <label htmlFor="edit-due-date">Due Date</label>
                      <input
                        id="edit-due-date"
                        type="date"
                        value={editDueAt}
                        onChange={(e) => setEditDueAt(e.target.value)}
                        className="cw-drawer__input"
                      />
                    </div>

                    <div className="cw-drawer__form-actions">
                      <Button
                        type="submit"
                        variant="primary"
                        size="sm"
                        isLoading={isSaving}
                      >
                        Save Changes
                      </Button>
                      <Button
                        type="button"
                        variant="secondary"
                        size="sm"
                        onClick={() => setIsEditing(false)}
                        disabled={isSaving}
                      >
                        Cancel
                      </Button>
                    </div>
                  </form>
                ) : (
                  <div className="cw-drawer__workflow-view">
                    <div className="cw-drawer__workflow-row">
                      <span className="cw-drawer__workflow-label">Assigned Officer:</span>
                      <div className="cw-drawer__workflow-val">
                        <User size={14} aria-hidden="true" />
                        <span>{complaint.assigned_role || 'Unassigned'}</span>
                      </div>
                    </div>

                    <div className="cw-drawer__workflow-row">
                      <span className="cw-drawer__workflow-label">Scheduled Action:</span>
                      <span className="cw-drawer__workflow-val cw-drawer__workflow-val--strong">
                        {complaint.next_action || 'No action specified'}
                      </span>
                    </div>

                    <div className="cw-drawer__workflow-row">
                      <span className="cw-drawer__workflow-label">Due Milestone:</span>
                      <div className="cw-drawer__workflow-val">
                        {due ? (
                          <StatusBadge
                            label={due.label}
                            variant={
                              due.status === 'overdue'
                                ? 'error'
                                : due.status === 'due_soon'
                                ? 'warning'
                                : 'neutral'
                            }
                          />
                        ) : (
                          <span>No due date</span>
                        )}
                        {complaint.due_at && (
                          <span className="cw-drawer__due-sub">({formatDate(complaint.due_at)})</span>
                        )}
                      </div>
                    </div>
                  </div>
                )}
              </section>

              {/* Related Complaint Candidates */}
              <section className="cw-drawer__card" aria-label="Related Complaint Candidates">
                <h3 className="cw-drawer__section-title">
                  <GitCompare size={15} aria-hidden="true" />
                  Potentially Related Cases
                </h3>
                {relationships.length === 0 ? (
                  <p className="cw-drawer__empty-hint">
                    No cross-bureau relationships currently identified for this complaint.
                  </p>
                ) : (
                  <div className="cw-drawer__rels-list">
                    {relationships.map((rel) => {
                      const otherId =
                        rel.complaint_a_id === complaint.id
                          ? rel.complaint_b?.external_reference || rel.complaint_b_id.slice(0, 8)
                          : rel.complaint_a?.external_reference || rel.complaint_a_id.slice(0, 8);

                      return (
                        <div key={rel.id} className="cw-drawer__rel-item">
                          <div className="cw-drawer__rel-info">
                            <span className="cw-drawer__rel-ref ref-mono">{otherId}</span>
                            <StatusBadge
                              label={`${rel.state.toUpperCase()} (${Math.round(rel.score * 100)}%)`}
                              variant={
                                rel.state === 'confirmed'
                                  ? 'success'
                                  : rel.state === 'dismissed'
                                  ? 'neutral'
                                  : 'warning'
                              }
                              size="sm"
                            />
                          </div>
                          <Button
                            variant="secondary"
                            size="sm"
                            icon={<ArrowRight size={12} />}
                            iconPosition="right"
                            onClick={() => {
                              onClose();
                              navigate(`/relationships?id=${rel.id}`);
                            }}
                          >
                            Inspect Relationship
                          </Button>
                        </div>
                      );
                    })}
                  </div>
                )}
              </section>

              {/* Chronology & Timestamps */}
              <div className="cw-drawer__meta">
                <span>Record Created: {formatDateTime(complaint.created_at)}</span>
                <span>Last Updated: {formatDateTime(complaint.updated_at)}</span>
              </div>
            </div>
          ) : null}
        </div>
      </aside>
    </>
  );
};
