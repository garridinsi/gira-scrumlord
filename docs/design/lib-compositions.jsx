/* DEPÓSITO · VII · Composiciones · Compositions
   Donde varios elementos se atornillan juntos para formar una pieza
   reconocible del producto. Si te peleas con una composición, vuelve
   a Elementos y haz una variante más pequeña primero. */

function CompositionsSection() {
  return (
    <Sect
      id="comp"
      num="VII"
      eyebrow="composiciones · compositions · 11 bays"
      titleEs="COMPOSICIONES."
      titleEn="Atoms riveted together. Recognisable shapes."
      meta={<>SERIE · GS-LIB-W<br /><b>+50 piezas</b><br />cada una es un trozo del producto</>}
      intro="Las composiciones son piezas con identidad de producto — la tarjeta del tablero, la fila del backlog, el header de un drawer, el cronómetro. Cada una usa los átomos de §II–§VI, sin inventar nada."
    >
      <IssueCardBay />
      <BacklogRowBay />
      <SprintHeadBay />
      <ColumnHeadBay />
      <QuickCreateBay />
      <DrawerHeadBay />
      <ComposerBay />
      <MentionInlineBay />
      <TimerBay />
      <InvoiceLineBay />
      <SwitcherBay />
    </Sect>
  );
}

/* ─── 01 Issue card (board) ──────────────────────────────── */
function IssueCardBay() {
  return (
    <Bay num="01" name="TICKET CARD · BOARD" en="// the card you drag"
      lede="La pieza más vista del producto. Tiene cabecera con asset key + tipo, título, chips, footer con avatar + tiempo + dinero. Tres variants — normal, emergencia, blocked.">
      <Spec serial="GS-LIB-W01" label="ISSUE CARD · 3 STATES" stage="paper2">
        <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 240px)", gap: 14 }}>
          <IssueCard k="MTNR-39" t="Brake tests · timetable D-3 review" ty="T" tyCls="type-task" labels={[{n:"freight",c:"green"}]} pri="high" asg="JI" asgHue="gold" est="3h" pts={3} />
          <IssueCard k="MTNR-42" t="Brake sensor on bogie 14 returns 0N" ty="B" tyCls="type-bug" labels={[{n:"p0",c:"red"},{n:"cost-impact",c:"red"}]} pri="emergency" asg="MR" asgHue="yellow" est="8h" pts={5} log="4h 12m" eur="€273" timer />
          <IssueCard k="ANVL-03" t="Anvil delivery API · 429 from upstream" ty="B" tyCls="type-bug" labels={[{n:"infra",c:"ink"}]} pri="urgent" asg="AL" asgHue="green" est="4h" pts={3} blocked="esperando spec de Acme" />
        </div>
      </Spec>
    </Bay>
  );
}

function IssueCard({ k, t, ty, tyCls, pri, labels = [], asg, asgHue, est, pts, log, eur, timer, blocked }) {
  const emergency = pri === "emergency";
  return (
    <div style={{
      background: "var(--eg-paper)",
      border: emergency ? "2px solid var(--eg-iron)" : "1.5px solid var(--eg-iron)",
      boxShadow: emergency ? "3px 3px 0 var(--eg-red)" : "2px 2px 0 var(--eg-iron)"
    }}>
      {emergency && (
        <div className="bg-hazard-thin" style={{ height: 8, borderBottom: "1.5px solid var(--eg-iron)" }} />
      )}
      <div className="tag-head">
        <span style={{ display: "inline-flex", alignItems: "center", gap: 8 }}>
          <span className={`type-chip ${tyCls}`}>{ty}</span>
          <b style={{ color: "var(--eg-iron)" }}>{k}</b>
        </span>
        <span style={{ display: "inline-flex", alignItems: "center", gap: 6 }}>
          {timer && <><span style={{ width: 6, height: 6, background: "var(--eg-red)", borderRadius: "50%", animation: "blink 1.4s steps(2) infinite" }} /><span style={{ color: "var(--eg-red)", fontWeight: 700 }}>REC</span></>}
          {!timer && <span>{emergency ? <span style={{ color: "var(--eg-red)" }}>// P0</span> : <span>// {pri}</span>}</span>}
        </span>
      </div>
      <div style={{ padding: "10px 12px" }}>
        <div style={{ fontFamily: "var(--font-body)", fontSize: 13.5, color: "var(--eg-iron)", lineHeight: 1.35, fontWeight: 500 }}>
          {t}
        </div>
        {labels.length > 0 && (
          <div style={{ display: "flex", flexWrap: "wrap", gap: 4, marginTop: 8 }}>
            {labels.map(l => <span key={l.n} className={`chip chip--${l.c}`} style={{ fontSize: 9, padding: "1px 6px" }}>{l.n}</span>)}
          </div>
        )}
        {blocked && (
          <div style={{ marginTop: 8, padding: "4px 8px", background: "var(--eg-red-soft)", border: "1px solid var(--eg-red)" }}>
            <div className="mono" style={{ fontSize: 9.5, color: "var(--eg-red)", fontWeight: 700, letterSpacing: "0.1em", textTransform: "uppercase" }}>▲ bloqueado · {blocked}</div>
          </div>
        )}
      </div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "6px 12px", borderTop: "1px dashed var(--eg-iron)", background: "var(--eg-paper-2)" }}>
        <span style={{ display: "inline-flex", alignItems: "center", gap: 6 }}>
          <span className={`avatar avatar--${asgHue}`}>{asg}</span>
          <span className="mono" style={{ fontSize: 10, color: "var(--eg-fg-3)", letterSpacing: "0.06em" }}>{pts}pt · {est}</span>
        </span>
        <span style={{ display: "inline-flex", alignItems: "center", gap: 8 }}>
          {log && <span className="mono" style={{ fontSize: 10, color: "var(--eg-iron)", fontWeight: 700, letterSpacing: "0.04em" }}>{log}</span>}
          {eur && <span className="mono" style={{ fontSize: 10, color: emergency ? "var(--eg-red)" : "var(--eg-iron)", fontWeight: 800, letterSpacing: "0.04em" }}>{eur}</span>}
        </span>
      </div>
    </div>
  );
}

/* ─── 02 Backlog row ─────────────────────────────────────── */
function BacklogRowBay() {
  return (
    <Bay num="02" name="BACKLOG · ROW" en="// rank handle + meta-rich"
      lede="La fila del backlog lleva todo. Drag handle, asset key, tipo, prioridad, título, labels, sprint asignado o '—', estimate, asignado. Ranks usan LexoRank — el ! solo aparece si la rank conflicta.">
      <Spec serial="GS-LIB-W02" label="BACKLOG ROW · 5 EXAMPLES" pad={0}>
        <div>
          {[
            { k: "MTNR-42", t: "Brake sensor on bogie 14 returns 0N", ty: "B", tyCls: "type-bug", pri: "emergency", labels: [{n:"p0",c:"red"},{n:"cost-impact",c:"red"}], sprint: "S-04", est: "5pt", asg: "MR", asgHue: "yellow" },
            { k: "MTNR-39", t: "Brake tests · timetable D-3 review",   ty: "T", tyCls: "type-task", pri: "high",      labels: [{n:"freight",c:"green"}], sprint: "S-04", est: "3pt", asg: "JI", asgHue: "gold" },
            { k: "MTNR-37", t: "Couplers spec · weight tolerance update", ty: "S", tyCls: "type-story", pri: "medium", labels: [{n:"freight",c:"green"}], sprint: "S-05", est: "5pt", asg: "AL", asgHue: "green" },
            { k: "MTNR-22", t: "ETL: timetable CSV → postgres staging", ty: "T", tyCls: "type-task", pri: "low", labels: [{n:"infra",c:"ink"}], sprint: "—",    est: "8pt", asg: "EG", asgHue: "ink", drag: true },
            { k: "MTNR-19", t: "Translate dashboard strings to euskara · EU", ty: "T", tyCls: "type-task", pri: "low", labels: [{n:"translation",c:"gold"}], sprint: "—", est: "2pt", asg: null },
          ].map((r, i, arr) => (
            <div key={r.k} style={{
              display: "grid",
              gridTemplateColumns: "28px 24px 80px 1fr 200px 80px 60px 40px",
              alignItems: "center", gap: 12,
              padding: "8px 14px",
              borderBottom: i < arr.length - 1 ? "1px dashed var(--eg-iron)" : 0,
              background: r.drag ? "var(--eg-yellow-soft)" : "var(--eg-paper)"
            }}>
              <span style={{ color: "var(--eg-fg-4)", fontFamily: "var(--font-mono)", fontSize: 14, cursor: "grab", letterSpacing: "0.1em", fontWeight: 700 }}>⋮⋮</span>
              <span className={`type-chip ${r.tyCls}`}>{r.ty}</span>
              <span className="mono" style={{ fontSize: 12, color: "var(--eg-iron)", fontWeight: 700, letterSpacing: "0.06em" }}>{r.k}</span>
              <span style={{ display: "flex", alignItems: "center", gap: 8, minWidth: 0 }}>
                <span style={{ fontFamily: "var(--font-body)", fontSize: 13.5, color: "var(--eg-fg-1)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{r.t}</span>
              </span>
              <span style={{ display: "flex", gap: 4, flexWrap: "wrap" }}>
                {r.labels.map(l => <span key={l.n} className={`chip chip--${l.c}`} style={{ fontSize: 9, padding: "1px 6px" }}>{l.n}</span>)}
                {r.pri === "emergency" && <span className="chip chip--emergency" style={{ padding: "1px 6px", fontSize: 9 }}><span>P0</span></span>}
              </span>
              <span className="mono" style={{ fontSize: 11, color: r.sprint === "—" ? "var(--eg-fg-4)" : "var(--eg-iron)", fontWeight: 700, letterSpacing: "0.06em" }}>{r.sprint}</span>
              <span className="mono" style={{ fontSize: 11, color: "var(--eg-iron)", fontWeight: 700, letterSpacing: "0.06em" }}>{r.est}</span>
              <span style={{ textAlign: "right" }}>
                {r.asg
                  ? <span className={`avatar avatar--${r.asgHue}`}>{r.asg}</span>
                  : <span className="avatar" style={{ background: "var(--eg-paper-3)", color: "var(--eg-fg-3)" }}>?</span>}
              </span>
            </div>
          ))}
        </div>
      </Spec>
    </Bay>
  );
}

/* ─── 03 Sprint header ───────────────────────────────────── */
function SprintHeadBay() {
  return (
    <Bay num="03" name="SPRINT · HEADER" en="// name + range + capacity + actions"
      lede="Encabezado de un sprint. Plate riveted con el código. Fechas mono. Capacity gauge mini. Acciones a la derecha.">
      <Spec serial="GS-LIB-W03" label="SPRINT HEADER · OPEN" stage="paper2">
        <div style={{ background: "var(--eg-paper)", border: "2px solid var(--eg-iron)", boxShadow: "4px 4px 0 var(--eg-iron)" }}>
          <div className="bg-hazard-thin" style={{ height: 8, borderBottom: "1.5px solid var(--eg-iron)" }} />
          <div style={{ padding: "14px 20px", display: "grid", gridTemplateColumns: "auto 1fr auto", gap: 22, alignItems: "center" }}>
            <span className="plate plate--yellow" style={{ fontSize: 13 }}>S-04 · ACTIVO</span>
            <div>
              <div className="disp" style={{ fontSize: 28, color: "var(--eg-iron)", lineHeight: 1 }}>BRAKE TESTS</div>
              <div className="mono" style={{ fontSize: 11, color: "var(--eg-fg-3)", letterSpacing: "0.14em", textTransform: "uppercase", marginTop: 4 }}>
                // 2026-05-13 → 2026-05-27 · 14 días · D-9 de 14
              </div>
            </div>
            <div className="spec__row" style={{ gap: 8 }}>
              <button className="b-btn">▍ Filtrar</button>
              <button className="b-btn b-btn--ghost">⋯ Más</button>
              <button className="b-btn b-btn--ink">Cerrar sprint →</button>
            </div>
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr 1fr 1fr", borderTop: "1.5px solid var(--eg-iron)" }}>
            {[
              { lbl: "committed", v: "34 pts", sub: "18 tickets" },
              { lbl: "completed", v: "22 pts", sub: "12 tickets", tone: "green" },
              { lbl: "in progress", v: "8 pts", sub: "4 tickets", tone: "yellow" },
              { lbl: "blocked", v: "4 pts", sub: "2 tickets", tone: "red" },
              { lbl: "velocity μ", v: "24 pts", sub: "promedio 6 sprints" },
            ].map((s, i, arr) => (
              <div key={s.lbl} style={{
                padding: "10px 14px",
                borderRight: i < arr.length - 1 ? "1px solid var(--eg-iron)" : 0
              }}>
                <div className="mono" style={{ fontSize: 10, color: "var(--eg-fg-3)", letterSpacing: "0.14em", textTransform: "uppercase" }}>// {s.lbl}</div>
                <div className="disp" style={{ fontSize: 22, color: s.tone === "green" ? "var(--eg-green)" : s.tone === "red" ? "var(--eg-red)" : "var(--eg-iron)", lineHeight: 1, marginTop: 4 }}>{s.v}</div>
                <div className="mono" style={{ fontSize: 10, color: "var(--eg-fg-3)", marginTop: 2, letterSpacing: "0.06em" }}>{s.sub}</div>
              </div>
            ))}
          </div>
        </div>
      </Spec>
    </Bay>
  );
}

/* ─── 04 Column header (kanban) ──────────────────────────── */
function ColumnHeadBay() {
  return (
    <Bay num="04" name="COLUMNA · KANBAN HEAD" en="// name · count · WIP · +new"
      lede="Encabezado de columna del board. Plate ink con el nombre del status. Counter mono. WIP-limit pintado de rojo si está roto. Botón + new abajo a la derecha.">
      <Spec serial="GS-LIB-W04" label="KANBAN COLUMN HEADER · 5 STATES" stage="paper2">
        <div style={{ display: "grid", gridTemplateColumns: "repeat(5, 1fr)", gap: 10 }}>
          {[
            { name: "Backlog",     en: "backlog",      count: 27, wip: null, tone: "" },
            { name: "To Do",       en: "to do",        count:  8, wip: null, tone: "" },
            { name: "In Progress", en: "in progress",  count:  6, wip: 5,    tone: "breach" },
            { name: "In Review",   en: "review",       count:  2, wip: 3 },
            { name: "Done",        en: "done",         count: 12, wip: null, tone: "ok" },
          ].map(c => (
            <div key={c.name} style={{
              background: "var(--eg-paper)",
              border: "2px solid var(--eg-iron)",
              boxShadow: "2px 2px 0 var(--eg-iron)"
            }}>
              <div style={{
                background: c.tone === "ok" ? "var(--eg-green)" : c.tone === "breach" ? "var(--eg-red)" : "var(--eg-iron)",
                color: c.tone === "ok" ? "var(--eg-paper)" : "var(--eg-yellow)",
                padding: "6px 10px", display: "flex", justifyContent: "space-between", alignItems: "center"
              }}>
                <span style={{ fontFamily: "var(--font-display)", fontWeight: 800, fontSize: 14, textTransform: "uppercase", letterSpacing: "0.04em" }}>{c.name}</span>
                <span style={{ fontFamily: "var(--font-mono)", fontWeight: 700, fontSize: 11, letterSpacing: "0.06em" }}>{c.count}</span>
              </div>
              <div style={{ padding: "6px 10px", borderBottom: "1px dashed var(--eg-iron)", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <span className="mono" style={{ fontSize: 9.5, color: "var(--eg-fg-3)", letterSpacing: "0.12em", textTransform: "uppercase" }}>// {c.en}</span>
                {c.wip !== null && (
                  <span className="mono" style={{
                    fontSize: 9, fontWeight: 700, letterSpacing: "0.06em",
                    background: c.tone === "breach" ? "var(--eg-red)" : "var(--eg-iron)",
                    color: c.tone === "breach" ? "var(--eg-paper)" : "var(--eg-yellow)",
                    padding: "1px 5px"
                  }}>WIP {c.count}/{c.wip}{c.tone === "breach" ? " ▲" : ""}</span>
                )}
              </div>
              <div style={{ padding: "8px 10px", display: "flex", alignItems: "center", justifyContent: "center" }}>
                <button className="b-btn b-btn--ghost" style={{ width: "100%", padding: "4px 8px", borderStyle: "dashed", borderColor: "var(--eg-iron)" }}>+ Nuevo</button>
              </div>
            </div>
          ))}
        </div>
      </Spec>
    </Bay>
  );
}

/* ─── 05 Quick create ────────────────────────────────────── */
function QuickCreateBay() {
  return (
    <Bay num="05" name="CREAR RÁPIDO · QUICK CREATE" en="// inline · row-shaped"
      lede="Caja inline para crear un ticket sin abrir modal. Aparece al fondo de una columna o lista. Una sola fila — type chip, título, asignar, enter envía.">
      <Spec serial="GS-LIB-W05" label="QUICK CREATE · INLINE · FOCUSED" stage="paper2">
        <div style={{ background: "var(--eg-yellow-soft)", border: "2px solid var(--eg-iron)", boxShadow: "3px 3px 0 var(--eg-iron)" }}>
          <div className="tag-head" style={{ background: "var(--eg-yellow)" }}>
            <span><b style={{ color: "var(--eg-iron)" }}>MTNR-NEW</b> · CREAR RÁPIDO · QUICK CREATE</span>
            <span><span className="kbd-key" style={{ fontSize: 9, padding: "0 4px", minWidth: 0 }}>↵</span> crear · <span className="kbd-key" style={{ fontSize: 9, padding: "0 4px", minWidth: 0 }}>esc</span> cancelar</span>
          </div>
          <div style={{ padding: "10px 12px", display: "grid", gridTemplateColumns: "auto 1fr auto auto auto", gap: 10, alignItems: "center" }}>
            <button className="b-btn" style={{ padding: "4px 8px", fontFamily: "var(--font-mono)" }}><span className="type-chip type-task" style={{ marginRight: 6 }}>T</span> Tarea ▼</button>
            <input
              defaultValue="Lubricar bogie 14 después de cambio de sensor"
              style={{
                fontFamily: "var(--font-body)", fontSize: 14,
                background: "var(--eg-paper)", padding: "8px 10px",
                border: "1.5px solid var(--eg-iron)"
              }}
            />
            <span className="chip chip--medium">medium</span>
            <span className="avatar avatar--green">AL</span>
            <button className="b-btn b-btn--ink">+ Crear</button>
          </div>
          <div style={{ padding: "0 12px 10px", display: "flex", gap: 8 }}>
            <span className="mono" style={{ fontSize: 10, color: "var(--eg-fg-3)", letterSpacing: "0.1em", textTransform: "uppercase" }}>// destino · MTNR · Freight Scheduling Engine · S-04</span>
            <span style={{ marginLeft: "auto", display: "flex", gap: 8 }}>
              <span className="chip" style={{ fontSize: 9, padding: "1px 6px" }}>+ label</span>
              <span className="chip" style={{ fontSize: 9, padding: "1px 6px" }}>+ estimate</span>
              <span className="chip" style={{ fontSize: 9, padding: "1px 6px" }}>+ cliente</span>
            </span>
          </div>
        </div>
      </Spec>
    </Bay>
  );
}

/* ─── 06 Drawer header ───────────────────────────────────── */
function DrawerHeadBay() {
  return (
    <Bay num="06" name="DRAWER · HEADER" en="// the issue page top"
      lede="Encabezado del drawer de un ticket. Cierra/anterior/siguiente a la izquierda. Asset key y título grande. Acciones rápidas a la derecha. Hazard top si el ticket es emergencia.">
      <Spec serial="GS-LIB-W06" label="DRAWER HEAD · EMERGENCY" pad={0}>
        <div className="bg-hazard-thin" style={{ height: 10 }} />
        <div style={{ padding: "14px 22px 12px", borderBottom: "1.5px solid var(--eg-iron)" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 14, marginBottom: 8 }}>
            <button className="b-btn" style={{ padding: "4px 8px" }}>← Atrás</button>
            <span className="mono" style={{ fontSize: 11, color: "var(--eg-fg-3)", letterSpacing: "0.1em", textTransform: "uppercase" }}>
              MANTENEDOR SL <span style={{ color: "var(--eg-fg-4)" }}>/</span> MTNR · FREIGHT <span style={{ color: "var(--eg-fg-4)" }}>/</span> S-04
            </span>
            <span style={{ marginLeft: "auto", display: "flex", gap: 8 }}>
              <button className="b-btn b-btn--ghost" style={{ padding: "4px 8px" }}>↑ MTNR-43</button>
              <button className="b-btn b-btn--ghost" style={{ padding: "4px 8px" }}>↓ MTNR-41</button>
              <button className="b-btn b-btn--ghost" style={{ padding: "4px 8px" }}>↗</button>
              <button className="b-btn b-btn--ghost" style={{ padding: "4px 8px" }}>✕</button>
            </span>
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "auto 1fr auto", gap: 16, alignItems: "center" }}>
            <span className="plate plate--red" style={{ fontSize: 13 }}>MTNR-42 · EMERGENCIA</span>
            <h2 className="disp" style={{ fontSize: 32, color: "var(--eg-iron)", margin: 0, lineHeight: 1.05 }}>
              BRAKE SENSOR ON BOGIE 14 RETURNS 0N AT FULL LOAD
            </h2>
            <div className="spec__row" style={{ gap: 8 }}>
              <button className="b-btn b-btn--yellow">▶ Iniciar timer</button>
              <button className="b-btn b-btn--ink">Cambiar estado · ▼</button>
              <button className="b-btn">⋯</button>
            </div>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 16, marginTop: 10, flexWrap: "wrap" }}>
            <span className="type-chip type-bug">B</span>
            <span className="mono" style={{ fontSize: 11, color: "var(--eg-iron)", fontWeight: 700, letterSpacing: "0.06em" }}>Bug</span>
            <span style={{ color: "var(--eg-fg-4)" }}>·</span>
            <span className="chip chip--emergency"><span>P0 · EMERGENCIA</span></span>
            <span className="chip chip--red">p0</span>
            <span className="chip chip--red">cost-impact</span>
            <span style={{ color: "var(--eg-fg-4)" }}>·</span>
            <span style={{ display: "inline-flex", alignItems: "center", gap: 6 }}>
              <span className="avatar avatar--yellow">MR</span>
              <span className="mono" style={{ fontSize: 11, color: "var(--eg-iron)", fontWeight: 600 }}>Maite Rekalde</span>
            </span>
            <span style={{ color: "var(--eg-fg-4)" }}>·</span>
            <span className="mono" style={{ fontSize: 11, color: "var(--eg-iron)", fontWeight: 600 }}>S-04 · brake tests · 5 pts</span>
            <span style={{ color: "var(--eg-fg-4)" }}>·</span>
            <span className="mono" style={{ fontSize: 11, color: "var(--eg-red)", fontWeight: 700 }}>● REC · 01:24 corriendo</span>
          </div>
        </div>
      </Spec>
    </Bay>
  );
}

/* ─── 07 Comment composer ────────────────────────────────── */
function ComposerBay() {
  return (
    <Bay num="07" name="COMENTAR · COMMENT COMPOSER" en="// the box you type into"
      lede="Caja para escribir un comentario en un ticket. Toolbar con B / I / code / @ / # arriba. Toggle de visibilidad cliente/staff a la derecha. Mono char counter abajo.">
      <Spec serial="GS-LIB-W07" label="COMPOSER · FOCUSED · WITH @MENTION OPEN">
        <div style={{ border: "2px solid var(--eg-iron)", background: "var(--eg-paper)", boxShadow: "3px 3px 0 var(--eg-iron)", maxWidth: 720, position: "relative" }}>
          <div className="tag-head" style={{ background: "var(--eg-yellow)" }}>
            <span><b style={{ color: "var(--eg-iron)" }}>NUEVO COMENTARIO</b> · NEW COMMENT</span>
            <span>// markdown ok</span>
          </div>
          <div style={{ padding: "8px 10px", borderBottom: "1px dashed var(--eg-iron)", display: "flex", gap: 6, alignItems: "center" }}>
            <button className="b-btn b-btn--ghost" style={{ padding: "2px 8px", fontWeight: 800 }}>B</button>
            <button className="b-btn b-btn--ghost" style={{ padding: "2px 8px", fontStyle: "italic" }}>I</button>
            <button className="b-btn b-btn--ghost" style={{ padding: "2px 8px" }}>S̶</button>
            <span style={{ width: 1, height: 16, background: "var(--eg-rule)" }} />
            <button className="b-btn b-btn--ghost" style={{ padding: "2px 8px", fontFamily: "var(--font-mono)" }}>{"<>"}</button>
            <button className="b-btn b-btn--ghost" style={{ padding: "2px 8px", fontFamily: "var(--font-mono)" }}>{"```"}</button>
            <button className="b-btn b-btn--ghost" style={{ padding: "2px 8px" }}>{"⊟"}</button>
            <span style={{ width: 1, height: 16, background: "var(--eg-rule)" }} />
            <button className="b-btn b-btn--ghost" style={{ padding: "2px 8px" }}>@</button>
            <button className="b-btn b-btn--ghost" style={{ padding: "2px 8px" }}>#</button>
            <button className="b-btn b-btn--ghost" style={{ padding: "2px 8px" }}>🔗</button>
            <span style={{ marginLeft: "auto", display: "flex", alignItems: "center", gap: 6 }}>
              <span className="mono" style={{ fontSize: 10, color: "var(--eg-fg-3)", letterSpacing: "0.1em", textTransform: "uppercase" }}>// visible para</span>
              <Segmented options={["Staff", "Cliente", "Todos"]} value={0} onChange={() => {}} small />
            </span>
          </div>
          <div style={{ padding: 12, fontFamily: "var(--font-body)", fontSize: 14, color: "var(--eg-iron)", lineHeight: 1.55, position: "relative", minHeight: 100 }}>
            La pieza llega en <b>48h</b>. Apunta el SN en la descripción, @ma<span style={{ background: "var(--eg-iron)", color: "var(--eg-yellow)", padding: "0 2px" }}>|</span>
            <div style={{
              position: "absolute", left: 220, top: 30,
              width: 220, background: "var(--eg-paper)",
              border: "2px solid var(--eg-iron)", boxShadow: "3px 3px 0 var(--eg-iron)",
              zIndex: 2
            }}>
              <div className="tag-head" style={{ background: "var(--eg-yellow)" }}>
                <span><b style={{ color: "var(--eg-iron)" }}>@</b> · MENCIONAR</span>
                <span>esc</span>
              </div>
              {[
                { i: "MR", h: "yellow", n: "Maite Rekalde",  s: "staff", hi: true },
                { i: "MM", h: "ink",    n: "Markel Mendiola", s: "staff" },
                { i: "MA", h: "gold",   n: "Mary Apperloo",   s: "client" },
              ].map((u, i, arr) => (
                <div key={u.i} style={{
                  display: "flex", alignItems: "center", gap: 8, padding: "6px 10px",
                  background: u.hi ? "var(--eg-yellow-soft)" : "transparent",
                  borderBottom: i < arr.length - 1 ? "1px dashed var(--eg-iron)" : 0
                }}>
                  <span className={`avatar avatar--${u.h}`}>{u.i}</span>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontFamily: "var(--font-display)", fontSize: 13, fontWeight: 700, color: "var(--eg-iron)", textTransform: "uppercase", letterSpacing: "0.01em" }}>{u.n}</div>
                    <div className="mono" style={{ fontSize: 9.5, color: "var(--eg-fg-3)", letterSpacing: "0.08em" }}>// {u.s}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "8px 12px", borderTop: "1px dashed var(--eg-iron)", background: "var(--eg-paper-2)" }}>
            <span className="mono" style={{ fontSize: 10, color: "var(--eg-fg-3)", letterSpacing: "0.1em", textTransform: "uppercase" }}>
              42 / 4000 · <span className="kbd-key" style={{ fontSize: 9, padding: "0 4px", minWidth: 0 }}>⌘</span><span className="kbd-key" style={{ fontSize: 9, padding: "0 4px", minWidth: 0 }}>↵</span> enviar
            </span>
            <div style={{ display: "flex", gap: 8 }}>
              <button className="b-btn b-btn--ghost">Cancelar</button>
              <button className="b-btn b-btn--yellow">Comentar · Comment</button>
            </div>
          </div>
        </div>
      </Spec>
    </Bay>
  );
}

/* ─── 08 Mention inline ──────────────────────────────────── */
function MentionInlineBay() {
  return (
    <Bay num="08" name="MENCIONES · INLINE" en="// @user · #ticket · /command"
      lede="Cuando aparecen en cuerpo de un comentario, se renderizan como chip inline — sin paréntesis, sin tooltips. Hover muestra .lore con info corta.">
      <Spec serial="GS-LIB-W08" label="MENTION CHIPS · 4 KINDS">
        <div style={{ maxWidth: 720, fontFamily: "var(--font-body)", fontSize: 14, color: "var(--eg-iron)", lineHeight: 1.7 }}>
          <p style={{ margin: "0 0 10px" }}>
            Confirmado con <MentChip kind="user" hue="yellow">@maite</MentChip>. Vamos a aislar el componente y a apuntar el SN en la descripción de <MentChip kind="ticket">#MTNR-42</MentChip>. Si en 48h no llega la pieza, abro un sub-ticket de logística contra <MentChip kind="client" hue="red">@acme-pm</MentChip>.
          </p>
          <p style={{ margin: 0 }}>
            CC <MentChip kind="user" hue="ink">@eneko</MentChip>, miramos los <MentChip kind="ticket">#MTNR-37</MentChip> y <MentChip kind="ticket">#MTNR-39</MentChip> en la review del viernes. Si la métrica no mejora ejecuta <MentChip kind="cmd">/cierra-sprint</MentChip>.
          </p>
        </div>
      </Spec>
    </Bay>
  );
}

function MentChip({ kind, hue, children }) {
  const c = kind === "user"   ? { bg: `var(--eg-${hue === "ink" ? "iron" : hue})`, fg: hue === "ink" ? "var(--eg-yellow)" : "var(--eg-iron)" }
         : kind === "client" ? { bg: "var(--eg-red)", fg: "var(--eg-paper)" }
         : kind === "ticket" ? { bg: "var(--eg-paper)", fg: "var(--eg-iron)", border: true }
         : { bg: "var(--eg-iron)", fg: "var(--eg-yellow)" };
  return (
    <span style={{
      display: "inline-flex", alignItems: "center",
      padding: "1px 6px",
      background: c.bg, color: c.fg,
      border: c.border ? "1.5px solid var(--eg-iron)" : "1.5px solid transparent",
      fontFamily: "var(--font-mono)", fontSize: 12, fontWeight: 700,
      letterSpacing: "0.04em"
    }}>{children}</span>
  );
}

/* ─── 09 Timer card ──────────────────────────────────────── */
function TimerBay() {
  return (
    <Bay num="09" name="CRONÓMETRO · TIMER" en="// start · pause · stop"
      lede="Card flotante con la cuenta corriendo en mono grande, el ticket asociado, y dos botones. La franja izquierda parpadea cuando va.">
      <Spec serial="GS-LIB-W09" label="TIMER · RUNNING">
        <div style={{
          width: 380, border: "2px solid var(--eg-iron)",
          background: "var(--eg-iron)", color: "var(--eg-paper)",
          boxShadow: "4px 4px 0 var(--eg-yellow)",
          display: "grid", gridTemplateColumns: "10px 1fr auto"
        }}>
          <div style={{ background: "var(--eg-red)", animation: "blink 1.4s steps(2) infinite" }} />
          <div style={{ padding: "10px 14px" }}>
            <div className="mono" style={{ fontSize: 10, color: "var(--eg-yellow)", letterSpacing: "0.14em", textTransform: "uppercase", fontWeight: 700 }}>
              // EN CURSO · RUNNING · billable · €65/h
            </div>
            <div style={{ display: "flex", alignItems: "baseline", gap: 12, marginTop: 4 }}>
              <span style={{ fontFamily: "var(--font-mono)", fontWeight: 700, fontSize: 30, color: "var(--eg-paper)", letterSpacing: "0.04em" }}>01:24:08</span>
              <span style={{ fontFamily: "var(--font-mono)", fontSize: 11, color: "var(--eg-fg-5)", letterSpacing: "0.1em" }}>· €91.42 devengado</span>
            </div>
            <div className="mono" style={{ fontSize: 11, color: "var(--eg-paper)", marginTop: 2, fontWeight: 600 }}>
              <span className="type-chip type-bug" style={{ marginRight: 6, color: "var(--eg-paper)" }}>B</span>
              <b style={{ color: "var(--eg-yellow)" }}>MTNR-42</b> · Brake sensor on bogie 14
            </div>
          </div>
          <div style={{ padding: 10, display: "flex", flexDirection: "column", gap: 6, justifyContent: "center" }}>
            <button className="b-btn b-btn--yellow" style={{ padding: "4px 8px" }}>⏸ Pausa</button>
            <button className="b-btn b-btn--red" style={{ padding: "4px 8px" }}>■ Stop</button>
          </div>
        </div>
      </Spec>

      <Spec serial="GS-LIB-W10" label="TIMER · STOPPED · ASK ABOUT WORKLOG" stage="paper2">
        <div style={{
          width: 460, border: "2px solid var(--eg-iron)",
          background: "var(--eg-paper)", boxShadow: "4px 4px 0 var(--eg-iron)"
        }}>
          <div className="tag-head"><span><b style={{ color: "var(--eg-iron)" }}>TIMER · DETENIDO</b> · 01:24:08</span><span>// confirmar worklog</span></div>
          <div style={{ padding: "14px 16px" }}>
            <div className="disp" style={{ fontSize: 20, color: "var(--eg-iron)", lineHeight: 1.1 }}>
              ¿GUARDAR ESTAS <span style={{ background: "var(--eg-yellow)", padding: "0 4px" }}>1H 24M</span>?
            </div>
            <textarea
              placeholder="Qué hiciste · what did you do"
              defaultValue="Aislamiento del sensor + verificación cable continuidad."
              style={{ marginTop: 10, minHeight: 64, fontSize: 13 }}
            />
            <div className="spec__row" style={{ gap: 10, marginTop: 10 }}>
              <Toggle on label="Facturable · billable" />
              <span className="mono" style={{ marginLeft: "auto", fontSize: 11, color: "var(--eg-iron)", fontWeight: 700, letterSpacing: "0.06em" }}>= €91.42</span>
            </div>
            <div className="spec__row" style={{ gap: 8, marginTop: 12, justifyContent: "flex-end" }}>
              <button className="b-btn b-btn--ghost">Descartar</button>
              <button className="b-btn b-btn--yellow">Guardar worklog</button>
            </div>
          </div>
        </div>
      </Spec>
    </Bay>
  );
}

/* ─── 10 Invoice line ────────────────────────────────────── */
function InvoiceLineBay() {
  return (
    <Bay num="10" name="LÍNEA DE FACTURA · INVOICE LINE" en="// what gets billed"
      lede="Una fila por ticket + agregación por sprint. Mono para horas, mono para €. El total en placa amarilla riveted al final.">
      <Spec serial="GS-LIB-W11" label="INVOICE · 5 LINES · SPRINT TOTAL" pad={0}>
        <div>
          <div style={{ padding: "10px 18px", background: "var(--eg-iron)", color: "var(--eg-paper)", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <div>
              <div className="mono" style={{ fontSize: 10, color: "var(--eg-yellow)", letterSpacing: "0.14em", textTransform: "uppercase" }}>// factura · invoice · borrador</div>
              <div className="disp" style={{ fontSize: 22, color: "var(--eg-paper)", lineHeight: 1 }}>MANTENEDOR SL · S-04 · BRAKE TESTS</div>
            </div>
            <div style={{ textAlign: "right" }}>
              <div className="mono" style={{ fontSize: 10, color: "var(--eg-fg-5)", letterSpacing: "0.1em", textTransform: "uppercase" }}>// 2026-05-13 → 2026-05-27</div>
              <div className="mono" style={{ fontSize: 11, color: "var(--eg-paper)", fontWeight: 700, letterSpacing: "0.06em" }}>INV-2026-S04 · BORRADOR · DRAFT</div>
            </div>
          </div>
          <div style={{ background: "var(--eg-paper)" }}>
            {[
              { k: "MTNR-42", t: "Brake sensor on bogie 14",         h: "4h 12m", r: "65", e: "€273.00", hi: true },
              { k: "MTNR-39", t: "Brake tests · timetable D-3",      h: "6h 40m", r: "65", e: "€433.33" },
              { k: "MTNR-37", t: "Couplers spec · weight tolerance", h: "5h 18m", r: "65", e: "€344.50" },
              { k: "MTNR-33", t: "ETL: timetable CSV → staging",     h: "3h 04m", r: "55", e: "€168.67", rate: "junior" },
              { k: "MTNR-22", t: "Translate dashboard · euskara",    h: "1h 44m", r: "75", e: "€130.00", rate: "specialist" },
            ].map((r, i, arr) => (
              <div key={r.k} style={{
                display: "grid", gridTemplateColumns: "auto 1fr 90px 80px 100px",
                gap: 12, padding: "10px 18px",
                alignItems: "center",
                borderBottom: i < arr.length - 1 ? "1px dashed var(--eg-iron)" : 0,
                background: r.hi ? "var(--eg-yellow-soft)" : "transparent"
              }}>
                <span className="mono" style={{ fontSize: 12, color: "var(--eg-iron)", fontWeight: 700, letterSpacing: "0.06em" }}>{r.k}</span>
                <span style={{ fontFamily: "var(--font-body)", fontSize: 13, color: "var(--eg-fg-1)" }}>{r.t} {r.rate && <span className="chip" style={{ marginLeft: 6, fontSize: 9, padding: "1px 5px" }}>{r.rate}</span>}</span>
                <span className="mono" style={{ textAlign: "right", fontSize: 12, color: "var(--eg-iron)", fontWeight: 600 }}>{r.h}</span>
                <span className="mono" style={{ textAlign: "right", fontSize: 12, color: "var(--eg-fg-3)" }}>€{r.r}/h</span>
                <span className="mono" style={{ textAlign: "right", fontSize: 13, color: "var(--eg-iron)", fontWeight: 800 }}>{r.e}</span>
              </div>
            ))}
            <div style={{
              display: "grid", gridTemplateColumns: "1fr auto auto",
              gap: 12, alignItems: "center",
              padding: "16px 18px", background: "var(--eg-paper-2)",
              borderTop: "2px solid var(--eg-iron)"
            }}>
              <span className="mono" style={{ fontSize: 11, color: "var(--eg-fg-3)", letterSpacing: "0.12em", textTransform: "uppercase" }}>// 5 tickets · 20h 58m · 4 facturables + 1 specialist</span>
              <span className="mono" style={{ fontSize: 12, color: "var(--eg-fg-3)", letterSpacing: "0.06em" }}>SUBTOTAL</span>
              <span className="plate plate--yellow" style={{ fontSize: 18, padding: "6px 18px" }}>€1,349.50</span>
            </div>
          </div>
        </div>
      </Spec>
    </Bay>
  );
}

/* ─── 11 Project switcher ────────────────────────────────── */
function SwitcherBay() {
  return (
    <Bay num="11" name="SWITCHER · PROYECTO" en="// quick jump · grouped by client"
      lede="Panel desde la topbar. Cliente como header oscuro, proyectos como filas. El project key en placa amarilla pequeña.">
      <Spec serial="GS-LIB-W12" label="PROJECT SWITCHER · OPEN" stage="ink">
        <div style={{
          width: 380, background: "var(--eg-paper)",
          border: "2px solid var(--eg-iron)", boxShadow: "4px 4px 0 var(--eg-iron-3)"
        }}>
          <div className="tag-head" style={{ background: "var(--eg-yellow)" }}>
            <span><b style={{ color: "var(--eg-iron)" }}>PROYECTOS</b> · SWITCH</span>
            <span>// ⌘P</span>
          </div>
          <div style={{ padding: "6px 12px", borderBottom: "1.5px solid var(--eg-iron)", display: "flex", alignItems: "center", gap: 8 }}>
            <span className="mono" style={{ fontSize: 11, color: "var(--eg-fg-3)", fontWeight: 700 }}>//</span>
            <input placeholder="filtrar · MTNR · acme" style={{ border: 0, outline: 0, background: "transparent", fontFamily: "var(--font-mono)", fontSize: 12, flex: 1 }} />
          </div>
          {[
            {
              client: "Mantenedor SL",
              cur: "EUR",
              projects: [
                { pk: "MTNR", n: "Freight Scheduling Engine", open: 18, sprint: "S-04", hi: true },
                { pk: "RAIL", n: "Rolling-Stock Audit",        open:  9, sprint: "S-12" },
              ]
            },
            {
              client: "Acme Corp",
              cur: "USD",
              warn: true,
              projects: [
                { pk: "ANVL", n: "Anvil Delivery API", open:  7, sprint: "S-02" },
                { pk: "RSKT", n: "Rocket-Skate QA",    open:  5, sprint: "S-09" },
                { pk: "RDRN", n: "Roadrunner CRM",     open:  2, sprint: "—"     },
              ]
            },
            {
              client: "Internal",
              cur: "EUR",
              projects: [
                { pk: "GIRA", n: "Gira · Core Tracker", open: 6, sprint: "M1" },
              ]
            }
          ].map((g, gi, arr) => (
            <div key={g.client}>
              <div style={{
                padding: "6px 12px", background: "var(--eg-iron)", color: "var(--eg-paper)",
                display: "flex", justifyContent: "space-between", alignItems: "center"
              }}>
                <div style={{ display: "inline-flex", alignItems: "center", gap: 8 }}>
                  <span style={{ width: 8, height: 8, background: g.warn ? "var(--eg-red)" : "var(--eg-green)", borderRadius: "50%" }} />
                  <span className="disp" style={{ fontSize: 14, color: "var(--eg-yellow)", letterSpacing: "0.02em" }}>{g.client.toUpperCase()}</span>
                </div>
                <span className="mono" style={{ fontSize: 9.5, color: "var(--eg-fg-5)", letterSpacing: "0.1em" }}>{g.cur} · {g.projects.length} PROY</span>
              </div>
              {g.projects.map((p, i) => (
                <div key={p.pk} style={{
                  display: "grid", gridTemplateColumns: "auto 1fr auto",
                  gap: 10, padding: "8px 12px", alignItems: "center",
                  background: p.hi ? "var(--eg-yellow-soft)" : "transparent",
                  borderBottom: i < g.projects.length - 1 ? "1px dashed var(--eg-iron)" : 0
                }}>
                  <span className="plate plate--yellow" style={{ fontSize: 10, padding: "2px 6px" }}>{p.pk}</span>
                  <div>
                    <div style={{ fontFamily: "var(--font-display)", fontWeight: 700, fontSize: 13, color: "var(--eg-iron)", textTransform: "uppercase", letterSpacing: "0.01em" }}>{p.n}</div>
                    <div className="mono" style={{ fontSize: 9.5, color: "var(--eg-fg-3)", letterSpacing: "0.08em" }}>// {p.sprint} · {p.open} open</div>
                  </div>
                  {p.hi && <span className="kbd-key" style={{ fontSize: 9, padding: "0 4px", minWidth: 0 }}>↵</span>}
                </div>
              ))}
              {gi < arr.length - 1 && <div className="bg-hazard-thin" style={{ height: 4 }} />}
            </div>
          ))}
          <div style={{ padding: "6px 12px", background: "var(--eg-paper-2)", borderTop: "1.5px solid var(--eg-iron)", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <span className="mono" style={{ fontSize: 9.5, color: "var(--eg-fg-3)", letterSpacing: "0.1em", textTransform: "uppercase" }}>3 clientes · 6 proyectos</span>
            <button className="b-btn" style={{ padding: "2px 8px" }}>+ Nuevo proyecto</button>
          </div>
        </div>
      </Spec>
    </Bay>
  );
}

Object.assign(window, { CompositionsSection });
