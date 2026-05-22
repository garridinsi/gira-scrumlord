// SPDX-License-Identifier: GPL-3.0-or-later
import { useState, type FormEvent } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import type { IssueType, Priority } from '@gira/shared';
import { issues, projects } from '../../api/client';
import { Modal } from '../ui/Modal';
import { Input, Textarea, Select } from '../ui/Input';
import { Button } from '../ui/Button';
import { ErrorMessage } from '../ui/ErrorMessage';

interface CreateIssueModalProps {
  open: boolean;
  onClose: () => void;
  projectKey: string;
  defaultSprintId?: string;
}

export function CreateIssueModal({
  open,
  onClose,
  projectKey,
  defaultSprintId,
}: CreateIssueModalProps) {
  const queryClient = useQueryClient();

  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [type, setType] = useState<IssueType>('task');
  const [priority, setPriority] = useState<Priority>('medium');
  const [storyPoints, setStoryPoints] = useState('');

  const { data: statuses } = useQuery({
    queryKey: ['statuses', projectKey],
    queryFn: () => projects.statuses.list(projectKey),
    enabled: open,
  });

  const createIssue = useMutation({
    mutationFn: () =>
      issues.create({
        projectKey,
        title: title.trim(),
        description,
        type,
        priority,
        billingMode: 'hourly',
        sprintId: defaultSprintId ?? null,
        storyPoints: storyPoints ? parseInt(storyPoints, 10) : null,
      }),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['board', projectKey] });
      void queryClient.invalidateQueries({ queryKey: ['backlog', projectKey] });
      void queryClient.invalidateQueries({ queryKey: ['issues'] });
      setTitle('');
      setDescription('');
      setType('task');
      setPriority('medium');
      setStoryPoints('');
      onClose();
    },
  });

  function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (title.trim()) createIssue.mutate();
  }

  return (
    <Modal open={open} onClose={onClose} title="Create Issue" className="max-w-xl">
      <form onSubmit={handleSubmit} className="space-y-4">
        <Input
          label="Title"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="What needs to be done? (The velociraptor is waiting.)"
          required
          autoFocus
          maxLength={200}
        />

        <Textarea
          label="Description (Markdown)"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder="Describe the circle of doom…"
          rows={4}
          maxLength={50_000}
        />

        <div className="grid grid-cols-2 gap-3">
          <Select
            label="Type"
            value={type}
            onChange={(e) => setType(e.target.value as IssueType)}
          >
            <option value="task">◻ Task</option>
            <option value="bug">✕ Bug</option>
            <option value="story">▷ Story</option>
            <option value="epic">⚡ Epic</option>
          </Select>

          <Select
            label="Priority"
            value={priority}
            onChange={(e) => setPriority(e.target.value as Priority)}
          >
            <option value="emergency">!! Emergency</option>
            <option value="urgent">! Urgent</option>
            <option value="high">High</option>
            <option value="medium">Medium</option>
            <option value="low">Low</option>
          </Select>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <Input
            label="Story Points"
            type="number"
            min={0}
            max={100}
            value={storyPoints}
            onChange={(e) => setStoryPoints(e.target.value)}
            placeholder="Fibonacci, pray"
          />

          {statuses && statuses.length > 0 && (
            <div className="text-xs text-gray-500 flex items-end pb-2">
              Will be placed in: <strong className="ml-1 text-gray-400">{statuses[0]?.name}</strong>
            </div>
          )}
        </div>

        {createIssue.error && <ErrorMessage error={createIssue.error} />}

        <div className="flex justify-end gap-3 pt-2">
          <Button type="button" variant="ghost" onClick={onClose}>
            Cancel
          </Button>
          <Button type="submit" variant="primary" isLoading={createIssue.isPending}>
            Create Issue
          </Button>
        </div>
      </form>
    </Modal>
  );
}
