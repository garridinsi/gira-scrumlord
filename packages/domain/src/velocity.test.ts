// SPDX-License-Identifier: GPL-3.0-or-later
import { describe, expect, it } from 'vitest';
import { velocity } from './velocity.js';

describe('velocity', () => {
  const issues = [
    { storyPoints: 5, statusCategory: 'done' as const },
    { storyPoints: 3, statusCategory: 'done' as const },
    { storyPoints: 8, statusCategory: 'in_progress' as const },
    { storyPoints: 2, statusCategory: 'todo' as const },
    { storyPoints: null, statusCategory: 'done' as const },
  ];

  it('counts completed points/count from done issues only', () => {
    const v = velocity(issues);
    expect(v.completedPoints).toBe(8);
    expect(v.completedCount).toBe(3);
    expect(v.totalPoints).toBe(18);
    expect(v.totalCount).toBe(5);
  });

  it('uses the committed override when provided', () => {
    expect(velocity(issues, 23).committedPoints).toBe(23);
  });

  it('falls back to total points when no override', () => {
    expect(velocity(issues).committedPoints).toBe(18);
  });

  it('handles an empty sprint', () => {
    expect(velocity([])).toEqual({
      committedPoints: 0,
      completedPoints: 0,
      completedCount: 0,
      totalPoints: 0,
      totalCount: 0,
    });
  });
});
