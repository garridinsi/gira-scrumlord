// SPDX-License-Identifier: GPL-3.0-or-later
// Coverage-closing cases for src/ui/IssueCard.tsx. These exercise branches the
// sibling issue-card.test.tsx leaves cold: the logged-hours header math, the
// `dragging` inline-style branches (box-shadow + transform), the `major`/`minor`
// severity-colour arms, the estimate badge, and the non-overdue due-date badge.
import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import type { IssueView } from '@gira/shared';
import { IssueCard } from '../ui/IssueCard';

function makeIssue(overrides: Partial<IssueView> = {}): IssueView {
  return {
    id: 'i1',
    key: 'GIRA-1',
    title: 'Build the rocket sled',
    type: 'task',
    priority: 'medium',
    statusId: 's1',
    statusCategory: 'todo',
    status: { id: 's1', name: 'To Do', category: 'todo', order: 1 },
    assignee: null,
    reporter: null,
    labels: [],
    storyPoints: null,
    estimateMinutes: null,
    dueAt: null,
    billingMode: 'hourly',
    fixedPriceCents: null,
    loggedMinutes: 0,
    ...overrides,
  } as unknown as IssueView;
}

describe('IssueCard coverage', () => {
  it('renders logged hours rounded to one decimal in the header (line 20)', () => {
    // 90 min => 1.5h after the round-to-tenths math.
    render(<IssueCard issue={makeIssue({ loggedMinutes: 90 })} />);
    expect(screen.getByText(/1\.5h/)).toBeInTheDocument();
  });

  it('applies the dragging box-shadow and transform branches (lines 34, 38)', () => {
    const { container } = render(<IssueCard issue={makeIssue()} dragging />);
    const card = container.querySelector('.gs-card') as HTMLElement;
    expect(card).not.toBeNull();
    // dragging => "6px 6px 0 ..." shadow + rotate transform.
    expect(card.style.boxShadow).toContain('6px 6px 0');
    expect(card.style.transform).toContain('rotate(-1deg)');
  });

  it('uses the non-dragging defaults when dragging is false (lines 34, 38 else)', () => {
    const { container } = render(<IssueCard issue={makeIssue()} />);
    const card = container.querySelector('.gs-card') as HTMLElement;
    expect(card.style.boxShadow).toContain('2px 2px 0');
    expect(card.style.transform).toBe('none');
  });

  it('renders the major severity colour arm (lines 92-96)', () => {
    render(<IssueCard issue={makeIssue({ severity: 'major' })} />);
    expect(screen.getByText(/SEV · MAJOR/)).toBeInTheDocument();
  });

  it('renders the minor severity fallback colour arm (lines 92-96 else)', () => {
    render(<IssueCard issue={makeIssue({ severity: 'minor' })} />);
    expect(screen.getByText(/SEV · MINOR/)).toBeInTheDocument();
  });

  it('renders the estimate badge for a positive estimate (lines 166-172)', () => {
    // 90 min => EST 1.5h.
    render(<IssueCard issue={makeIssue({ estimateMinutes: 90 })} />);
    expect(screen.getByText(/EST 1\.5h/)).toBeInTheDocument();
  });

  it('renders a non-overdue due badge without the !! prefix (lines 182-185, 189)', () => {
    const future = new Date(Date.now() + 7 * 86_400_000).toISOString();
    const { container } = render(
      <IssueCard issue={makeIssue({ dueAt: future, statusCategory: 'todo' })} />,
    );
    const badge = container.querySelector('[title^="Vencimiento"]') as HTMLElement;
    expect(badge).not.toBeNull();
    // not overdue => no "!!" prefix, and the iron (not red) border colour.
    expect(badge.textContent).not.toContain('!!');
    expect(badge.style.borderColor).toBe('var(--eg-iron)');
  });

  it('treats a done issue with a past due date as not overdue (line 189 false arm)', () => {
    const past = new Date(Date.now() - 86_400_000).toISOString();
    const { container } = render(
      <IssueCard issue={makeIssue({ dueAt: past, statusCategory: 'done' })} />,
    );
    const badge = container.querySelector('[title^="Vencimiento"]') as HTMLElement;
    expect(badge).not.toBeNull();
    expect(badge.textContent).not.toContain('!!');
  });
});
