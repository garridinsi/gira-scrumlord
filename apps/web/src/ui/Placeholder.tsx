// SPDX-License-Identifier: GPL-3.0-or-later
import { Subbar, type SubTab } from './Subbar';

/** Honest "under construction" body — replaced by the real screen. */
export function Placeholder({ es, en, tabs }: { es: string; en: string; tabs?: SubTab[] }) {
  return (
    <div className="body">
      {tabs && <Subbar tabs={tabs} />}
      <div className="gs-state">
        <div>
          <span className="plate" style={{ marginBottom: 18, display: 'inline-flex' }}>
            EN OBRAS · WIP
          </span>
          <h2
            className="disp"
            style={{ fontSize: 44, color: 'var(--eg-iron)', margin: '0 0 8px', lineHeight: 0.95 }}
          >
            {es}
          </h2>
          <div
            className="mono"
            style={{
              fontSize: 11,
              color: 'var(--eg-fg-3)',
              letterSpacing: '0.14em',
              textTransform: 'uppercase',
            }}
          >
            — {en} · building —
          </div>
        </div>
      </div>
    </div>
  );
}
