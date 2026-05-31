// SPDX-License-Identifier: GPL-3.0-or-later
import type { ReactNode } from 'react';
import { Bi } from './atoms';

export interface SubTab {
  es?: string;
  en?: string;
  label?: string;
  count?: number | null;
  active?: boolean;
  onClick?: () => void;
}

export function Subbar({ tabs, right }: { tabs: SubTab[]; right?: ReactNode }) {
  return (
    <div className="subbar">
      {tabs.map((t, i) => (
        <button
          key={i}
          type="button"
          className={'subbar__tab' + (t.active ? ' active' : '')}
          onClick={t.onClick}
        >
          {t.es ? <Bi es={t.es} en={t.en} size="tiny" /> : <span>{t.label}</span>}
          {t.count != null && <span className="ct">{t.count}</span>}
        </button>
      ))}
      {right && <div className="subbar__right">{right}</div>}
    </div>
  );
}
