import React from 'react';
import { Search, X, GitCompare } from 'lucide-react';
import type { Relationship, RelationshipState } from '../../types/entities.ts';
import { StatusBadge } from '../common/StatusBadge.tsx';
import { formatRelativeTime } from '../../utils/dateUtils.ts';
import './RelationshipQueue.css';

export interface RelationshipQueueProps {
  relationships: Relationship[];
  selectedId: string | null;
  onSelect: (relationship: Relationship) => void;
  stateFilter: RelationshipState | 'all';
  onStateFilterChange: (state: RelationshipState | 'all') => void;
  searchQuery: string;
  onSearchChange: (query: string) => void;
  isLoading?: boolean;
  pendingCount?: number;
}

const STATE_TABS: Array<{ id: RelationshipState | 'all'; label: string }> = [
  { id: 'suggested', label: 'Suggested' },
  { id: 'confirmed', label: 'Confirmed' },
  { id: 'needs_info', label: 'Needs Info' },
  { id: 'dismissed', label: 'Dismissed' },
  { id: 'all', label: 'All' },
];

export const RelationshipQueue: React.FC<RelationshipQueueProps> = ({
  relationships,
  selectedId,
  onSelect,
  stateFilter,
  onStateFilterChange,
  searchQuery,
  onSearchChange,
  isLoading = false,
  pendingCount,
}) => {
  // Filter locally by search query if provided
  const filteredRelationships = React.useMemo(() => {
    if (!searchQuery.trim()) return relationships;
    const q = searchQuery.toLowerCase().trim();

    return relationships.filter((rel) => {
      const refA = rel.complaint_a?.external_reference || rel.complaint_a_id;
      const refB = rel.complaint_b?.external_reference || rel.complaint_b_id;
      const instA =
        rel.complaint_a?.institution?.canonical_name ||
        rel.complaint_a?.institution_name_raw ||
        '';
      const instB =
        rel.complaint_b?.institution?.canonical_name ||
        rel.complaint_b?.institution_name_raw ||
        '';

      return (
        refA.toLowerCase().includes(q) ||
        refB.toLowerCase().includes(q) ||
        instA.toLowerCase().includes(q) ||
        instB.toLowerCase().includes(q)
      );
    });
  }, [relationships, searchQuery]);

  return (
    <aside className="cw-rel-queue" aria-label="Candidate relationship queue">
      <div className="cw-rel-queue__header">
        <div className="cw-rel-queue__title-row">
          <h2 className="cw-rel-queue__title">Candidate Queue</h2>
          <span className="cw-rel-queue__count-badge" aria-label={`${relationships.length} items`}>
            {isLoading ? '...' : relationships.length}
          </span>
        </div>

        {/* State Filter Tabs */}
        <div className="cw-rel-queue__tabs" role="tablist" aria-label="Filter queue by relationship state">
          {STATE_TABS.map((tab) => {
            const isActive = stateFilter === tab.id;
            return (
              <button
                key={tab.id}
                role="tab"
                aria-selected={isActive}
                className={`cw-rel-queue__tab ${isActive ? 'cw-rel-queue__tab--active' : ''}`}
                onClick={() => onStateFilterChange(tab.id)}
              >
                <span>{tab.label}</span>
                {tab.id === 'suggested' && pendingCount !== undefined && pendingCount > 0 && (
                  <span className="cw-rel-queue__tab-count">{pendingCount}</span>
                )}
              </button>
            );
          })}
        </div>

        {/* Local Search Input */}
        <div className="cw-rel-queue__search">
          <Search size={13} className="cw-rel-queue__search-icon" aria-hidden="true" />
          <input
            type="search"
            className="cw-rel-queue__search-input"
            placeholder="Filter by ref or institution..."
            value={searchQuery}
            onChange={(e) => onSearchChange(e.target.value)}
            aria-label="Filter candidate relationships"
          />
          {searchQuery && (
            <button
              type="button"
              className="cw-rel-queue__search-clear"
              onClick={() => onSearchChange('')}
              aria-label="Clear filter query"
            >
              <X size={12} aria-hidden="true" />
            </button>
          )}
        </div>
      </div>

      {/* Queue Items List */}
      <div className="cw-rel-queue__list" role="list">
        {isLoading ? (
          <div className="cw-rel-queue__loading">
            <div className="cw-rel-queue__skeleton-item" />
            <div className="cw-rel-queue__skeleton-item" />
            <div className="cw-rel-queue__skeleton-item" />
          </div>
        ) : filteredRelationships.length === 0 ? (
          <div className="cw-rel-queue__empty">
            <GitCompare size={24} className="cw-rel-queue__empty-icon" aria-hidden="true" />
            <p className="cw-rel-queue__empty-title">
              {searchQuery ? 'No matching candidates' : `No ${stateFilter} relationships`}
            </p>
            <p className="cw-rel-queue__empty-desc">
              {searchQuery
                ? `Zero items match "${searchQuery}". Clear your search to see all candidates.`
                : stateFilter === 'suggested'
                ? 'No suggestions currently require human review in this dataset.'
                : `There are currently no candidate pairs marked as ${stateFilter}.`}
            </p>
            {searchQuery && (
              <button
                type="button"
                className="cw-rel-queue__empty-btn"
                onClick={() => onSearchChange('')}
              >
                Clear filter
              </button>
            )}
          </div>
        ) : (
          filteredRelationships.map((rel) => {
            const isSelected = selectedId === rel.id;
            const refA = rel.complaint_a?.external_reference || rel.complaint_a_id.slice(0, 8);
            const refB = rel.complaint_b?.external_reference || rel.complaint_b_id.slice(0, 8);
            const bureauA = rel.complaint_a?.bureau || 'Bureau A';
            const bureauB = rel.complaint_b?.bureau || 'Bureau B';

            const instName =
              rel.complaint_a?.institution?.canonical_name ||
              rel.complaint_a?.institution_name_raw ||
              rel.complaint_b?.institution?.canonical_name ||
              rel.complaint_b?.institution_name_raw ||
              'Unresolved Institution';

            const instId =
              rel.complaint_a?.institution?.normalized_identifier ||
              rel.complaint_b?.institution?.normalized_identifier;

            const bandVariant =
              rel.score_band === 'High'
                ? 'warning'
                : rel.score_band === 'Review'
                ? 'info'
                : 'neutral';

            const stateVariant =
              rel.state === 'confirmed'
                ? 'success'
                : rel.state === 'dismissed'
                ? 'neutral'
                : rel.state === 'needs_info'
                ? 'warning'
                : 'info';

            return (
              <div
                key={rel.id}
                role="listitem"
                tabIndex={0}
                className={`cw-rel-card ${isSelected ? 'cw-rel-card--selected' : ''}`}
                onClick={() => onSelect(rel)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    onSelect(rel);
                  }
                }}
                aria-current={isSelected ? 'true' : undefined}
                aria-label={`Candidate relationship between ${refA} and ${refB}, ${rel.score_band} band`}
              >
                {/* Active indicator stripe */}
                {isSelected && <div className="cw-rel-card__active-stripe" aria-hidden="true" />}

                {/* Top Row: References */}
                <div className="cw-rel-card__refs">
                  <div className="cw-rel-card__ref-item">
                    <span className="ref-mono cw-rel-card__ref" title={refA}>
                      {refA}
                    </span>
                    <span className="cw-rel-card__bureau">{bureauA}</span>
                  </div>
                  <div className="cw-rel-card__vs" aria-hidden="true">
                    ↔
                  </div>
                  <div className="cw-rel-card__ref-item">
                    <span className="ref-mono cw-rel-card__ref" title={refB}>
                      {refB}
                    </span>
                    <span className="cw-rel-card__bureau cw-rel-card__bureau--secondary">
                      {bureauB}
                    </span>
                  </div>
                </div>

                {/* Institution context */}
                <div className="cw-rel-card__inst">
                  <span className="cw-rel-card__inst-name" title={instName}>
                    {instName}
                  </span>
                  {instId && <span className="cw-rel-card__inst-id ref-mono">{instId}</span>}
                </div>

                {/* Footer: Priority Band & Timestamp */}
                <div className="cw-rel-card__footer">
                  <div className="cw-rel-card__badges">
                    <StatusBadge
                      label={`${rel.score_band} Band`}
                      variant={bandVariant}
                      size="sm"
                    />
                    {rel.state !== 'suggested' && (
                      <StatusBadge
                        label={rel.state.replace('_', ' ')}
                        variant={stateVariant}
                        size="sm"
                      />
                    )}
                  </div>
                  <span className="cw-rel-card__age" title={rel.created_at}>
                    {formatRelativeTime(rel.created_at)}
                  </span>
                </div>
              </div>
            );
          })
        )}
      </div>
    </aside>
  );
};
