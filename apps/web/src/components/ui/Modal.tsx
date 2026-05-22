// SPDX-License-Identifier: GPL-3.0-or-later
import { useEffect, type ReactNode } from 'react';
import { cn } from '../../lib/cn';
import { Button } from './Button';

interface ModalProps {
  open: boolean;
  onClose: () => void;
  title: string;
  children: ReactNode;
  className?: string;
}

export function Modal({ open, onClose, title, children, className }: ModalProps) {
  // Close on Escape
  useEffect(() => {
    if (!open) return;
    function handler(e: KeyboardEvent) {
      if (e.key === 'Escape') onClose();
    }
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="modal-title"
    >
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/70 backdrop-blur-sm animate-fade-in"
        onClick={onClose}
      />
      {/* Panel */}
      <div
        className={cn(
          'relative z-10 w-full rounded-xl bg-surface-850 border border-surface-700',
          'shadow-2xl shadow-black/60 animate-slide-up',
          className ?? 'max-w-lg',
        )}
      >
        <div className="flex items-center justify-between px-6 py-4 border-b border-surface-700">
          <h2 id="modal-title" className="text-base font-semibold text-gray-100">
            {title}
          </h2>
          <Button variant="ghost" size="sm" onClick={onClose} aria-label="Close modal">
            ✕
          </Button>
        </div>
        <div className="p-6">{children}</div>
      </div>
    </div>
  );
}
