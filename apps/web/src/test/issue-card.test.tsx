// SPDX-License-Identifier: GPL-3.0-or-later
import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
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

describe('IssueCard', () => {
  it('renders key, title, and the unassigned state by default', () => {
    render(<IssueCard issue={makeIssue()} />);
    expect(screen.getByText('GIRA-1')).toBeInTheDocument();
    expect(screen.getByText('Build the rocket sled')).toBeInTheDocument();
    expect(screen.getByText(/unassigned/i)).toBeInTheDocument();
  });

  it('shows the assignee first name and story points when present', () => {
    render(
      <IssueCard
        issue={makeIssue({
          assignee: { id: 'u1', name: 'Ada Lovelace' } as IssueView['assignee'],
          storyPoints: 5,
        })}
      />,
    );
    expect(screen.getByText('Ada')).toBeInTheDocument();
    expect(screen.getByText(/5 pts/)).toBeInTheDocument();
  });

  it('renders the fixed-price chip for fixed billing', () => {
    render(<IssueCard issue={makeIssue({ billingMode: 'fixed', fixedPriceCents: 25000 })} />);
    expect(screen.getByText(/fixed/)).toBeInTheDocument();
  });

  it('marks an overdue, not-done issue with a due badge', () => {
    const past = new Date(Date.now() - 86_400_000).toISOString();
    const { container } = render(
      <IssueCard issue={makeIssue({ dueAt: past, statusCategory: 'todo' })} />,
    );
    const badge = container.querySelector('[title^="Vencimiento"]');
    expect(badge).not.toBeNull();
    expect(badge!.textContent).toContain('!!'); // overdue prefix
  });

  it('shows a Blocked badge when the issue has a blockedReason (D1)', () => {
    render(
      <IssueCard issue={makeIssue({ blockedReason: 'waiting on client' } as Partial<IssueView>)} />,
    );
    expect(screen.getByText(/BLOCKED/)).toBeInTheDocument();
  });

  it('shows a severity badge when set (D3)', () => {
    render(<IssueCard issue={makeIssue({ severity: 'critical' } as Partial<IssueView>)} />);
    expect(screen.getByText(/SEV · CRITICAL/)).toBeInTheDocument();
  });

  it('renders emergency styling without crashing and fires onClick', async () => {
    const onClick = vi.fn();
    render(<IssueCard issue={makeIssue({ priority: 'emergency' })} onClick={onClick} />);
    await userEvent.click(screen.getByText('Build the rocket sled'));
    expect(onClick).toHaveBeenCalledTimes(1);
  });
});
