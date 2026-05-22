// SPDX-License-Identifier: GPL-3.0-or-later
import { useNavigate } from 'react-router-dom';
import { useMe, useLogout } from '../../hooks/useAuth';
import { useActiveTimer, useStopTimer } from '../../hooks/useTimer';
import { Avatar } from '../ui/Avatar';
import { Button } from '../ui/Button';
import { formatMinutes } from '../../lib/format';

function TimerIndicator() {
  const { data: timer } = useActiveTimer();
  const stopTimer = useStopTimer();
  const navigate = useNavigate();

  if (!timer) return null;

  return (
    <div className="flex items-center gap-2 rounded-md bg-accent-900/50 border border-accent-700/50 px-3 py-1.5">
      <span className="w-2 h-2 rounded-full bg-accent-400 animate-pulse" aria-hidden />
      <button
        onClick={() => navigate(`/issues/${timer.issueKey}`)}
        className="text-xs font-mono text-accent-300 hover:text-accent-200 transition-colors"
        title={`Timer running for ${timer.issueKey}`}
      >
        {timer.issueKey} · {formatMinutes(timer.elapsedMinutes)}
      </button>
      <Button
        variant="ghost"
        size="sm"
        isLoading={stopTimer.isPending}
        onClick={() => stopTimer.mutate()}
        title="Stop timer"
        className="h-5 w-5 p-0 text-accent-400 hover:text-red-400"
      >
        ■
      </Button>
    </div>
  );
}

export function TopBar() {
  const { data: me } = useMe();
  const logout = useLogout();
  const navigate = useNavigate();

  return (
    <header className="h-12 shrink-0 flex items-center justify-between px-4 bg-surface-900 border-b border-surface-800">
      <div className="flex items-center gap-3">
        <TimerIndicator />
      </div>

      <div className="flex items-center gap-3">
        {me && (
          <>
            <div className="flex items-center gap-2">
              <Avatar user={me} size="sm" />
              <span className="text-sm text-gray-300 hidden sm:block">{me.name}</span>
              {me.role === 'admin' && (
                <span className="text-xs rounded px-1.5 py-0.5 bg-accent-900/60 text-accent-400 border border-accent-800">
                  admin
                </span>
              )}
            </div>
            <Button
              variant="ghost"
              size="sm"
              isLoading={logout.isPending}
              onClick={() => logout.mutate(undefined, { onSuccess: () => navigate('/login') })}
            >
              Logout
            </Button>
          </>
        )}
      </div>
    </header>
  );
}
