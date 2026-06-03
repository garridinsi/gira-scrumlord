// SPDX-License-Identifier: GPL-3.0-or-later
import { describe, it, expect } from 'vitest';
import { render } from '@testing-library/react';
import { NavIcon, type IconName } from '../ui/icons';

const NAMES: IconName[] = [
  'board', 'backlog', 'sprints', 'monthly', 'summary', 'audit', 'daemon', 'billing',
  'rates', 'team', 'clients', 'settings', 'incidents', 'account', 'overview', 'request',
];

describe('NavIcon', () => {
  it('renders an SVG for every icon name', () => {
    for (const name of NAMES) {
      const { container, unmount } = render(<NavIcon name={name} />);
      expect(container.querySelector('svg')).toBeTruthy();
      unmount();
    }
  });

  it('honours the size prop', () => {
    const { container } = render(<NavIcon name="board" size={32} />);
    const svg = container.querySelector('svg');
    expect(svg).toHaveAttribute('width', '32');
  });
});
