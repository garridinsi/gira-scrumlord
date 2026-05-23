// SPDX-License-Identifier: GPL-3.0-or-later
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { issues } from '../api/client';
import { IssueDrawer } from '../ui/IssueDrawer';
import { Plate } from '../ui/atoms';

/**
 * Standalone full-page view for /issues/:key.
 * Renders the IssueDrawer over a neutral background (no board behind it).
 */
export function IssueDetailPage() {
  const { key: issueKey = '' } = useParams<{ key: string }>();
  const navigate = useNavigate();

  // Pre-fetch the issue to derive projectKey for drawer queries
  const issueQuery = useQuery({
    queryKey: ['issue', issueKey],
    queryFn: () => issues.get(issueKey),
    enabled: !!issueKey,
  });

  const projectKey = issueQuery.data?.projectKey ?? '';

  const handleClose = () => {
    if (projectKey) {
      navigate(`/projects/${projectKey}/board`);
    } else {
      navigate(-1);
    }
  };

  if (issueQuery.isLoading) {
    return (
      <div className="body">
        <div className="gs-state">
          <span className="gs-loading">cargando ticket · loading issue</span>
        </div>
      </div>
    );
  }

  if (issueQuery.isError) {
    return (
      <div className="body">
        <div className="gs-state">
          <div>
            <Plate tone="red">404 · NO ENCONTRADO</Plate>
            <p style={{ marginTop: 12, color: 'var(--eg-fg-2)', fontFamily: 'var(--font-mono)', fontSize: 12 }}>
              Ticket no encontrado · Issue not found: {issueKey}
            </p>
          </div>
        </div>
      </div>
    );
  }

  if (!issueQuery.data) return null;

  return (
    <div className="body" style={{ position: 'relative' }}>
      {/* Neutral background — faded grid hint */}
      <div
        style={{
          position: 'absolute',
          inset: 0,
          background: 'var(--eg-paper-2)',
          backgroundImage:
            'linear-gradient(var(--eg-rule) 1px, transparent 1px), linear-gradient(90deg, var(--eg-rule) 1px, transparent 1px)',
          backgroundSize: '24px 24px',
          opacity: 0.4,
          pointerEvents: 'none',
        }}
      />

      {issueKey && projectKey && (
        <IssueDrawer
          issueKey={issueKey}
          projectKey={projectKey}
          onClose={handleClose}
        />
      )}
    </div>
  );
}
