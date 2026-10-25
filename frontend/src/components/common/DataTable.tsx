import React from 'react';
import './DataTable.css';

export interface ColumnDef<T> {
  key: string;
  header: React.ReactNode;
  render?: (item: T, index: number) => React.ReactNode;
  width?: string;
  align?: 'left' | 'center' | 'right';
}

export interface DataTableProps<T> {
  columns: ColumnDef<T>[];
  data: T[];
  keyExtractor: (item: T, index: number) => string;
  caption?: string;
  isLoading?: boolean;
  loadingRowCount?: number;
  emptyMessage?: React.ReactNode;
  onRowClick?: (item: T) => void;
  className?: string;
}

export function DataTable<T>({
  columns,
  data,
  keyExtractor,
  caption,
  isLoading = false,
  loadingRowCount = 4,
  emptyMessage = 'No records match the selected criteria.',
  onRowClick,
  className = '',
}: DataTableProps<T>) {
  return (
    <div className={`cw-table-wrapper ${className}`}>
      <table className="cw-table">
        {caption && <caption className="sr-only">{caption}</caption>}
        <thead>
          <tr>
            {columns.map((col) => (
              <th
                key={col.key}
                scope="col"
                style={{
                  width: col.width,
                  textAlign: col.align || 'left',
                }}
                className={`cw-table__th cw-table__th--${col.align || 'left'}`}
              >
                {col.header}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {isLoading ? (
            Array.from({ length: loadingRowCount }).map((_, rIdx) => (
              <tr key={`loading-row-${rIdx}`} className="cw-table__tr--loading">
                {columns.map((col) => (
                  <td key={col.key} className="cw-table__td">
                    <div className="cw-table__skeleton" />
                  </td>
                ))}
              </tr>
            ))
          ) : data.length === 0 ? (
            <tr>
              <td colSpan={columns.length} className="cw-table__td cw-table__td--empty">
                {emptyMessage}
              </td>
            </tr>
          ) : (
            data.map((item, idx) => {
              const isInteractive = Boolean(onRowClick);
              return (
                <tr
                  key={keyExtractor(item, idx)}
                  className={`cw-table__tr ${isInteractive ? 'cw-table__tr--clickable' : ''}`}
                  onClick={() => onRowClick?.(item)}
                  tabIndex={isInteractive ? 0 : undefined}
                  onKeyDown={(e) => {
                    if (isInteractive && (e.key === 'Enter' || e.key === ' ')) {
                      e.preventDefault();
                      onRowClick?.(item);
                    }
                  }}
                >
                  {columns.map((col) => (
                    <td
                      key={col.key}
                      style={{ textAlign: col.align || 'left' }}
                      className={`cw-table__td cw-table__td--${col.align || 'left'}`}
                    >
                      {col.render
                        ? col.render(item, idx)
                        : String((item as Record<string, unknown>)[col.key] ?? '—')}
                    </td>
                  ))}
                </tr>
              );
            })
          )}
        </tbody>
      </table>
    </div>
  );
}
