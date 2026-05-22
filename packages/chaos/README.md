# `chaos` — where the stuff that works by accident will live

Reserved for **M4: inbound integrations**. This is the home for adapters that
turn external events into issues:

- **Grafana** alerts → auto-created issues (severity → priority, `critical` → `emergency`)
- **WordPress** form/webhook → client issues
- Auto-assignment rules

It is intentionally empty today — no fake stubs. The seams it will plug into
already exist in M1:

- `Priority.emergency` on issues
- the `Outbox` table + `scrumlord`'s `outbox-dispatch` job (the dispatch point)
- the issue-intake service shape documented in the spec

See [`PLAN.md`](../../PLAN.md) (milestone M4) and the design spec under
`docs/superpowers/specs/`.
