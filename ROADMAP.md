# gira-scrumlord — Product Roadmap (v2)

> A living roadmap, not a commitment. v2 restructures the v1 inventory around a **thesis**,
> an explicit **v1.0 cut line + non-goals**, and a **dependency-aware wave sequence** — then
> keeps the full theme inventory as the reference appendix.
>
> Synthesized from a 20-lens product ideation pass and a second adversarial enhancement pass
> (deep theme development for the gaps + two competing release sequencers + an adversarial
> critic). The critic's adjudication is what this document encodes — not any single agent's plan.
>
> **In flight now:** per-user notifications (email / web-push / Telegram) and PWA install.

---

## 1. Thesis — the wedge

> **gira-scrumlord is the tracker where the work, the clock, and the invoice are the same object** —
> the only self-hostable issue tracker that natively turns logged maintenance work into SLA
> attainment _and_ a monthly bill, so a small shop runs support and gets paid without a second tool.

The bet is the **one quadrant nobody owns** — a dev-grade tracker that is _also_ a help-desk SLA
clock _and_ a retainer-billing engine, self-hosted with zero telemetry:

| Tool class                          | Tracker | SLA clock | Retainer billing | Self-host · no telemetry |
| ----------------------------------- | ------- | --------- | ---------------- | ------------------------ |
| Jira / Linear / Plane / OpenProject | ✅      | bolt-on   | ❌               | partial                  |
| Harvest / Toggl                     | ❌      | ❌        | time only        | ❌                       |
| Zammad / FreeScout (help-desk)      | weak    | ✅        | ❌               | ✅                       |
| **gira-scrumlord**                  | ✅      | ✅        | ✅               | ✅                       |

**Primary user:** a small maintenance / retainer shop or solo freelancer, dogfooded by the
maintainer's own shop. **Consequence for priority:** money + SLA are **P0 _product_, not P1
_finance features_.** Depth on money + SLA + client-portal beats breadth on generic PM features.

---

## 2. Non-goals (the kill list)

Saying _no_ is what gives the product an identity. gira-scrumlord will **not**:

1. **Issue fiscal invoices, ever** (TicketBAI / Batuz) — it produces a **non-fiscal annex** (`ANX-`) only.
2. **Ship native iOS / Android apps** — the **PWA is the mobile story**.
3. **Grow generic PM bloat** — no Gantt empire, no resource-leveling, no PMO portfolio suite beyond the single RAG dashboard. It is a _maintenance shop's_ tool, not MS Project.
4. **Phone home / collect telemetry** — _ever_. A formal non-goal so no future feature can violate it. (AI features inherit this: see Theme M — BYO-key, off by default, Ollama = zero egress.)
5. **Become multi-tenant SaaS** — self-hosted, single-org, multi-_client_ within that org.
6. **Become a CRM** — a client is a billing + portal entity, not a sales lead/pipeline.
7. **Localize copy beyond ES · EN** for 1.0 — RTL groundwork is welcome; a full i18n framework is out of scope. (Note: number/currency _formatting_ per locale **is** in scope — see `S1`, distinct from copy.)

---

## 3. The v1.0 cut line — definition of done

**v1.0 = Wave 0 ∪ Wave 1, all green.** It is _not_ "everything good." It is the smallest set that
makes **one sentence literally and safely true**:

> _The work, the clock, and the invoice are the same object — exposed to a client without leaking,
> on a box that survives the night._

Concretely, 1.0 is:

- ✅ **Shipped** — M1–M15 + the 2026-06 correctness fixes.
- 🔨 **In flight** — per-user notifications + PWA install.
- 🛟 **Audit safety floor** — remaining domain/money/error-handling fixes + a11y to WCAG AA on shipped surfaces + a coverage gate (a "perfect app" cannot ship known HIGH bugs).
- 🧱 **Spine made literally true** — `A1` ledger, `B1`+`B2` SLA clock, `B3` flat-retainer, `D1` typed links/Blocked, `R1` contract anchor.
- 🔒 **Spine made _trustworthy_** — `P1` worklog approval + period lock, `P2` annex supersede, tamper-evident annex (Sauron-chained), `S1` locale formatting, `S6` TZ/DST-correct clock.
- 🚪 **Portal made _safe to expose_** — `N1` internal-vs-client comment guard, `N2` attachments (authorized download), `N4` markdown/mention, `R4` portal-access revocation on contract lapse.
- 💾 **Box made _survivable_** — `S3`/`S4` boot-guard + intake rate-limit, `O1`/`O2`/`O3`/`O4`/`O5` offsite-encrypted backup + proven restore + secrets hygiene + bus-factor recovery + upgrade safety net.

Everything else — AI (Theme M), advanced analytics, automation, SSO, importer, integrations, offline,
onboarding craft, perf/scale — is **post-1.0**, added without re-architecting.

---

## 4. Build-order foundations (corrected)

The v1 doc named `A1 · B1 · F1 · B3`. The adversarial pass corrected this:

- **`F1` (PATs/OpenAPI) is demoted out of foundations → Wave 2.** No spine item needs a Bearer token or a public API to be _true_; it blocks no Wave-1 item and serves integrators who arrive at 1.1.
- **Three P0s join the foundation tier** — without them the thesis is _expressible_ but not _trustworthy or survivable_: `P1` (period lock — else `A1` is decorative and "work=invoice" is editable-after-billing), `N1` (visibility guard — else the portal is a leak), and the survivability floor (`S3·S4·O1·O3·O5`).

> **Corrected foundations:** `A1 → B1 → {B2, B3, P1} + N1 + (S3, S4, O1, O3, O5) + S6`

---

## 5. Release waves

### Wave 0 — In flight / safety floor _(finish before any Wave-1 feature starts)_

Debt + correctness, not features. Nothing in Wave 1 begins until this is green.

- **Per-user notifications** — `E1` in-app inbox + @mentions, per-user routing (email / web-push / Telegram), idempotent dispatch (fixes the confirmed double-delivery + personal-bypass HIGH bugs).
- **PWA install** — manifest, real icons, iOS meta, service worker (NetworkOnly `/api`, precache shell, navigate-fallback with `/api` denylist).
- **Audit correctness backlog (2026-06)** — domain/money/error-handling fixes, a11y to AA on shipped surfaces (`G2`, live regions/focus on existing pages), and the **coverage gate** (the CI ratchet Wave 1 lands on).
- **`K7`** — env zod schema + real `APP_VERSION`. _Pulled in:_ it's the one-day enforcement point that `S3`, `O3`, `O5` all check against.

```
K7 → {S3, O3, O5}
audit-money-correctness → P1          (cannot lock a ledger you haven't proven correct)
coverage-gate → (gates ALL of Wave 1 — the ratchet)
E1 → N4 mention-notify
```

### Wave 1 — The spine to 1.0 _(completion == v1.0)_

**1A · Foundations** — `A1` IssueEvent ledger · `B1` business-hours calendar + waiting-on-client pause · `D1` typed links + first-class Blocked.

**1B · Clock real, bill trustworthy** — `B2` SLA policies + breach clock + attainment · `B3` flat-retainer billing + burn-down · `R1` contract/SOW lifecycle (anchors B2+B3 to a term) · **`P1` worklog approval + period lock** · `P2` annex supersede/correction · `S1` per-locale date/number/currency formatting · **`S6` org/client timezone + DST-correct SLA & worklog timestamps (store UTC)** · `P6` annex completeness & integrity (org/client identity block + gapless `ANX-` numbering under concurrency/rollback) · **tamper-evident annex** (pull `I1`'s hash-chain slice forward, just for the annex).

**1C · Portal-safe comments/attachments** — `N1` first-class comments + internal/client visibility guard (repo predicate **+ Postgres RLS** + a contract test asserting _no_ portal token ever receives an INTERNAL row, across every comment-bearing endpoint) · `N2` attachments + authorized download + inherited visibility · `N4` markdown + @mention + paste-image (authoritative server-side sanitizer).

**1D · Security & survivability floor** — `S4` public-intake rate-limit/abuse · `S3` schema-version boot guard + guarded migrate · `O3` secrets generate-on-first-boot · `O1` offsite encrypted backup (DB + attachment blobs) · `O5` auto-backup-before-migrate + drift guard + rollback (built _inside_ `K3`) · `O2` automated restore-verification drill · `O4` one-command recovery + `RECOVERY.md` · `K1` local-dump primitive · `K2` deep health/readiness · `K3` safe-upgrade/rollback shell.

**1E · Daily-life + access** — `Q1` per-client runbook/KB _(degraded: basic markdown listing; the `L4` full-text upgrade lands in Wave 2)_ · **`R4` portal-access revocation on contract lapse / contact offboarding** · `G1` keyboard + SR board DnD · `G2` (from Wave-0 floor).

```
A1 → {B2, B3, P1, N1-timeline, O2-integrity-check, A2(W2), D2(W2)}
B1 → B2 ;  B2 → {R1, P3(W2)} ;  D1 → {N1-link-model, M3(W2)}
audit-money(W0) → P1 → {P2, P4(W2), P3(W2)}        (lock before correct/penalty/reconcile)
R1 → {B2-coverage, B3-term, R4, R2/R3(W2)}
S1 → {S2(W2), annex render} ;  S6 → {B2 clock math, annex period}
N1 → {N2, N4, N5(W2), N7(W2), N6(W2)} ;  N2 → N4 paste-image ;  E1(W0) → N4 mention-notify
K7(W0) → {S3, O3, O5} ;  K1 → {O1, O5} ;  K2 → {O2, O4} ;  K3 → O5 ;  O1 → {O2, O4} ;  O3 → O4
```

### Wave 2 — Adoption + leverage (1.1)

The spine is true and safe; now lower the new-user floor and add high-leverage automation.

- **Money/contract loops** — `P3` SLA credit/penalty → billing line _(emits a `C7` `ANC-` credit — pull `C7` primitive forward)_ · `P4` pre-bill reconciliation · `P5` non-billable/write-off classification · `R3` included-vs-overage metering · `R2` renewal auto-stop _(folds into `B9`)_ · `C5` rate effective-dating _(before the first rate change)_ · `C4` budget burn alerts · `C1` payment terms + AR aging.
- **Comments/intake depth** — `N5` edit/delete + audit · `N3` optional AV scan (gates client uploads) · `N7` email reply-to-comment · `F7` email-to-issue · `N6` reactions/acks.
- **Operational knowledge & first analytics** — `Q1` search upgrade (`L4`) · `Q2` recurring scheduled-work generator · `D8` recurring maintenance issues · `A2` cycle/lead-time + aging-WIP badges · `D2` resolution + reopen/escaped-defect.
- **AI (Theme M) — starts here, never before `M1`** — `M1` gateway/redaction/kill-switch → `M4` bilingual client status-email draft _(the #1 leverage item & best demo)_ · `M2` auto-triage intake · `M3` dup-detection · `M5` thread catch-up.
- **Adoption floor & craft** — `F1` PATs + Bearer + OpenAPI · `F2` Jira/Trello/CSV importer + JSON export/restore · `H1` setup wizard + empty states + demo data · `H3` ⌘K palette · `H4` bulk actions + undo · `H5` running-timer pill.
- **a11y + DR polish** — `G3` live regions/focus trap/icon names · `G4` CI a11y/contrast gate · `G6` portal a11y parity · `S2` PDF accessibility/correctness · `O6` backup-freshness alerting · `O7` RPO/RTO posture doc · `S5` attachment storage quota · `I2` admin session console · `I4` step-up reauth.
- **Perf the above needs** — `L1` SQL aggregation · `L2` portal N+1 fix · `L4` trigram/tsvector search.

### Wave 3 — Depth & scale (post-1.0, built by pull)

Analytics depth `A3·A4·A5·A6·A7·A8·A9·A10` · SLA/support depth `B4·B5·B6·B7·B8·B9` · billing depth `C2·C3·C6·C8·C9·C10` · issue-quality depth `D3·D4·D5·D6·D7·D9·D10` · notifications depth `E2·E3·E4·E5·E6·E7·E8` · integrations `F3·F4·F5·F6·F8` · a11y polish `G5·G7` · craft `H2·H6·H7·H8·H9·H10` · enterprise/IAM `I1(full)·I3·I5·I6·I7·I8·I9` · mobile depth `J1·J2·J3·J4·J5·J6·J7` · devex `K4·K5·K6·K8` · perf `L3·L5·L6` · AI depth `M6·M7·M8·M9` · `Q3` client uptime tile _(ingest-only, hard-capped)_ · `Q4` encrypted credential locker _(high-risk; gate behind `I4`+`I5`; W3-or-never)_ · client portal self-export (mini-DSAR, distinct from `F2`).

---

## 6. Theme reference — the full inventory

### Existing themes (A–L)

#### A — Analytics & flow foundation (the data spine)

- **A1. IssueEvent transition ledger** — `(issueId, kind, from, to, statusCategory, actor, at)` in the issue-update tx. — P0 · L
- **A2. Cycle/lead-time report + aging-WIP board badges** — p50/p85/p95, scatter, days-in-status dots. — P1 · M (badge alone S)
- **A3. Sprint burndown/burnup + committed-vs-completed velocity trend.** — P1 · M
- **A4. WIP limits + pull/replenishment + flow efficiency** (active vs queue). — P1 · M
- **A5. Cumulative Flow Diagram.** — P2 · M
- **A6. Multi-project portfolio dashboard (RAG on budget burn).** — P1 · M
- **A7. Estimate-vs-actual / scope-creep / carryover report.** — P2 · M
- **A8. Team utilization & billable-realization report.** — P2 · M
- **A9. Monte Carlo throughput forecast.** — P3 · L
- **A10. Self-service report builder + saved/scheduled emailed reports.** — P2 · L

#### B — SLA, support & retainer economics

- **B1. Business-hours calendar + "waiting-on-client" SLA-pause class** (pre-seed ES holidays). — P0 · M
- **B2. SLA policies + breach clock + attainment %.** — P0 · L
- **B3. Flat-retainer billing run + entitlement/burn-down** (`retainerCents`, included hours, overage→T&M, rollover). — P1 · M
- **B4. Escalation rules engine** (SLA% / inactivity / reopened / unassigned-high). — P2 · M
- **B5. CSAT on resolution (tokenized no-login rating).** — P2 · M
- **B6. Support ops dashboard.** — P2 · M
- **B7. Saved-reply / canned snippets with `{{var}}`.** — P3 · S
- **B8. Client profitability / margin view** (admin-only cost rate). — P2 · M
- **B9. Client health & renewal radar** — _absorbs `R2`: add the P1 enforcement slice (auto-stop billable retainer on lapse)._ — P3 · M

#### C — Billing & finance controller

- **C1. Payment terms + due dates + AR aging.** — P1 · M
- **C2. Partial payments + Payment table.** — P2 · M
- **C3. Tax/VAT (IVA) line, per-client exemptible** (stays non-fiscal). — P2 · M
- **C4. Budget-vs-actual burn alerts** (T&M cap + retainer overrun). — P1 · M
- **C5. Rate effective-dating (history); resolve by worklog date.** — P2 · L
- **C6. Per-currency totals everywhere (+ optional FxRate).** — P2 · M
- **C7. Credit notes (ANC- negative annex)** — _forced dependency of `P3` (the SLA-credit artifact); primitive pulls to Wave 2._ — P3 · M
- **C8. Revenue billed-vs-collected CSV export.** — P2 · S
- **C9. Timesheet export (CSV/PDF) for T&M clients.** — P2 · M
- **C10. Scheduled, branded, multi-currency monthly client statement pack.** — P2 · L

#### D — Issue quality, workflow & QA

- **D1. Typed issue links + first-class Blocked** (reason, age, flow-exclusion, auto-notify). — P0 · M
- **D2. Resolution field + reopen/escaped-defect tracking.** — P1 · M
- **D3. Bug template: severity (≠ priority) + repro/expected/actual/env.** — P1 · M
- **D4. Issue templates + DoD/DoR checklists with optional transition gate.** — P1 · S
- **D5. Per-project status-transition workflow + required-field/role gates.** — P2 · L
- **D6. Saved/shareable views (Triage, Blocked, Reopened, Critical, My Work).** — P1 · M
- **D7. MoSCoW/RICE prioritization fields.** — P3 · S
- **D8. Recurring/templated maintenance issues + monthly runbook checklist** — _companion to `Q2`'s scheduler._ — P2 · M
- **D9. Custom fields (typed, scoped, validated).** — P3 · L
- **D10. Worklog-vs-Done readiness guards.** — P3 · S

#### E — Notifications & comms (design layer over the in-progress channels)

- **E1. @mentions + in-app inbox + notification reasons.** — P1 · M _(Wave 0)_
- **E2. Reason × channel × mode routing matrix** (emergency non-mutable). — P1 · M
- **E3. Digest batcher + per-user quiet hours/DND with emergency override.** — P1 · M
- **E4. Issue watching/subscriptions + one-click unwatch from email.** — P2 · M
- **E5. One-tap incident ack from email/Telegram (signed link).** — P1 · M
- **E6. Bilingual branded templates with deep links + field diffs** — _moves with `M4`._ — P2 · M
- **E7. Per-user delivery log + "why did/didn't I get this" + test-my-channels.** — P2 · S/M
- **E8. Security-event & login notifications** (new device, role grant, magic-link burst). — P2 · M

#### F — Integrations & data portability

- **F1. PATs + Bearer auth + OpenAPI 3.1 from existing Zod** — _demoted from foundations → Wave 2 (adoption lever, not spine)._ — P1 · M
- **F2. Jira/Trello/CSV importer + full-tenant JSON export/restore** — _late Wave 2 (migration adoption gate)._ — P2 · L
- **F3. Git commit/PR linking (GitHub/GitLab/Gitea) + smart-commits.** — P2 · L
- **F4. First-class Slack/Discord/Telegram outbound + expanded event set.** — P2 · M
- **F5. Signed generic outbound webhook subscriptions + delivery log/replay.** — P2 · M
- **F6. iCal feed (sprints, due dates, on-call) via revocable token.** — P3 · S
- **F7. Email-to-issue + reply-to-comment** — _prereq for `N7`._ — P2 · L
- **F8. Slack/Telegram slash-command actions + CI/deploy status intake.** — P3 · M

#### G — Accessibility & inclusive design

- **G1. Keyboard + SR-announced board DnD with non-drag move fallback.** — P0 · M
- **G2. `Bi` language-aware (aria-hidden secondary).** — P0 · S _(Wave 0)_
- **G3. Live regions (timer, danger toasts→alert) + icon-button names + modal focus trap/return.** — P1 · M
- **G4. CI a11y/contrast gate (axe + token contrast).** — P1 · M
- **G5. Honor `prefers-reduced-motion` for JS/dnd motion.** — P2 · S
- **G6. Client-portal a11y parity audit.** — P2 · M
- **G7. Per-user calm mode / density / font-scale + RTL groundwork.** — P3 · M

#### H — Onboarding, growth & craft

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

#### I — Enterprise, security & multi-client governance

- **I1. Tamper-evident hash-chained Sauron + `/audit/verify` + signed export** — _pull the annex-chaining slice into Wave 1 (1.0 trust item); full theme W3._ — P1 · M
- **I2. Admin session console + force-logout (org-wide kill switch).** — P1 · S
- **I3. Granular role builder with project/client-scoped grants.** — P2 · L
- **I4. Step-up reauth for high-risk actions + magic-link device binding.** — P2 · M/S
- **I5. GDPR DSAR export + crypto-erase/pseudonymization + retention/legal-hold.** — P2 · L
- **I6. No-code automation rules (when→if→then).** — P2 · L
- **I7. Intake-token + secret rotation.** — P2 · M
- **I8. OIDC/SAML SSO + JIT + SCIM provisioning** (Keycloak sibling repo as reference). — P3 · L
- **I9. IP allowlist for staff surface + Sauron bind-localhost.** — P3 · S

#### J — Mobile / field & PWA (riding the in-progress PWA install)

- **J1. Cross-project "My Work" + Today view + glanceable home.** — P2 · M
- **J2. Global quick-capture: one-tap timer + title-only quick-add + share-target.** — P2 · M
- **J3. Offline worklog/comment/transition capture with Background Sync outbox.** — P3 · L
- **J4. Thumb-reachable board: swipe transitions + bottom action bar.** — P3 · M
- **J5. Mobile worklog clean-up: end-of-day review + bulk edit + gap detection.** — P3 · M
- **J6. OS-level live timer notification + quiet-hours-aware push digest.** — P3 · M
- **J7. Geofenced/location-stamped worklogs (opt-in).** — P3 · M

#### K — DevEx / self-hoster operations

- **K1. One-command backup + verified restore** — _local-dump primitive; Theme O builds the DR layer on top._ — P1 · M
- **K2. Deep health + readiness (migration-drift, SMTP, outbox backlog, daemon heartbeat).** — P1 · M
- **K3. Safe upgrade: auto-backup-before-migrate + drift guard + rollback** — _`O5` is built inside this; keep them in the same release._ — P1 · M
- **K4. Dead-letter visibility + retry/replay UI for notifications & webhooks.** — P1 · M
- **K5. `scrumlord doctor` deploy validator.** — P2 · M
- **K6. Prometheus `/metrics` + bundled Grafana dashboard.** — P2 · M
- **K7. Centralized env zod schema → generated reference + real `APP_VERSION`** — _pulled to Wave 0 (enforcement point for `S3`/`O3`/`O5`)._ — P2 · M
- **K8. `support-bundle` + resource-bounded compose defaults + log rotation.** — P3 · S

#### L — Performance & scale

- **L1. Push board/summary/monthly aggregation into SQL (groupBy/date_trunc).** — P1 · M
- **L2. Fix portal-overview N+1 (set-based rollups).** — P1 · M
- **L3. Real-time board/incident updates via SSE + LISTEN/NOTIFY (replace 1-min cron).** — P2 · L/M
- **L4. Trigram/tsvector search index** — _prereq for `Q1` search + `M3` dup-detect; pull to Wave 2._ — P2 · M
- **L5. Cursor pagination + composite indexes + ETag/304.** — P2 · M/S
- **L6. Denormalized `Issue.loggedMinutes` rollup + board column virtualization.** — P3 · L

### New themes (M–S) — added in v2

#### M — AI / LLM assist _(BYO-key · off by default · no-egress-by-default · AI suggests, human commits)_

Design constraints (whole theme): **one chokepoint** (`M1`: every call redacts → budget-checks → Sauron-logs a prompt-hash, never raw → single kill-switch); **Ollama = first-class zero-egress option**; **nothing auto-applies** to issues, bills, the SLA clock, or client channels; **tenant + internal/client scope is sacred** — no cross-client context, no internal-note leakage, even with AI on. _No M-item may be sequenced before `M1`._

- **M1. AI provider config + redaction gateway + kill-switch.** Admin-only panel; key encrypted at rest (webhook-secret vault); hard monthly token budget. — P0(theme) · M · deps I1, K7
- **M2. AI auto-triage of unauthenticated intake** (project/type/severity/priority suggestions, rule-based fallback). — P0(theme) · L · deps M1, F7, B2, A1
- **M3. Dup-detection on intake + create** (pgvector embeddings, project-scoped, one-click link-as-duplicate). — P0(theme) · M · deps M1, D1, L4
- **M4. Auto-drafted bilingual client status email** (from ledger + SLA + annex; ready-to-edit, never auto-sent). — P0(theme) · L · deps M1, A1, B2, B3, C10, E6 — _highest-leverage item; top Wave 2 pick._
- **M5. Issue-thread "catch me up" summarization** (client-safe variant strips internal notes). — P1 · M · deps M1, N1, A1
- **M6. Estimate suggestion from historical cycle-time** (decision aid, never autofill). — P1 · M · deps M1, M3, A2, A7
- **M7. Retro / at-risk synthesis** (slip causes, SLA near-miss, scope-creep; draft, not verdict). — P1 · M · deps M1, A1, A2, A7, B2, C4
- **M8. Comment/reply rewrite assist** (tone + ES↔EN, on box-text only). — P2 · S · deps M1, N1, E6
- **M9. Natural-language "ask your tracker"** (NL → _validated filter_ over saved-view primitives; schema-only egress, runs under caller RBAC). — P2 · L · deps M1, D6, L1, H3

#### N — Comments & attachments depth _(the internal-vs-client visibility split is the spine of the theme)_

- **N1. First-class threaded comments + internal/client visibility guard.** `Comment` model (one-level threading); the guard is a **repo-level predicate** (`listVisibleComments(issue, viewer)`), `viewerIsStaff` derived server-side, **belt-and-suspenders Postgres RLS / mandatory Prisma middleware** so a forgotten WHERE fails _closed_, and a contract test asserting a portal token never receives an INTERNAL row across _every_ comment-bearing endpoint (detail, feed, search, notifications, email render, export). CLIENT→INTERNAL never retracts what was already delivered. — **P0** · M · deps I1
- **N2. File attachments, pluggable storage** (local-disk default / S3-compatible). Magic-byte allowlist (not client MIME), size caps, server-generated random `storageKey` (filename is metadata only), visibility inherited from parent, **authorized download endpoint** running the N1 predicate (short-TTL pre-signed URL only after authz; never public-read), `Content-Disposition: attachment` + `nosniff`, SVG sanitized/forced-download. — **P0** · L · deps N1, I1
- **N3. Optional AV scan pipeline** (ClamAV via daemon job; `PENDING`→`CLEAN|INFECTED|ERROR`; off by default; gates client downloads). — P1 · M · deps N2
- **N4. Markdown + @mention + paste/drag image.** Server-side authoritative sanitizer (strict allowlist, strip raw HTML / `javascript:` / `data:` / event handlers; `rel="noopener nofollow ugc"`; scheme allowlist). Mention autocomplete runs the N1 scope (client cannot enumerate the directory); mention inside an INTERNAL comment never notifies a client. — **P0** · M · deps N1, N2, E1
- **N5. Comment edit/delete + audit + "edited" marker** (full before→after history to Sauron; visibility changes audited). — P1 · S · deps N1, I1
- **N6. Reactions / lightweight acks** (fixed emoji set; respect visibility; explicitly capped — non-goal #3). — P2 · S · deps N1
- **N7. Email reply-to-comment** (signed per-recipient `Reply-To` token is the _sole_ authority for the reply's visibility — a client can never smuggle an INTERNAL note; SPF/DKIM/DMARC checks; attachment allowlist applies). — P1 · L · deps N1, F7, E1

#### O — Single-operator resilience & disaster recovery _("backup exists" ≠ DR)_

1.0 trust floor = `O1 + O2 + O3 + O4 + O5`. O builds the DR layer on top of `K1`/`K2`/`K3`.

- **O1. Offsite encrypted backup to S3-compatible storage** (restic or `pg_dump`→age; client-side encryption; GFS retention; covers DB **and** attachment blobs). — **P0** · L · deps K1
- **O2. Automated restore-verification drill** (ephemeral throwaway Postgres; integrity checks incl. `ANX-` cents reconcile + latest IssueEvent; red banner if last good drill is stale). — **P0** · L · deps O1, A1
- **O3. Secrets hygiene** (generate-on-first-boot, zero secrets in compose, scripted rotation with grace window; zod loader hard-fails on placeholder secrets in prod). — **P0** · M · deps K7
- **O4. Disaster-restore runbook + one-command `restore drill`** (stand up a full instance from nothing-but-the-bucket; the bus-factor artifact + `RECOVERY.md`). — **P0** · M · deps O1, O3, K2
- **O5. Upgrade safety net** (auto-backup-before-migrate + schema/data drift guard + `rollback --to pre-migrate`; refuse to migrate without a fresh backup; built inside `K3`). — **P0** · L · deps K3, K1
- **O6. Backup health monitoring + freshness alerting** (last-good-backup/-drill age, offsite reachability, dead-man's-switch friendly). — P1 · M · deps O1, O2, K2
- **O7. RPO/RTO posture doc + nightly-dump default** (nightly logical dump is the 1.0 default ≈24h RPO; WAL/PITR is a documented power-user flag, not the floor). — P1 · M · deps O1

#### P — Work-to-invoice governance _(the spine's missing guardrails)_

- **P1. Worklog approval + period lock** (draft→approved→locked; closing a billing period freezes its worklogs/rates; an annex issues only from locked entries). — **P0** · M · deps C5, annex — _highest integrity-per-line-of-code in the backlog._
- **P2. Annex correction / supersede** (re-issue creates a versioned annex referencing+voiding the prior; non-fiscal; distinct from `C7` credit-notes). — **P0** · S · deps P1, annex
- **P3. SLA credit / penalty → billing line** (a `B2` breach auto-proposes a credit line, approval-gated; **emitted as a `C7` `ANC-` artifact**). — P1 · M · deps B2, B3, P1, **C7**
- **P4. Pre-bill reconciliation review** ("ready to bill" screen: unapproved worklogs, missing rates, running timers, retainer over/under-burn, unbilled approved work). — P1 · M · deps P1, B3, C4
- **P5. Non-billable / write-off classification** (billable/non-billable/write-off + reason; flows to `A8` realization + the annex). — P1 · S · deps P1, A8
- **P6. Annex completeness & integrity** (org + client identity block on the annex; gapless `ANX-` numbering resilient under concurrency/rollback). — P1 · S · deps P2

#### Q — Operational knowledge & runtime _(a maintenance shop is its runbooks)_

- **Q1. Per-client runbook / internal KB** (lightweight per-client markdown wiki, internal-only by default, linkable from issues). — P0 · M · deps N(attachments), L4 — _Wave 1 degraded (no `L4` search yet), search upgrade in Wave 2._
- **Q2. Recurring scheduled-work generator** (schedule defs materialize issues on the daemon, runbook-linked, overdue signal — the retainer engine). — P1 · M · deps D8, B1, daemon
- **Q3. Client-scoped status/uptime tile** (ingest webhook/heartbeat + display only — **hard-capped: no synthetic probes**, else it becomes a monitoring product / non-goal #3). — P2 · M · deps F5, portal — _W3 only._
- **Q4. Per-client encrypted credential locker** (envelope-encrypted, Sauron-read-audited, step-up-gated — **NOT cleartext passwords**). — P2 · L · deps I1, I5, I4 — _W3-or-never; highest-risk item in the backlog._

#### R — Commercial lifecycle _(the retainer has a start, end, and terms — and they drive billing)_

- **R1. Contract / SOW lifecycle** (start/end/auto-renew, committed retainer, included-hours cap, notice period — this object _drives_ `B2` coverage and `B3` billing, not free-floating config). — **P0** · L · deps B2, B3, C5
- **R2. Renewal radar + auto-stop** — _folded into `B9`_ (the enforcement slice: stop billable retainer + flag uncovered work on lapse). — P1 · S · deps R1, B9
- **R3. Included-vs-overage metering** (track included hours/tickets per period; overflow routes to T&M **annex line**, per R1 terms; visible to the client). — P1 · M · deps R1, B3
- **R4. Portal-access lifecycle / auto-revoke** (revoke a client contact's portal access on contract lapse or offboarding — the leak the visibility guard can't catch). — **P0** · S · deps R1, magic-link auth

#### S — Self-hoster correctness _(silent data-corruptors)_

- **S1. Per-locale date/number/currency formatting** (`1.234,56 €` vs `€1,234.56`; distinct from `G2` UI-string copy). — **P0** · S · deps G2, billing
- **S2. Generated-PDF accessibility + correctness** (tagged, selectable text, language set, logical order; renders correctly at the chosen locale). — P1 · M · deps S1, C10
- **S3. Schema-migration safety + data version stamp** (stamp DB with app/schema version; block boot on mismatch; guarded migrate). — **P0** · M · deps K3, K7
- **S4. Public-intake rate-limiting + abuse protection** (per-IP/token limits, payload caps, lockout on magic-link / email-to-issue / intake / webhook). — **P0** · S · deps F7, F5, magic-link auth, I7
- **S5. Storage quota + attachment retention policy** (per-org/-client disk budget + alerting + cleanup; keeps the single-box promise sustainable). — P2 · S · deps N(attachments), O(backup), K2
- **S6. Org/client timezone + DST-correct timestamps** (canonical TZ as a first-class field; DST-correct `B2` breach-clock math; all storage UTC). — **P0** · S/M · deps B1, B2 — _the omission the adversarial pass caught: a clock in the wrong TZ yields a wrong SLA number and a wrong bill. (Worklog→annex rollup is already TZ-aware via `BILLING_TIMEZONE`; this generalizes it to the SLA clock and makes per-org/client TZ explicit.)_

---

## Quick wins (small effort, high value)

1. `Bi` language-aware (aria-hidden secondary) — fixes double-reading app-wide. — P0 · S _(Wave 0)_
2. `S1` per-locale number/currency formatting — the annex stops looking broken to ES clients. — P0 · S
3. `R4` portal-access auto-revoke on lapse — closes a leak the visibility guard can't. — P0 · S
4. `P2` annex supersede — an auditable way to fix a wrong annex. — P0 · S
5. Aging-WIP badge on cards (needs `A1`). — P1 · S
6. Admin session console + force-logout (wire existing `revokeUserSessions`). — P1 · S
7. Actionable empty states (`EmptyState` atom with CTAs). — P1 · M(low)
8. DoD/DoR + issue templates. — P1 · S
9. Seeded saved/system views (Triage, Blocked, Reopened, Critical, My Work). — P1 · M(low)
10. `?` keyboard cheat-sheet overlay. — P2 · S
11. Inline `(i)` help on rate/annex/cadence + copy-link invite fallback. — P2 · S
12. Client-portal welcome primer + "Raise a request" empty state. — P2 · S
13. iCal feed (revocable token). — P3 · S
14. Revenue billed-vs-collected CSV export. — P2 · S
15. `prefers-reduced-motion` for JS/dnd motion. — P2 · S
16. Magic-link device binding (kills the top ATO path). — P2 · S
17. IP allowlist for staff surface + Sauron localhost bind. — P3 · S
