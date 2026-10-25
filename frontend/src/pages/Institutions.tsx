import React, { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Search,
  X,
  RefreshCw,
  ArrowRight,
  FileText,
} from 'lucide-react';
import { PageHeader } from '../components/common/PageHeader.tsx';
import { StatusBadge } from '../components/common/StatusBadge.tsx';
import { Button } from '../components/common/Button.tsx';
import { DataTable, ColumnDef } from '../components/common/DataTable.tsx';
import { ErrorMessage } from '../components/common/ErrorMessage.tsx';
import { EmptyState } from '../components/common/EmptyState.tsx';
import { apiClient } from '../services/apiClient.ts';
import { useApi } from '../hooks/useApi.ts';
import { Institution } from '../types/entities.ts';
import { formatDate } from '../utils/dateUtils.ts';
import './Institutions.css';

// Helper to extract items from paginated envelope or raw array
function extractItems<T>(res: unknown): T[] {
  if (!res) return [];
  if (Array.isArray(res)) return res as T[];
  if (typeof res === 'object' && res !== null && 'items' in res && Array.isArray((res as { items: unknown[] }).items)) {
    return (res as { items: T[] }).items;
  }
  return [];
}

export const Institutions: React.FC = () => {
  const navigate = useNavigate();
  const [searchQuery, setSearchQuery] = useState('');

  // Fetch Institutions from Backend
  const {
    data: rawData,
    isLoading,
    error,
    refetch,
  } = useApi(
    () => apiClient.getInstitutions({ search: searchQuery.trim() || undefined }),
    [searchQuery]
  );

  const institutions: Institution[] = useMemo(
    () => extractItems<Institution>(rawData),
    [rawData]
  );

  const handleResetSearch = () => {
    setSearchQuery('');
  };

  // Table Column Definitions
  const columns: ColumnDef<Institution>[] = [
    {
      key: 'canonical_name',
      header: 'Canonical Institution Name',
      render: (inst) => (
        <div className="cw-inst-name-cell">
          <span className="cw-inst-name-cell__title" title={inst.canonical_name}>
            {inst.canonical_name}
          </span>
          {inst.region && <span className="cw-inst-name-cell__region">{inst.region}</span>}
        </div>
      ),
    },
    {
      key: 'normalized_identifier',
      header: 'Permanent ID',
      width: '160px',
      render: (inst) =>
        inst.normalized_identifier ? (
          <span className="ref-mono" title={inst.normalized_identifier}>
            {inst.normalized_identifier}
          </span>
        ) : (
          <span className="cw-inst-unverified">Unverified ID</span>
        ),
    },
    {
      key: 'aliases',
      header: 'Known Aliases',
      render: (inst) => {
        if (!inst.aliases || inst.aliases.length === 0) {
          return <span className="cw-inst-muted">None recorded</span>;
        }
        return (
          <div className="cw-inst-aliases" title={inst.aliases.join(', ')}>
            <span className="cw-inst-alias-first">{inst.aliases[0]}</span>
            {inst.aliases.length > 1 && (
              <span className="cw-inst-alias-count">+{inst.aliases.length - 1}</span>
            )}
          </div>
        );
      },
    },
    {
      key: 'complaints_count',
      header: 'Complaints',
      width: '110px',
      render: (inst) => (
        <div className="cw-inst-count">
          <FileText size={13} aria-hidden="true" />
          <span>{inst.complaints_count !== undefined ? inst.complaints_count : '—'}</span>
        </div>
      ),
    },
    {
      key: 'bureaus_represented',
      header: 'Bureaus Represented',
      render: (inst) => {
        if (!inst.bureaus_represented || inst.bureaus_represented.length === 0) {
          return <span className="cw-inst-muted">—</span>;
        }
        return (
          <div className="cw-inst-bureaus">
            {inst.bureaus_represented.map((b, i) => (
              <span key={i} className="cw-inst-bureau-pill">
                {b}
              </span>
            ))}
          </div>
        );
      },
    },
    {
      key: 'latest_activity_at',
      header: 'Latest Activity',
      width: '120px',
      render: (inst) => (
        <span className="cw-inst-date">
          {inst.latest_activity_at ? formatDate(inst.latest_activity_at) : '—'}
        </span>
      ),
    },
    {
      key: 'action',
      header: 'Profile',
      width: '110px',
      align: 'right',
      render: (inst) => (
        <Button
          variant="secondary"
          size="sm"
          icon={<ArrowRight size={13} />}
          iconPosition="right"
          onClick={(e) => {
            e.stopPropagation();
            navigate(`/institutions/${encodeURIComponent(inst.id)}`);
          }}
          aria-label={`View profile for ${inst.canonical_name}`}
        >
          Profile
        </Button>
      ),
    },
  ];

  return (
    <div className="page-container cw-institutions-page">
      <PageHeader
        eyebrow="Institution Directory"
        title="Institutions"
        description="Searchable registry of educational institutions, resolved identifiers, recorded aliases, and cross-bureau activity."
        badge={<StatusBadge label="SYNTHETIC DIRECTORY" variant="neutral" />}
        actions={
          <Button
            variant="tertiary"
            size="sm"
            icon={<RefreshCw size={13} />}
            onClick={() => refetch()}
            aria-label="Refresh institutions directory"
          >
            Refresh
          </Button>
        }
      />

      {/* Search Bar */}
      <div className="cw-institutions-search-bar">
        <div className="cw-institutions-search-wrap">
          <Search size={15} className="cw-institutions-search-icon" aria-hidden="true" />
          <input
            type="search"
            className="cw-institutions-search-input"
            placeholder="Search by canonical name, known alias, or permanent identifier..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            aria-label="Search institutions"
          />
          {searchQuery && (
            <button
              type="button"
              className="cw-institutions-search-clear"
              onClick={handleResetSearch}
              aria-label="Clear search query"
            >
              <X size={14} aria-hidden="true" />
            </button>
          )}
        </div>
      </div>

      {/* Surface API Error Honestly */}
      {error && (
        <ErrorMessage
          error={error}
          title="Institution Directory Unavailable"
          onRetry={() => refetch()}
        />
      )}

      {/* Result Count */}
      <div className="cw-institutions-summary-row">
        <span className="cw-institutions-count-text">
          {isLoading
            ? 'Loading institutions...'
            : `Showing ${institutions.length} registered institution${
                institutions.length === 1 ? '' : 's'
              }`}
        </span>
      </div>

      {/* Institutions Table */}
      <DataTable
        columns={columns}
        data={institutions}
        keyExtractor={(item) => item.id}
        isLoading={isLoading}
        loadingRowCount={5}
        onRowClick={(item) => navigate(`/institutions/${encodeURIComponent(item.id)}`)}
        caption="Registered institutions directory"
        emptyMessage={
          searchQuery.trim() ? (
            <EmptyState
              title="No institutions match search query"
              description={`Zero institutions in the dataset match "${searchQuery}". Check the identifier or alias.`}
              actionLabel="Clear search"
              onAction={handleResetSearch}
            />
          ) : (
            <EmptyState
              title="No institutions registered"
              description="The database currently contains zero registered institutions. Reload the synthetic demo dataset."
            />
          )
        }
      />
    </div>
  );
};
