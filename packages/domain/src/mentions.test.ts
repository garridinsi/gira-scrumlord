// SPDX-License-Identifier: GPL-3.0-or-later
import { describe, it, expect } from 'vitest';
import { parseMentions } from './mentions.js';

describe('parseMentions', () => {
  it('returns no ids for an empty or mention-free body', () => {
    expect(parseMentions('')).toEqual([]);
    expect(parseMentions('just a plain comment, no mentions here')).toEqual([]);
  });

  it('extracts a single @[label](id) token', () => {
    expect(parseMentions('hey @[Eneko Garrido](clyx0abcd1234efgh) take a look')).toEqual([
      'clyx0abcd1234efgh',
    ]);
  });

  it('extracts multiple ids in first-seen order', () => {
    const body = '@[Ana](claaa111aaa111aaa) and @[Bea](clbbb222bbb222bbb) — thoughts?';
    expect(parseMentions(body)).toEqual(['claaa111aaa111aaa', 'clbbb222bbb222bbb']);
  });

  it('deduplicates repeated mentions of the same id', () => {
    const body = '@[Ana](claaa111aaa111aaa) ... ping @[Ana again](claaa111aaa111aaa)';
    expect(parseMentions(body)).toEqual(['claaa111aaa111aaa']);
  });

  it('ignores malformed tokens (bare @name, missing id, empty label, uppercase/short id)', () => {
    expect(parseMentions('@eneko @[](claaa111aaa111aaa) @[Name]() @[Name](SHORT)')).toEqual([]);
  });

  it('does not span a newline inside the label', () => {
    expect(parseMentions('@[Multi\nLine](claaa111aaa111aaa)')).toEqual([]);
  });

  it('tolerates adjacent punctuation around the token', () => {
    expect(parseMentions('(cc @[Ana](claaa111aaa111aaa)).')).toEqual(['claaa111aaa111aaa']);
  });
});
