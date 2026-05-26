// SPDX-License-Identifier: GPL-3.0-or-later
/**
 * useProjectTabs — returns the correct Subbar tab list for a given project key.
 * Fetches `projects.get(key)` to read the cadence, then builds the tab array:
 *  - cadence === 'monthly': show Mensual · Monthly, hide Sprints
 *  - cadence === 'sprints' (or undefined): show Sprints, hide Mensual
 */
import { useQuery } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { projects } from '../api/client';
import type { SubTab } from '../ui/Subbar';

type ActiveTab = 'board' | 'backlog' | 'sprints' | 'monthly' | 'summary';

export function useProjectTabs(key: string, active: ActiveTab): SubTab[] {
  const navigate = useNavigate();

  const projectQ = useQuery({
    queryKey: ['project', key],
    queryFn: () => projects.get(key),
    enabled: !!key,
    staleTime: 60_000,
  });

  const p = `/projects/${key}`;
  const cadence = projectQ.data?.cadence ?? 'sprints';
  const isMonthly = cadence === 'monthly';

  const tabs: SubTab[] = [
    {
      es: 'Tablero',
      en: 'Board',
      active: active === 'board',
      onClick: active === 'board' ? undefined : () => navigate(`${p}/board`),
    },
    {
      es: 'Pendientes',
      en: 'Backlog',
      active: active === 'backlog',
      onClick: active === 'backlog' ? undefined : () => navigate(`${p}/backlog`),
    },
  ];

  if (isMonthly) {
    tabs.push({
      es: 'Mensual',
      en: 'Monthly',
      active: active === 'monthly',
      onClick: active === 'monthly' ? undefined : () => navigate(`${p}/monthly`),
    });
  } else {
    tabs.push({
      es: 'Sprints',
      en: 'Sprints',
      active: active === 'sprints',
      onClick: active === 'sprints' ? undefined : () => navigate(`${p}/sprints`),
    });
  }

  tabs.push({
    es: 'Informes',
    en: 'Reports',
    active: active === 'summary',
    onClick: active === 'summary' ? undefined : () => navigate(`${p}`),
  });

  return tabs;
}
