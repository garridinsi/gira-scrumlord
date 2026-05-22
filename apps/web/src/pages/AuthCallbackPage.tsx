// SPDX-License-Identifier: GPL-3.0-or-later
import { useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { auth } from '../api/client';
import { FullPageSpinner } from '../components/ui/Spinner';
import { ErrorMessage } from '../components/ui/ErrorMessage';
import { Button } from '../components/ui/Button';

export function AuthCallbackPage() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const token = searchParams.get('token') ?? '';

  const callback = useMutation({
    mutationFn: (t: string) => auth.callback(t),
    onSuccess: (data) => {
      // Seed the me query with the returned user
      queryClient.setQueryData(['auth', 'me'], data.user);
      navigate('/', { replace: true });
    },
  });

  useEffect(() => {
    if (token && !callback.isPending && !callback.isError && !callback.isSuccess) {
      callback.mutate(token);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token]);

  if (!token) {
    return (
      <div className="min-h-screen bg-surface-950 flex items-center justify-center p-4">
        <div className="text-center space-y-4">
          <ErrorMessage error={new Error('No token in URL. Something went wrong with the magic link.')} />
          <Button variant="secondary" onClick={() => navigate('/login')}>
            Back to login
          </Button>
        </div>
      </div>
    );
  }

  if (callback.isPending || (!callback.isError && !callback.isSuccess)) {
    return <FullPageSpinner />;
  }

  if (callback.isError) {
    return (
      <div className="min-h-screen bg-surface-950 flex items-center justify-center p-4">
        <div className="text-center space-y-4 max-w-sm">
          <span className="text-4xl block">💀</span>
          <h1 className="text-lg font-semibold text-gray-200">Magic link failed</h1>
          <ErrorMessage error={callback.error} />
          <p className="text-sm text-muted">
            The link may have expired or already been used. Magic links are single-use and short-lived —
            like a sprint that ends at midnight.
          </p>
          <Button variant="secondary" onClick={() => navigate('/login')}>
            Try again
          </Button>
        </div>
      </div>
    );
  }

  return <FullPageSpinner />;
}
