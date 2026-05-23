/* DEPÓSITO · VI · Datos · Data display */

function DataSection() {
  return (
    <Sect
      id="data"
      num="VI"
      eyebrow="datos · data · 7 bays"
      titleEs="DATOS."
      titleEn="Numbers, rows, charts, what was."
      meta={<>SERIE · GS-LIB-D<br /><b>20 piezas</b> · todo en mono donde cuenta</>}
      intro="Donde el sistema se vuelve un timetable: stats, listas k/v, tablas con dashed rules, gráficos SVG que no necesitan canvas, log entries con timestamp, todo en mono porque las cifras no son prosa."
    >
      <StatsBay />
      <DlBay />
      <TableBay />
      <ActivityBay />
      <TimelineBay />
      <ChartsBay />
    </Sect>
  );
}

/* ─── 01 Stat tiles ──────────────────────────────────────── */
function StatsBay() {
  return (
    <Bay num="01" name="STATS · MÉTRICAS" en="// big number + caps label + delta"
      lede="La pieza primaria del summary. Número grande en display, label mono en caps, opcional delta con triángulo. Stat tiles entran de 1, 2, 3 o 4 — nunca de 5.">
      <Spec serial="GS-LIB-D01" label="STAT TILE · 4-UP · BORDERED">
        <div style={{ border: "2px solid var(--eg-iron)", display: "grid", gridTemplateColumns: "1fr 1fr 1fr 1fr" }}>
          <StatTile label="tickets · open"        v="27"      delta="+3"    deltaUp />
          <StatTile label="horas · this sprint"   v="247"     unit="h"      delta="+12h" deltaUp />
          <StatTile label="velocidad · velocity"  v="22"      unit="pts"    delta="-3 pts" />
          <StatTile label="facturable · accrued"  v="€28k"    highlight     delta="+€2.4k" deltaUp />
        </div>
      </Spec>

      <Spec serial="GS-LIB-D02" label="STAT · COMPACT · INLINE" stage="paper2"
        when="Dentro de header de tabla o de un drawer.">
        <div className="spec__row" style={{ gap: 22 }}>
          <CompactStat label="committed" v="34 pts" />
          <CompactStat label="completed" v="22 pts" tone="green" />
          <CompactStat label="carry-over" v="12 pts" tone="red" />
          <CompactStat label="velocity μ" v="24 pts" />
          <CompactStat label="capacity" v="40h" />
        </div>
      </Spec>

      <Spec serial="GS-LIB-D03" label="STAT · WITH SPARKLINE"
        when="Resumen ejecutivo de un cliente o proyecto. La sparkline va al lado, no sobre.">
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14, maxWidth: 720 }}>
          <SparkStat label="horas · 14d" v="247h" trend={[12, 18, 16, 22, 20, 28, 32, 30, 26, 24, 28, 31, 35, 30]} />
          <SparkStat label="tickets cerrados · 14d" v="38" trend={[2, 3, 1, 4, 5, 3, 2, 6, 4, 3, 5, 2, 4, 4]} tone="green" />
        </div>
      </Spec>
    </Bay>
  );
}

function StatTile({ label, v, unit, delta, deltaUp, highlight }) {
  return (
    <div style={{
      padding: "16px 18px",
      borderRight: "2px solid var(--eg-iron)",
      background: highlight ? "var(--eg-yellow)" : "var(--eg-paper)",
      minHeight: 100
    }}>
      <div className="mono" style={{
        fontSize: 10, letterSpacing: "0.14em", textTransform: "uppercase",
        color: highlight ? "var(--eg-iron)" : "var(--eg-fg-3)", fontWeight: 600
      }}>// {label}</div>
      <div style={{ display: "flex", alignItems: "baseline", gap: 6, marginTop: 4 }}>
        <span className="disp" style={{ fontSize: 40, lineHeight: 1, color: highlight ? "var(--eg-iron)" : "var(--eg-iron)" }}>{v}</span>
        {unit && <span className="mono" style={{ fontSize: 12, color: highlight ? "var(--eg-iron)" : "var(--eg-fg-3)", fontWeight: 600 }}>{unit}</span>}
      </div>
      {delta && (
        <div className="mono" style={{
          fontSize: 11, fontWeight: 700, letterSpacing: "0.06em",
          color: deltaUp ? "var(--eg-green)" : "var(--eg-red)",
          marginTop: 6
        }}>{deltaUp ? "▲" : "▼"} {delta}</div>
      )}
    </div>
  );
}

function CompactStat({ label, v, tone }) {
  const c = tone === "green" ? "var(--eg-green)" : tone === "red" ? "var(--eg-red)" : "var(--eg-iron)";
  return (
    <div>
      <div className="mono" style={{ fontSize: 10, color: "var(--eg-fg-3)", letterSpacing: "0.12em", textTransform: "uppercase" }}>// {label}</div>
      <div style={{ fontFamily: "var(--font-display)", fontWeight: 800, fontSize: 22, color: c, letterSpacing: "0.01em" }}>{v}</div>
    </div>
  );
}

function Sparkline({ data, color = "var(--eg-iron)", width = 160, height = 38 }) {
  const max = Math.max(...data);
  const min = Math.min(...data);
  const range = (max - min) || 1;
  const step = width / (data.length - 1);
  const points = data.map((d, i) => [i * step, height - 4 - ((d - min) / range) * (height - 8)]);
  const path = points.map((p, i) => (i === 0 ? "M" : "L") + p[0].toFixed(1) + " " + p[1].toFixed(1)).join(" ");
  return (
    <svg width={width} height={height} viewBox={`0 0 ${width} ${height}`} style={{ display: "block" }}>
      <path d={path + ` L ${width} ${height} L 0 ${height} Z`} fill={color} opacity={0.12} />
      <path d={path} stroke={color} strokeWidth="1.5" fill="none" />
      {points.map((p, i) => i === points.length - 1 && (
        <rect key={i} x={p[0] - 2.5} y={p[1] - 2.5} width="5" height="5" fill={color} />
      ))}
    </svg>
  );
}

function SparkStat({ label, v, trend, tone }) {
  const c = tone === "green" ? "var(--eg-green)" : "var(--eg-iron)";
  return (
    <div style={{ border: "1.5px solid var(--eg-iron)", padding: "12px 14px", display: "flex", alignItems: "center", gap: 16, background: "var(--eg-paper)" }}>
      <div>
        <div className="mono" style={{ fontSize: 10, color: "var(--eg-fg-3)", letterSpacing: "0.12em", textTransform: "uppercase" }}>// {label}</div>
        <div style={{ fontFamily: "var(--font-display)", fontWeight: 800, fontSize: 32, color: c, letterSpacing: "0.01em" }}>{v}</div>
      </div>
      <div style={{ marginLeft: "auto" }}>
        <Sparkline data={trend} color={c} />
        <div className="mono" style={{ fontSize: 9.5, color: "var(--eg-fg-3)", letterSpacing: "0.1em", textTransform: "uppercase", marginTop: 4 }}>// 14d</div>
      </div>
    </div>
  );
}

/* ─── 02 K/V definition list ─────────────────────────────── */
function DlBay() {
  return (
    <Bay num="02" name="K · V · DEFINITION LIST" en="// label / value pairs"
      lede="Labels mono caps tracking 0.12em, valores body. Rule dashed entre filas. Es el formato para el meta-panel de un ticket, settings rows, audit details.">
      <Spec serial="GS-LIB-D04" label="DL · TICKET METADATA" stage="paper2">
        <div style={{ maxWidth: 520, background: "var(--eg-paper)", border: "1.5px solid var(--eg-iron)", padding: "0 14px" }}>
          {[
            { k: "Estado · status",    v: <><span className="chip chip--yellow">In Progress</span> <span className="mono" style={{ fontSize: 10, color: "var(--eg-fg-3)", marginLeft: 6, letterSpacing: "0.06em" }}>desde 16:18</span></> },
            { k: "Tipo · type",        v: <span style={{ display: "inline-flex", alignItems: "center", gap: 6 }}><span className="type-chip type-bug">B</span> Bug</span> },
            { k: "Prioridad · priority",v: <span className="chip chip--emergency"><span>EMERGENCIA</span></span> },
            { k: "Asignado · assignee", v: <span style={{ display: "inline-flex", alignItems: "center", gap: 6 }}><span className="avatar avatar--yellow">MR</span> Maite Rekalde</span> },
            { k: "Sprint",              v: "S-04 · Brake tests" },
            { k: "Estimado · estimate", v: <span className="mono" style={{ fontSize: 13, fontWeight: 700, color: "var(--eg-iron)" }}>8h / 5 pts</span> },
            { k: "Registrado · logged", v: <span className="mono" style={{ fontSize: 13, fontWeight: 700, color: "var(--eg-iron)" }}>4h 12m</span> },
            { k: "Facturable · billable", v: <Toggle on label="" /> },
          ].map((r, i, arr) => (
            <div key={i} style={{
              display: "grid", gridTemplateColumns: "180px 1fr", gap: 18,
              padding: "10px 0",
              borderBottom: i < arr.length - 1 ? "1px dashed var(--eg-iron)" : 0
            }}>
              <span className="mono" style={{ fontSize: 10, letterSpacing: "0.14em", textTransform: "uppercase", color: "var(--eg-fg-3)", fontWeight: 600 }}>// {r.k}</span>
              <span style={{ fontFamily: "var(--font-body)", fontSize: 13, color: "var(--eg-iron)" }}>{r.v}</span>
            </div>
          ))}
        </div>
      </Spec>
    </Bay>
  );
}

/* ─── 03 Table ───────────────────────────────────────────── */
function TableBay() {
  return (
    <Bay num="03" name="TABLA · TIMETABLE" en="// dashed rules · mono caps headers"
      lede="Las tablas son el timetable del producto. Headers mono caps + tracking ancho. Filas con dashed rules. Selected = yellow-soft. La columna numérica siempre right-aligned y mono.">
      <Spec serial="GS-LIB-D05" label="TICKETS · TABLE" pad={0}>
        <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13, fontFamily: "var(--font-body)" }}>
          <thead>
            <tr style={{ background: "var(--eg-iron)", color: "var(--eg-yellow)" }}>
              <th style={thS}>// KEY</th>
              <th style={{...thS, textAlign: "left", width: "auto"}}>// TÍTULO · TITLE</th>
              <th style={thS}>// TIPO</th>
              <th style={thS}>// PRI</th>
              <th style={thS}>// ASIGN</th>
              <th style={{...thS, textAlign: "right"}}>// EST</th>
              <th style={{...thS, textAlign: "right"}}>// LOG</th>
              <th style={{...thS, textAlign: "right"}}>// €</th>
            </tr>
          </thead>
          <tbody>
            {[
              { k: "MTNR-42", t: "Brake sensor on bogie 14 returns 0N",       ty: "B", tyCls: "type-bug",   pri: "emergency", asg: "MR", asgHue: "yellow", est: "8h",  log: "4h 12m", eur: "€273", hi: true },
              { k: "MTNR-39", t: "Brake tests · timetable D-3 review",        ty: "T", tyCls: "type-task",  pri: "high",      asg: "JI", asgHue: "gold",   est: "3h",  log: "—",       eur: "—" },
              { k: "MTNR-37", t: "Couplers spec · weight tolerance update",   ty: "S", tyCls: "type-story", pri: "medium",    asg: "AL", asgHue: "green",  est: "5 pts",log:"6h 40m", eur: "€432" },
              { k: "GIRA-12", t: "Magic-link expiry: 15min vs 10min audit",   ty: "T", tyCls: "type-task",  pri: "low",       asg: "EG", asgHue: "ink",    est: "1h",  log: "1h 04m", eur: "—" },
              { k: "ANVL-03", t: "Anvil delivery API · 429 from upstream",    ty: "B", tyCls: "type-bug",   pri: "urgent",    asg: "AL", asgHue: "green",  est: "4h",  log: "—",       eur: "—" },
            ].map((r, i) => (
              <tr key={r.k} style={{
                background: r.hi ? "var(--eg-yellow-soft)" : "transparent",
                borderBottom: "1px dashed var(--eg-iron)"
              }}>
                <td style={{...tdS, fontFamily: "var(--font-mono)", fontWeight: 700, color: "var(--eg-iron)"}}>{r.k}</td>
                <td style={{...tdS, textAlign: "left", color: "var(--eg-fg-1)"}}>{r.t}</td>
                <td style={tdS}><span className={`type-chip ${r.tyCls}`}>{r.ty}</span></td>
                <td style={tdS}>
                  {r.pri === "emergency"
                    ? <span className="chip chip--emergency"><span>P0</span></span>
                    : <span className={`chip chip--${r.pri === "urgent" ? "urgent" : r.pri === "high" ? "high" : r.pri === "low" ? "low" : "medium"}`}>{r.pri}</span>}
                </td>
                <td style={tdS}><span className={`avatar avatar--${r.asgHue}`}>{r.asg}</span></td>
                <td style={{...tdS, textAlign: "right", fontFamily: "var(--font-mono)", color: "var(--eg-iron)"}}>{r.est}</td>
                <td style={{...tdS, textAlign: "right", fontFamily: "var(--font-mono)", color: "var(--eg-iron)"}}>{r.log}</td>
                <td style={{...tdS, textAlign: "right", fontFamily: "var(--font-mono)", color: "var(--eg-iron)", fontWeight: 700}}>{r.eur}</td>
              </tr>
            ))}
            <tr style={{ background: "var(--eg-paper-2)" }}>
              <td style={{...tdS, fontFamily: "var(--font-mono)", color: "var(--eg-fg-3)", letterSpacing: "0.1em", textTransform: "uppercase"}} colSpan={5}>// 5 tickets · 1 emergencia · 4 abiertos</td>
              <td style={{...tdS, textAlign: "right", fontFamily: "var(--font-mono)", color: "var(--eg-iron)", fontWeight: 700}}>21h</td>
              <td style={{...tdS, textAlign: "right", fontFamily: "var(--font-mono)", color: "var(--eg-iron)", fontWeight: 700}}>11h 56m</td>
              <td style={{...tdS, textAlign: "right", fontFamily: "var(--font-mono)", color: "var(--eg-iron)", fontWeight: 800}}>€705</td>
            </tr>
          </tbody>
        </table>
      </Spec>

      <Spec serial="GS-LIB-D06" label="STATE · EMPTY ROW · LOADING ROW · ERROR ROW" stage="paper2">
        <table style={{ width: "100%", borderCollapse: "collapse", fontFamily: "var(--font-body)", background: "var(--eg-paper)" }}>
          <thead>
            <tr style={{ background: "var(--eg-iron)", color: "var(--eg-yellow)" }}>
              <th style={thS}>// KEY</th>
              <th style={{...thS, textAlign: "left"}}>// TÍTULO</th>
              <th style={thS}>// PRI</th>
              <th style={thS}>// ASIGN</th>
            </tr>
          </thead>
          <tbody>
            <tr style={{ borderBottom: "1px dashed var(--eg-iron)" }}>
              <td colSpan={4} style={{ padding: "16px 14px", textAlign: "center", color: "var(--eg-fg-3)", fontFamily: "var(--font-mono)", letterSpacing: "0.12em", textTransform: "uppercase", fontSize: 11 }}>
                // sin resultados para 'brake-handler-v2' · try other terms
              </td>
            </tr>
            <tr style={{ borderBottom: "1px dashed var(--eg-iron)" }}>
              <td colSpan={4} style={{ padding: 0 }}>
                <div style={{ height: 6, background: "var(--eg-paper-2)", overflow: "hidden", position: "relative" }}>
                  <div style={{ position: "absolute", inset: 0, width: "200%", background: "repeating-linear-gradient(-45deg, var(--eg-yellow) 0 8px, var(--eg-iron) 8px 16px)", animation: "gs-stripe 1.2s linear infinite" }} />
                </div>
                <div style={{ padding: "10px 14px", color: "var(--eg-fg-3)", fontFamily: "var(--font-mono)", fontSize: 11, letterSpacing: "0.12em", textTransform: "uppercase" }}>// cargando 312 filas · loading</div>
              </td>
            </tr>
            <tr style={{ background: "var(--eg-red-soft)" }}>
              <td colSpan={4} style={{ padding: "10px 14px", color: "var(--eg-iron)", fontFamily: "var(--font-mono)", fontSize: 11, letterSpacing: "0.1em", textTransform: "uppercase" }}>
                ▲ HTTP 504 · upstream timeout · <a href="#" style={{ color: "var(--eg-red)" }}>↺ reintentar</a>
              </td>
            </tr>
          </tbody>
        </table>
      </Spec>
    </Bay>
  );
}

const thS = {
  fontFamily: "var(--font-mono)", fontSize: 10, fontWeight: 700,
  letterSpacing: "0.14em", textTransform: "uppercase",
  padding: "8px 12px", textAlign: "center", borderRight: "1px solid var(--eg-iron-3)"
};
const tdS = {
  padding: "10px 12px", textAlign: "center",
  fontFamily: "var(--font-body)", fontSize: 13
};

/* ─── 04 Activity feed / audit log / comments ────────────── */
function ActivityBay() {
  return (
    <Bay num="04" name="ACTIVIDAD · ACTIVITY · AUDIT" en="// who · what · when"
      lede="Filas con avatar a izquierda, descripción en body, timestamp mono a derecha. Tres flavors — actividad de ticket, auditoría de Sauron, hilo de comentarios.">
      <Spec serial="GS-LIB-D07" label="ACTIVITY · TICKET HISTORY">
        <div style={{ background: "var(--eg-paper)", border: "1.5px solid var(--eg-iron)" }}>
          {[
            { hue: "yellow", who: "Maite Rekalde", what: <>cambió el estado a <b style={{ color: "var(--eg-iron)" }}>In Progress</b></>, when: "hoy · 16:18" },
            { hue: "yellow", who: "Maite Rekalde", what: <>se asignó el ticket</>, when: "hoy · 16:18" },
            { hue: "ink",    who: "Eneko Garrido", what: <>marcó como <b style={{ color: "var(--eg-iron)" }}>emergencia</b> + añadió label <span className="chip chip--red" style={{ marginLeft: 4 }}>p0</span></>, when: "hoy · 15:42" },
            { hue: "red",    who: "Wile E. Coyote (cliente)", what: <>creó el ticket · enviado desde la widget de portal</>, when: "hoy · 15:14" },
          ].map((r, i, arr) => (
            <div key={i} style={{ display: "grid", gridTemplateColumns: "32px 1fr auto", gap: 12, alignItems: "flex-start", padding: "10px 14px", borderBottom: i < arr.length - 1 ? "1px dashed var(--eg-iron)" : 0 }}>
              <span className={`avatar avatar--${r.hue}`}>{r.who.split(" ").map(w => w[0]).join("").slice(0,2)}</span>
              <div style={{ paddingTop: 2 }}>
                <span style={{ fontFamily: "var(--font-display)", fontWeight: 700, fontSize: 14, color: "var(--eg-iron)", textTransform: "uppercase", letterSpacing: "0.01em", marginRight: 8 }}>{r.who.toUpperCase()}</span>
                <span style={{ fontFamily: "var(--font-body)", fontSize: 13, color: "var(--eg-fg-2)" }}>{r.what}</span>
              </div>
              <span className="mono" style={{ fontSize: 10, color: "var(--eg-fg-3)", letterSpacing: "0.1em", textTransform: "uppercase", fontWeight: 600, whiteSpace: "nowrap" }}>{r.when}</span>
            </div>
          ))}
        </div>
      </Spec>

      <Spec serial="GS-LIB-D08" label="AUDIT LOG · SAURON · :666" stage="ink"
        when="El log de auditoría. Inmutable. Cada fila es un evento, sin avatar, todo mono."
        dont="Sauron nunca habla en primera persona. No emite juicio, sólo registra.">
        <div>
          {[
            { ts: "16:42:14", actor: "u1 · eneko",      action: "issue.update",          target: "MTNR-42", note: "priority: urgent → emergency",         tone: "red" },
            { ts: "16:42:08", actor: "u2 · maite",      action: "timer.start",           target: "MTNR-42", note: "billable=true · rate=€65/h",            tone: "yellow" },
            { ts: "16:18:00", actor: "scrumlord · job", action: "sprint.autoclose",      target: "S-04",    note: "0 sprints closed · scan 8 sprints",     tone: "ok" },
            { ts: "15:14:02", actor: "client · wile",   action: "issue.create",          target: "MTNR-42", note: "via portal widget · source=mantenedor",  tone: "ok" },
            { ts: "14:09:22", actor: "u1 · eneko",      action: "export.timesheet",      target: "—",       note: "1208 rows · csv · last-90d",            tone: "red" },
          ].map((r, i) => (
            <div key={i} style={{ display: "grid", gridTemplateColumns: "92px 160px 200px 100px 1fr", gap: 14, padding: "8px 14px", borderBottom: i < 4 ? "1px dashed var(--eg-iron-3)" : 0, fontFamily: "var(--font-mono)", fontSize: 11, color: "var(--eg-paper)" }}>
              <span style={{ color: "var(--eg-fg-5)", letterSpacing: "0.06em" }}>{r.ts}</span>
              <span style={{ color: "var(--eg-yellow)", fontWeight: 600 }}>{r.actor}</span>
              <span style={{ color: r.tone === "red" ? "var(--eg-red)" : r.tone === "yellow" ? "var(--eg-yellow)" : "var(--eg-paper)", fontWeight: 700, letterSpacing: "0.04em" }}>{r.action}</span>
              <span style={{ color: "var(--eg-paper)", fontWeight: 700 }}>{r.target}</span>
              <span style={{ color: "var(--eg-fg-5)" }}>// {r.note}</span>
            </div>
          ))}
        </div>
      </Spec>

      <Spec serial="GS-LIB-D09" label="COMMENT · THREAD ITEM">
        <div style={{ display: "flex", flexDirection: "column", gap: 12, maxWidth: 720 }}>
          {[
            { hue: "yellow", who: "Maite Rekalde", when: "hoy · 16:18", body: "Reproducido. Sensor del bogie 14 marca 0N a carga completa. Voy a aislar el componente y pedir pieza a almacén central. Si la pieza tarda más de 48h, abriré un sub-ticket de logística contra el mantenedor.", visible: "staff" },
            { hue: "ink",    who: "Eneko Garrido", when: "hoy · 16:20", body: <>@<b>maite</b> apunta el número de serie del sensor en la descripción — necesitamos linaje para el reporte al cliente.</>, visible: "staff" },
            { hue: "red",    who: "Wile E. Coyote", when: "hoy · 16:42", body: "Necesitamos esto fixed antes del run de las 06:42 mañana. ¿ETA?", visible: "client" },
          ].map((c, i) => (
            <div key={i} style={{ border: "1.5px solid var(--eg-iron)", background: c.visible === "client" ? "var(--eg-red-soft)" : "var(--eg-paper)" }}>
              <div className="tag-head">
                <span style={{ display: "inline-flex", alignItems: "center", gap: 8 }}>
                  <span className={`avatar avatar--${c.hue}`}>{c.who.split(" ").map(w => w[0]).join("").slice(0,2)}</span>
                  <b style={{ color: "var(--eg-iron)" }}>{c.who.toUpperCase()}</b>
                </span>
                <span style={{ display: "inline-flex", gap: 10 }}>
                  <span className="chip" style={{ fontSize: 9, padding: "1px 6px" }}>VISIBLE · {c.visible}</span>
                  <span>{c.when}</span>
                </span>
              </div>
              <div style={{ padding: "12px 14px", fontSize: 13.5, lineHeight: 1.55, color: "var(--eg-fg-1)" }}>
                {c.body}
              </div>
            </div>
          ))}
        </div>
      </Spec>
    </Bay>
  );
}

/* ─── 05 Timeline (vertical, iron rail) ──────────────────── */
function TimelineBay() {
  return (
    <Bay num="05" name="LÍNEA TIEMPO · TIMELINE" en="// vertical iron rail"
      lede="Eventos en orden, con un rail vertical iron. Los nodos son cuadraditos pequeños — yellow para hechos, red para emergencias, ink para 'sin marcar'. El tiempo va abajo cuanto más viejo.">
      <Spec serial="GS-LIB-D10" label="TIMELINE · MTNR-42 · LIFECYCLE">
        <div style={{ position: "relative", paddingLeft: 24, maxWidth: 600 }}>
          <div style={{
            position: "absolute", left: 6, top: 8, bottom: 8,
            width: 2, background: "var(--eg-iron)"
          }} />
          {[
            { title: "Reaper escaneó y soltó", time: "ahora · just now",      dot: "ink",    note: "scrumlord pasó por aquí 4 veces en la última hora · 0 acciones tomadas" },
            { title: "Mover a S-05 propuesto", time: "16:42 · today",         dot: "yellow", note: "Eneko: la pieza no llega antes de las 06:42 de mañana" },
            { title: "Emergencia · break-glass",time:"15:42 · today",          dot: "red",    note: "Eneko marcó p0 + emergencia. Activado canal de cliente." },
            { title: "Asignado a Maite",       time: "15:14 · today",         dot: "yellow", note: "Auto-asignación por carga: 2 tickets de bogies activos" },
            { title: "Creado por cliente",     time: "15:14 · today",         dot: "ink",    note: "Wile E. Coyote via widget · portal=mantenedor" },
            { title: "Sensor falló en runtime",time: "06:43 · hoy",            dot: "red",    note: "Bogie 14 reportó 0N · primer occurrence en logs upstream" },
          ].map((e, i) => (
            <div key={i} style={{ position: "relative", paddingBottom: 16 }}>
              <span style={{
                position: "absolute", left: -22, top: 4,
                width: 14, height: 14,
                background: e.dot === "red" ? "var(--eg-red)" : e.dot === "yellow" ? "var(--eg-yellow)" : "var(--eg-paper)",
                border: "2px solid var(--eg-iron)"
              }} />
              <div className="disp" style={{ fontSize: 14, color: "var(--eg-iron)", lineHeight: 1.1 }}>{e.title.toUpperCase()}</div>
              <div className="mono" style={{ fontSize: 10, color: "var(--eg-fg-3)", letterSpacing: "0.12em", textTransform: "uppercase", marginTop: 2 }}>// {e.time}</div>
              <div style={{ fontSize: 12.5, color: "var(--eg-fg-2)", marginTop: 4, lineHeight: 1.5 }}>{e.note}</div>
            </div>
          ))}
        </div>
      </Spec>
    </Bay>
  );
}

/* ─── 06 Charts: burndown, velocity, gauge ───────────────── */
function ChartsBay() {
  return (
    <Bay num="06" name="GRÁFICOS · CHARTS" en="// SVG · no canvas · timetable feel"
      lede="Burndown como timetable rotated. Velocity como barras pareadas. Gauge para capacity. Sin chart libs, todo SVG inline — la marca exige bordes duros y rellenos planos.">
      <Spec serial="GS-LIB-D11" label="BURNDOWN · S-04 · 14d">
        <Burndown />
      </Spec>

      <Spec serial="GS-LIB-D12" label="VELOCITY · 6 SPRINTS" stage="paper2">
        <VelocityBars />
      </Spec>

      <Spec serial="GS-LIB-D13" label="CAPACITY GAUGE · HALF-DIAL">
        <div style={{ display: "flex", gap: 32 }}>
          <Gauge value={32} max={40} label="Maite Rekalde · esta semana" unit="h / 40h" />
          <Gauge value={47} max={40} label="Jon Ibarguren · esta semana" unit="h / 40h" over />
          <Gauge value={12} max={40} label="Ane Larrazabal · esta semana" unit="h / 40h" />
        </div>
      </Spec>
    </Bay>
  );
}

function Burndown() {
  const W = 640, H = 240, P = 32;
  const days = 14;
  const ideal = Array.from({ length: days + 1 }, (_, i) => 34 - (34 / days) * i);
  const actual = [34, 34, 31, 30, 28, 26, 24, 22, 22, 20, 18, 16, 14, 12, 12];
  const max = 36;
  const xs = i => P + (i / days) * (W - P * 2);
  const ys = v => H - P - (v / max) * (H - P * 2);
  const pathOf = (arr) => arr.map((v, i) => (i === 0 ? "M" : "L") + xs(i).toFixed(1) + " " + ys(v).toFixed(1)).join(" ");
  return (
    <svg viewBox={`0 0 ${W} ${H}`} width="100%" style={{ maxWidth: 720, display: "block", background: "var(--eg-paper)", border: "1.5px solid var(--eg-iron)" }}>
      {/* grid */}
      {[0, 10, 20, 30].map(g => (
        <g key={g}>
          <line x1={P} x2={W - P} y1={ys(g)} y2={ys(g)} stroke="var(--eg-rule)" strokeDasharray="3 4" />
          <text x={P - 6} y={ys(g) + 4} fontFamily="var(--font-mono)" fontSize="10" fill="var(--eg-fg-3)" textAnchor="end" letterSpacing="0.08em">{g}</text>
        </g>
      ))}
      {/* ideal */}
      <path d={pathOf(ideal)} stroke="var(--eg-fg-3)" strokeWidth="1.5" strokeDasharray="4 4" fill="none" />
      {/* actual fill + line */}
      <path d={pathOf(actual) + ` L ${xs(days)} ${ys(0)} L ${xs(0)} ${ys(0)} Z`} fill="var(--eg-yellow)" opacity="0.45" />
      <path d={pathOf(actual)} stroke="var(--eg-iron)" strokeWidth="2.2" fill="none" />
      {actual.map((v, i) => (
        <rect key={i} x={xs(i) - 3} y={ys(v) - 3} width="6" height="6" fill="var(--eg-iron)" />
      ))}
      {/* day labels */}
      {Array.from({ length: days + 1 }, (_, i) => i).filter(i => i % 2 === 0).map(i => (
        <text key={i} x={xs(i)} y={H - 14} fontFamily="var(--font-mono)" fontSize="10" fill="var(--eg-fg-3)" textAnchor="middle" letterSpacing="0.08em">D{i}</text>
      ))}
      {/* legend */}
      <g transform={`translate(${W - 220}, 14)`}>
        <rect x={0} y={0} width={200} height={46} fill="var(--eg-paper)" stroke="var(--eg-iron)" />
        <g transform="translate(10,14)">
          <line x1={0} x2={24} y1={4} y2={4} stroke="var(--eg-fg-3)" strokeWidth="1.5" strokeDasharray="4 4" />
          <text x={32} y={8} fontFamily="var(--font-mono)" fontSize="10" fill="var(--eg-fg-2)" letterSpacing="0.08em">// ideal</text>
        </g>
        <g transform="translate(10,30)">
          <line x1={0} x2={24} y1={4} y2={4} stroke="var(--eg-iron)" strokeWidth="2.2" />
          <text x={32} y={8} fontFamily="var(--font-mono)" fontSize="10" fill="var(--eg-iron)" fontWeight="700" letterSpacing="0.08em">// real · 22 pts arrastre</text>
        </g>
      </g>
    </svg>
  );
}

function VelocityBars() {
  const sprints = [
    { n: "S-01", c: 28, d: 24 },
    { n: "S-02", c: 30, d: 28 },
    { n: "S-03", c: 26, d: 26 },
    { n: "S-04", c: 34, d: 22 },
    { n: "S-05", c: 32, d: null },
    { n: "S-06", c: 30, d: null },
  ];
  const W = 640, H = 220, P = 32, BW = 36;
  const max = 40;
  const xs = i => P + i * ((W - P * 2) / sprints.length) + ((W - P * 2) / sprints.length - BW * 2 - 6) / 2;
  const ys = v => H - P - (v / max) * (H - P * 2);
  return (
    <svg viewBox={`0 0 ${W} ${H}`} width="100%" style={{ maxWidth: 720, display: "block", background: "var(--eg-paper)", border: "1.5px solid var(--eg-iron)" }}>
      {[0, 10, 20, 30, 40].map(g => (
        <g key={g}>
          <line x1={P} x2={W - P} y1={ys(g)} y2={ys(g)} stroke="var(--eg-rule)" strokeDasharray="3 4" />
          <text x={P - 6} y={ys(g) + 4} fontFamily="var(--font-mono)" fontSize="10" fill="var(--eg-fg-3)" textAnchor="end" letterSpacing="0.08em">{g}</text>
        </g>
      ))}
      {sprints.map((s, i) => (
        <g key={s.n}>
          <rect x={xs(i)} y={ys(s.c)} width={BW} height={H - P - ys(s.c)} fill="var(--eg-paper-3)" stroke="var(--eg-iron)" strokeWidth="1.5" />
          {s.d !== null && (
            <rect x={xs(i) + BW + 6} y={ys(s.d)} width={BW} height={H - P - ys(s.d)}
              fill={s.d >= s.c ? "var(--eg-green)" : "var(--eg-yellow)"} stroke="var(--eg-iron)" strokeWidth="1.5" />
          )}
          {s.d === null && (
            <rect x={xs(i) + BW + 6} y={H - P - 6} width={BW} height={6} fill="repeating-linear-gradient(-45deg, var(--eg-yellow) 0 6px, var(--eg-iron) 6px 12px)" stroke="var(--eg-iron)" strokeWidth="1.5" />
          )}
          <text x={xs(i) + BW + 3} y={H - 14} fontFamily="var(--font-mono)" fontSize="10" fontWeight="700" fill="var(--eg-iron)" textAnchor="middle" letterSpacing="0.08em">{s.n}</text>
          {/* values atop */}
          <text x={xs(i) + BW / 2} y={ys(s.c) - 4} fontFamily="var(--font-mono)" fontSize="9" fill="var(--eg-fg-3)" textAnchor="middle">{s.c}</text>
          {s.d !== null && <text x={xs(i) + BW + 6 + BW / 2} y={ys(s.d) - 4} fontFamily="var(--font-mono)" fontSize="9" fill="var(--eg-iron)" fontWeight="700" textAnchor="middle">{s.d}</text>}
        </g>
      ))}
      {/* legend */}
      <g transform={`translate(${W - 280}, 14)`}>
        <rect x={0} y={0} width={260} height={28} fill="var(--eg-paper)" stroke="var(--eg-iron)" />
        <rect x={10} y={9} width={14} height={10} fill="var(--eg-paper-3)" stroke="var(--eg-iron)" />
        <text x={30} y={18} fontFamily="var(--font-mono)" fontSize="10" fill="var(--eg-fg-2)" letterSpacing="0.06em">// committed</text>
        <rect x={120} y={9} width={14} height={10} fill="var(--eg-yellow)" stroke="var(--eg-iron)" />
        <text x={140} y={18} fontFamily="var(--font-mono)" fontSize="10" fill="var(--eg-iron)" fontWeight="700" letterSpacing="0.06em">// completed</text>
      </g>
    </svg>
  );
}

function Gauge({ value, max, label, unit, over }) {
  const W = 160, H = 100;
  const cx = W / 2, cy = H - 10, r = 70;
  const pct = Math.min(1, value / max);
  const angle = Math.PI - Math.PI * pct;
  const x = cx + r * Math.cos(angle);
  const y = cy - r * Math.sin(angle);
  const ax = cx + (r - 12) * Math.cos(angle);
  const ay = cy - (r - 12) * Math.sin(angle);
  return (
    <div style={{ textAlign: "center", flex: 1 }}>
      <svg viewBox={`0 0 ${W} ${H}`} width={W} height={H}>
        {/* outer arc */}
        <path d={`M ${cx - r} ${cy} A ${r} ${r} 0 0 1 ${cx + r} ${cy}`} fill="none" stroke="var(--eg-iron)" strokeWidth="2" />
        {/* fill arc (always full but masked by stroke-dasharray) */}
        <path d={`M ${cx - r + 8} ${cy} A ${r - 8} ${r - 8} 0 0 1 ${x} ${y}`}
          fill="none"
          stroke={over ? "var(--eg-red)" : pct > 0.75 ? "var(--eg-yellow)" : "var(--eg-green)"}
          strokeWidth="14"
        />
        {/* ticks */}
        {[0, 0.25, 0.5, 0.75, 1].map(t => {
          const a = Math.PI - Math.PI * t;
          const x1 = cx + r * Math.cos(a), y1 = cy - r * Math.sin(a);
          const x2 = cx + (r + 6) * Math.cos(a), y2 = cy - (r + 6) * Math.sin(a);
          return <line key={t} x1={x1} y1={y1} x2={x2} y2={y2} stroke="var(--eg-iron)" strokeWidth="1.5" />;
        })}
        {/* needle */}
        <line x1={cx} y1={cy} x2={ax} y2={ay} stroke="var(--eg-iron)" strokeWidth="3" />
        <rect x={cx - 4} y={cy - 4} width="8" height="8" fill="var(--eg-iron)" />
        <text x={cx} y={cy - 28} fontFamily="var(--font-display)" fontSize="22" fontWeight="800" fill={over ? "var(--eg-red)" : "var(--eg-iron)"} textAnchor="middle">{value}h</text>
      </svg>
      <div className="mono" style={{ fontSize: 10, color: "var(--eg-fg-3)", letterSpacing: "0.12em", textTransform: "uppercase", marginTop: -4 }}>// {label}</div>
      <div className="mono" style={{ fontSize: 11, color: over ? "var(--eg-red)" : "var(--eg-iron)", letterSpacing: "0.06em", fontWeight: 700 }}>{value} {unit} {over && "· OVER"}</div>
    </div>
  );
}

Object.assign(window, { DataSection });
