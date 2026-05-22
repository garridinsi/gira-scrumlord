// SPDX-License-Identifier: GPL-3.0-or-later
import { useState, type FormEvent } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import type { IssueType, Priority, BillingMode } from '@gira/shared';
import { issues as issuesApi } from '../api/client';
import { Spinner } from '../components/ui/Spinner';
import { ErrorMessage } from '../components/ui/ErrorMessage';
import { Button } from '../components/ui/Button';
import { Input, Textarea } from '../components/ui/Input';
import { PriorityBadge, IssueTypeBadge, LabelChip } from '../components/ui/Badge';
import { Avatar } from '../components/ui/Avatar';
import { formatCents, formatMinutes, formatRelativeTime, formatDate } from '../lib/format';
import { useActiveTimer, useStartTimer, useStopTimer } from '../hooks/useTimer';

/**
 * Plain-text Markdown renderer — renders description as preformatted text with
 * whitespace preserved. No HTML injection: content is rendered as text nodes only.
 * A richer renderer (e.g. react-markdown) can be swapped in without API changes.
 */
function MarkdownRenderer({ markdown }: { markdown: string }) {
  return (
    <pre className="font-sans text-sm text-gray-300 whitespace-pre-wrap leading-relaxed break-words">
      {markdown}
    </pre>
  );
}

function WorklogSection({ issueKey }: { issueKey: string }) {
  const queryClient = useQueryClient();
  const [minutes, setMinutes] = useState('');
  const [note, setNote] = useState('');
  const [billable, setBillable] = useState(true);

  const { data: worklogs, isLoading } = useQuery({
    queryKey: ['worklogs', issueKey],
    queryFn: () => issuesApi.worklogs.list(issueKey),
  });

  const addWorklog = useMutation({
    mutationFn: () =>
      issuesApi.worklogs.create(issueKey, {
        minutes: parseInt(minutes, 10),
        note,
        billable,
      }),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['worklogs', issueKey] });
      void queryClient.invalidateQueries({ queryKey: ['cost', issueKey] });
      setMinutes('');
      setNote('');
    },
  });

  function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (parseInt(minutes, 10) > 0) addWorklog.mutate();
  }

  return (
    <div>
      <h3 className="text-sm font-semibold text-gray-300 mb-3">Worklogs</h3>

      {isLoading && <Spinner size="sm" />}

      {worklogs && worklogs.length === 0 && (
        <p className="text-xs text-gray-600 italic mb-3">No time logged yet. The clock is judging you.</p>
      )}

      {worklogs && worklogs.length > 0 && (
        <div className="space-y-1.5 mb-4">
          {worklogs.map((wl) => (
            <div
              key={wl.id}
              className="flex items-center gap-2 text-xs rounded bg-surface-800 px-2.5 py-1.5"
            >
              <Avatar user={wl.user} size="xs" />
              <span className="font-mono text-accent-300">{formatMinutes(wl.minutes)}</span>
              {wl.billable && (
                <span className="text-green-600 text-xs" title="Billable">$</span>
              )}
              {wl.note && <span className="text-gray-400 truncate flex-1">{wl.note}</span>}
              <span className="text-gray-600 ml-auto">{formatDate(wl.loggedAt)}</span>
            </div>
          ))}
        </div>
      )}

      <form onSubmit={handleSubmit} className="flex gap-2 items-end flex-wrap">
        <Input
          label="Minutes"
          type="number"
          min={1}
          max={1440}
          value={minutes}
          onChange={(e) => setMinutes(e.target.value)}
          placeholder="30"
          className="w-20"
          required
        />
        <Input
          label="Note"
          value={note}
          onChange={(e) => setNote(e.target.value)}
          placeholder="What was done…"
          className="flex-1 min-w-32"
        />
        <div className="flex items-center gap-1.5 pb-2">
          <input
            type="checkbox"
            id="billable"
            checked={billable}
            onChange={(e) => setBillable(e.target.checked)}
            className="rounded border-surface-600"
          />
          <label htmlFor="billable" className="text-xs text-gray-400">
            Billable
          </label>
        </div>
        <Button
          type="submit"
          variant="secondary"
          size="sm"
          isLoading={addWorklog.isPending}
          className="pb-0.5"
        >
          Log time
        </Button>
      </form>
      {addWorklog.error && <ErrorMessage error={addWorklog.error} className="mt-2" />}
    </div>
  );
}

function CommentsSection({ issueKey }: { issueKey: string }) {
  const queryClient = useQueryClient();
  const [body, setBody] = useState('');

  const { data: comments, isLoading } = useQuery({
    queryKey: ['comments', issueKey],
    queryFn: () => issuesApi.comments.list(issueKey),
  });

  const addComment = useMutation({
    mutationFn: () => issuesApi.comments.create(issueKey, { body: body.trim() }),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['comments', issueKey] });
      setBody('');
    },
  });

  function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (body.trim()) addComment.mutate();
  }

  return (
    <div>
      <h3 className="text-sm font-semibold text-gray-300 mb-3">Comments</h3>

      {isLoading && <Spinner size="sm" />}

      {comments && comments.length === 0 && (
        <p className="text-xs text-gray-600 italic mb-3">
          No comments. Silence. The velociraptor appreciates it.
        </p>
      )}

      {comments && comments.length > 0 && (
        <div className="space-y-3 mb-4">
          {comments.map((c) => (
            <div key={c.id} className="rounded-lg bg-surface-800 border border-surface-700 p-3">
              <div className="flex items-center gap-2 mb-2">
                <Avatar user={c.author} size="xs" />
                <span className="text-xs font-medium text-gray-300">{c.author.name}</span>
                <span className="text-xs text-gray-600 ml-auto">{formatRelativeTime(c.createdAt)}</span>
              </div>
              <p className="text-sm text-gray-300 whitespace-pre-wrap">{c.body}</p>
            </div>
          ))}
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-2">
        <Textarea
          value={body}
          onChange={(e) => setBody(e.target.value)}
          placeholder="Add a comment… (Markdown displayed as-is)"
          rows={3}
          required
        />
        {addComment.error && <ErrorMessage error={addComment.error} />}
        <div className="flex justify-end">
          <Button
            type="submit"
            variant="secondary"
            size="sm"
            isLoading={addComment.isPending}
          >
            Comment
          </Button>
        </div>
      </form>
    </div>
  );
}

function CostPanel({ issueKey }: { issueKey: string }) {
  const { data: cost, isLoading } = useQuery({
    queryKey: ['cost', issueKey],
    queryFn: () => issuesApi.cost(issueKey),
  });

  if (isLoading) return <Spinner size="sm" />;
  if (!cost) return null;

  return (
    <div className="rounded-lg bg-surface-800 border border-surface-700 p-3 space-y-2">
      <h4 className="text-xs font-semibold text-gray-400 uppercase tracking-wide">Cost</h4>
      <div className="grid grid-cols-2 gap-2 text-xs">
        <div>
          <span className="text-gray-500">Total time</span>
          <p className="text-gray-200 font-mono">{formatMinutes(cost.minutes)}</p>
        </div>
        <div>
          <span className="text-gray-500">Billable time</span>
          <p className="text-gray-200 font-mono">{formatMinutes(cost.billableMinutes)}</p>
        </div>
        <div>
          <span className="text-gray-500">Billing mode</span>
          <p className="text-gray-200">{cost.billingMode}</p>
        </div>
        <div>
          <span className="text-gray-500">Accrued</span>
          <p className="text-green-400 font-mono font-semibold">
            {formatCents(cost.accruedCents, cost.currency)}
          </p>
        </div>
        {cost.hourlyCents !== null && (
          <div className="col-span-2">
            <span className="text-gray-500">Hourly rate</span>
            <p className="text-gray-200 font-mono">
              {formatCents(cost.hourlyCents, cost.currency)}/h
            </p>
          </div>
        )}
      </div>
    </div>
  );
}

function TimerButton({ issueKey }: { issueKey: string }) {
  const { data: activeTimer } = useActiveTimer();
  const startTimer = useStartTimer();
  const stopTimer = useStopTimer();

  const isMyTimer = activeTimer?.issueKey === issueKey;
  const otherTimerRunning = !!activeTimer && !isMyTimer;

  if (isMyTimer) {
    return (
      <Button
        variant="danger"
        size="sm"
        isLoading={stopTimer.isPending}
        onClick={() => stopTimer.mutate()}
      >
        Stop timer ({formatMinutes(activeTimer.elapsedMinutes)})
      </Button>
    );
  }

  return (
    <Button
      variant="secondary"
      size="sm"
      isLoading={startTimer.isPending}
      disabled={otherTimerRunning}
      onClick={() => startTimer.mutate(issueKey)}
      title={
        otherTimerRunning ? `Another timer is running (${activeTimer?.issueKey})` : undefined
      }
    >
      Start timer
    </Button>
  );
}

// Inline field editor
function FieldEditor({
  label,
  value,
  onSave,
  options,
  type = 'text',
  placeholder,
  isLoading,
}: {
  label: string;
  value: string;
  onSave: (v: string) => void;
  options?: { value: string; label: string }[];
  type?: string;
  placeholder?: string;
  isLoading?: boolean;
}) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(value);

  if (!editing) {
    return (
      <div className="flex items-center justify-between text-xs">
        <span className="text-gray-500">{label}</span>
        <button
          className="text-gray-300 hover:text-accent-400 transition-colors"
          onClick={() => {
            setDraft(value);
            setEditing(true);
          }}
        >
          {value || '—'}
        </button>
      </div>
    );
  }

  return (
    <form
      className="flex items-center gap-1.5"
      onSubmit={(e) => {
        e.preventDefault();
        onSave(draft);
        setEditing(false);
      }}
    >
      {options ? (
        <select
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          className="flex-1 rounded bg-surface-800 border border-surface-600 px-2 py-1 text-xs text-gray-200 focus:outline-none focus:ring-1 focus:ring-accent-500/50"
          autoFocus
        >
          {options.map((o) => (
            <option key={o.value} value={o.value}>
              {o.label}
            </option>
          ))}
        </select>
      ) : (
        <input
          type={type}
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          placeholder={placeholder}
          className="flex-1 rounded bg-surface-800 border border-surface-600 px-2 py-1 text-xs text-gray-200 focus:outline-none focus:ring-1 focus:ring-accent-500/50"
          autoFocus
        />
      )}
      <Button
        type="submit"
        variant="primary"
        size="sm"
        isLoading={isLoading}
        className="h-6 px-2 text-xs"
      >
        Save
      </Button>
      <Button
        type="button"
        variant="ghost"
        size="sm"
        className="h-6 px-1 text-xs"
        onClick={() => setEditing(false)}
      >
        Cancel
      </Button>
    </form>
  );
}

function MetaRow({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between">
      <span className="text-xs text-gray-500">{label}</span>
      <div className="text-xs text-gray-300">{children}</div>
    </div>
  );
}

export function IssueDetailPage() {
  const { key } = useParams<{ key: string }>();
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const [editTitle, setEditTitle] = useState(false);
  const [editDesc, setEditDesc] = useState(false);
  const [titleVal, setTitleVal] = useState('');
  const [descVal, setDescVal] = useState('');

  const { data: issue, isLoading, error } = useQuery({
    queryKey: ['issue', key],
    queryFn: () => issuesApi.get(key!),
    enabled: !!key,
  });

  // Sync local edit state when issue loads
  const prevKey = issue?.key;
  if (issue && issue.key !== prevKey) {
    setTitleVal(issue.title);
    setDescVal(issue.description);
  }
  // Initialize on first load
  if (issue && !titleVal && !editTitle) {
    setTitleVal(issue.title);
    setDescVal(issue.description);
  }

  const update = useMutation({
    mutationFn: (patch: Parameters<typeof issuesApi.update>[1]) => issuesApi.update(key!, patch),
    onSuccess: (updated) => {
      queryClient.setQueryData(['issue', key], updated);
      void queryClient.invalidateQueries({ queryKey: ['board'] });
      setEditTitle(false);
      setEditDesc(false);
    },
  });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-full">
        <Spinner size="lg" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-6">
        <ErrorMessage error={error} />
      </div>
    );
  }

  if (!issue) return null;

  return (
    <div className="max-w-5xl mx-auto px-6 py-6">
      {/* Breadcrumb */}
      <div className="flex items-center gap-2 text-xs text-gray-500 mb-6">
        <button onClick={() => navigate(-1)} className="hover:text-gray-300 transition-colors">
          Back
        </button>
        <span>/</span>
        <Link
          to={`/projects/${issue.projectKey}/board`}
          className="hover:text-accent-400 transition-colors"
        >
          {issue.projectKey}
        </Link>
        <span>/</span>
        <span className="font-mono text-gray-400">{issue.key}</span>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main content */}
        <div className="lg:col-span-2 space-y-6">
          {/* Title */}
          <div>
            {editTitle ? (
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  update.mutate({ title: titleVal });
                }}
                className="flex gap-2"
              >
                <Input
                  value={titleVal}
                  onChange={(e) => setTitleVal(e.target.value)}
                  className="flex-1 text-lg font-semibold"
                  autoFocus
                  required
                  maxLength={200}
                />
                <Button type="submit" variant="primary" size="sm" isLoading={update.isPending}>
                  Save
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => setEditTitle(false)}
                >
                  Cancel
                </Button>
              </form>
            ) : (
              <button
                className="text-xl font-semibold text-gray-100 text-left w-full hover:text-white group"
                onClick={() => {
                  setTitleVal(issue.title);
                  setEditTitle(true);
                }}
              >
                {issue.title}
                <span className="ml-2 text-xs text-gray-600 opacity-0 group-hover:opacity-100 transition-opacity">
                  edit
                </span>
              </button>
            )}
          </div>

          {/* Description */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-sm font-semibold text-gray-400">Description</h3>
              {!editDesc && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    setDescVal(issue.description);
                    setEditDesc(true);
                  }}
                >
                  Edit
                </Button>
              )}
            </div>
            {editDesc ? (
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  update.mutate({ description: descVal });
                }}
                className="space-y-2"
              >
                <Textarea
                  value={descVal}
                  onChange={(e) => setDescVal(e.target.value)}
                  rows={8}
                  autoFocus
                  maxLength={50_000}
                  placeholder="Markdown displayed as-is…"
                />
                <div className="flex gap-2">
                  <Button
                    type="submit"
                    variant="primary"
                    size="sm"
                    isLoading={update.isPending}
                  >
                    Save
                  </Button>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => setEditDesc(false)}
                  >
                    Cancel
                  </Button>
                </div>
              </form>
            ) : issue.description ? (
              <div className="rounded-lg bg-surface-850 border border-surface-700 p-4">
                <MarkdownRenderer markdown={issue.description} />
              </div>
            ) : (
              <p className="text-sm text-gray-600 italic">
                No description. The abyss stares back.
              </p>
            )}
          </div>

          {/* Timer */}
          <div className="flex items-center gap-3">
            <TimerButton issueKey={issue.key} />
          </div>

          {/* Worklogs */}
          <div className="rounded-lg bg-surface-900 border border-surface-800 p-4">
            <WorklogSection issueKey={issue.key} />
          </div>

          {/* Comments */}
          <div className="rounded-lg bg-surface-900 border border-surface-800 p-4">
            <CommentsSection issueKey={issue.key} />
          </div>
        </div>

        {/* Sidebar metadata */}
        <div className="space-y-4">
          {/* Key + type + priority */}
          <div className="rounded-lg bg-surface-900 border border-surface-800 p-4 space-y-3">
            <div className="flex items-center gap-2">
              <IssueTypeBadge type={issue.type} showLabel />
              <span className="font-mono text-xs text-gray-500">{issue.key}</span>
            </div>
            <PriorityBadge priority={issue.priority} />

            {/* Inline editable fields */}
            <div className="space-y-2 pt-2 border-t border-surface-800">
              <FieldEditor
                label="Type"
                value={issue.type}
                onSave={(v) => update.mutate({ type: v as IssueType })}
                options={[
                  { value: 'task', label: 'Task' },
                  { value: 'bug', label: 'Bug' },
                  { value: 'story', label: 'Story' },
                  { value: 'epic', label: 'Epic' },
                ]}
                isLoading={update.isPending}
              />
              <FieldEditor
                label="Priority"
                value={issue.priority}
                onSave={(v) => update.mutate({ priority: v as Priority })}
                options={[
                  { value: 'emergency', label: '!! Emergency' },
                  { value: 'urgent', label: 'Urgent' },
                  { value: 'high', label: 'High' },
                  { value: 'medium', label: 'Medium' },
                  { value: 'low', label: 'Low' },
                ]}
                isLoading={update.isPending}
              />
              <FieldEditor
                label="Story Points"
                value={issue.storyPoints?.toString() ?? ''}
                onSave={(v) => update.mutate({ storyPoints: v ? parseInt(v, 10) : null })}
                type="number"
                placeholder="0"
                isLoading={update.isPending}
              />
              <FieldEditor
                label="Billing"
                value={issue.billingMode}
                onSave={(v) => update.mutate({ billingMode: v as BillingMode })}
                options={[
                  { value: 'hourly', label: 'Hourly' },
                  { value: 'fixed', label: 'Fixed price' },
                ]}
                isLoading={update.isPending}
              />
              {issue.billingMode === 'fixed' && (
                <FieldEditor
                  label="Fixed price (cents)"
                  value={issue.fixedPriceCents?.toString() ?? ''}
                  onSave={(v) => update.mutate({ fixedPriceCents: v ? parseInt(v, 10) : null })}
                  type="number"
                  placeholder="0"
                  isLoading={update.isPending}
                />
              )}
            </div>
          </div>

          {/* People */}
          <div className="rounded-lg bg-surface-900 border border-surface-800 p-4 space-y-2">
            <MetaRow label="Assignee">
              <div className="flex items-center gap-1.5">
                <Avatar user={issue.assignee} size="sm" />
                <span className="text-sm text-gray-300">
                  {issue.assignee?.name ?? 'Unassigned'}
                </span>
              </div>
            </MetaRow>
            <MetaRow label="Reporter">
              <div className="flex items-center gap-1.5">
                <Avatar user={issue.reporter} size="sm" />
                <span className="text-sm text-gray-300">
                  {issue.reporter?.name ?? '—'}
                </span>
              </div>
            </MetaRow>
          </div>

          {/* Labels */}
          {issue.labels.length > 0 && (
            <div className="rounded-lg bg-surface-900 border border-surface-800 p-4">
              <p className="text-xs text-gray-500 mb-2 uppercase tracking-wide font-medium">
                Labels
              </p>
              <div className="flex flex-wrap gap-1.5">
                {issue.labels.map((l) => (
                  <LabelChip key={l.id} name={l.name} color={l.color} />
                ))}
              </div>
            </div>
          )}

          {/* Dates */}
          <div className="rounded-lg bg-surface-900 border border-surface-800 p-4 space-y-2">
            <MetaRow label="Created">{formatDate(issue.createdAt)}</MetaRow>
            <MetaRow label="Updated">{formatRelativeTime(issue.updatedAt)}</MetaRow>
            {issue.closedAt && (
              <MetaRow label="Closed">{formatDate(issue.closedAt)}</MetaRow>
            )}
          </div>

          {/* Cost panel */}
          <CostPanel issueKey={issue.key} />
        </div>
      </div>
    </div>
  );
}
