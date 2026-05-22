// SPDX-License-Identifier: GPL-3.0-or-later
import { useState, type FormEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { projects } from '../api/client';
import { Spinner } from '../components/ui/Spinner';
import { ErrorMessage, EmptyState } from '../components/ui/ErrorMessage';
import { Button } from '../components/ui/Button';
import { Modal } from '../components/ui/Modal';
import { Input, Textarea } from '../components/ui/Input';

function CreateProjectModal({
  open,
  onClose,
}: {
  open: boolean;
  onClose: () => void;
}) {
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const [key, setKey] = useState('');
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');

  const create = useMutation({
    mutationFn: () =>
      projects.create({
        key: key.trim().toUpperCase(),
        name: name.trim(),
        description: description || undefined,
      }),
    onSuccess: (project) => {
      void queryClient.invalidateQueries({ queryKey: ['projects'] });
      setKey('');
      setName('');
      setDescription('');
      onClose();
      navigate(`/projects/${project.key}`);
    },
  });

  return (
    <Modal open={open} onClose={onClose} title="New Project">
      <form
        onSubmit={(e: FormEvent) => {
          e.preventDefault();
          if (key.trim() && name.trim()) create.mutate();
        }}
        className="space-y-4"
      >
        <Input
          label="Project Key"
          value={key}
          onChange={(e) => setKey(e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, ''))}
          placeholder="GIRA"
          required
          autoFocus
          maxLength={10}
          pattern="[A-Z][A-Z0-9]{1,9}"
          title="2-10 uppercase letters/digits, starting with a letter"
        />
        <p className="text-xs text-gray-600 -mt-2">
          2-10 uppercase alphanumeric. This becomes the issue key prefix (e.g. GIRA-1).
        </p>
        <Input
          label="Name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="The Grand Chaos Engine"
          required
          maxLength={120}
        />
        <Textarea
          label="Description (optional)"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder="What is this project's noble purpose? (Be honest.)"
          rows={3}
        />
        {create.error && <ErrorMessage error={create.error} />}
        <div className="flex justify-end gap-3 pt-2">
          <Button type="button" variant="ghost" onClick={onClose}>
            Cancel
          </Button>
          <Button type="submit" variant="primary" isLoading={create.isPending}>
            Create Project
          </Button>
        </div>
      </form>
    </Modal>
  );
}

export function ProjectsPage() {
  const navigate = useNavigate();
  const [createOpen, setCreateOpen] = useState(false);

  const { data: projectList, isLoading, error } = useQuery({
    queryKey: ['projects'],
    queryFn: () => projects.list(),
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

  return (
    <div className="flex flex-col h-full">
      <div className="px-6 py-4 border-b border-surface-800 flex items-center justify-between">
        <h1 className="text-lg font-semibold text-gray-100">All Projects</h1>
        <Button variant="primary" onClick={() => setCreateOpen(true)}>
          + New Project
        </Button>
      </div>

      <div className="flex-1 overflow-auto px-6 py-6">
        {projectList && projectList.length === 0 && (
          <EmptyState
            message="No projects yet. Create one to start the descent."
            icon="🌀"
          />
        )}

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {(projectList ?? []).map((p) => (
            <button
              key={p.key}
              onClick={() => navigate(`/projects/${p.key}`)}
              className="text-left rounded-xl bg-surface-900 border border-surface-700 p-5 hover:bg-surface-850 hover:border-surface-600 transition-colors group"
            >
              <div className="flex items-start justify-between mb-3">
                <div className="w-10 h-10 rounded-lg bg-accent-900/60 border border-accent-800 flex items-center justify-center">
                  <span className="text-base font-bold text-accent-300">{p.key[0]}</span>
                </div>
                <span className="font-mono text-xs text-gray-600 group-hover:text-accent-500 transition-colors">
                  {p.key}
                </span>
              </div>
              <h3 className="text-sm font-semibold text-gray-200 group-hover:text-white transition-colors">
                {p.name}
              </h3>
              {p.description && (
                <p className="text-xs text-gray-500 mt-1 line-clamp-2">{p.description}</p>
              )}
              <div className="mt-3 flex gap-3">
                <span
                  className="text-xs text-gray-600 hover:text-accent-400 transition-colors"
                  onClick={(e) => {
                    e.stopPropagation();
                    navigate(`/projects/${p.key}/board`);
                  }}
                >
                  Board
                </span>
                <span
                  className="text-xs text-gray-600 hover:text-accent-400 transition-colors"
                  onClick={(e) => {
                    e.stopPropagation();
                    navigate(`/projects/${p.key}/backlog`);
                  }}
                >
                  Backlog
                </span>
              </div>
            </button>
          ))}
        </div>
      </div>

      <CreateProjectModal open={createOpen} onClose={() => setCreateOpen(false)} />
    </div>
  );
}
