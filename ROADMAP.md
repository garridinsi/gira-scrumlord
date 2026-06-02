# gira-scrumlord — Product Roadmap & Idea Backlog

> Synthesized from a 20-lens product ideation pass (Scrum Master, Kanban coach, PM,
> agency owner, freelancer, enterprise admin, a11y advocate, security, mobile/field,
> integrations, analytics, onboarding, support, finance, DevEx, QA, notifications,
> performance, data-portability, craft). Items are deduped, grouped by theme, and
> prioritized P0–P3 with rough effort (S/M/L/XL). "Converged" notes where multiple
> independent lenses asked for the same thing — a strong priority signal.
>
> This is a living backlog, not a commitment. In-progress now: per-user notifications
> (email/web-push/telegram) and PWA install.

## Build-order foundations (gate disproportionate downstream value)

1. **A1 — IssueEvent transition ledger** unlocks all flow/SLA/QA analytics.
2. **B1 — business-hours calendar** gates every SLA number.
3. **F1 — Personal Access Tokens + Bearer auth** unlocks every importer/export/integration.
4. **B3 — flat-retainer billing run** is the named near-term P1 (needs a `retainerCents` field + a generation branch).

## Top 15 (ranked)

1. **IssueEvent transition ledger** — append-only status/assignee/sprint history; the foundation under cycle-time, CFD, SLA, burndown, aging, flow-efficiency. — P0 · L
2. **Typed issue links + first-class Blocked state** (reason, age, flow-exclusion) — most-converged single item; biggest planning/QA gap. — P0 · M
3. **SLA policies + breach clock on a business-hours calendar** — for a retainer/maintenance shop, responsiveness *is* the product. — P0 · L
4. **Flat-retainer billing run + entitlement/burn-down meter** — bills the fixed monthly fee regardless of hours, folds in non-billable tickets, overage spills to T&M. — P1 · M
5. **Personal Access Tokens + Bearer auth + published OpenAPI** — the unlock layer for importers, export, CLI, CI, integrations. — P1 · M
6. **Per-user notification routing matrix + in-app inbox + @mentions + digest/quiet-hours** — the design layer over the in-progress per-user channels. — P1 · M
7. **Sprint goal + burndown/burnup with scope-change + committed-vs-completed velocity** — the core agile artifacts, currently absent. — P1 · M
8. **WIP limits + aging-WIP badges + CFD + cycle/lead-time report** — Kanban diagnostics for maintenance projects. — P1 · M
9. **Keyboard + screen-reader board drag-and-drop; stop double-reading both languages** — a keyboard/SR user cannot change status today. — P0 · S/M
10. **Request intake forms + triage queue** — typed requests landing in an Untriaged lane; protects scope + billing at the front door. — P1 · M
11. **Scope-change requests with client e-approval** (mini change orders) — the audit-grade paper trail that wins scope arguments. — P1 · M
12. **Project templates + actionable empty states + first-run wizard + demo data** — converts a fresh self-hoster's evaluation. — P1 · M
13. **Jira/Trello/CSV importer + full-tenant JSON export/restore** — the adoption gate for a Jira alternative. — P2 · L
14. **Command palette (⌘K) + board shortcuts + bulk actions with undo + saved views** — makes it *feel* like Jira. — P1 · M/L
15. **Cross-client "My Work"/Today view + global quick-capture timer + offline outbox** — the freelancer/field daily cockpit. — P2 · M/L

## By theme

### A — Analytics & flow foundation (the data spine)
- **A1. IssueEvent transition ledger** — `(issueId, kind, from, to, statusCategory, actor, at)` in the issue-update tx. — P0 · L
- **A2. Cycle/lead-time report + aging-WIP board badges** — p50/p85/p95, scatter, days-in-status dots. — P1 · M (badge alone S)
- **A3. Sprint burndown/burnup + committed-vs-completed velocity trend** — stop discarding the velocity-snapshot row. — P1 · M
- **A4. WIP limits + pull/replenishment + flow efficiency** (active vs queue). — P1 · M
- **A5. Cumulative Flow Diagram.** — P2 · M
- **A6. Multi-project portfolio dashboard (RAG on budget burn).** — P1 · M
- **A7. Estimate-vs-actual / scope-creep / carryover report.** — P2 · M
- **A8. Team utilization & billable-realization report.** — P2 · M
- **A9. Monte Carlo throughput forecast.** — P3 · L
- **A10. Self-service report builder + saved/scheduled emailed reports.** — P2 · L

### B — SLA, support & retainer economics
- **B1. Business-hours calendar + "waiting-on-client" SLA-pause class** (pre-seed ES holidays). — P0 · M
- **B2. SLA policies + breach clock + attainment %.** — P0 · L
- **B3. Flat-retainer billing run + entitlement/burn-down** (`retainerCents`, included hours, overage→T&M, rollover). — P1 · M
- **B4. Escalation rules engine** (SLA% / inactivity / reopened / unassigned-high). — P2 · M
- **B5. CSAT on resolution (tokenized no-login rating).** — P2 · M
- **B6. Support ops dashboard.** — P2 · M
- **B7. Saved-reply / canned snippets with `{{var}}`.** — P3 · S
- **B8. Client profitability / margin view** (admin-only cost rate). — P2 · M
- **B9. Client health & renewal radar.** — P3 · M

### C — Billing & finance controller
- **C1. Payment terms + due dates + AR aging.** — P1 · M
- **C2. Partial payments + Payment table.** — P2 · M
- **C3. Tax/VAT (IVA) line, per-client exemptible** (stays non-fiscal). — P2 · M
- **C4. Budget-vs-actual burn alerts** (T&M cap + retainer overrun). — P1 · M
- **C5. Rate effective-dating (history); resolve by worklog date.** — P2 · L
- **C6. Per-currency totals everywhere (+ optional FxRate).** — P2 · M
- **C7. Credit notes (ANC- negative annex).** — P3 · M
- **C8. Revenue billed-vs-collected CSV export.** — P2 · S
- **C9. Timesheet export (CSV/PDF) for T&M clients.** — P2 · M
- **C10. Scheduled, branded, multi-currency monthly client statement pack.** — P2 · L

### D — Issue quality, workflow & QA
- **D1. Typed issue links + first-class Blocked** (reason, age, flow-exclusion, auto-notify). — P0 · M
- **D2. Resolution field + reopen/escaped-defect tracking.** — P1 · M
- **D3. Bug template: severity (≠ priority) + repro/expected/actual/env.** — P1 · M
- **D4. Issue templates + DoD/DoR checklists with optional transition gate.** — P1 · S
- **D5. Per-project status-transition workflow + required-field/role gates.** — P2 · L
- **D6. Saved/shareable views (Triage, Blocked, Reopened, Critical, My Work).** — P1 · M
- **D7. MoSCoW/RICE prioritization fields.** — P3 · S
- **D8. Recurring/templated maintenance issues + monthly runbook checklist.** — P2 · M
- **D9. Custom fields (typed, scoped, validated).** — P3 · L
- **D10. Worklog-vs-Done readiness guards.** — P3 · S

### E — Notifications & comms (design layer over the in-progress channels)
- **E1. @mentions + in-app inbox + notification reasons.** — P1 · M
- **E2. Reason × channel × mode routing matrix** (emergency non-mutable). — P1 · M
- **E3. Digest batcher + per-user quiet hours/DND with emergency override.** — P1 · M
- **E4. Issue watching/subscriptions + one-click unwatch from email.** — P2 · M
- **E5. One-tap incident ack from email/Telegram (signed link).** — P1 · M
- **E6. Bilingual branded templates with deep links + field diffs.** — P2 · M
- **E7. Per-user delivery log + "why did/didn't I get this" + test-my-channels.** — P2 · S/M
- **E8. Security-event & login notifications** (new device, role grant, magic-link burst). — P2 · M

### F — Integrations & data portability
- **F1. PATs + Bearer auth + OpenAPI 3.1 from existing Zod.** — P1 · M
- **F2. Jira/Trello/CSV importer + full-tenant JSON export/restore.** — P2 · L
- **F3. Git commit/PR linking (GitHub/GitLab/Gitea) + smart-commits.** — P2 · L
- **F4. First-class Slack/Discord/Telegram outbound + expanded event set.** — P2 · M
- **F5. Signed generic outbound webhook subscriptions + delivery log/replay.** — P2 · M
- **F6. iCal feed (sprints, due dates, on-call) via revocable token.** — P3 · S
- **F7. Email-to-issue + reply-to-comment.** — P2 · L
- **F8. Slack/Telegram slash-command actions + CI/deploy status intake.** — P3 · M

### G — Accessibility & inclusive design
- **G1. Keyboard + SR-announced board DnD with non-drag move fallback.** — P0 · M
- **G2. `Bi` language-aware (aria-hidden secondary).** — P0 · S
- **G3. Live regions (timer, danger toasts→alert) + icon-button names + modal focus trap/return.** — P1 · M
- **G4. CI a11y/contrast gate (axe + token contrast).** — P1 · M
- **G5. Honor `prefers-reduced-motion` for JS/dnd motion.** — P2 · S
- **G6. Client-portal a11y parity audit.** — P2 · M
- **G7. Per-user calm mode / density / font-scale + RTL groundwork.** — P3 · M

### H — Onboarding, growth & craft
- **H1. First-run setup wizard + actionable empty states + load/wipe demo data.** — P1 · M
- **H2. Project templates (Sprint / Monthly-T&M / Flat-retainer / Blank).** — P1 · M
- **H3. Command palette (⌘K) + board shortcuts + `?` cheat-sheet.** — P1 · M
- **H4. Bulk actions + selection tray + universal toast-undo.** — P1 · L
- **H5. Running-timer pill + stop-timer nudge.** — P1 · M
- **H6. Inline contextual help on money/cadence + copy-link invite fallback.** — P2 · S
- **H7. Client-portal welcome primer + portal CTA empty states.** — P2 · S
- **H8. Per-issue humane activity timeline + reviewable "Generate annex" preview/diff.** — P2 · M/L
- **H9. Per-client branded portal (logo, colors, custom domain).** — P2 · M
- **H10. Public roadmap + changelog + "what's new" (dogfood).** — P3 · M

### I — Enterprise, security & multi-client governance
- **I1. Tamper-evident hash-chained Sauron + `/audit/verify` + signed export.** — P1 · M
- **I2. Admin session console + force-logout (org-wide kill switch).** — P1 · S
- **I3. Granular role builder with project/client-scoped grants.** — P2 · L
- **I4. Step-up reauth for high-risk actions + magic-link device binding.** — P2 · M/S
- **I5. GDPR DSAR export + crypto-erase/pseudonymization + retention/legal-hold.** — P2 · L
- **I6. No-code automation rules (when→if→then).** — P2 · L
- **I7. Intake-token + secret rotation.** — P2 · M
- **I8. OIDC/SAML SSO + JIT + SCIM provisioning** (Keycloak sibling repo as reference). — P3 · L
- **I9. IP allowlist for staff surface + Sauron bind-localhost.** — P3 · S

### J — Mobile / field & PWA (riding the in-progress PWA install)
- **J1. Cross-project "My Work" + Today view + glanceable home.** — P2 · M
- **J2. Global quick-capture: one-tap timer + title-only quick-add + share-target.** — P2 · M
- **J3. Offline worklog/comment/transition capture with Background Sync outbox.** — P3 · L
- **J4. Thumb-reachable board: swipe transitions + bottom action bar.** — P3 · M
- **J5. Mobile worklog clean-up: end-of-day review + bulk edit + gap detection.** — P3 · M
- **J6. OS-level live timer notification + quiet-hours-aware push digest.** — P3 · M
- **J7. Geofenced/location-stamped worklogs (opt-in).** — P3 · M

### K — DevEx / self-hoster operations
- **K1. One-command backup + verified restore.** — P1 · M
- **K2. Deep health + readiness (migration-drift, SMTP, outbox backlog, daemon heartbeat).** — P1 · M
- **K3. Safe upgrade: auto-backup-before-migrate + drift guard + rollback.** — P1 · M
- **K4. Dead-letter visibility + retry/replay UI for notifications & webhooks.** — P1 · M
- **K5. `scrumlord doctor` deploy validator.** — P2 · M
- **K6. Prometheus `/metrics` + bundled Grafana dashboard.** — P2 · M
- **K7. Centralized env zod schema → generated reference + real `APP_VERSION`.** — P2 · M
- **K8. `support-bundle` + resource-bounded compose defaults + log rotation.** — P3 · S

### L — Performance & scale
- **L1. Push board/summary/monthly aggregation into SQL (groupBy/date_trunc).** — P1 · M
- **L2. Fix portal-overview N+1 (set-based rollups).** — P1 · M
- **L3. Real-time board/incident updates via SSE + LISTEN/NOTIFY (replace 1-min cron).** — P2 · L/M
- **L4. Trigram/tsvector search index.** — P2 · M
- **L5. Cursor pagination + composite indexes + ETag/304.** — P2 · M/S
- **L6. Denormalized `Issue.loggedMinutes` rollup + board column virtualization.** — P3 · L

## Quick wins (small effort, high value)

1. `Bi` language-aware (aria-hidden secondary) — fixes double-reading app-wide. — P0 · S
2. Aging-WIP badge on cards (needs A1). — P1 · S
3. Admin session console + force-logout (wire existing `revokeUserSessions`). — P1 · S
4. Actionable empty states (`EmptyState` atom with CTAs). — P1 · M(low)
5. DoD/DoR + issue templates. — P1 · S
6. Seeded saved/system views (Triage, Blocked, Reopened, Critical, My Work). — P1 · M(low)
7. `?` keyboard cheat-sheet overlay. — P2 · S
8. Inline `(i)` help on rate/annex/cadence + copy-link invite fallback. — P2 · S
9. Client-portal welcome primer + "Raise a request" empty state. — P2 · S
10. iCal feed (revocable token). — P3 · S
11. Revenue billed-vs-collected CSV export. — P2 · S
12. `prefers-reduced-motion` for JS/dnd motion. — P2 · S
13. Magic-link device binding (kills the top ATO path). — P2 · S
14. IP allowlist for staff surface + Sauron localhost bind. — P3 · S
