// SPDX-License-Identifier: GPL-3.0-or-later
import { useParams, NavLink } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { projects } from '../api/client';
import { Spinner } from '../components/ui/Spinner';
import { ErrorMessage } from '../components/ui/ErrorMessage';
import { formatCents, formatMinutes } from '../lib/format';

function VelocityBar({
  committed,
  completed,
}: {
  committed: number;
  completed: number;
}) {
  const max = Math.max(committed, completed, 1);
  const completedPct = Math.min((completed / max) * 100, 100);
  const committedPct = Math.min((committed / max) * 100, 100);

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between text-xs text-gray-400">
        <span>Committed: <strong className="text-gray-200">{committed}pt</strong></span>
        <span>Completed: <strong className="text-green-400">{completed}pt</strong></span>
      </div>
      <div className="relative h-3 rounded-full bg-surface-700 overflow-hidden">
        {/* Committed bar (background) */}
        <div
          className="absolute inset-y-0 left-0 rounded-full bg-surface-500 transition-all duration-500"
          style={{ width: `${committedPct}%` }}
        />
        {/* Completed bar (foreground) */}
        <div
          className="absolute inset-y-0 left-0 rounded-full bg-accent-500 transition-all duration-500"
          style={{ width: `${completedPct}%` }}
        />
      </div>
      <p className="text-xs text-gray-600 text-right">
        {committed > 0
          ? `${Math.round((completed / committed) * 100)}% of committed points completed`
          : 'No committed points'}
      </p>
    </div>
  );
}

function StatCard({
  label,
  value,
  sub,
  accent = false,
}: {
  label: string;
  value: string;
  sub?: string;
  accent?: boolean;
}) {
  return (
    <div className="rounded-lg bg-surface-900 border border-surface-800 p-4">
      <p className="text-xs text-gray-500 uppercase tracking-wide font-medium mb-1">{label}</p>
      <p className={`text-2xl font-bold font-mono ${accent ? 'text-accent-400' : 'text-gray-100'}`}>
        {value}
      </p>
      {sub && <p className="text-xs text-gray-500 mt-1">{sub}</p>}
    </div>
  );
}

export function ProjectSummaryPage() {
  const { key } = useParams<{ key: string }>();

  const { data: summary, isLoading, error } = useQuery({
    queryKey: ['summary', key],
    queryFn: () => projects.summary(key!),
    enabled: !!key,
  });

  const subNavItems = [
    { to: `/projects/${key}`, label: 'Summary', end: true },
    { to: `/projects/${key}/board`, label: 'Board' },
    { to: `/projects/${key}/backlog`, label: 'Backlog' },
    { to: `/projects/${key}/sprints`, label: 'Sprints' },
  ];

  return (
    <div className="flex flex-col h-full">
      {/* Header with sub-navigation */}
      <div className="px-6 pt-4 border-b border-surface-800">
        <h1 className="text-lg font-semibold text-gray-100 mb-4">
          <span className="text-accent-400">{key}</span>
        </h1>
        <nav className="flex gap-1 -mb-px" aria-label="Project navigation">
          {subNavItems.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.end}
              className={({ isActive }) =>
                `px-3 py-2 text-sm font-medium border-b-2 transition-colors ${
                  isActive
                    ? 'border-accent-500 text-accent-400'
                    : 'border-transparent text-gray-400 hover:text-gray-200 hover:border-surface-600'
                }`
              }
            >
              {item.label}
            </NavLink>
          ))}
        </nav>
      </div>

      <div className="flex-1 overflow-auto px-6 py-6">
        {isLoading && (
          <div className="flex items-center justify-center h-40">
            <Spinner size="lg" />
          </div>
        )}

        {error && <ErrorMessage error={error} />}

        {summary && (
          <div className="space-y-6 max-w-3xl">
            {/* Stats grid */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <StatCard
                label="Total time"
                value={formatMinutes(summary.totalMinutes)}
                sub="all worklogs"
              />
              <StatCard
                label="Billable time"
                value={formatMinutes(summary.billableMinutes)}
                sub={`${summary.totalMinutes > 0 ? Math.round((summary.billableMinutes / summary.totalMinutes) * 100) : 0}% of total`}
                accent
              />
              <StatCard
                label="Accrued cost"
                value={formatCents(summary.accruedCents, summary.currency)}
                sub="resolve-on-read"
              />
              <StatCard
                label="Issues"
                value={String(summary.openIssues + summary.doneIssues)}
                sub={`${summary.openIssues} open · ${summary.doneIssues} done`}
              />
            </div>

            {/* Open vs done */}
            <div className="rounded-lg bg-surface-900 border border-surface-800 p-4">
              <h3 className="text-sm font-semibold text-gray-300 mb-3">Issue breakdown</h3>
              <div className="space-y-2">
                <div className="flex items-center gap-3 text-xs">
                  <div className="w-3 h-3 rounded-full bg-accent-500 shrink-0" />
                  <span className="text-gray-400 w-12">Open</span>
                  <div className="flex-1 h-2 bg-surface-700 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-accent-500 rounded-full transition-all duration-500"
                      style={{
                        width: `${
                          summary.openIssues + summary.doneIssues > 0
                            ? (summary.openIssues / (summary.openIssues + summary.doneIssues)) * 100
                            : 0
                        }%`,
                      }}
                    />
                  </div>
                  <span className="text-gray-200 font-mono w-8 text-right">{summary.openIssues}</span>
                </div>
                <div className="flex items-center gap-3 text-xs">
                  <div className="w-3 h-3 rounded-full bg-green-500 shrink-0" />
                  <span className="text-gray-400 w-12">Done</span>
                  <div className="flex-1 h-2 bg-surface-700 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-green-500 rounded-full transition-all duration-500"
                      style={{
                        width: `${
                          summary.openIssues + summary.doneIssues > 0
                            ? (summary.doneIssues / (summary.openIssues + summary.doneIssues)) * 100
                            : 0
                        }%`,
                      }}
                    />
                  </div>
                  <span className="text-gray-200 font-mono w-8 text-right">{summary.doneIssues}</span>
                </div>
              </div>
            </div>

            {/* Active sprint velocity */}
            {summary.activeSprint && (
              <div className="rounded-lg bg-surface-900 border border-surface-800 p-4">
                <div className="flex items-center gap-2 mb-4">
                  <span className="text-lg animate-spin-slow">🌀</span>
                  <div>
                    <h3 className="text-sm font-semibold text-gray-300">
                      Active Sprint: {summary.activeSprint.name}
                    </h3>
                    <p className="text-xs text-gray-500">Velocity</p>
                  </div>
                </div>
                <VelocityBar
                  committed={summary.activeSprint.velocity.committedPoints}
                  completed={summary.activeSprint.velocity.completedPoints}
                />
                <div className="mt-3 pt-3 border-t border-surface-800 flex gap-6 text-xs text-gray-500">
                  <span>Total issues: <strong className="text-gray-300">{summary.activeSprint.velocity.totalCount}</strong></span>
                  <span>Completed: <strong className="text-green-400">{summary.activeSprint.velocity.completedCount}</strong></span>
                </div>
              </div>
            )}

            {!summary.activeSprint && (
              <div className="rounded-lg bg-surface-900 border border-surface-800 p-4">
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-lg opacity-30">🌀</span>
                  <h3 className="text-sm font-semibold text-gray-500">No active sprint</h3>
                </div>
                <p className="text-xs text-gray-600 italic">
                  The board is still. The velocity chart awaits. Start a sprint to summon the storm.
                </p>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
