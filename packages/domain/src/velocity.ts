// SPDX-License-Identifier: GPL-3.0-or-later
// Sprint velocity: committed vs completed story points. The hurricane is honest.

export interface VelocityIssue {
  storyPoints?: number | null;
  statusCategory: 'todo' | 'in_progress' | 'done';
}

export interface VelocitySummary {
  committedPoints: number;
  completedPoints: number;
  completedCount: number;
  totalPoints: number;
  totalCount: number;
}

/**
 * Compute velocity for a set of issues. "Completed" = status category `done`.
 * `committedOverride` is the points snapshot taken when the sprint started; when
 * absent we fall back to the current total (useful for not-yet-started sprints).
 */
export function velocity(
  issues: readonly VelocityIssue[],
  committedOverride?: number | null,
): VelocitySummary {
  const points = (i: VelocityIssue) => i.storyPoints ?? 0;
  const done = issues.filter((i) => i.statusCategory === 'done');
  const totalPoints = issues.reduce((sum, i) => sum + points(i), 0);
  return {
    committedPoints: committedOverride ?? totalPoints,
    completedPoints: done.reduce((sum, i) => sum + points(i), 0),
    completedCount: done.length,
    totalPoints,
    totalCount: issues.length,
  };
}
