// SPDX-License-Identifier: GPL-3.0-or-later
import { NavLink, useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { projects } from '../../api/client';
import { cn } from '../../lib/cn';
import { Spinner } from '../ui/Spinner';

interface NavItemProps {
  to: string;
  label: string;
  icon?: string;
}

function NavItem({ to, label, icon }: NavItemProps) {
  return (
    <NavLink
      to={to}
      className={({ isActive }) =>
        cn(
          'flex items-center gap-2.5 rounded-md px-3 py-2 text-sm font-medium transition-colors',
          isActive
            ? 'bg-accent-600/20 text-accent-400 border border-accent-600/30'
            : 'text-gray-400 hover:text-gray-200 hover:bg-surface-800',
        )
      }
    >
      {icon && <span className="text-base leading-none">{icon}</span>}
      <span className="truncate">{label}</span>
    </NavLink>
  );
}

export function Sidebar() {
  const { data: projectList, isLoading } = useQuery({
    queryKey: ['projects'],
    queryFn: () => projects.list(),
  });
  const navigate = useNavigate();

  return (
    <nav
      className="flex flex-col w-56 shrink-0 bg-surface-900 border-r border-surface-800 h-screen overflow-y-auto"
      aria-label="Main navigation"
    >
      {/* Logo */}
      <div className="px-4 py-4 border-b border-surface-800">
        <button
          onClick={() => navigate('/')}
          className="flex items-center gap-2 group"
          aria-label="Home"
        >
          <span className="text-2xl group-hover:animate-spin-slow transition-transform">🌀</span>
          <span className="font-bold text-sm text-gray-100 leading-tight">
            gira-
            <br />
            scrumlord
          </span>
        </button>
      </div>

      {/* Top nav */}
      <div className="px-3 py-3 space-y-1 border-b border-surface-800">
        <NavItem to="/projects" label="All Projects" icon="▤" />
      </div>

      {/* Projects */}
      <div className="flex-1 px-3 py-3">
        <p className="px-3 mb-2 text-xs font-semibold text-gray-500 uppercase tracking-widest">
          Projects
        </p>
        {isLoading && (
          <div className="flex justify-center py-4">
            <Spinner size="sm" />
          </div>
        )}
        {projectList && projectList.length === 0 && (
          <p className="px-3 text-xs text-gray-600 italic">No projects yet. The backlog is empty. Peaceful.</p>
        )}
        {projectList && (
          <div className="space-y-0.5">
            {projectList.map((p) => (
              <div key={p.key} className="group">
                <NavLink
                  to={`/projects/${p.key}`}
                  className={({ isActive }) =>
                    cn(
                      'flex items-center gap-2 rounded-md px-3 py-1.5 text-sm transition-colors',
                      isActive
                        ? 'bg-accent-600/20 text-accent-400'
                        : 'text-gray-400 hover:text-gray-200 hover:bg-surface-800',
                    )
                  }
                >
                  <span
                    className="w-5 h-5 rounded text-xs font-bold flex items-center justify-center bg-accent-900/60 text-accent-300 shrink-0"
                  >
                    {p.key[0]}
                  </span>
                  <span className="truncate">{p.name}</span>
                </NavLink>
                {/* Sub-nav for project */}
                <div className="ml-7 mt-0.5 space-y-0.5 hidden group-focus-within:block">
                  <NavLink
                    to={`/projects/${p.key}/board`}
                    className={({ isActive }) =>
                      cn(
                        'block rounded px-2 py-1 text-xs transition-colors',
                        isActive ? 'text-accent-400' : 'text-gray-500 hover:text-gray-300',
                      )
                    }
                  >
                    Board
                  </NavLink>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Footer */}
      <div className="px-3 py-3 border-t border-surface-800">
        <p className="text-xs text-gray-700 text-center italic">
          Sauron watches. Port 666.
        </p>
      </div>
    </nav>
  );
}
