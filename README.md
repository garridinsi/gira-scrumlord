<div align="center">

```
   ██████  ██ ██████   █████        ███████  ██████ ██████  ██    ██ ███    ███ ██       ██████  ██████  ██████
  ██       ██ ██   ██ ██   ██       ██      ██      ██   ██ ██    ██ ████  ████ ██      ██    ██ ██   ██ ██   ██
  ██   ███ ██ ██████  ███████ █████ ███████ ██      ██████  ██    ██ ██ ████ ██ ██      ██    ██ ██████  ██   ██
  ██    ██ ██ ██   ██ ██   ██            ██ ██      ██   ██ ██    ██ ██  ██  ██ ██      ██    ██ ██   ██ ██   ██
   ██████  ██ ██   ██ ██   ██       ███████  ██████ ██   ██  ██████  ██      ██ ███████  ██████  ██   ██ ██████

                          it's Jira, but rotated — and now it has a master
```

# `gira-scrumlord` 🌀

**Agile, but make it dizzy.**

_Project management for people who feel the roadmap instead of reading it._

![status](https://img.shields.io/badge/status-it%20works%20on%20my%20machine-yellow)
![coverage](https://img.shields.io/badge/test%20coverage-vibes-ff69b4)
![sprints](https://img.shields.io/badge/sprints-going%20in%20circles-blue)
![PM](https://img.shields.io/badge/product%20owner-a%20velociraptor-green)

</div>

---

## 📜 Manifesto

We don't write code. **We summon it.**

Jira was born from a committee. `gira-scrumlord` was born at 3 AM on a Tuesday, fueled by cold coffee and the unshakeable belief that "this can't be that hard." Spoiler: it was. We did it anyway.

We believe that:

- The **backlog** is not a list of tasks, it is a poem about entropy.
- A **sprint** never ends, it merely collapses in on itself and births another, like a cyclical universe.
- The **daily standup** is an ancient ritual. We light a candle. Sauron watches.
- The **story point estimate** is an act of faith. Fibonacci doesn't estimate, Fibonacci prays.
- "**In Progress**" is a state of the soul, not of the ticket.

`gira-scrumlord` doesn't manage your project. `gira-scrumlord` accompanies its descent.

---

## 🌀 Why "gira-scrumlord"?

Because your sprints **gira** — they spin in circles and never get anywhere.
Because it's literally **Jira** rotated — same energy, different cosmic orientation.
Because in Spanish it already means _to spin_, so your tickets **literally rotate** on the board. This is a feature. Not a bug. It's lore.

And **scrumlord** because you are the dark lord of the dailies. Every standup is a ritual. One ticket to rule them all.

The logo is a tornado. The tornado is you at the end of the quarter.

---

## 🐉 Features (which exist, actually)

> Status is honest now. The jokes moved to the _Reality_ column where they belong.
> Full engineering plan: [`PLAN.md`](./PLAN.md). Design spec: [`docs/superpowers/specs/`](./docs/superpowers/specs/).

| Feature | Status | Reality |
|---|---|---|
| Issues & Kanban board (drag-drop) | ✅ | Real `@dnd-kit` board with fractional ranks. Columns still warn you past 5 cards in _In Progress_. Game mechanic, now documented. |
| Backlog & sprints | ✅ | They start. Closing one snapshots velocity before it collapses into the next, like a cyclical universe. |
| Time tracking (worklogs + timers) | ✅ | One running timer per human. `scrumlord` reaps the ones you forget after 12h. |
| Money (rates + accrued cost) | ✅ | Rates resolve issue → project → client → default. Stored in cents, because floats lie about money. |
| Invoicing (generate → issue → pay) | ✅ | Turns logged hours into a frozen bill: each line snapshots the rate at generation, so reprinting an old invoice never lies. No hour billed twice. Printable receipt. |
| Velocity reports | ✅ | Real committed-vs-completed points. Still rendered as a hurricane. Soothing. |
| Passwordless auth (magic links) | ✅ | OIDC-ready. The first login to a fresh install becomes the dark lord (admin). |
| Team & user management | ✅ | Admins onboard people (staff or client logins) from Settings → Equipo; set roles, deactivate, and email a one-click sign-in invite. No passwords to leak. |
| User permissions & client isolation | ✅ | **NOT** everyone is admin anymore. We learned. Clients see only their own data, enforced server-side. |
| `sauron` — audit log | ✅ | Append-only. Read-only. Listens on **port 666**. It only watches. Don't touch. |
| `scrumlord` — the daemon | ✅ | A real `pg-boss` worker. Governs the dailies: rolls sprints, reaps timers, drains the outbox. |
| Notifications & **emergency paging** | ✅ | Email/webhook channels; an `emergency` opens an incident and the pager keeps nudging until someone acks. |
| Grafana / WordPress intake | ✅ | A Grafana `critical` alert auto-files an `emergency` ticket (deduped) and pages you. WordPress forms become tickets. (`packages/chaos`) |
| Auto-assignment | ✅ | Rule-based: new intake issues get an owner by type/priority/label. |
| Slack intake | 🚧 | Same adapter pattern, later. Notifications still drafted in ancient Aramaic. |
| Client portal | ✅ | Clients log in and get their own world: open/done/in-progress, time, money, their invoices, and a form to file requests (capped to `medium` — no self-declared emergencies). |
| Dark mode | ✅ | Still the only mode. Darkness is the PM's natural state. |
| AI | ❌ | We vibe by hand here, the way the gods intended. |
| Tests | ✅ | **130 of them.** The README used to say we don't test. The README was coping. |

---

## 🎨 Interfaz · UI

The web app (`apps/web`, React + Vite) is built in the **Eneko Garrido "Mantenedor"
design system** — an industrial public-works language: timetable-paper cream,
locomotive-iron black, hi-vis safety yellow, ikurriña red. Stencil display type,
hard offset shadows (no blur), riveted asset-tag plates, hazard stripes for danger,
and **bilingual by default** (Spanish primary, English mono secondary). Dark mode is
not the only mode anymore — the only mode is *paper*.

Screens, all wired to the live API: passwordless **login** (poster + boarding pass),
**Kanban board** (drag-drop, emergency banner, WIP-breach hazard warnings), **issue
drawer** (edit / comments / worklogs / cost / timer / audit), **backlog + sprints**,
**summary** (time + money + 🌀 velocity), **Sauron audit** (`:666`), and **settings**
(clients + the rate-resolution chain). The design source lives in
[`docs/design/`](./docs/design/); the contract the UI builds against is
[`docs/api-contract.md`](./docs/api-contract.md).

> _Four rules, non-negotiable: the system is a promise · bilingual by default · sharp
> by default · honesty over polish (empty states with a voice, errors with a cause)._

---

## ⚙️ Installation

Real steps. They actually work. (We left the prayer in, just in case.)

### Ship it — the whole app, one command

```bash
git clone https://github.com/your-username/gira-scrumlord.git
cd gira-scrumlord

# postgres · migrate · api · scrumlord · sauron · web — with fictional demo data
docker compose -f docker-compose.full.yml --profile seed up --build
```

Open **http://localhost:8080**, sign in as `boss@example.test`, grab the magic
link from **Mailpit (http://localhost:8025)**. Sauron watches on **:666**. Full
deploy + production checklist in [`DEPLOY.md`](./DEPLOY.md).

### Develop it — apps on the host, infra in Docker

```bash
# one package manager to rule them all
corepack enable pnpm
pnpm install

# config (defaults work out of the box for local dev)
cp .env.example .env

# bring up the only infra you need: Postgres + Mailpit
docker compose up -d

# apply the schema and seed fictional data (Acme Corp, a velociraptor PO)
pnpm --filter @gira/db migrate

# summon everything: api :3000 · scrumlord worker · sauron :666 · web :5173
pnpm dev

# pray (optional)
```

Then open **http://localhost:5173**, enter `boss@example.test`, and grab your
magic link from **Mailpit at http://localhost:8025**. The first account on a
fresh install becomes admin.

> **Note:** `sauron` listens on **port 666** — the canonical port. Binding it
> needs privilege; without root it honestly retreats to `6660` and tells you so.
> It only watches. The `scrumlord` daemon governs the dailies via a real job queue.

---

## 🧙 Architecture

The lore names turned out to be load-bearing. They're real packages now:

```
gira-scrumlord/
├── apps/
│   ├── api/               # the "core". Fastify + Prisma. nobody understands it anymore (jk, see PLAN.md)
│   ├── scrumlord/         # the daemon. governs all dailies. (a real pg-boss worker)
│   └── web/               # React + Vite + Tailwind. dark, like your roadmap.
├── packages/
│   ├── db/                # Prisma schema, migrations, fictional seed
│   ├── domain/            # pure logic: ranks, rates, velocity, tokens (21 tests)
│   ├── sauron/            # the eye. it only watches. listens on 666. don't touch.
│   ├── chaos/             # where the stuff that works by accident WILL live (M4)
│   └── shared/            # Zod contracts shared by api + web
├── docs/                  # no longer a lie. there's a spec and a plan in there.
└── README.md              # you are here. brave of you.
```

> _One ticket to rule them all, one ticket to find them, one ticket to bring them all, and in the sprint bind them._

---

## 🤝 Contributing

1. Fork it (psychologically and in git).
2. Create a branch: `git checkout -b feature/something-we-felt`.
3. Commit with honest messages: `git commit -m "i think this fixes something"`.
4. Open a PR. The velociraptor will review it. Be kind, he's having a rough day.

We used to say we don't accept PRs that add tests — they'd break the magic.
Then we wrote 84 of them and the magic held. Add tests. The velociraptor insists now.

---

## ⚖️ License

Licensed under the **GNU General Public License v3.0** — see [`LICENSE`](./LICENSE) for the full text.

In short: it's free as in freedom. You may use, study, share, and modify `gira-scrumlord`, provided that whatever you build on top stays just as free. No one gets to take the chaos proprietary. The sprints belong to everyone now.

There is, as the GPL helpfully reminds us, **ABSOLUTELY NO WARRANTY**. Which, given the architecture, was never really in question.

> _"Life finds a way."_ — a closed ticket, moments before reopening on its own.

---

<div align="center">

**`gira-scrumlord`** — because the roadmap isn't read, it's felt. 🌀

_Made with cold coffee, fear, and very few guarantees._

</div>
