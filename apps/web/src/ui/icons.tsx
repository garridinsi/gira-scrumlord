// SPDX-License-Identifier: GPL-3.0-or-later
// Monoline nav icons in the EG industrial style: 16×16, currentColor, thick strokes,
// square caps. They inherit color from the parent (iron, or yellow when a rail item
// is active) and are decorative (aria-hidden) — the visible bilingual label is the
// accessible name.

export type IconName =
  | 'board'
  | 'backlog'
  | 'sprints'
  | 'monthly'
  | 'summary'
  | 'audit'
  | 'daemon'
  | 'billing'
  | 'rates'
  | 'team'
  | 'clients'
  | 'settings'
  | 'incidents'
  | 'account'
  | 'overview'
  | 'request';

const PATHS: Record<IconName, React.ReactNode> = {
  // kanban columns
  board: (
    <>
      <rect x="1.5" y="2.5" width="3.5" height="11" />
      <rect x="6.25" y="2.5" width="3.5" height="7" />
      <rect x="11" y="2.5" width="3.5" height="9" />
    </>
  ),
  // stacked list
  backlog: (
    <>
      <line x1="2" y1="4" x2="14" y2="4" />
      <line x1="2" y1="8" x2="14" y2="8" />
      <line x1="2" y1="12" x2="10" y2="12" />
    </>
  ),
  // flag on a pole
  sprints: (
    <>
      <line x1="3" y1="2" x2="3" y2="14" />
      <path d="M3 2.5 H13 L10.5 5.25 L13 8 H3" />
    </>
  ),
  // calendar
  monthly: (
    <>
      <rect x="2" y="3" width="12" height="11" />
      <line x1="2" y1="6.5" x2="14" y2="6.5" />
      <line x1="5" y1="1.5" x2="5" y2="4" />
      <line x1="11" y1="1.5" x2="11" y2="4" />
    </>
  ),
  // bar chart
  summary: (
    <>
      <line x1="2" y1="14" x2="14" y2="14" />
      <line x1="4.5" y1="14" x2="4.5" y2="9" />
      <line x1="8" y1="14" x2="8" y2="5.5" />
      <line x1="11.5" y1="14" x2="11.5" y2="7.5" />
    </>
  ),
  // eye (sauron / audit)
  audit: (
    <>
      <path d="M1.5 8 Q8 2.5 14.5 8 Q8 13.5 1.5 8 Z" />
      <circle cx="8" cy="8" r="2" />
    </>
  ),
  // terminal prompt >_
  daemon: (
    <>
      <path d="M3 4.5 L6.5 8 L3 11.5" />
      <line x1="8" y1="11.5" x2="13" y2="11.5" />
    </>
  ),
  // receipt
  billing: (
    <>
      <path d="M3.5 2 H12.5 V14 L10.75 13 L9 14 L7 13 L5.25 14 L3.5 13 Z" />
      <line x1="5.75" y1="6" x2="10.25" y2="6" />
      <line x1="5.75" y1="9" x2="10.25" y2="9" />
    </>
  ),
  // euro coin
  rates: (
    <>
      <circle cx="8" cy="8" r="6" />
      <path d="M11 5.5 Q6 5 6 8 Q6 11 11 10.5" />
      <line x1="4.5" y1="7" x2="9.5" y2="7" />
      <line x1="4.5" y1="9" x2="9.5" y2="9" />
    </>
  ),
  // two people
  team: (
    <>
      <circle cx="5.5" cy="5" r="2.3" />
      <path d="M1.5 13.5 Q1.5 9 5.5 9 Q9.5 9 9.5 13.5" />
      <circle cx="11" cy="5.75" r="1.9" />
      <path d="M11 9 Q14.5 9 14.5 13" />
    </>
  ),
  // building (clients)
  clients: (
    <>
      <rect x="3" y="2" width="10" height="12" />
      <line x1="6" y1="5" x2="6" y2="5" />
      <line x1="5.5" y1="5" x2="6.5" y2="5" />
      <line x1="9.5" y1="5" x2="10.5" y2="5" />
      <line x1="5.5" y1="8" x2="6.5" y2="8" />
      <line x1="9.5" y1="8" x2="10.5" y2="8" />
      <line x1="6.5" y1="14" x2="6.5" y2="11" />
      <line x1="9.5" y1="14" x2="9.5" y2="11" />
    </>
  ),
  // sliders (settings)
  settings: (
    <>
      <line x1="2" y1="4.5" x2="14" y2="4.5" />
      <rect x="9" y="3" width="3" height="3" />
      <line x1="2" y1="8" x2="14" y2="8" />
      <rect x="4" y="6.5" width="3" height="3" />
      <line x1="2" y1="11.5" x2="14" y2="11.5" />
      <rect x="10" y="10" width="3" height="3" />
    </>
  ),
  // alert triangle (incidents)
  incidents: (
    <>
      <path d="M8 2 L14.5 13.5 H1.5 Z" />
      <line x1="8" y1="6" x2="8" y2="9.5" />
      <line x1="8" y1="11.5" x2="8" y2="11.5" />
    </>
  ),
  // user (account)
  account: (
    <>
      <circle cx="8" cy="5.5" r="2.8" />
      <path d="M2.5 14 Q2.5 9 8 9 Q13.5 9 13.5 14" />
    </>
  ),
  // grid (overview)
  overview: (
    <>
      <rect x="2" y="2" width="5" height="5" />
      <rect x="9" y="2" width="5" height="5" />
      <rect x="2" y="9" width="5" height="5" />
      <rect x="9" y="9" width="5" height="5" />
    </>
  ),
  // plus (new request)
  request: (
    <>
      <line x1="8" y1="3" x2="8" y2="13" />
      <line x1="3" y1="8" x2="13" y2="8" />
    </>
  ),
};

export function NavIcon({ name, size = 16 }: { name: IconName; size?: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 16 16"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.6}
      strokeLinecap="square"
      strokeLinejoin="miter"
      style={{ display: 'block', flexShrink: 0 }}
      aria-hidden="true"
      focusable="false"
    >
      {PATHS[name]}
    </svg>
  );
}
