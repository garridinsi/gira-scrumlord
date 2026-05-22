// SPDX-License-Identifier: GPL-3.0-or-later
import type { IssueView } from '@gira/shared';

/**
 * Given a list of issues in a column and the index at which an issue was dropped,
 * returns the beforeId and afterId (issue keys) to pass to POST /issues/:key/move.
 *
 * The convention:
 *   - beforeId = the issue key that will be ABOVE the dropped issue (or undefined if at top)
 *   - afterId  = the issue key that will be BELOW the dropped issue (or undefined if at bottom)
 *
 * The server computes a new rank between (beforeId.rank, afterId.rank).
 * Omit both → append to end of column.
 */
export function getDropNeighbors(
  columnIssues: IssueView[],
  droppedIndex: number,
  skipKey?: string,
): { beforeId?: string; afterId?: string } {
  // Filter out the dragged item itself from the neighbor calculation
  const items = skipKey ? columnIssues.filter((i) => i.key !== skipKey) : [...columnIssues];

  const beforeItem = items[droppedIndex - 1];
  const afterItem = items[droppedIndex];

  return {
    beforeId: beforeItem?.key,
    afterId: afterItem?.key,
  };
}
