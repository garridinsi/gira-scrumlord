/* gira-scrumlord — shared app chrome (Topbar, Rail, Subbar) */

const Glyph = () => (
  <svg width="22" height="22" viewBox="0 0 22 22" style={{ display: "block" }}>
    {/* hi-vis circular plate with a hand-stencil "G" */}
    <rect x="1" y="1" width="20" height="20" fill="#f5c400" stroke="#0b1620" strokeWidth="2" />
    <path d="M 14 6 L 8 6 L 8 16 L 14 16 L 14 11 L 11 11" stroke="#0b1620" strokeWidth="2.5" fill="none" strokeLinecap="square" />
  </svg>
);

const SpinGlyph = () => (
  // 🌀 - hand-drawn spiral, our velocity flourish
  <svg width="14" height="14" viewBox="0 0 14 14" style={{ display: "inline-block", verticalAlign: "middle" }}>
    <path d="M 7 1.5 a 5.5 5.5 0 1 1 -4 9.3 a 3.7 3.7 0 1 1 6 -2.7 a 2.1 2.1 0 1 1 -2.9 1.2"
          fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
  </svg>
);

const EyeGlyph = ({ size = 14 }) => (
  // sauron, but minimalist — a slit-pupil eye in profile
  <svg width={size} height={size * (10 / 14)} viewBox="0 0 14 10" style={{ display: "inline-block", verticalAlign: "middle" }}>
    <path d="M 1 5 Q 7 0.5 13 5 Q 7 9.5 1 5 Z" fill="none" stroke="currentColor" strokeWidth="1.3" />
    <ellipse cx="7" cy="5" rx="1.6" ry="2.6" fill="currentColor" />
  </svg>
);

/* Bilingual stack — ES primary, EN small mono below. Use everywhere in chrome. */
function Bi({ es, en, size, tone, inline, className = "", style }) {
  return (
    <span
      className={"bi" + (inline ? " bi--inline" : "") + (size ? " bi--" + size : "") + (tone ? " bi--on-" + tone : "") + " " + className}
      style={style}
    >
      <span className="bi__es">{es}</span>
      <span className="bi__en">{en}</span>
    </span>
  );
}

function Topbar({ project = "GIRA", projectName = "Gira · Core Tracker", search = "" }) {
  return (
    <div className="topbar">
      <div className="topbar__brand">
        <Glyph />
        <div style={{ display: "flex", flexDirection: "column", lineHeight: 1 }}>
          <span>gira-scrumlord</span>
          <span className="sub">v0.1.0 · M1</span>
        </div>
      </div>

      <div className="topbar__project">
        <span className="pk">{project}</span>
        <span>{projectName}</span>
        <span className="chev">▾</span>
      </div>

      <div className="topbar__search">
        <span className="mono" style={{ fontSize: 11, color: "var(--eg-fg-4)" }}>{"//"}</span>
        <input placeholder={search || "Buscar  ·  Search issues, comments, worklogs…"} defaultValue={search} />
        <span className="kbd">⌘ K</span>
      </div>

      <div className="topbar__right">
        <div className="topbar__btn lore" data-lore="scrumlord · daemon · 4 jobs queued">
          <span style={{ width: 6, height: 6, background: "var(--eg-green)", borderRadius: "50%" }}></span>
          <span>scrumlord</span>
          <span style={{ color: "var(--eg-fg-5)" }}>RUN</span>
        </div>
        <div className="topbar__btn lore" data-lore="sauron · audit log · port :666">
          <span style={{ color: "var(--eg-yellow)" }}><EyeGlyph /></span>
          <span>:666</span>
        </div>
        <div className="topbar__btn">
          <span>Avisos · Notify</span>
          <span className="num">3</span>
        </div>
        <div className="topbar__btn" style={{ background: "var(--eg-yellow)", color: "var(--eg-iron)" }}>
          <span className="avatar" style={{ background: "var(--eg-iron)", color: "var(--eg-yellow)", border: "1px solid var(--eg-iron)" }}>EG</span>
          <span>Eneko</span>
        </div>
      </div>
    </div>
  );
}

function Rail({ active = "board", project = "GIRA" }) {
  const items = [
    { id: "board",    es: "Tablero",     en: "Board",      num: "27" },
    { id: "backlog",  es: "Pendientes",  en: "Backlog",    num: "31" },
    { id: "sprints",  es: "Sprints",     en: "Sprints",    num: "3"  },
    { id: "issues",   es: "Tickets",     en: "All Issues", num: "84" },
    { id: "summary",  es: "Resumen",     en: "Summary",    num: ""   },
  ];
  const lore = [
    { id: "audit",    es: "Auditoría",   en: "Sauron · Audit", num: ":666" },
    { id: "scrumlord",es: "Daemon",      en: "Scrumlord",      num: "4"    },
  ];
  const admin = [
    { id: "rates",    es: "Tarifas",   en: "Rates",    num: "12" },
    { id: "clients",  es: "Clientes",  en: "Clients",  num: "3"  },
    { id: "settings", es: "Ajustes",   en: "Settings", num: ""   },
  ];

  const renderItem = (it) => (
    <div key={it.id} className={"rail__item" + (active === it.id ? " active" : "")} style={{ alignItems: "flex-start", paddingTop: 8, paddingBottom: 8 }}>
      <span className="ico" style={{
        background: "var(--eg-iron)",
        clipPath: it.id === "board" ? "polygon(0 0, 100% 0, 100% 70%, 0 70%, 0 100%, 50% 100%, 50% 30%, 100% 30%)" : "none",
        opacity: active === it.id ? 1 : 0.7,
        marginTop: 4
      }} />
      <Bi es={it.es} en={it.en} size="tiny" />
      {it.num && <span className="num" style={{ marginTop: 4 }}>{it.num}</span>}
    </div>
  );

  return (
    <aside className="rail">
      <div className="rail__section">
        <div className="rail__head">
          <span>// project</span>
          <span style={{ color: "var(--eg-iron)", fontWeight: 700 }}>{project}</span>
        </div>
        {items.map(renderItem)}
      </div>

      <div className="rail__section">
        <div className="rail__head"><span>// lore, in code</span></div>
        {lore.map(renderItem)}
      </div>

      <div className="rail__section">
        <div className="rail__head"><span>// admin</span></div>
        {admin.map(renderItem)}
      </div>

      <div className="rail__foot">
        <div className="row">
          <span><span className="dot"></span>&nbsp; api</span>
          <span style={{ color: "var(--eg-fg-1)" }}>OK · 14ms</span>
        </div>
        <div className="row">
          <span><span className="dot"></span>&nbsp; db</span>
          <span style={{ color: "var(--eg-fg-1)" }}>pg16 · 31 conn</span>
        </div>
        <div className="row">
          <span><span className="dot yellow"></span>&nbsp; pg-boss</span>
          <span style={{ color: "var(--eg-fg-1)" }}>4 jobs</span>
        </div>
        <div className="row">
          <span><span className="dot"></span>&nbsp; sauron</span>
          <span style={{ color: "var(--eg-fg-1)" }}>:666 · UP</span>
        </div>
      </div>
    </aside>
  );
}

function Subbar({ tabs = [], right = null }) {
  return (
    <div className="subbar">
      {tabs.map((t, i) => (
        <div key={i} className={"subbar__tab" + (t.active ? " active" : "")}>
          {t.es ? <Bi es={t.es} en={t.en} size="tiny" /> : <span>{t.label}</span>}
          {t.count != null && <span className="ct">{t.count}</span>}
        </div>
      ))}
      <div className="subbar__right">{right}</div>
    </div>
  );
}

/* Issue card (re-used by board + backlog + drawer) */
function IssueCard({ issue, compact = false, ghost = false, dragging = false, onClick }) {
  const u = USERS.find(u => u.id === issue.assignee);
  const labels = (issue.labels || []).map(id => LABELS.find(l => l.name === id || l.id === id)).filter(Boolean);
  const priorityChip = {
    low: "chip--low", medium: "chip--medium", high: "chip--high",
    urgent: "chip--urgent", emergency: "chip--emergency"
  }[issue.priority] || "";

  const emergency = issue.priority === "emergency";
  const isFixed = issue.mode === "fixed";

  return (
    <article
      className="gs-card"
      onClick={onClick}
      style={{
        background: emergency ? "var(--eg-paper)" : "var(--eg-paper)",
        border: "1.5px solid var(--eg-iron)",
        boxShadow: dragging ? "6px 6px 0 var(--eg-iron)" : "2px 2px 0 var(--eg-iron)",
        opacity: ghost ? 0.35 : 1,
        cursor: onClick ? "pointer" : "default",
        position: "relative",
        transform: dragging ? "translate(-2px,-2px) rotate(-1deg)" : "none",
        transition: "transform 100ms, box-shadow 100ms"
      }}
    >
      {emergency && (
        <div style={{
          height: 6,
          background: "repeating-linear-gradient(-45deg, var(--eg-yellow) 0 8px, var(--eg-iron) 8px 16px)",
        }} />
      )}
      <div className="tag-head" style={{ background: emergency ? "var(--eg-red)" : "var(--eg-paper-2)", color: emergency ? "var(--eg-paper)" : "var(--eg-fg-3)" }}>
        <span style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <span className={"type-chip type-" + issue.type}>{issue.type[0].toUpperCase()}</span>
          <b style={{ color: emergency ? "var(--eg-paper)" : "var(--eg-iron)", fontWeight: 700 }}>{issue.key}</b>
        </span>
        <span>{issue.points ? `${issue.points} pts` : "—"} · {Math.round((issue.logged || 0) / 60 * 10) / 10}h</span>
      </div>

      <div style={{ padding: "10px 12px 12px" }}>
        <div className="disp" style={{
          fontSize: compact ? 14 : 15, lineHeight: 1.15, color: "var(--eg-iron)",
          marginBottom: 8, textWrap: "balance"
        }}>
          {issue.title}
        </div>

        <div style={{ display: "flex", gap: 4, flexWrap: "wrap", marginBottom: 8 }}>
          {emergency ? (
            <span className="chip chip--emergency"><span>EMERGENCY</span></span>
          ) : (
            <span className={"chip " + priorityChip}>{issue.priority}</span>
          )}
          {labels.map(l => (
            <span key={l.id} className={"chip chip--" + l.color}>{l.name}</span>
          ))}
          {isFixed && <span className="chip chip--ink">fixed · ${(issue.fixedPriceCents/100).toLocaleString()}</span>}
        </div>

        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", borderTop: "1px dashed var(--eg-iron)", paddingTop: 8 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
            {u ? (
              <><span className={"avatar avatar--" + (u.hue)}>{u.initials}</span>
              <span className="mono" style={{ fontSize: 10, color: "var(--eg-fg-3)", textTransform: "uppercase", letterSpacing: "0.1em" }}>{u.name.split(" ")[0]}</span></>
            ) : (
              <span className="mono" style={{ fontSize: 10, color: "var(--eg-fg-4)", textTransform: "uppercase", letterSpacing: "0.1em" }}>sin asignar · unassigned</span>
            )}
          </div>
          {issue.billable && (
            <span className="mono" style={{ fontSize: 10, color: "var(--eg-iron)", letterSpacing: "0.1em" }}>
              {issue.rate ? `${issue.rate.cur} ${(issue.rate.hourlyCents/100).toFixed(0)}/h` : "BILLABLE"}
            </span>
          )}
        </div>
      </div>
    </article>
  );
}

Object.assign(window, { Topbar, Rail, Subbar, IssueCard, SpinGlyph, EyeGlyph, Glyph, Bi });
