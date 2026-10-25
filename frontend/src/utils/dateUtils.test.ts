import { test, describe } from 'node:test';
import assert from 'node:assert';
import { formatDate, getDueStatus, formatRelativeTime } from './dateUtils.ts';

describe('CaseWeave Date Utilities', () => {
  test('formatDate: formats standard ISO dates correctly', () => {
    const formatted = formatDate('2026-10-14T10:00:00Z');
    assert.match(formatted, /14.*Oct.*2026/);
    assert.strictEqual(formatDate(null), '—');
    assert.strictEqual(formatDate(undefined), '—');
  });

  test('getDueStatus: accurately flags overdue actions against reference date', () => {
    const ref = new Date('2026-10-24T12:00:00Z');

    // 4 days in past
    const overdue = getDueStatus('2026-10-20T12:00:00Z', ref);
    assert.strictEqual(overdue.isOverdue, true);
    assert.strictEqual(overdue.status, 'overdue');
    assert.match(overdue.label, /Overdue by 4 days/);

    // 2 days in future -> due soon
    const dueSoon = getDueStatus('2026-10-26T12:00:00Z', ref);
    assert.strictEqual(dueSoon.isDueSoon, true);
    assert.strictEqual(dueSoon.status, 'due_soon');
    assert.match(dueSoon.label, /Due in 2 days/);

    // 10 days in future -> on track
    const onTrack = getDueStatus('2026-11-03T12:00:00Z', ref);
    assert.strictEqual(onTrack.isOverdue, false);
    assert.strictEqual(onTrack.isDueSoon, false);
    assert.strictEqual(onTrack.status, 'on_track');

    // Missing due date
    const none = getDueStatus(null, ref);
    assert.strictEqual(none.status, 'none');
    assert.strictEqual(none.isOverdue, false);
  });

  test('formatRelativeTime: calculates human-readable relative ages', () => {
    const recent = new Date(Date.now() - 5 * 60 * 1000).toISOString();
    assert.strictEqual(formatRelativeTime(recent), '5m ago');

    const hoursAgo = new Date(Date.now() - 3 * 3600 * 1000).toISOString();
    assert.strictEqual(formatRelativeTime(hoursAgo), '3h ago');
  });
});
