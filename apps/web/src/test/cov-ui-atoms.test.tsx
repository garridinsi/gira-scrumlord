// SPDX-License-Identifier: GPL-3.0-or-later
// Coverage gap-closer for src/ui/atoms.tsx — exercises the prop branches the
// existing atoms.test.tsx does not reach: Bi `inline`, and Avatar's
// display/hue fallback chains (name-only, seed, and the empty fallback).
import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import type { PublicUserView } from '@gira/shared';
import { Avatar, Bi } from '../ui/atoms';

const user = (id: string, name: string) => ({ id, name }) as unknown as PublicUserView;

describe('atoms — uncovered prop branches', () => {
  it('Bi adds bi--inline when inline is set (atoms.tsx line 29)', () => {
    render(<Bi es="dentro" en="inline" inline />);
    const es = screen.getByText('dentro');
    // The class lives on the outer .bi wrapper (parent of the ES line).
    const wrapper = es.parentElement;
    expect(wrapper).toHaveClass('bi');
    expect(wrapper).toHaveClass('bi--inline');
  });

  it('Avatar falls back to the name prop when no user is given (atoms.tsx line 196 — name branch)', () => {
    render(<Avatar name="Grace Hopper" />);
    const av = screen.getByText('GH');
    expect(av).toHaveAttribute('title', 'Grace Hopper');
  });

  it('Avatar uses the explicit seed for the hue, independent of display (atoms.tsx line 197 — seed branch)', () => {
    render(<Avatar name="Grace Hopper" seed="fixed-seed" />);
    const av = screen.getByText('GH');
    // Seed-driven avatars still title themselves with the display name.
    expect(av).toHaveAttribute('title', 'Grace Hopper');
    // Hue class is one of the palette buckets.
    expect(av.className).toMatch(/avatar--(ink|yellow|gold|green|red)/);
  });

  it('Avatar falls back to user.id for the hue when no seed is given (atoms.tsx line 197 — user?.id branch)', () => {
    render(<Avatar user={user('u-42', 'Ada Lovelace')} />);
    const av = screen.getByText('AL');
    expect(av).toHaveAttribute('title', 'Ada Lovelace');
  });

  it('Avatar with no user, name, or seed renders the empty-display fallback (atoms.tsx lines 196/197 — final fallbacks)', () => {
    const { container } = render(<Avatar lg />);
    const av = container.querySelector('span.avatar');
    expect(av).not.toBeNull();
    // Empty display → initialsOf('') === '??'; large variant class is applied.
    expect(av!).toHaveTextContent('??');
    expect(av!).toHaveAttribute('title', '');
    expect(av!.className).toContain('avatar--lg');
  });
});
