/**
 * CaseWeave Date & Time Formatting Utilities
 * Standardized date parsing and overdue/due-soon calculation.
 */

export interface DueStatus {
  status: 'overdue' | 'due_soon' | 'on_track' | 'none';
  label: string;
  isOverdue: boolean;
  isDueSoon: boolean;
  daysDiff?: number;
}

/**
 * Format ISO timestamp into standard British/Indian administrative style (e.g., "14-Oct-2026")
 */
export function formatDate(isoDate?: string | null): string {
  if (!isoDate) return '—';
  try {
    const d = new Date(isoDate);
    if (isNaN(d.getTime())) return isoDate;
    return d.toLocaleDateString('en-GB', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
    });
  } catch {
    return isoDate;
  }
}

/**
 * Format ISO timestamp with 24h time (e.g., "14-Oct-2026, 15:30")
 */
export function formatDateTime(isoDate?: string | null): string {
  if (!isoDate) return '—';
  try {
    const d = new Date(isoDate);
    if (isNaN(d.getTime())) return isoDate;
    const dateStr = d.toLocaleDateString('en-GB', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
    });
    const timeStr = d.toLocaleTimeString('en-GB', {
      hour: '2-digit',
      minute: '2-digit',
      hour12: false,
    });
    return `${dateStr}, ${timeStr}`;
  } catch {
    return isoDate;
  }
}

/**
 * Compute whether an action is overdue or due soon relative to now
 */
export function getDueStatus(dueAt?: string | null, referenceDate: Date = new Date()): DueStatus {
  if (!dueAt) {
    return {
      status: 'none',
      label: 'No due date set',
      isOverdue: false,
      isDueSoon: false,
    };
  }

  try {
    const target = new Date(dueAt);
    if (isNaN(target.getTime())) {
      return { status: 'none', label: dueAt, isOverdue: false, isDueSoon: false };
    }

    // Difference in whole calendar days
    const diffMs = target.getTime() - referenceDate.getTime();
    const diffDays = Math.ceil(diffMs / (1000 * 60 * 60 * 24));

    if (diffDays < 0) {
      const daysOver = Math.abs(diffDays);
      return {
        status: 'overdue',
        label: daysOver === 1 ? 'Overdue by 1 day' : `Overdue by ${daysOver} days`,
        isOverdue: true,
        isDueSoon: false,
        daysDiff: diffDays,
      };
    } else if (diffDays <= 3) {
      return {
        status: 'due_soon',
        label: diffDays === 0 ? 'Due today' : diffDays === 1 ? 'Due tomorrow' : `Due in ${diffDays} days`,
        isOverdue: false,
        isDueSoon: true,
        daysDiff: diffDays,
      };
    } else {
      return {
        status: 'on_track',
        label: `Due ${formatDate(dueAt)}`,
        isOverdue: false,
        isDueSoon: false,
        daysDiff: diffDays,
      };
    }
  } catch {
    return { status: 'none', label: dueAt, isOverdue: false, isDueSoon: false };
  }
}

/**
 * Relative age calculation (e.g., "3 days ago")
 */
export function formatRelativeTime(isoDate?: string | null): string {
  if (!isoDate) return '—';
  try {
    const d = new Date(isoDate);
    const now = new Date();
    const diffSecs = Math.floor((now.getTime() - d.getTime()) / 1000);

    if (diffSecs < 60) return 'Just now';
    if (diffSecs < 3600) return `${Math.floor(diffSecs / 60)}m ago`;
    if (diffSecs < 86400) return `${Math.floor(diffSecs / 3600)}h ago`;
    const diffDays = Math.floor(diffSecs / 86400);
    if (diffDays === 1) return 'Yesterday';
    if (diffDays < 30) return `${diffDays}d ago`;
    return formatDate(isoDate);
  } catch {
    return isoDate;
  }
}
