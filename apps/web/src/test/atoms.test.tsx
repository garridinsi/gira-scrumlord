// SPDX-License-Identifier: GPL-3.0-or-later
import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import type { LabelView, PublicUserView } from '@gira/shared';
import { Avatar, Bi, Glyph, LabelChip, Plate, PriorityChip, TypeChip, hueFor, initialsOf } from '../ui/atoms';

const label = (name: string, color: string) => ({ id: name, name, color }) as unknown as LabelView;
const user = (id: string, name: string) => ({ id, name }) as unknown as PublicUserView;

describe('atoms — pure helpers', () => {
  it('initialsOf handles empty, single, and multi-word names', () => {
    expect(initialsOf('Ada Lovelace')).toBe('AL');
    expect(initialsOf('Cher')).toBe('CH');
    expect(initialsOf('   ')).toBe('??');
    expect(initialsOf('madonna')).toBe('MA');
  });

  it('hueFor is deterministic and stays within the palette', () => {
    expect(hueFor('abc')).toBe(hueFor('abc'));
    expect(['ink', 'yellow', 'gold', 'green', 'red']).toContain(hueFor('whatever-seed'));
  });
});

describe('atoms — components', () => {
  it('PriorityChip renders EMERGENCY specially and other priorities plainly', () => {
    const { rerender } = render(<PriorityChip priority="emergency" />);
    expect(screen.getByText('EMERGENCY')).toBeInTheDocument();
    rerender(<PriorityChip priority="medium" />);
    expect(screen.getByText('medium')).toBeInTheDocument();
  });

  it('TypeChip shows the uppercased first letter of the type', () => {
    render(<TypeChip type="bug" />);
    expect(screen.getByText('B')).toBeInTheDocument();
  });

  it('LabelChip renders the name for both dark and light colors (contrast branch)', () => {
    render(<LabelChip label={label('darklabel', '#0b1620')} />);
    render(<LabelChip label={label('lightlabel', '#f5c400')} />);
    expect(screen.getByText('darklabel')).toBeInTheDocument();
    expect(screen.getByText('lightlabel')).toBeInTheDocument();
  });

  it('Avatar shows initials and a name title', () => {
    render(<Avatar user={user('u1', 'Grace Hopper')} />);
    const av = screen.getByText('GH');
    expect(av).toHaveAttribute('title', 'Grace Hopper');
  });

  it('Bi renders both languages; Plate and Glyph render', () => {
    render(<Bi es="hola" en="hello" />);
    expect(screen.getByText('hola')).toBeInTheDocument();
    expect(screen.getByText('hello')).toBeInTheDocument();
    render(<Plate tone="yellow">BOARDING</Plate>);
    expect(screen.getByText('BOARDING')).toBeInTheDocument();
    const { container } = render(<Glyph />);
    expect(container.querySelector('svg')).toBeTruthy();
  });
});
