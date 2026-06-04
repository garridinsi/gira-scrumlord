// SPDX-License-Identifier: GPL-3.0-or-later
import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { appendMention, mentionToken, renderMentions } from '../lib/mentions';

const ana = { id: 'claaa111aaa111aaa', name: 'Ana' };

describe('mention lib', () => {
  it('mentionToken builds the @[name](id) form', () => {
    expect(mentionToken(ana)).toBe('@[Ana](claaa111aaa111aaa)');
  });

  it('appendMention adds a separating space only when needed and a trailing space', () => {
    expect(appendMention('', ana)).toBe('@[Ana](claaa111aaa111aaa) ');
    expect(appendMention('hi', ana)).toBe('hi @[Ana](claaa111aaa111aaa) ');
    expect(appendMention('hi ', ana)).toBe('hi @[Ana](claaa111aaa111aaa) ');
    expect(appendMention('hi\n', ana)).toBe('hi\n@[Ana](claaa111aaa111aaa) ');
  });

  it('renderMentions returns the raw string when there are no tokens', () => {
    expect(renderMentions('plain comment')).toBe('plain comment');
  });

  it('renderMentions shows each token as a chip and keeps surrounding text', () => {
    render(<div data-testid="c">{renderMentions('cc @[Ana](claaa111aaa111aaa) please look')}</div>);
    const chip = screen.getByText('@Ana');
    expect(chip).toHaveClass('mention-chip');
    // surrounding text is preserved around the chip
    expect(screen.getByTestId('c')).toHaveTextContent('cc @Ana please look');
  });
});
