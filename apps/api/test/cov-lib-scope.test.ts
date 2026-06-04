// SPDX-License-Identifier: GPL-3.0-or-later
// projectScopeWhere is a pure WHERE-clause builder, so it is unit-tested directly
// (no buildApp): a client user is scoped to its own clientId, staff see everything.
import type { AuthUser } from '../src/lib/auth.js';
import { describe, expect, it } from 'vitest';
import { projectScopeWhere } from '../src/lib/scope.js';

const baseUser: Omit<AuthUser, 'kind' | 'role' | 'clientId'> = {
  id: 'u1',
  email: 'u1@example.com',
  name: 'User One',
  locale: 'both',
};

describe('cov src/lib/scope.ts', () => {
  it('scopes a client user to their own clientId (line 38)', () => {
    const user: AuthUser = { ...baseUser, kind: 'client', role: 'viewer', clientId: 'client-1' };
    expect(projectScopeWhere(user)).toEqual({ clientId: 'client-1' });
  });

  it('lets staff see every project with an empty WHERE (line 39)', () => {
    const user: AuthUser = { ...baseUser, kind: 'staff', role: 'admin', clientId: null };
    expect(projectScopeWhere(user)).toEqual({});
  });
});
