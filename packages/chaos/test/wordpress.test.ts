// SPDX-License-Identifier: GPL-3.0-or-later
import { describe, expect, it } from 'vitest';
import { parseWordpress } from '../src/wordpress.js';

describe('wordpress', () => {
  it('parses a form submission into a task', () => {
    const intake = parseWordpress({
      subject: 'Site is down',
      message: 'The homepage 500s',
      name: 'Wile E. Coyote',
      email: 'wile@acme.example.test',
      formId: 'form-7',
    });
    expect(intake).toMatchObject({
      externalRef: 'form-7',
      title: 'Site is down',
      type: 'task',
      priority: 'medium',
    });
    expect(intake.labels).toContain('wordpress');
    expect(intake.description).toContain('The homepage 500s');
    expect(intake.description).toContain('Wile E. Coyote');
    expect(intake.description).toContain('<wile@acme.example.test>');
  });

  it('falls back gracefully on sparse payloads', () => {
    const intake = parseWordpress({ message: 'just this' });
    expect(intake.title).toBe('WordPress submission');
    expect(intake.description).toBe('just this');
  });
});
