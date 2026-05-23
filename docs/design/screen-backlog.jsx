/* gira-scrumlord — Backlog + Sprints */

function BacklogScreen() {
  const all = ISSUES.filter(i => i.key.startsWith("MTNR"));
  const active   = all.filter(i => i.status !== "s1" && i.status !== "s5");
  const future   = ISSUES.filter(i => i.key.startsWith("GIRA")).slice(0, 5);
  const backlog  = [
    { key: "MTNR-55", type: "story", priority: "medium",   points: 8,  title: "Real-time consist tracker · WebSockets",                   assignee: "u2", labels: ["freight"] },
    { key: "MTNR-54", type: "task",  priority: "high",     points: 5,  title: "GTFS-rail export for partner agencies",                    assignee: "u3", labels: ["freight"] },
    { key: "MTNR-53", type: "bug",   priority: "medium",   points: 3,  title: "Rounding error on multi-leg routes ≥ 7 segments",         assignee: null, labels: ["cost-impact"] },
    { key: "MTNR-52", type: "task",  priority: "low",      points: 2,  title: "Translate operator handbook · ES → EU (12 pages)",        assignee: "u4", labels: ["translation"] },
    { key: "MTNR-51", type: "story", priority: "high",     points: 13, title: "Wagon-rotation optimiser (mixed-gauge corridors)",        assignee: "u2", labels: ["freight"] },
    { key: "MTNR-50", type: "epic",  priority: "medium",   points: 21, title: "EPIC · Sleeper-car operations · summer 2026",             assignee: null, labels: ["freight","needs-spec"] },
  ];

  return (
    <div className="body">
      <Subbar
        tabs={[
          { es: "Tablero",    en: "Board",   count: 14 },
          { es: "Pendientes", en: "Backlog", count: 31, active: true },
          { es: "Sprints",    en: "Sprints", count: 3  },
          { es: "Informes",   en: "Reports" },
        ]}
        right={
          <>
            <span className="f-pill">EPIC <b>cualquiera</b> <span className="x">▾</span></span>
            <span className="f-pill">ETIQUETA <b>cualquiera</b> <span className="x">▾</span></span>
            <button className="b-btn">+ Sprint</button>
            <button className="b-btn b-btn--ink">+ Ticket</button>
          </>
        }
      />

      <div style={{ flex: 1, overflow: "auto", padding: "16px 24px" }}>
        {/* Active sprint */}
        <SprintGroup
          plate="ACTIVO"
          plateColor="yellow"
          name="S-04 · Pruebas de Freno"
          nameEn="S-04 · Brake Tests"
          dates="12·V·26 → 26·V·26"
          committed={21}
          completed={9}
          loggedH={14.5}
          accrued="EUR 1.671,00"
          velocity="19.4"
          issues={active.slice(0, 5)}
          actions={<><button className="b-btn">+ Añadir ticket</button><button className="b-btn b-btn--yellow">Cerrar sprint</button></>}
        />

        {/* Future */}
        <SprintGroup
          plate="FUTURO"
          plateColor="paper"
          name="S-05 · Exportación de Manifiestos"
          nameEn="S-05 · Consist Manifest Export"
          dates="26·V·26 → 09·VI·26"
          committed={18}
          completed={0}
          loggedH={0}
          accrued="—"
          velocity="—"
          issues={future}
          actions={<><button className="b-btn">+ Añadir ticket</button><button className="b-btn b-btn--ink">▶ Iniciar sprint</button></>}
        />

        {/* Backlog */}
        <BacklogGroup issues={backlog} />
      </div>
    </div>
  );
}

function SprintGroup({ plate, plateColor, name, nameEn, dates, committed, completed, loggedH, accrued, velocity, issues, actions }) {
  const [open, setOpen] = React.useState(true);
  const pct = committed ? Math.round(completed / committed * 100) : 0;

  return (
    <section style={{ marginBottom: 22, border: "2px solid var(--eg-iron)", background: "var(--eg-paper)" }}>
      <header style={{
        background: plateColor === "yellow" ? "var(--eg-yellow)" : "var(--eg-paper-2)",
        borderBottom: "2px solid var(--eg-iron)",
        padding: "10px 14px",
        display: "grid", gridTemplateColumns: "auto 1fr auto auto", gap: 18, alignItems: "center"
      }}>
        <span className={"plate " + (plateColor === "yellow" ? "" : "plate--yellow")}>{plate}</span>
        <div>
          <div className="disp" style={{ fontSize: 18, color: "var(--eg-iron)", lineHeight: 1 }}>{name}</div>
          <div className="mono" style={{ fontSize: 10, color: "var(--eg-fg-3)", letterSpacing: "0.1em", marginTop: 3 }}>
            {nameEn ? nameEn.toUpperCase() + " · " : ""}{dates} · {issues.length} TICKETS
          </div>
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr 1fr", gap: 18 }}>
          <Stat labelEs="comprometido" labelEn="committed" value={committed} unit="pts" />
          <Stat labelEs="completado"   labelEn="done"      value={completed} unit="pts" />
          <Stat labelEs="registrado"   labelEn="logged"    value={loggedH} unit="h" />
          <Stat labelEs="devengado"    labelEn="accrued"   value={accrued} unit="" mono />
        </div>
        <div style={{ display: "flex", gap: 6 }}>
          {actions}
          <button onClick={() => setOpen(!open)} className="b-btn b-btn--ghost">{open ? "▾" : "▸"}</button>
        </div>
      </header>

      {/* Progress bar */}
      {committed > 0 && (
        <div style={{ height: 6, background: "var(--eg-paper-3)", borderBottom: "1px solid var(--eg-iron)", position: "relative" }}>
          <div style={{ position: "absolute", inset: 0, width: `${pct}%`, background: "var(--eg-green)" }} />
          <div style={{ position: "absolute", inset: 0, width: `${100-pct}%`, left: `${pct}%`, background: "repeating-linear-gradient(-45deg, var(--eg-paper-3) 0 4px, var(--eg-paper-2) 4px 8px)" }} />
        </div>
      )}

      {open && (
        <div>
          {issues.map((iss, i) => <BacklogRow key={iss.key} issue={iss} odd={i % 2} />)}
        </div>
      )}
    </section>
  );
}

function BacklogGroup({ issues }) {
  return (
    <section style={{ border: "2px solid var(--eg-iron)", background: "var(--eg-paper)" }}>
      <header style={{
        background: "var(--eg-iron)", color: "var(--eg-paper)",
        padding: "8px 14px", display: "flex", alignItems: "center", gap: 14
      }}>
        <span className="plate plate--yellow">PENDIENTES</span>
        <span className="disp" style={{ fontSize: 18, color: "var(--eg-paper)" }}>Sin planificar</span>
        <span className="mono" style={{ fontSize: 10, color: "var(--eg-fg-5)", letterSpacing: "0.12em" }}>UNSCHEDULED · {issues.length} TICKETS · {issues.reduce((s,i) => s + (i.points||0), 0)} POINTS</span>
        <div style={{ marginLeft: "auto", display: "flex", gap: 6 }}>
          <button className="b-btn b-btn--yellow">+ Ticket</button>
        </div>
      </header>
      <div>
        {issues.map((iss, i) => <BacklogRow key={iss.key} issue={iss} odd={i % 2} />)}
      </div>
    </section>
  );
}

function BacklogRow({ issue, odd }) {
  const u = USERS.find(u => u.id === issue.assignee);
  const labels = (issue.labels || []).map(name => LABELS.find(l => l.name === name)).filter(Boolean);
  return (
    <div style={{
      display: "grid",
      gridTemplateColumns: "60px 24px 1fr auto auto auto auto auto",
      gap: 14, alignItems: "center",
      padding: "9px 14px",
      borderBottom: "1px solid var(--eg-rule)",
      background: odd ? "var(--eg-paper)" : "var(--eg-paper-2)",
      fontSize: 13,
    }}>
      <span className="mono" style={{ fontWeight: 700, fontSize: 11, color: "var(--eg-iron)", letterSpacing: "0.04em" }}>{issue.key}</span>
      <span className={"type-chip type-" + issue.type}>{issue.type[0].toUpperCase()}</span>
      <span style={{ color: "var(--eg-iron)" }}>{issue.title}</span>
      <div style={{ display: "flex", gap: 4 }}>
        {labels.slice(0,2).map(l => <span key={l.id} className={"chip chip--" + l.color}>{l.name}</span>)}
      </div>
      {issue.priority === "emergency"
        ? <span className="chip chip--emergency"><span>EMERG</span></span>
        : <span className={"chip " + (issue.priority === "high" ? "chip--high" : issue.priority === "urgent" ? "chip--urgent" : "chip--low")}>{issue.priority}</span>}
      <span className="mono" style={{ fontSize: 11, color: "var(--eg-iron)", fontWeight: 600, minWidth: 32, textAlign: "right" }}>{issue.points || "—"}{issue.points ? " pts" : ""}</span>
      <span className="mono" style={{ fontSize: 10, color: "var(--eg-fg-3)", minWidth: 40, textAlign: "right" }}>
        {issue.logged ? `${(issue.logged/60).toFixed(1)}h` : "—"}
      </span>
      {u ? <span className={"avatar avatar--" + u.hue}>{u.initials}</span> : <span className="avatar" style={{ background: "transparent", borderStyle: "dashed", color: "var(--eg-fg-4)" }}>—</span>}
    </div>
  );
}

function Stat({ labelEs, labelEn, label, value, unit, mono }) {
  return (
    <div>
      <div className="caps">// {labelEs || label}{labelEn ? " · " + labelEn : ""}</div>
      <div className={mono ? "mono" : "disp"} style={{
        fontSize: mono ? 14 : 22, color: "var(--eg-iron)",
        lineHeight: 1.05, fontWeight: 700, letterSpacing: mono ? "0.02em" : "-0.01em"
      }}>
        {value}{unit && <span style={{ fontSize: mono ? 10 : 12, marginLeft: 3, color: "var(--eg-fg-3)" }}>{unit}</span>}
      </div>
    </div>
  );
}

window.BacklogScreen = BacklogScreen;
