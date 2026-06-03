// SPDX-License-Identifier: GPL-3.0-or-later
import { describe, it, expect } from 'vitest';
import { getDropNeighbors } from '../lib/board';
import type { IssueView } from '@gira/shared';

function makeIssue(key: string): IssueView {
  return {
    id: key,
    key,
    projectKey: 'GIRA',
    title: `Issue ${key}`,
    description: '',
    type: 'task',
    priority: 'medium',
    statusId: 'status-1',
    assignee: null,
    reporter: null,
    sprintId: null,
    parentId: null,
    storyPoints: null,
    estimateMinutes: null,
    rank: key,
    dueAt: null,
    billingMode: 'hourly',
    fixedPriceCents: null,
    labels: [],
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    closedAt: null,
    resolution: null,
    blockedReason: null,
    severity: null,
    reopenCount: 0,
    moscow: null,
  };
}

describe('getDropNeighbors', () => {
  const columnIssues = [
    makeIssue('GIRA-1'),
    makeIssue('GIRA-2'),
    makeIssue('GIRA-3'),
    makeIssue('GIRA-4'),
  ];

  it('returns undefined for both neighbors when dropping into empty column', () => {
    const result = getDropNeighbors([], 0);
    expect(result).toEqual({ beforeId: undefined, afterId: undefined });
  });

  it('returns only afterId when dropping at the top (index 0)', () => {
    const result = getDropNeighbors(columnIssues, 0);
    expect(result).toEqual({ beforeId: undefined, afterId: 'GIRA-1' });
  });

  it('returns only beforeId when dropping at the bottom (past last item)', () => {
    const result = getDropNeighbors(columnIssues, 4);
    expect(result).toEqual({ beforeId: 'GIRA-4', afterId: undefined });
  });

  it('returns both neighbors when dropping in the middle', () => {
    const result = getDropNeighbors(columnIssues, 2);
    expect(result).toEqual({ beforeId: 'GIRA-2', afterId: 'GIRA-3' });
  });

  it('excludes the dragged item when skipKey is provided', () => {
    // Dragging GIRA-2 (was at index 1) and dropping at index 1 → skips GIRA-2,
    // so the remaining list is [GIRA-1, GIRA-3, GIRA-4].
    // Dropping at index 1 in that filtered list: before=GIRA-1, after=GIRA-3
    const result = getDropNeighbors(columnIssues, 1, 'GIRA-2');
    expect(result).toEqual({ beforeId: 'GIRA-1', afterId: 'GIRA-3' });
  });

  it('handles a single-item column at index 0', () => {
    const result = getDropNeighbors([makeIssue('GIRA-1')], 0);
    expect(result).toEqual({ beforeId: undefined, afterId: 'GIRA-1' });
  });

  it('handles dropping at end of single-item column', () => {
    const result = getDropNeighbors([makeIssue('GIRA-1')], 1);
    expect(result).toEqual({ beforeId: 'GIRA-1', afterId: undefined });
  });
});
