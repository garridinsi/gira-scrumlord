// SPDX-License-Identifier: GPL-3.0-or-later
import { ApiError } from '../../api/client';

interface ErrorMessageProps {
  error: unknown;
  className?: string;
}

export function ErrorMessage({ error, className }: ErrorMessageProps) {
  const message =
    error instanceof ApiError
      ? error.message
      : error instanceof Error
        ? error.message
        : 'Something went wrong. The velociraptor is investigating.';

  return (
    <div
      role="alert"
      className={`rounded-lg border border-red-800/50 bg-red-950/30 px-4 py-3 text-sm text-red-400 ${className ?? ''}`}
    >
      <span className="font-medium">Error:</span> {message}
    </div>
  );
}

export function EmptyState({
  message,
  icon = '🌀',
}: {
  message: string;
  icon?: string;
}) {
  return (
    <div className="flex flex-col items-center gap-3 py-16 text-center">
      <span className="text-4xl opacity-40">{icon}</span>
      <p className="text-muted text-sm max-w-xs">{message}</p>
    </div>
  );
}
