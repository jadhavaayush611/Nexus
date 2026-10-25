import React, { useState, useEffect, useMemo } from 'react';
import { useSearchParams } from 'react-router-dom';
import {
  Search,
  X,
  RefreshCw,
  Clock,
  Layers,
  ArrowRight,
} from 'lucide-react';
import { PageHeader } from '../components/common/PageHeader.tsx';
import { StatusBadge } from '../components/common/StatusBadge.tsx';
import { Button } from '../components/common/Button.tsx';
import { DataTable, ColumnDef } from '../components/common/DataTable.tsx';
import { ErrorMessage } from '../components/common/ErrorMessage.tsx';
import { EmptyState } from '../components/common/EmptyState.tsx';
import { ComplaintDetailDrawer } from '../components/complaints/ComplaintDetailDrawer.tsx';
import { apiClient } from '../services/apiClient.ts';
import { useApi } from '../hooks/useApi.ts';
import { Complaint } from '../types/entities.ts';
import { formatDate, getDueStatus } from '../utils/dateUtils.ts';
import './Complaints.css';

// Helper to extract items from paginated envelope or raw array
function extractItems<T>(res: unknown): T[] {
  if (!res) return [];
  if (Array.isArray(res)) return res as T[];
  if (typeof res === 'object' && res !== null && 'items' in res && Array.isArray((res as { items: unknown[] }).items)) {
    return (res as { items: T[] }).items;
  }
  return [];
}

type SavedView = 'all' | 'overdue' | 'awaiting_review' | 'open';

export const Complaints: React.FC = () => {
  const [searchParams, setSearchParams] = useSearchParams();

  // Read URL query params
  const initialSearch = searchParams.get('search') || '';
  const initialBureau = searchParams.get('bureau') || '';
  const initialStatus = searchParams.get('status') || '';
  const initialDueStatus = searchParams.get('due_status') || '';
  const activeComplaintId = searchParams.get('id');

  // Filter State
  const [searchQuery, setSearchQuery] = useState(initialSearch);
  const [selectedBureau, setSelectedBureau] = useState(initialBureau);
  const [selectedStatus, setSelectedStatus] = useState(initialStatus);
  const [selectedDueStatus, setSelectedDueStatus] = useState(initialDueStatus);
  const [activeTab, setActiveTab] = useState<SavedView>('all');

  // Sync state if URL query params change (e.g. from Topbar search)
  useEffect(() => {
    setSearchQuery(searchParams.get('search') || '');
    setSelectedBureau(searchParams.get('bureau') || '');
    setSelectedStatus(searchParams.get('status') || '');
    const due = searchParams.get('due_status') || '';
    setSelectedDueStatus(due);

    if (due === 'overdue') setActiveTab('overdue');
    else if (searchParams.get('status') === 'open') setActiveTab('open');
    else if (searchParams.get('relationship_state') === 'suggested') setActiveTab('awaiting_review');
    else setActiveTab('all');
  }, [searchParams]);

  // Fetch Complaints from Backend
  const {
    data: rawData,
    isLoading,
    error,
    refetch,
    setData,
  } = useApi(
    () =>
      apiClient.getComplaints({
        search: searchQuery.trim() || undefined,
        bureau: selectedBureau || undefined,
        status: selectedStatus || undefined,
        due_status: (selectedDueStatus as 'overdue' | 'due_soon' | 'all') || undefined,
      }),
    [searchQuery, selectedBureau, selectedStatus, selectedDueStatus]
  );

  const complaints: Complaint[] = useMemo(() => extractItems<Complaint>(rawData), [rawData]);

  // Update URL Search Parameters
  const updateFilters = (newParams: Record<string, string | null>) => {
    const current = new URLSearchParams(searchParams);
    for (const [key, value] of Object.entries(newParams)) {
      if (value) {
        current.set(key, value);
      } else {
        current.delete(key);
      }
    }
    setSearchParams(current);
  };

  const handleTabChange = (view: SavedView) => {
    setActiveTab(view);
    if (view === 'all') {
      updateFilters({ due_status: null, status: null, relationship_state: null });
    } else if (view === 'overdue') {
      updateFilters({ due_status: 'overdue', status: null, relationship_state: null });
    } else if (view === 'open') {
      updateFilters({ status: 'open', due_status: null, relationship_state: null });
    } else if (view === 'awaiting_review') {
      updateFilters({ relationship_state: 'suggested', due_status: null, status: null });
    }
  };

  const handleResetFilters = () => {
    setSearchQuery('');
    setSelectedBureau('');
    setSelectedStatus('');
    setSelectedDueStatus('');
    setActiveTab('all');
    setSearchParams(new URLSearchParams());
  };

  const handleOpenDetail = (id: string) => {
    updateFilters({ id });
  };

  const handleCloseDetail = () => {
    updateFilters({ id: null });
  };

  const handleComplaintUpdated = (updated: Complaint) => {
    setData((prev) => {
      if (!prev) return prev;
      if (Array.isArray(prev)) {
        return prev.map((c) => (c.id === updated.id ? updated : c));
      }
      return {
        ...prev,
        items: prev.items.map((c) => (c.id === updated.id ? updated : c)),
      };
    });
  };

  const hasActiveFilters = Boolean(
    searchQuery || selectedBureau || selectedStatus || selectedDueStatus
  );

  // Table Column Definitions
  const columns: ColumnDef<Complaint>[] = [
    {
      key: 'external_reference',
      header: 'Reference ID',
      width: '180px',
      render: (c) => (
        <span className="cw-complaints-ref ref-mono" title={c.external_reference}>
          {c.external_reference}
        </span>
      ),
    },
    {
      key: 'institution',
      header: 'Institution',
      render: (c) => {
        const canonical = c.institution?.canonical_name;
        const normId = c.institution?.normalized_identifier;
        return (
          <div className="cw-complaints-inst">
            <span className="cw-complaints-inst__name" title={canonical || c.institution_name_raw}>
              {canonical || c.institution_name_raw}
            </span>
            {normId ? (
              <span className="cw-complaints-inst__id ref-mono">{normId}</span>
            ) : (
              <span className="cw-complaints-inst__unverified">Unverified ID</span>
            )}
          </div>
        );
      },
    },
    {
      key: 'bureau',
      header: 'Bureau',
      width: '140px',
      render: (c) => <span className="cw-complaints-bureau-tag">{c.bureau}</span>,
    },
    {
      key: 'category',
      header: 'Category',
      render: (c) => (
        <span className="cw-complaints-category" title={c.category}>
          {c.category}
        </span>
      ),
    },
    {
      key: 'status',
      header: 'Case Status',
      width: '120px',
      render: (c) => (
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
      ),
    },
    {
      key: 'assigned_role',
      header: 'Owner Label',
      render: (c) => (
        <span className="cw-complaints-role" title={c.assigned_role}>
          {c.assigned_role || 'Unassigned'}
        </span>
      ),
    },
    {
      key: 'submitted_at',
      header: 'Submitted',
      width: '110px',
      render: (c) => (
        <span className="cw-complaints-date">{formatDate(c.submitted_at)}</span>
      ),
    },
    {
      key: 'next_action',
      header: 'Next Action & Due Date',
      render: (c) => {
        const due = getDueStatus(c.due_at);
        return (
          <div className="cw-complaints-action-cell">
            <span className="cw-complaints-action-text" title={c.next_action}>
              {c.next_action || 'No action recorded'}
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
        );
      },
    },
    {
      key: 'action',
      header: 'Action',
      width: '90px',
      align: 'right',
      render: (c) => (
        <Button
          variant="secondary"
          size="sm"
          icon={<ArrowRight size={13} />}
          iconPosition="right"
          onClick={(e) => {
            e.stopPropagation();
            handleOpenDetail(c.id);
          }}
          aria-label={`Inspect complaint ${c.external_reference}`}
        >
          View
        </Button>
      ),
    },
  ];

  return (
    <div className="page-container cw-complaints-page">
      <PageHeader
        eyebrow="Operations Register"
        title="Complaints Register"
        description="Filterable register of all complaints across AICTE bureaus, with references, ownership, and relationship state."
        badge={<StatusBadge label="SYNTHETIC RECORDS" variant="neutral" />}
        actions={
          <Button
            variant="tertiary"
            size="sm"
            icon={<RefreshCw size={13} />}
            onClick={() => refetch()}
            aria-label="Refresh complaints register"
          >
            Refresh
          </Button>
        }
      />

      {/* Saved Views Bar */}
      <div className="cw-complaints-tabs" role="tablist" aria-label="Complaint filter views">
        <button
          type="button"
          role="tab"
          aria-selected={activeTab === 'all'}
          className={`cw-complaints-tab ${activeTab === 'all' ? 'cw-complaints-tab--active' : ''}`}
          onClick={() => handleTabChange('all')}
        >
          All Complaints
        </button>
        <button
          type="button"
          role="tab"
          aria-selected={activeTab === 'overdue'}
          className={`cw-complaints-tab ${activeTab === 'overdue' ? 'cw-complaints-tab--active' : ''}`}
          onClick={() => handleTabChange('overdue')}
        >
          <Clock size={13} aria-hidden="true" />
          Overdue Actions
        </button>
        <button
          type="button"
          role="tab"
          aria-selected={activeTab === 'open'}
          className={`cw-complaints-tab ${activeTab === 'open' ? 'cw-complaints-tab--active' : ''}`}
          onClick={() => handleTabChange('open')}
        >
          Open Cases
        </button>
        <button
          type="button"
          role="tab"
          aria-selected={activeTab === 'awaiting_review'}
          className={`cw-complaints-tab ${activeTab === 'awaiting_review' ? 'cw-complaints-tab--active' : ''}`}
          onClick={() => handleTabChange('awaiting_review')}
        >
          <Layers size={13} aria-hidden="true" />
          Awaiting Relationship Review
        </button>
      </div>

      {/* Search & Filter Controls */}
      <div className="cw-complaints-filters">
        <div className="cw-complaints-search-wrap">
          <Search size={15} className="cw-complaints-search-icon" aria-hidden="true" />
          <input
            type="search"
            className="cw-complaints-search-input"
            placeholder="Filter by reference, institution, or description..."
            value={searchQuery}
            onChange={(e) => {
              setSearchQuery(e.target.value);
              updateFilters({ search: e.target.value.trim() || null });
            }}
            aria-label="Search complaints"
          />
        </div>

        <div className="cw-complaints-select-group">
          <select
            value={selectedBureau}
            onChange={(e) => {
              setSelectedBureau(e.target.value);
              updateFilters({ bureau: e.target.value || null });
            }}
            className="cw-complaints-select"
            aria-label="Filter by Bureau"
          >
            <option value="">All Bureaus</option>
            <option value="Approval">Approval Bureau</option>
            <option value="Policy & Academic Planning">Policy & Academic Planning</option>
            <option value="Student Welfare">Student Welfare</option>
            <option value="Administration">Administration</option>
          </select>

          <select
            value={selectedStatus}
            onChange={(e) => {
              setSelectedStatus(e.target.value);
              updateFilters({ status: e.target.value || null });
            }}
            className="cw-complaints-select"
            aria-label="Filter by Complaint Status"
          >
            <option value="">All Statuses</option>
            <option value="open">Open</option>
            <option value="under_review">Under Review</option>
            <option value="resolved">Resolved</option>
            <option value="escalated">Escalated</option>
          </select>

          {hasActiveFilters && (
            <Button
              variant="tertiary"
              size="sm"
              icon={<X size={13} />}
              onClick={handleResetFilters}
            >
              Reset Filters
            </Button>
          )}
        </div>
      </div>

      {/* Surface API Error Honestly */}
      {error && (
        <ErrorMessage
          error={error}
          title="Complaints Register Unavailable"
          onRetry={() => refetch()}
        />
      )}

      {/* Active Filter Summary */}
      <div className="cw-complaints-summary-row">
        <span className="cw-complaints-count-text">
          {isLoading
            ? 'Loading complaints...'
            : `Showing ${complaints.length} complaint record${complaints.length === 1 ? '' : 's'}`}
        </span>
      </div>

      {/* Complaints Table */}
      <DataTable
        columns={columns}
        data={complaints}
        keyExtractor={(item) => item.id}
        isLoading={isLoading}
        loadingRowCount={5}
        onRowClick={(item) => handleOpenDetail(item.id)}
        caption="Registered complaint cases across AICTE bureaus"
        emptyMessage={
          hasActiveFilters ? (
            <EmptyState
              title="No complaints match active filters"
              description="No complaints in the synthetic dataset match your search query and filter criteria."
              actionLabel="Reset all filters"
              onAction={handleResetFilters}
            />
          ) : (
            <EmptyState
              title="No complaint records found"
              description="The database currently contains zero registered complaints. Reload the demo dataset to seed fixture records."
            />
          )
        }
      />

      {/* Complaint Detail Side Drawer */}
      <ComplaintDetailDrawer
        complaintId={activeComplaintId}
        onClose={handleCloseDetail}
        onComplaintUpdated={handleComplaintUpdated}
      />
    </div>
  );
};
