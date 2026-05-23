/* gira-scrumlord — Project Summary (time + money + 🌀 velocity) */

function SummaryScreen() {
  return (
    <div className="body">
      <Subbar
        tabs={[
          { es: "Tablero",    en: "Board",   count: 14 },
          { es: "Pendientes", en: "Backlog", count: 31 },
          { es: "Sprints",    en: "Sprints", count: 3 },
          { es: "Informes",   en: "Reports", active: true },
        ]}
        right={
          <>
            <span className="f-pill">RANGO <b>S-08 → S-13</b> <span className="x">▾</span></span>
            <span className="f-pill">MONEDA <b>EUR</b> <span className="x">▾</span></span>
            <button className="b-btn">↓ CSV</button>
            <button className="b-btn b-btn--ink">Exportar PDF</button>
          </>
        }
      />

      <div style={{ flex: 1, overflow: "auto", padding: "18px 22px", background: "var(--eg-paper)" }}>
        {/* Section title */}
        <div style={{
          display: "grid", gridTemplateColumns: "1fr auto auto", gap: 24, alignItems: "end",
          borderBottom: "2px solid var(--eg-iron)", paddingBottom: 8, marginBottom: 14
        }}>
          <div>
            <h1 className="disp" style={{
              fontSize: 56, lineHeight: 0.9, color: "var(--eg-iron)",
              margin: 0, fontWeight: 900, letterSpacing: "-0.02em"
            }}>
              MTNR · Resumen del Proyecto
            </h1>
            <div className="mono" style={{ fontSize: 11, color: "var(--eg-fg-3)", letterSpacing: "0.14em", marginTop: 4, textTransform: "uppercase" }}>
              — PROJECT SUMMARY —
            </div>
          </div>
          <div className="mono" style={{ fontSize: 10, color: "var(--eg-fg-3)", letterSpacing: "0.12em", textAlign: "right" }}>
            CLIENTE · MANTENEDOR SL<br />
            MONEDA · EUR · EN VIVO
          </div>
          <span className="plate plate--yellow">M1 · CORE</span>
        </div>

        {/* Stat tiles row */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 0, border: "2px solid var(--eg-iron)", background: "var(--eg-paper)", marginBottom: 18 }}>
          <BigStat
            labelEs="tickets abiertos"
            labelEn="open issues"
            value="27"
            sub="14 en curso · 6 en revisión"
            color="paper"
          />
          <BigStat
            labelEs="tiempo · últimos 14 días"
            labelEn="time · last 14 days"
            value="247"
            unit="h"
            sub="184 facturables · 75%"
            color="paper-2"
          />
          <BigStat
            labelEs="devengado · en vivo"
            labelEn="accrued · live"
            value="28.405"
            prefix="EUR "
            decimal=",00"
            sub="@ 115,00 €/h proyecto"
            color="yellow"
          />
          <BigStat
            labelEs={<><SpinGlyph /> velocidad</>}
            labelEn="velocity"
            value="19,4"
            unit="pts/sp"
            sub="últimos 5 sprints · 91% commit"
            color="ink"
          />
        </div>

        {/* Velocity chart + cost breakdown */}
        <div style={{ display: "grid", gridTemplateColumns: "1.4fr 1fr", gap: 16, marginBottom: 18 }}>
          <VelocityChart />
          <CostByPerson />
        </div>

        {/* Time table + Money table */}
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
          <TimeBreakdown />
          <BillingBreakdown />
        </div>
      </div>
    </div>
  );
}

function BigStat({ labelEs, labelEn, label, value, unit, prefix, decimal, sub, color }) {
  const bg = { paper: "var(--eg-paper)", "paper-2": "var(--eg-paper-2)", yellow: "var(--eg-yellow)", ink: "var(--eg-iron)" }[color];
  const fg = color === "ink" ? "var(--eg-yellow)" : "var(--eg-iron)";
  const subColor = color === "ink" ? "var(--eg-fg-5)" : "var(--eg-fg-3)";
  return (
    <div style={{
      padding: "16px 18px 14px", background: bg, color: fg,
      borderRight: "1.5px solid var(--eg-iron)", position: "relative"
    }}>
      <div className="caps" style={{ color: subColor }}>// {labelEs || label}{labelEn ? " · " + labelEn : ""}</div>
      <div className="disp" style={{ fontSize: 56, lineHeight: 1, marginTop: 6, fontWeight: 900, letterSpacing: "-0.02em" }}>
        {prefix && <span style={{ fontSize: 22, marginRight: 4, color: subColor }}>{prefix}</span>}
        {value}
        {decimal && <span style={{ fontSize: 22, color: subColor }}>{decimal}</span>}
        {unit && <span style={{ fontSize: 16, marginLeft: 6, color: subColor, textTransform: "uppercase" }}>{unit}</span>}
      </div>
      <div className="mono" style={{ fontSize: 10.5, letterSpacing: "0.08em", textTransform: "uppercase", color: subColor, marginTop: 6 }}>
        {sub}
      </div>
    </div>
  );
}

function VelocityChart() {
  const max = 28;
  const data = VELOCITY_HISTORY;
  const w = 480, h = 240, pad = 28;
  const bw = (w - pad * 2) / data.length;
  const barW = bw * 0.36;

  return (
    <section style={{ border: "2px solid var(--eg-iron)", background: "var(--eg-paper)" }}>
      <div className="tag-head" style={{ background: "var(--eg-iron)", color: "var(--eg-yellow)", borderColor: "var(--eg-iron)", padding: "8px 14px" }}>
        <span style={{ display: "flex", alignItems: "center", gap: 6 }}>
          <SpinGlyph /> VELOCIDAD · VELOCITY · ÚLTIMOS 6 SPRINTS
        </span>
        <span>COMPROMETIDO / COMPLETADO · PUNTOS</span>
      </div>
      <div style={{ padding: "16px 14px 8px" }}>
        <svg width="100%" viewBox={`0 0 ${w} ${h+44}`} style={{ display: "block" }}>
          {/* gridlines */}
          {[0, 7, 14, 21, 28].map((v, i) => (
            <g key={i}>
              <line x1={pad} x2={w - pad} y1={h - (v/max)*h + 8} y2={h - (v/max)*h + 8} stroke="var(--eg-rule)" strokeDasharray="2 4" />
              <text x={pad - 8} y={h - (v/max)*h + 12} textAnchor="end" fontFamily="var(--font-mono)" fontSize="10" fill="var(--eg-fg-3)">{v}</text>
            </g>
          ))}
          {data.map((d, i) => {
            const cx = pad + i*bw + bw/2;
            const ch = (d.committed/max) * h;
            const dh = (d.completed/max) * h;
            return (
              <g key={i}>
                {/* committed (background, hatched) */}
                <rect
                  x={cx - barW}
                  y={h - ch + 8}
                  width={barW * 2}
                  height={ch}
                  fill="none"
                  stroke="var(--eg-iron)"
                  strokeWidth="1.5"
                />
                <rect
                  x={cx - barW + 1}
                  y={h - ch + 9}
                  width={barW * 2 - 2}
                  height={ch - 2}
                  fill="url(#hatch)"
                />
                {/* completed (filled, yellow or red if under) */}
                <rect
                  x={cx - barW * 0.65}
                  y={h - dh + 8}
                  width={barW * 1.3}
                  height={dh}
                  fill={d.partial ? "var(--eg-yellow)" : d.completed >= d.committed ? "var(--eg-green)" : d.completed/d.committed < 0.85 ? "var(--eg-red)" : "var(--eg-yellow)"}
                  stroke="var(--eg-iron)"
                  strokeWidth="1.5"
                />
                <text x={cx} y={h + 22} textAnchor="middle" fontFamily="var(--font-mono)" fontSize="10" fill="var(--eg-fg-3)" letterSpacing="0.08em">{d.sprint}</text>
                <text x={cx} y={h - dh + 2} textAnchor="middle" fontFamily="var(--font-display)" fontWeight="800" fontSize="13" fill="var(--eg-iron)">{d.completed}</text>
                {d.partial && (
                  <text x={cx} y={h + 36} textAnchor="middle" fontFamily="var(--font-mono)" fontSize="9" fill="var(--eg-fg-3)" letterSpacing="0.08em">DAY 6 / 10</text>
                )}
              </g>
            );
          })}
          <defs>
            <pattern id="hatch" patternUnits="userSpaceOnUse" width="6" height="6" patternTransform="rotate(45)">
              <line x1="0" y1="0" x2="0" y2="6" stroke="var(--eg-rule)" strokeWidth="1.5"/>
            </pattern>
          </defs>
          {/* axis */}
          <line x1={pad} x2={w-pad} y1={h+8} y2={h+8} stroke="var(--eg-iron)" strokeWidth="1.5" />
        </svg>
        <div style={{ display: "flex", gap: 18, padding: "8px 14px 4px", fontFamily: "var(--font-mono)", fontSize: 10, color: "var(--eg-fg-3)", letterSpacing: "0.08em", textTransform: "uppercase" }}>
          <span><span style={{ display: "inline-block", width: 10, height: 10, border: "1.5px solid var(--eg-iron)", background: "url(#hatch)", verticalAlign: "middle", marginRight: 4 }} />Comprometido</span>
          <span><span style={{ display: "inline-block", width: 10, height: 10, background: "var(--eg-green)", border: "1.5px solid var(--eg-iron)", verticalAlign: "middle", marginRight: 4 }} />Completado</span>
          <span><span style={{ display: "inline-block", width: 10, height: 10, background: "var(--eg-red)", border: "1.5px solid var(--eg-iron)", verticalAlign: "middle", marginRight: 4 }} />Por debajo</span>
          <span style={{ marginLeft: "auto", color: "var(--eg-iron)", fontWeight: 700 }}>MEDIA · 19,4 pts/sprint · σ 4,1</span>
        </div>
      </div>
    </section>
  );
}

function CostByPerson() {
  const rows = [
    { who: "Maite Rekalde",   ini: "MR", hue: "yellow", h: 84, bill: 76, cents: 874000 },
    { who: "Jon Ibarguren",   ini: "JI", hue: "gold",   h: 62, bill: 58, cents: 667000 },
    { who: "Eneko Garrido",   ini: "EG", hue: "ink",    h: 48, bill: 32, cents: 368000 },
    { who: "Ane Larrazabal",  ini: "AL", hue: "green",  h: 53, bill: 38, cents: 437000 },
  ];
  const max = Math.max(...rows.map(r => r.cents));

  return (
    <section style={{ border: "2px solid var(--eg-iron)", background: "var(--eg-paper)" }}>
      <div className="tag-head" style={{ background: "var(--eg-iron)", color: "var(--eg-yellow)", borderColor: "var(--eg-iron)", padding: "8px 14px" }}>
        <span>// DEVENGADO · ACCRUED · POR PERSONA</span>
        <span>S-08 → S-13 · EUR</span>
      </div>
      <div style={{ padding: 12 }}>
        {rows.map((r, i) => (
          <div key={i} style={{
            display: "grid", gridTemplateColumns: "auto 1fr auto", gap: 10,
            alignItems: "center", padding: "10px 4px",
            borderBottom: i < 3 ? "1px dashed var(--eg-rule)" : "none"
          }}>
            <span className={"avatar avatar--lg avatar--" + r.hue}>{r.ini}</span>
            <div>
              <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 4 }}>
                <span style={{ color: "var(--eg-iron)", fontWeight: 500 }}>{r.who}</span>
                <span className="mono" style={{ fontSize: 11, color: "var(--eg-fg-3)" }}>{r.h}h · {r.bill}h facturable</span>
              </div>
              <div style={{ height: 8, background: "var(--eg-paper-3)", border: "1px solid var(--eg-iron)" }}>
                <div style={{ width: `${(r.cents/max)*100}%`, height: "100%", background: "var(--eg-yellow)" }} />
              </div>
            </div>
            <span className="disp" style={{ fontSize: 18, color: "var(--eg-iron)", minWidth: 96, textAlign: "right" }}>
              {(r.cents/100).toLocaleString("es-ES")},<span style={{ fontSize: 11, color: "var(--eg-fg-3)" }}>00</span>
            </span>
          </div>
        ))}
      </div>
    </section>
  );
}

function TimeBreakdown() {
  const rows = [
    { type: "story", labelEs: "Historias", labelEn: "Stories", h: 142, pct: 57, color: "green" },
    { type: "bug",   labelEs: "Bugs",      labelEn: "Bugs",    h: 56,  pct: 23, color: "red"   },
    { type: "task",  labelEs: "Tareas",    labelEn: "Tasks",   h: 36,  pct: 15, color: "paper-3" },
    { type: "epic",  labelEs: "Épicas",    labelEn: "Epics",   h: 13,  pct: 5,  color: "ink"   },
  ];
  return (
    <section style={{ border: "2px solid var(--eg-iron)", background: "var(--eg-paper)" }}>
      <div className="tag-head" style={{ background: "var(--eg-paper-2)", padding: "8px 14px" }}>
        <span>// TIEMPO · TIME · POR TIPO DE TICKET</span>
        <span>247 H TOTAL</span>
      </div>
      <div style={{ padding: 14 }}>
        <div style={{ display: "flex", height: 24, border: "1.5px solid var(--eg-iron)", marginBottom: 12 }}>
          {rows.map((r, i) => (
            <div key={i} style={{
              width: `${r.pct}%`,
              background: {
                green: "var(--eg-green)", red: "var(--eg-red)",
                "paper-3": "var(--eg-paper-3)", ink: "var(--eg-iron)"
              }[r.color],
              borderRight: i < rows.length - 1 ? "1.5px solid var(--eg-iron)" : "none",
              position: "relative"
            }}>
              {r.pct >= 12 && <span style={{
                position: "absolute", inset: 0, display: "flex", alignItems: "center", justifyContent: "center",
                fontFamily: "var(--font-mono)", fontSize: 11, fontWeight: 700,
                color: ["green","red","ink"].includes(r.color) ? "var(--eg-paper)" : "var(--eg-iron)"
              }}>{r.pct}%</span>}
            </div>
          ))}
        </div>
        {rows.map((r, i) => (
          <div key={i} style={{
            display: "grid", gridTemplateColumns: "20px 1fr auto auto", gap: 10,
            alignItems: "center", padding: "6px 0", borderBottom: i < 3 ? "1px dashed var(--eg-rule)" : "none",
            fontSize: 13
          }}>
            <span className={"type-chip type-" + r.type}>{r.type[0].toUpperCase()}</span>
            <span style={{ color: "var(--eg-iron)" }}>{r.labelEs} · <span style={{ color: "var(--eg-fg-3)" }}>{r.labelEn}</span></span>
            <span className="mono" style={{ fontSize: 11, color: "var(--eg-fg-3)" }}>{r.pct}%</span>
            <span className="mono" style={{ fontSize: 12, color: "var(--eg-iron)", fontWeight: 600, minWidth: 50, textAlign: "right" }}>{r.h} h</span>
          </div>
        ))}
      </div>
    </section>
  );
}

function BillingBreakdown() {
  const rows = [
    { issue: "MTNR-42", title: "Brake-test DST",       titleEs: "DST pruebas freno",   mode: "hourly", h: 4.5, cents:  51750, em: true },
    { issue: "MTNR-39", title: "Manifest export",     titleEs: "Export manifiestos",  mode: "hourly", h: 3.7, cents:  42550 },
    { issue: "MTNR-21", title: "Sleeper dashboard",   titleEs: "Panel coches-cama",   mode: "hourly", h: 4.0, cents:  46000 },
    { issue: "MTNR-37", title: "Weight report",       titleEs: "Informe de peso",     mode: "hourly", h: 2.0, cents:  23000 },
    { issue: "ANVL-1",  title: "Order pipeline v1",   titleEs: "Pipeline pedidos v1", mode: "fixed",  h: 0,   cents:4500000 },
  ];
  return (
    <section style={{ border: "2px solid var(--eg-iron)", background: "var(--eg-paper)" }}>
      <div className="tag-head" style={{ background: "var(--eg-yellow)", padding: "8px 14px", borderColor: "var(--eg-iron)" }}>
        <span>// DEVENGADO · ACCRUED · POR TICKET · TOP 5</span>
        <span>RESOLVE-ON-READ · M5 HARÁ SNAPSHOT</span>
      </div>
      <div>
        {rows.map((r, i) => (
          <div key={i} style={{
            display: "grid", gridTemplateColumns: "70px 1fr auto auto auto", gap: 10,
            alignItems: "center", padding: "10px 14px",
            borderBottom: i < rows.length - 1 ? "1px dashed var(--eg-rule)" : "none",
            background: r.em ? "var(--eg-red-soft)" : "transparent",
            fontSize: 13
          }}>
            <span className="mono" style={{ fontWeight: 700, fontSize: 11 }}>{r.issue}</span>
            <span style={{ color: "var(--eg-iron)" }}>{r.titleEs} <span style={{ color: "var(--eg-fg-3)" }}>· {r.title}</span></span>
            {r.mode === "fixed"
              ? <span className="plate" style={{ background: "var(--eg-iron)", color: "var(--eg-yellow)" }}>FIJO</span>
              : <span className="mono" style={{ fontSize: 11, color: "var(--eg-fg-3)" }}>{r.h.toFixed(1)}h</span>}
            <span className="mono" style={{ fontSize: 11, color: "var(--eg-fg-3)" }}>
              {r.mode === "fixed" ? "—" : "× 115,00"}
            </span>
            <span className="disp" style={{ fontSize: 18, color: "var(--eg-iron)", minWidth: 110, textAlign: "right" }}>
              {(r.cents/100).toLocaleString("es-ES")},<span style={{ fontSize: 11, color: "var(--eg-fg-3)" }}>00</span>
            </span>
          </div>
        ))}
      </div>
    </section>
  );
}

window.SummaryScreen = SummaryScreen;
