// SPDX-License-Identifier: GPL-3.0-or-later
import type { IssueType, Priority, UserView, LabelView } from '@gira/shared';
import { Input } from '../ui/Input';
import { Button } from '../ui/Button';

export interface BoardFilterState {
  q?: string;
  type?: IssueType;
  priority?: Priority;
  assigneeId?: string;
  labelId?: string;
}

interface BoardFiltersProps {
  filters: BoardFilterState;
  onChange: (f: BoardFilterState) => void;
  assignees: UserView[];
  labels: LabelView[];
}

export function BoardFilters({ filters, onChange, assignees, labels }: BoardFiltersProps) {
  const hasFilters = Object.values(filters).some((v) => v !== undefined && v !== '');

  function set<K extends keyof BoardFilterState>(key: K, value: BoardFilterState[K]) {
    onChange({ ...filters, [key]: value || undefined });
  }

  return (
    <div className="px-6 py-2 border-b border-surface-800 flex items-center gap-3 flex-wrap bg-surface-950/50">
      <Input
        placeholder="Search issues…"
        value={filters.q ?? ''}
        onChange={(e) => set('q', e.target.value)}
        className="h-7 text-xs w-44"
      />

      <select
        value={filters.type ?? ''}
        onChange={(e) => set('type', e.target.value as IssueType | undefined)}
        className="h-7 rounded-md bg-surface-800 border border-surface-600 px-2 text-xs text-gray-300 focus:outline-none focus:ring-1 focus:ring-accent-500/50"
        aria-label="Filter by type"
      >
        <option value="">All types</option>
        <option value="task">Task</option>
        <option value="bug">Bug</option>
        <option value="story">Story</option>
        <option value="epic">Epic</option>
      </select>

      <select
        value={filters.priority ?? ''}
        onChange={(e) => set('priority', e.target.value as Priority | undefined)}
        className="h-7 rounded-md bg-surface-800 border border-surface-600 px-2 text-xs text-gray-300 focus:outline-none focus:ring-1 focus:ring-accent-500/50"
        aria-label="Filter by priority"
      >
        <option value="">All priorities</option>
        <option value="emergency">!! Emergency</option>
        <option value="urgent">Urgent</option>
        <option value="high">High</option>
        <option value="medium">Medium</option>
        <option value="low">Low</option>
      </select>

      {assignees.length > 0 && (
        <select
          value={filters.assigneeId ?? ''}
          onChange={(e) => set('assigneeId', e.target.value)}
          className="h-7 rounded-md bg-surface-800 border border-surface-600 px-2 text-xs text-gray-300 focus:outline-none focus:ring-1 focus:ring-accent-500/50"
          aria-label="Filter by assignee"
        >
          <option value="">All assignees</option>
          {assignees.map((a) => (
            <option key={a.id} value={a.id}>
              {a.name}
            </option>
          ))}
        </select>
      )}

      {labels.length > 0 && (
        <select
          value={filters.labelId ?? ''}
          onChange={(e) => set('labelId', e.target.value)}
          className="h-7 rounded-md bg-surface-800 border border-surface-600 px-2 text-xs text-gray-300 focus:outline-none focus:ring-1 focus:ring-accent-500/50"
          aria-label="Filter by label"
        >
          <option value="">All labels</option>
          {labels.map((l) => (
            <option key={l.id} value={l.id}>
              {l.name}
            </option>
          ))}
        </select>
      )}

      {hasFilters && (
        <Button variant="ghost" size="sm" onClick={() => onChange({})}>
          Clear filters
        </Button>
      )}
    </div>
  );
}
