/* gira-scrumlord — seed data (fictional only)
   Acme Corp + Mantenedor SL (railway). All names made up.
*/

const USERS = [
  { id: "u1", initials: "EG", name: "Eneko Garrido",       role: "admin",  kind: "staff",  hue: "ink"    },
  { id: "u2", initials: "MR", name: "Maite Rekalde",       role: "member", kind: "staff",  hue: "yellow" },
  { id: "u3", initials: "JI", name: "Jon Ibarguren",       role: "member", kind: "staff",  hue: "gold"   },
  { id: "u4", initials: "AL", name: "Ane Larrazabal",      role: "member", kind: "staff",  hue: "green"  },
  { id: "u5", initials: "WC", name: "Wile E. Coyote",      role: "viewer", kind: "client", hue: "red"    },
  { id: "u6", initials: "RR", name: "R. Runner (Acme PM)", role: "viewer", kind: "client", hue: "yellow" },
];

const CLIENTS = [
  { id: "c1", slug: "mantenedor", name: "Mantenedor SL",   currency: "EUR", projects: 2, openIssues: 27, accruedCents: 1284000 },
  { id: "c2", slug: "acme",       name: "Acme Corp",       currency: "USD", projects: 3, openIssues: 14, accruedCents:  618500 },
  { id: "c3", slug: "internal",   name: "Internal",        currency: "EUR", projects: 1, openIssues:  6, accruedCents:       0 },
];

const PROJECTS = [
  { key: "GIRA",  name: "Gira · Core Tracker",       client: "Internal",      lead: "EG", openIssues: 6,  sprint: "M1 · The Honest One" },
  { key: "MTNR",  name: "Freight Scheduling Engine", client: "Mantenedor SL", lead: "MR", openIssues: 18, sprint: "S-04 · Brake Tests"   },
  { key: "RAIL",  name: "Rolling-Stock Audit",       client: "Mantenedor SL", lead: "JI", openIssues: 9,  sprint: "S-12 · Bogie Logs"    },
  { key: "ANVL",  name: "Anvil Delivery API",        client: "Acme Corp",     lead: "AL", openIssues: 7,  sprint: "S-02 · 16-tonne"      },
  { key: "RSKT",  name: "Rocket-Skate QA",           client: "Acme Corp",     lead: "EG", openIssues: 5,  sprint: "S-09 · Ignition"      },
  { key: "RDRN",  name: "Roadrunner CRM",            client: "Acme Corp",     lead: "MR", openIssues: 2,  sprint: "—"                    },
];

const STATUSES = [
  { id: "s1", name: "Backlog",     cat: "todo",        wip: null },
  { id: "s2", name: "To Do",       cat: "todo",        wip: null },
  { id: "s3", name: "In Progress", cat: "in_progress", wip: 5    },
  { id: "s4", name: "In Review",   cat: "in_progress", wip: 3    },
  { id: "s5", name: "Done",        cat: "done",        wip: null },
];

const LABELS = [
  { id: "l1", name: "infra",      color: "ink"    },
  { id: "l2", name: "p0",         color: "red"    },
  { id: "l3", name: "freight",    color: "green"  },
  { id: "l4", name: "translation",color: "gold"   },
  { id: "l5", name: "needs-spec", color: "yellow" },
  { id: "l6", name: "cost-impact",color: "red"    },
  { id: "l7", name: "lore",       color: "ink"    },
];

const ISSUES = [
  // GIRA (Internal) -----------------------------------------------------
  { key: "GIRA-1",  status: "s3", type: "story", priority: "high",     points: 8, est: 480, logged: 240, billable: false, title: "Magic-link auth (OIDC-ready)",                        assignee: "u1", labels: ["infra"],                  rank: "a0", rate: null,            mode: "hourly" },
  { key: "GIRA-2",  status: "s3", type: "story", priority: "high",     points: 5, est: 360, logged: 180, billable: false, title: "Board drag-drop with LexoRank",                       assignee: "u2", labels: ["infra"],                  rank: "a1", rate: null,            mode: "hourly" },
  { key: "GIRA-3",  status: "s2", type: "task",  priority: "medium",   points: 3, est: 120, logged:   0, billable: false, title: "Sauron audit panel · port 666",                       assignee: "u3", labels: ["lore"],                   rank: "a2", rate: null,            mode: "hourly" },
  { key: "GIRA-4",  status: "s4", type: "bug",   priority: "urgent",   points: 2, est:  60, logged:  35, billable: false, title: "Timer reaper kills timers running > 12h",            assignee: "u1", labels: ["infra","lore"],           rank: "a3", rate: null,            mode: "hourly" },
  { key: "GIRA-5",  status: "s5", type: "task",  priority: "low",      points: 1, est:  30, logged:  28, billable: false, title: "GPL-3.0 header on every new source file",            assignee: "u4", labels: [],                         rank: "a4", rate: null,            mode: "hourly" },
  { key: "GIRA-6",  status: "s1", type: "epic",  priority: "medium",   points: 21, est: 1800, logged: 0, billable: false, title: "M3 · Emergency paging via Outbox seam",              assignee: null, labels: ["needs-spec"],            rank: "a5", rate: null,            mode: "hourly" },

  // MTNR (Mantenedor) ---------------------------------------------------
  { key: "MTNR-42", status: "s3", type: "bug",   priority: "emergency", points: 5, est: 240, logged: 180, billable: true,  title: "Brake-test scheduler skips Iberian-gauge depots after DST",       assignee: "u2", labels: ["freight","p0","cost-impact"], rank: "b0", rate: { hourlyCents: 11500, cur: "EUR", scope: "project" }, mode: "hourly" },
  { key: "MTNR-39", status: "s3", type: "story", priority: "high",      points: 8, est: 480, logged: 220, billable: true,  title: "Bilingual (ES/EU) export of consist manifests",                    assignee: "u3", labels: ["freight","translation"],      rank: "b1", rate: { hourlyCents: 11500, cur: "EUR", scope: "project" }, mode: "hourly" },
  { key: "MTNR-37", status: "s4", type: "task",  priority: "medium",    points: 3, est: 180, logged: 120, billable: true,  title: "Weight-distribution report · Bilbo-Mercancías corridor",           assignee: "u4", labels: ["freight"],                    rank: "b2", rate: { hourlyCents: 11500, cur: "EUR", scope: "project" }, mode: "hourly" },
  { key: "MTNR-31", status: "s2", type: "task",  priority: "high",      points: 5, est: 300, logged:   0, billable: true,  title: "Replace SOAP feed with OAuth2 + signed JWT",                       assignee: "u1", labels: ["infra"],                      rank: "b3", rate: { hourlyCents: 11500, cur: "EUR", scope: "project" }, mode: "hourly" },
  { key: "MTNR-28", status: "s5", type: "bug",   priority: "high",      points: 2, est:  90, logged:  72, billable: true,  title: "Locomotive 269-417 audit row missing reporter",                    assignee: "u2", labels: ["freight"],                    rank: "b4", rate: { hourlyCents: 11500, cur: "EUR", scope: "project" }, mode: "hourly" },
  { key: "MTNR-21", status: "s3", type: "story", priority: "medium",    points: 8, est: 480, logged: 240, billable: true,  title: "Sleeper-car turnaround dashboard (Sundays)",                       assignee: "u3", labels: ["freight"],                    rank: "b5", rate: { hourlyCents: 11500, cur: "EUR", scope: "project" }, mode: "hourly" },
  { key: "MTNR-18", status: "s2", type: "task",  priority: "low",       points: 2, est: 120, logged:   0, billable: true,  title: "Translate alert templates · ES → EU",                              assignee: "u4", labels: ["translation"],                rank: "b6", rate: { hourlyCents:  9000, cur: "EUR", scope: "issue"   }, mode: "hourly" },

  // ANVL (Acme) ---------------------------------------------------------
  { key: "ANVL-7",  status: "s3", type: "story", priority: "high",     points: 5, est: 300, logged: 150, billable: true,  title: "POST /orders accepts 16-tonne payloads",            assignee: "u1", labels: ["infra"],          rank: "c0", rate: { hourlyCents: 15000, cur: "USD", scope: "client" },                  mode: "hourly" },
  { key: "ANVL-3",  status: "s4", type: "bug",   priority: "urgent",   points: 3, est: 180, logged: 110, billable: true,  title: "Delivery webhook fires twice for desert drops",     assignee: "u2", labels: [],                 rank: "c1", rate: { hourlyCents: 15000, cur: "USD", scope: "client" },                  mode: "hourly" },
  { key: "ANVL-1",  status: "s5", type: "epic",  priority: "high",     points: 13, est: 0,  logged:   0, billable: true,  title: "Order pipeline v1 · live",                          assignee: "u4", labels: [],                 rank: "c2", rate: { hourlyCents: 15000, cur: "USD", scope: "client" },                  mode: "fixed", fixedPriceCents: 4500000 },

  // RSKT (Acme) ---------------------------------------------------------
  { key: "RSKT-12", status: "s2", type: "bug",   priority: "medium",   points: 3, est: 120, logged:   0, billable: true,  title: "Rocket skate cuts out on hairpin curves",           assignee: "u3", labels: [],                 rank: "d0", rate: { hourlyCents: 15000, cur: "USD", scope: "client" },                  mode: "hourly" },
];

const SPRINTS = [
  { id: "sp1", project: "GIRA", name: "M1 · The Honest One", state: "active", committed: 21, completed: 9,  velocity: null, start: "12·V·26", end: "26·V·26" },
  { id: "sp2", project: "GIRA", name: "M0 · Scaffolding",    state: "closed", committed: 13, completed: 13, velocity: 13,   start: "28·IV·26", end: "12·V·26" },
  { id: "sp3", project: "GIRA", name: "M2 · Client Portal",  state: "future", committed: 0,  completed: 0,  velocity: null, start: "—",         end: "—"         },
];

const VELOCITY_HISTORY = [
  { sprint: "S-08", committed: 18, completed: 14 },
  { sprint: "S-09", committed: 21, completed: 19 },
  { sprint: "S-10", committed: 21, completed: 21 },
  { sprint: "S-11", committed: 24, completed: 17 },
  { sprint: "S-12", committed: 21, completed: 22 },
  { sprint: "S-13", committed: 21, completed:  9, partial: true },
];

const AUDIT = [
  { at: "16:42:08", actor: "EG", action: "issue.move",     entity: "MTNR-42", note: "In Review → In Progress · rank=b0",     diff: "+statusId,+rank" },
  { at: "16:38:51", actor: "MR", action: "worklog.create", entity: "MTNR-42", note: "+60 min · billable",                     diff: "+worklog" },
  { at: "16:31:02", actor: "EG", action: "timer.start",    entity: "MTNR-42", note: "Active",                                 diff: "—" },
  { at: "16:24:19", actor: "JI", action: "comment.create", entity: "MTNR-39", note: "Confirmed against UIC 651 Annex C",      diff: "+comment#247" },
  { at: "16:18:00", actor: "—",  action: "sprint.autoclose",entity:"SP-12",    note: "scrumlord · endDate passed · velocity=22", diff: "+velocity" },
  { at: "16:12:44", actor: "AL", action: "rate.update",    entity: "ANVL",    note: "150.00 USD/h → 175.00 USD/h (client)",   diff: "hourlyCents:15000→17500" },
  { at: "15:59:30", actor: "—",  action: "timer.reap",     entity: "T-8814",  note: "scrumlord · 12h cap reached · flagged",  diff: "+flag" },
  { at: "15:52:18", actor: "WC", action: "comment.create", entity: "ANVL-3",  note: "\"It happens every Tuesday\"",            diff: "+comment#248" },
  { at: "15:47:02", actor: "EG", action: "issue.create",   entity: "GIRA-6",  note: "Epic · M3 · Emergency paging",           diff: "+issue" },
  { at: "15:31:11", actor: "—",  action: "outbox.dispatch",entity:"E-2204",   note: "scrumlord · 3 events drained",            diff: "+processedAt" },
  { at: "15:14:08", actor: "MR", action: "issue.move",     entity: "MTNR-28", note: "Done · closedAt set",                    diff: "+closedAt" },
  { at: "14:58:33", actor: "EG", action: "session.start",  entity: "U-1",     note: "magic-link · 192.168.1.42 · Bilbo",       diff: "+session" },
];

Object.assign(window, { USERS, CLIENTS, PROJECTS, STATUSES, LABELS, ISSUES, SPRINTS, VELOCITY_HISTORY, AUDIT });
