// SPDX-License-Identifier: GPL-3.0-or-later
import type { IssueType, Priority } from '@gira/shared';

/** A parsed external event, ready to become (or close) an issue. */
export interface NormalizedIntake {
  /** Stable external id (alert fingerprint, form id) used to dedup. */
  externalRef?: string;
  title: string;
  description: string;
  type?: IssueType;
  priority?: Priority;
  /** Label names to ensure-and-attach. */
  labels?: string[];
  /** When true (e.g. Grafana "resolved"), close the matching issue instead of creating. */
  resolved?: boolean;
}
