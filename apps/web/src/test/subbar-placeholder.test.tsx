// SPDX-License-Identifier: GPL-3.0-or-later
import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Subbar } from '../ui/Subbar';
import { Placeholder } from '../ui/Placeholder';

describe('Subbar', () => {
  it('renders bilingual + plain tabs, a count badge, the active class, and fires onClick', async () => {
    const onClick = vi.fn();
    const { container } = render(
      <Subbar
        tabs={[
          { es: 'Tablero', en: 'Board', count: 3, active: true, onClick },
          { label: 'Plain' },
        ]}
      />,
    );
    expect(screen.getByText('Tablero')).toBeInTheDocument();
    expect(screen.getByText('Board')).toBeInTheDocument();
    expect(screen.getByText('Plain')).toBeInTheDocument();
    expect(screen.getByText('3')).toBeInTheDocument();
    expect(container.querySelector('.subbar__tab.active')).not.toBeNull();

    await userEvent.click(screen.getByText('Tablero'));
    expect(onClick).toHaveBeenCalledTimes(1);
  });

  it('renders a right-hand slot', () => {
    render(<Subbar tabs={[{ label: 'X' }]} right={<span>rightside</span>} />);
    expect(screen.getByText('rightside')).toBeInTheDocument();
  });
});

describe('Placeholder', () => {
  it('renders the bilingual WIP body with optional tabs', () => {
    render(<Placeholder es="Próximamente" en="Coming soon" tabs={[{ label: 'Tab1' }]} />);
    expect(screen.getByText('Próximamente')).toBeInTheDocument();
    expect(screen.getByText(/Coming soon/)).toBeInTheDocument();
    expect(screen.getByText('Tab1')).toBeInTheDocument();
  });

  it('renders without tabs', () => {
    render(<Placeholder es="Hola" en="Hi" />);
    expect(screen.getByText('Hola')).toBeInTheDocument();
  });
});
