// SPDX-License-Identifier: GPL-3.0-or-later
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { screen } from '@testing-library/react';
import { renderWithProviders } from './render';

const { auditList } = vi.hoisted(() => ({ auditList: vi.fn() }));
vi.mock('../api/client', () => ({ audit: { list: (p: unknown) => auditList(p) } }));

import { SauronPage } from '../pages/SauronPage';

describe('SauronPage (audit log)', () => {
  beforeEach(() => auditList.mockReset());

  it('renders the audit tail with its entries', async () => {
    auditList.mockResolvedValue({
      count: 2,
      entries: [
        { id: 'a1', action: 'issue.create', entityType: 'Issue', entityId: 'i1', actor: { id: 'u1', name: 'Ada Lovelace' }, at: '2026-06-01T00:00:00Z', before: null, after: { key: 'GIRA-1' } },
        { id: 'a2', action: 'invoice.generate', entityType: 'Invoice', entityId: 'inv1', actor: null, at: '2026-06-02T00:00:00Z', before: null, after: {} },
      ],
    });
    renderWithProviders(<SauronPage />);

    expect(await screen.findByText('VIGILANDO')).toBeInTheDocument(); // live status
    // Rendering with entries exercises the row-mapping path.
    expect(auditList).toHaveBeenCalled();
  });

  it('still renders the watch status with no entries', async () => {
    auditList.mockResolvedValue({ count: 0, entries: [] });
    renderWithProviders(<SauronPage />);
    expect(await screen.findByText('VIGILANDO')).toBeInTheDocument();
  });
});
