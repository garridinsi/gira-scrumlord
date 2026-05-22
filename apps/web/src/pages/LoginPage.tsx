// SPDX-License-Identifier: GPL-3.0-or-later
import { useState, type FormEvent } from 'react';
import { useMutation } from '@tanstack/react-query';
import { auth } from '../api/client';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { ErrorMessage } from '../components/ui/ErrorMessage';

export function LoginPage() {
  const [email, setEmail] = useState('');
  const [sent, setSent] = useState(false);

  const sendLink = useMutation({
    mutationFn: (emailAddr: string) => auth.magicLink(emailAddr),
    onSuccess: () => setSent(true),
  });

  function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (email.trim()) sendLink.mutate(email.trim());
  }

  return (
    <div className="min-h-screen bg-surface-950 flex items-center justify-center p-4">
      <div className="w-full max-w-sm">
        {/* Logo */}
        <div className="text-center mb-10">
          <span className="text-6xl block mb-4 animate-spin-slow select-none">🌀</span>
          <h1 className="text-2xl font-bold text-gray-100">gira-scrumlord</h1>
          <p className="text-sm text-muted mt-1 italic">agile, but make it dizzy.</p>
        </div>

        <div className="bg-surface-900 rounded-xl border border-surface-700 p-8 shadow-2xl shadow-black/60">
          {!sent ? (
            <>
              <h2 className="text-base font-semibold text-gray-200 mb-1">Sign in</h2>
              <p className="text-sm text-muted mb-6">
                Enter your email. We'll send a magic link. No passwords. The velociraptor approves.
              </p>
              <form onSubmit={handleSubmit} className="space-y-4">
                <Input
                  label="Email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="you@example.com"
                  autoComplete="email"
                  required
                  autoFocus
                />
                {sendLink.error && <ErrorMessage error={sendLink.error} />}
                <Button
                  type="submit"
                  variant="primary"
                  className="w-full"
                  isLoading={sendLink.isPending}
                >
                  Send magic link
                </Button>
              </form>
            </>
          ) : (
            <div className="text-center space-y-4">
              <span className="text-4xl block">📬</span>
              <h2 className="text-base font-semibold text-gray-200">Check your email</h2>
              <p className="text-sm text-muted">
                A magic link has been summoned to <strong className="text-gray-300">{email}</strong>.
              </p>
              <p className="text-xs text-gray-600 mt-2">
                Running locally? Check{' '}
                <a
                  href="http://localhost:8025"
                  target="_blank"
                  rel="noreferrer"
                  className="text-accent-400 hover:text-accent-300 underline"
                >
                  Mailpit at :8025
                </a>
                .
              </p>
              <Button
                variant="ghost"
                size="sm"
                className="mt-4"
                onClick={() => {
                  setSent(false);
                  sendLink.reset();
                }}
              >
                Use a different email
              </Button>
            </div>
          )}
        </div>

        <p className="text-center text-xs text-gray-700 mt-6 italic">
          One ticket to rule them all.
        </p>
      </div>
    </div>
  );
}
