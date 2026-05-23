/* DEPÓSITO · VIII · Lore · easter eggs
   La regla del lore: vive en código, vive en tooltips, vive en
   consola — nunca en la UI principal. Si un cliente nuevo abre
   la app, no entiende ni una palabra rara hasta que pasea el
   ratón por encima de las placas raras. */

function LoreSection() {
  return (
    <Sect
      id="lore"
      num="VIII"
      eyebrow="lore · in-code easter eggs · 5 bays"
      titleEs="LORE."
      titleEn="Named modules. Named jokes."
      meta={<>SERIE · GS-LIB-L<br /><b>5 piezas</b> · todas opt-in<br />nunca en la ruta crítica</>}
      intro="El producto se llama gira-scrumlord. El daemon que cierra sprints se llama scrumlord. El audit log se llama sauron y vive en :666. Hay un Velociraptor en la documentación. Estas piezas dejan el chiste contado sin gritarlo."
    >
      <SauronRowBay />
      <ScrumlordMiniBay />
      <VelociraptorBay />
      <BoardingPassBay />
      <StampBay />
      <FooterBay />
    </Sect>
  );
}

/* ─── 01 Sauron row ──────────────────────────────────────── */
function SauronRowBay() {
  return (
    <Bay num="01" name="SAURON ROW" en="// :666 audit entry"
      lede="El log de auditoría vive en :666 (sí, ese :666). El nombre es interno — la UI lo etiqueta como 'Auditoría'. Sauron no juzga: registra. No edita: lee.">
      <Spec serial="GS-LIB-L01" label="SAURON · 6 ENTRIES · 1 ALERT" stage="ink"
        when="Pantalla de Auditoría · /audit · port :666."
        dont="Sauron NUNCA emite acciones. Nunca. Es lectura pura. Si añades una pieza de UI que dice 'sauron hizo X', es scrumlord disfrazado.">
        <div>
          <div style={{
            background: "var(--eg-iron-2)", padding: "10px 16px",
            borderBottom: "2px solid var(--eg-yellow)",
            display: "flex", alignItems: "center", gap: 14
          }}>
            <span style={{ width: 14, height: 14, background: "var(--eg-red)", borderRadius: "50%", animation: "blink 1.4s steps(2) infinite", border: "2px solid var(--eg-paper)" }} />
            <span className="plate plate--red" style={{ fontSize: 12 }}>SAURON · :666 · VIGILANDO</span>
            <span className="mono" style={{ fontSize: 11, color: "var(--eg-yellow)", letterSpacing: "0.14em", textTransform: "uppercase", fontWeight: 700 }}>
              // 1208 EVENTOS · 14D · 3 ANOMALÍAS
            </span>
            <span style={{ marginLeft: "auto" }}>
              <button className="b-btn b-btn--yellow" style={{ padding: "4px 10px" }}>Exportar CSV</button>
            </span>
          </div>
          {[
            { ts: "16:42:14", ev: "evt-22918", actor: "u1 · eneko",   action: "issue.update",     target: "MTNR-42",    note: "priority: urgent → emergency",            tone: "red" },
            { ts: "16:42:08", ev: "evt-22917", actor: "u2 · maite",   action: "timer.start",      target: "MTNR-42",    note: "billable=true · rate=€65/h" },
            { ts: "16:18:01", ev: "evt-22916", actor: "scrumlord · pgboss", action: "velocity.snapshot", target: "S-04", note: "committed=34 completed=22 carry=12",      tone: "yellow" },
            { ts: "16:18:00", ev: "evt-22915", actor: "scrumlord · pgboss", action: "sprint.autoclose",  target: "S-04", note: "auto · no manual close issued" },
            { ts: "14:09:22", ev: "evt-22914", actor: "u1 · eneko",   action: "export.timesheet", target: "—",          note: "1208 rows · csv · last-90d",              tone: "red", anomaly: true },
            { ts: "13:51:00", ev: "evt-22913", actor: "u5 · wile-c",  action: "auth.fail",        target: "/login",     note: "third attempt · 60s window",              tone: "red", anomaly: true },
          ].map((r, i) => (
            <div key={r.ev} style={{
              display: "grid", gridTemplateColumns: "92px 92px 160px 200px 100px 1fr",
              gap: 14, padding: "8px 16px",
              borderBottom: i < 5 ? "1px dashed var(--eg-iron-3)" : 0,
              fontFamily: "var(--font-mono)", fontSize: 11, color: "var(--eg-paper)",
              background: r.anomaly ? "rgba(217, 33, 30, 0.12)" : "transparent"
            }}>
              <span style={{ color: "var(--eg-fg-5)" }}>{r.ts}</span>
              <span style={{ color: "var(--eg-fg-5)", letterSpacing: "0.04em" }}>{r.ev}</span>
              <span style={{ color: "var(--eg-yellow)", fontWeight: 600 }}>{r.actor}</span>
              <span style={{
                color: r.tone === "red" ? "var(--eg-red)" : r.tone === "yellow" ? "var(--eg-yellow)" : "var(--eg-paper)",
                fontWeight: 700, letterSpacing: "0.04em"
              }}>{r.action}</span>
              <span style={{ color: "var(--eg-paper)", fontWeight: 700 }}>{r.target}</span>
              <span style={{ color: "var(--eg-fg-5)" }}>// {r.note}{r.anomaly && <span style={{ marginLeft: 8, color: "var(--eg-red)", fontWeight: 700 }}>▲ ANOMALÍA</span>}</span>
            </div>
          ))}
          <div style={{ padding: "10px 16px", borderTop: "2px solid var(--eg-iron-3)", display: "flex", justifyContent: "space-between", alignItems: "center", background: "var(--eg-iron-2)" }}>
            <span className="mono" style={{ fontSize: 10, color: "var(--eg-fg-5)", letterSpacing: "0.12em", textTransform: "uppercase" }}>
              // immutable · append-only · sha256 chain · last hash: 8c1f…4a2e
            </span>
            <span className="mono" style={{ fontSize: 10, color: "var(--eg-yellow)", letterSpacing: "0.12em", textTransform: "uppercase", fontWeight: 700 }}>
              // se ve todo · ve nada
            </span>
          </div>
        </div>
      </Spec>
    </Bay>
  );
}

/* ─── 02 Scrumlord mini ──────────────────────────────────── */
function ScrumlordMiniBay() {
  return (
    <Bay num="02" name="SCRUMLORD MINI" en="// pg-boss worker peek"
      lede="Card pequeña que mete una mirada al daemon en cualquier dashboard. Lista los jobs, sus duraciones, el último ack, y un log mini.">
      <Spec serial="GS-LIB-L02" label="SCRUMLORD MINI · WIDGET">
        <div style={{
          width: 460, background: "var(--eg-iron)", color: "var(--eg-paper)",
          border: "2px solid var(--eg-iron)", boxShadow: "4px 4px 0 var(--eg-yellow)"
        }}>
          <div style={{
            background: "var(--eg-yellow)", color: "var(--eg-iron)",
            padding: "8px 14px", display: "flex", alignItems: "center", gap: 10,
            borderBottom: "2px solid var(--eg-iron)"
          }}>
            <span className="plate" style={{ background: "var(--eg-iron)", color: "var(--eg-yellow)", fontSize: 10 }}>apps/scrumlord</span>
            <span className="disp" style={{ fontSize: 16, color: "var(--eg-iron)", letterSpacing: "0.01em" }}>SCRUMLORD · DAEMON</span>
            <span style={{ marginLeft: "auto", display: "flex", alignItems: "center", gap: 5 }}>
              <span style={{ width: 8, height: 8, background: "var(--eg-green)", borderRadius: "50%", border: "1px solid var(--eg-iron)" }} />
              <span className="mono" style={{ fontSize: 10, fontWeight: 700, letterSpacing: "0.1em", color: "var(--eg-iron)" }}>RUN · 14d 03:18</span>
            </span>
          </div>
          <div>
            {[
              { n: "sprint.autoclose", e: "cada 5min", last: "16:18:00", ok: true },
              { n: "timer.reap",       e: "cada 1min", last: "16:42:08", ok: true, c: 1 },
              { n: "outbox.dispatch",  e: "cada 30s",  last: "16:42:14", ok: true, c: 3 },
              { n: "velocity.snapshot",e: "al cierre", last: "16:18:01", ok: true },
            ].map((j, i, arr) => (
              <div key={j.n} style={{
                display: "grid", gridTemplateColumns: "1fr 80px 80px 30px",
                gap: 12, padding: "8px 14px",
                borderBottom: i < arr.length - 1 ? "1px solid var(--eg-iron-2)" : 0,
                fontFamily: "var(--font-mono)", fontSize: 11
              }}>
                <span style={{ color: "var(--eg-yellow)", fontWeight: 700 }}>{j.n}</span>
                <span style={{ color: "var(--eg-fg-5)" }}>// {j.e}</span>
                <span style={{ color: "var(--eg-paper)" }}>{j.last}</span>
                <span style={{
                  textAlign: "center", color: "var(--eg-iron)",
                  background: "var(--eg-yellow)", fontWeight: 700, fontSize: 10
                }}>{j.c || "·"}</span>
              </div>
            ))}
          </div>
          <pre style={{
            background: "var(--eg-iron-2)", border: 0,
            color: "var(--eg-paper)", padding: "8px 14px",
            margin: 0, fontSize: 10, lineHeight: 1.6,
            borderLeft: "4px solid var(--eg-yellow)",
            borderTop: "1px dashed var(--eg-iron-3)"
          }}>
{`16:42:14 outbox.dispatch  · vaciados 3 eventos       · ok 30ms
16:42:08 timer.reap        · escaneados 14 timers     · 0 reaped
16:42:00 sprint.autoclose  · escaneados 8 sprints     · 0 closed
16:39:08 timer.reap        · escaneados 14 timers     · 1 reaped (T-8814)`}
          </pre>
          <div style={{ padding: "6px 14px", display: "flex", justifyContent: "space-between", background: "var(--eg-iron-2)", borderTop: "1px dashed var(--eg-iron-3)" }}>
            <span className="mono" style={{ fontSize: 9.5, color: "var(--eg-fg-5)", letterSpacing: "0.1em", textTransform: "uppercase" }}>// pg-boss · pid 8814 · pg 3/31</span>
            <a href="#" className="mono" style={{ fontSize: 9.5, color: "var(--eg-yellow)", letterSpacing: "0.1em", textTransform: "uppercase" }}>ver detalle →</a>
          </div>
        </div>
      </Spec>
    </Bay>
  );
}

/* ─── 03 Velociraptor note ──────────────────────────────── */
function VelociraptorBay() {
  return (
    <Bay num="03" name="VELOCIRAPTOR NOTE" en="// the doc voice"
      lede="Algunos documentos de M4 tienen un personaje — el Velociraptor — que aparece en notas marginales con observaciones afiladas. La marca le da un componente: un sticker amarillo con texto stencil, anclado a la izquierda del párrafo.">
      <Spec serial="GS-LIB-L03" label="VELOCIRAPTOR · SIDE-NOTE">
        <div style={{ position: "relative", padding: "0 0 0 96px", maxWidth: 720 }}>
          <div style={{
            position: "absolute", left: 0, top: 0,
            width: 78, padding: "8px 8px 10px",
            background: "var(--eg-yellow)", border: "2px solid var(--eg-iron)",
            boxShadow: "2px 2px 0 var(--eg-iron)",
            transform: "rotate(-3deg)"
          }}>
            <div style={{
              fontFamily: "var(--font-stencil)", fontWeight: 900, fontSize: 32,
              color: "var(--eg-iron)", lineHeight: 0.85, letterSpacing: "0.02em",
              textAlign: "center"
            }}>VRPT</div>
            <div className="mono" style={{ fontSize: 8, color: "var(--eg-iron)", letterSpacing: "0.12em", textTransform: "uppercase", textAlign: "center", marginTop: 2, fontWeight: 700 }}>
              // velociraptor
            </div>
          </div>
          <div style={{
            border: "1.5px solid var(--eg-iron)", padding: "12px 14px",
            background: "var(--eg-paper)", boxShadow: "2px 2px 0 var(--eg-iron)"
          }}>
            <div className="caps" style={{ marginBottom: 6 }}>// nota marginal · margin note · M4 ADAPTERS</div>
            <p style={{ margin: 0, fontSize: 13, lineHeight: 1.55, color: "var(--eg-iron)" }}>
              <i>“Los adapters de M4 funcionan por accidente. Cuando rompan, no escribas otra capa de abstracción — escribe un test que falle, y deja que el daemon te diga qué cambió.”</i>
            </p>
            <div className="mono" style={{ marginTop: 8, fontSize: 10, color: "var(--eg-fg-3)", letterSpacing: "0.1em", textTransform: "uppercase" }}>
              // posted by velociraptor · 2026-05-14 · #M4 #adapters #chaos
            </div>
          </div>
        </div>
      </Spec>
    </Bay>
  );
}

/* ─── 04 Boarding pass ──────────────────────────────────── */
function BoardingPassBay() {
  return (
    <Bay num="04" name="BOARDING PASS · TICKET" en="// passport-stamp lockup"
      lede="Visualización completa de un ticket como pase de embarque. Va en emails de bienvenida, en exports de PDF, y en el splash de un nuevo cliente onboarded. Perforado en la mitad — talón izquierdo se queda contigo, derecho lo sella el mantenedor.">
      <Spec serial="GS-LIB-L04" label="BOARDING PASS · CLIENT ONBOARD" stage="paper2">
        <div style={{
          width: 720, background: "var(--eg-paper)",
          border: "2px solid var(--eg-iron)", boxShadow: "6px 6px 0 var(--eg-iron)",
          display: "grid", gridTemplateColumns: "1fr 14px 1fr"
        }}>
          {/* left talon */}
          <div style={{ padding: "16px 18px", borderRight: "2px dashed var(--eg-iron)" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
              <div>
                <div className="mono" style={{ fontSize: 10, color: "var(--eg-fg-3)", letterSpacing: "0.14em", textTransform: "uppercase" }}>// BOARDING · PASS · 1ª CLASE</div>
                <div className="disp" style={{ fontSize: 32, color: "var(--eg-iron)", lineHeight: 1, marginTop: 4 }}>MANTENEDOR</div>
              </div>
              <span className="plate plate--yellow" style={{ fontSize: 11 }}>EG · CO.</span>
            </div>
            <div style={{ marginTop: 16, display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
              <div>
                <div className="caps">// DE · FROM</div>
                <div className="disp" style={{ fontSize: 22, color: "var(--eg-iron)" }}>BILBO</div>
                <div className="mono" style={{ fontSize: 10, color: "var(--eg-fg-3)", letterSpacing: "0.1em" }}>BILBAO ABANDO 06:42</div>
              </div>
              <div>
                <div className="caps">// A · TO</div>
                <div className="disp" style={{ fontSize: 22, color: "var(--eg-iron)" }}>ACME</div>
                <div className="mono" style={{ fontSize: 10, color: "var(--eg-fg-3)", letterSpacing: "0.1em" }}>DELIVERY 11:18</div>
              </div>
              <div>
                <div className="caps">// PASAJERO · PASSENGER</div>
                <div style={{ fontFamily: "var(--font-display)", fontSize: 16, fontWeight: 700, color: "var(--eg-iron)", letterSpacing: "0.01em" }}>WILE E. COYOTE</div>
              </div>
              <div>
                <div className="caps">// ASIENTO · SEAT</div>
                <div className="disp" style={{ fontSize: 18, color: "var(--eg-iron)" }}>14C</div>
              </div>
            </div>
            <div style={{ marginTop: 16, padding: "8px 0 0", borderTop: "1px dashed var(--eg-iron)", display: "flex", justifyContent: "space-between" }}>
              <span className="mono" style={{ fontSize: 10, color: "var(--eg-fg-3)", letterSpacing: "0.1em", textTransform: "uppercase" }}>// emisor · gira-scrumlord</span>
              <span className="mono" style={{ fontSize: 10, color: "var(--eg-iron)", fontWeight: 700, letterSpacing: "0.1em" }}>2026-05-24 · 16:42</span>
            </div>
          </div>
          {/* perforation column */}
          <div style={{
            backgroundImage: "radial-gradient(circle at 7px 10px, var(--eg-iron) 1.5px, transparent 2px)",
            backgroundSize: "14px 20px"
          }} />
          {/* right stub */}
          <div style={{ padding: "16px 18px", background: "var(--eg-iron)", color: "var(--eg-paper)" }}>
            <div className="mono" style={{ fontSize: 10, color: "var(--eg-yellow)", letterSpacing: "0.14em", textTransform: "uppercase", fontWeight: 700 }}>// TALÓN · STUB · MANTENEDOR</div>
            <div className="disp" style={{ fontSize: 26, color: "var(--eg-yellow)", lineHeight: 1, marginTop: 6 }}>ACME CORP</div>
            <div className="mono" style={{ fontSize: 10, color: "var(--eg-fg-5)", letterSpacing: "0.1em", textTransform: "uppercase" }}>3 PROYECTOS · USD · S-02</div>
            <div style={{ marginTop: 14, padding: 10, border: "1.5px dashed var(--eg-yellow)" }}>
              <div className="mono" style={{ fontSize: 10, color: "var(--eg-yellow)", letterSpacing: "0.1em", textTransform: "uppercase" }}>// codigo · code</div>
              <div className="mono" style={{ fontSize: 16, color: "var(--eg-paper)", fontWeight: 700, letterSpacing: "0.18em" }}>BLB-ACM-14-MTNR</div>
            </div>
            <div style={{ marginTop: 14, fontFamily: "var(--font-stencil)", fontWeight: 900, fontSize: 60, lineHeight: 0.85, color: "var(--eg-yellow)", letterSpacing: "0.04em" }}>
              EG
            </div>
            <div className="mono" style={{ fontSize: 9, color: "var(--eg-fg-5)", letterSpacing: "0.12em", textTransform: "uppercase" }}>
              // riveted · plate · 2026 · gpl-3.0
            </div>
          </div>
        </div>
      </Spec>
    </Bay>
  );
}

/* ─── 05 Departure stamp ────────────────────────────────── */
function StampBay() {
  return (
    <Bay num="05" name="SELLO · DEPARTURE STAMP" en="// circular passport mark"
      lede="Sello redondo. Tipo stencil arqueado en el borde. Va en exports finalizados, en confirmaciones de cierre de sprint, en facturas pagadas. Cuando aparece, es definitivo.">
      <Spec serial="GS-LIB-L05" label="STAMP · 3 ESTADOS" stage="paper2">
        <div style={{ display: "flex", gap: 36, padding: "10px 0", justifyContent: "center" }}>
          <Stamp text="CERRADO · S-04" sub="2026·05·27" color="green" />
          <Stamp text="ENVIADO · INV-2026-S04" sub="ACME · USD" color="ink" />
          <Stamp text="EMERGENCIA · P0" sub="MTNR-42" color="red" />
        </div>
      </Spec>
    </Bay>
  );
}

function Stamp({ text, sub, color }) {
  const palette = {
    green: { fg: "var(--eg-green)", border: "var(--eg-green)" },
    red:   { fg: "var(--eg-red)",   border: "var(--eg-red)" },
    ink:   { fg: "var(--eg-iron)",  border: "var(--eg-iron)" },
  }[color];
  return (
    <div style={{
      width: 180, height: 180, borderRadius: "50%",
      border: `4px double ${palette.border}`,
      display: "flex", alignItems: "center", justifyContent: "center",
      position: "relative",
      transform: "rotate(-8deg)",
      color: palette.fg
    }}>
      <svg viewBox="0 0 200 200" width={180} height={180} style={{ position: "absolute", inset: 0 }}>
        <defs>
          <path id={`circ-${color}`} d="M 100,100 m -76,0 a 76,76 0 1,1 152,0 a 76,76 0 1,1 -152,0" />
        </defs>
        <text fontFamily="var(--font-stencil)" fontWeight="900" fontSize="20" fill={palette.fg} letterSpacing="0.16em">
          <textPath href={`#circ-${color}`} startOffset="2%">GIRA · SCRUMLORD · MANTENEDOR · </textPath>
        </text>
      </svg>
      <div style={{ textAlign: "center", zIndex: 1 }}>
        <div style={{
          fontFamily: "var(--font-stencil)", fontWeight: 900,
          fontSize: 22, lineHeight: 0.95,
          color: palette.fg, letterSpacing: "0.04em",
          textTransform: "uppercase"
        }}>{text}</div>
        <div style={{
          marginTop: 6, height: 0, borderTop: `1.5px solid ${palette.fg}`,
          width: 60, marginInline: "auto"
        }} />
        <div className="mono" style={{ fontSize: 10, color: palette.fg, marginTop: 4, letterSpacing: "0.14em", textTransform: "uppercase", fontWeight: 700 }}>{sub}</div>
      </div>
    </div>
  );
}

/* ─── 06 Hazard footer marquee ──────────────────────────── */
function FooterBay() {
  return (
    <Bay num="06" name="MARQUEE · HAZARD FOOTER" en="// running text · do not glamorise"
      lede="Banda inferior de páginas formales (login, brand book, 404) con texto mono corriendo. Reduce velocidad si prefers-reduced-motion. Lleva versiones, lema, copyright, en el orden técnico exacto.">
      <Spec serial="GS-LIB-L06" label="MARQUEE · INFINITE · 18s" status="LIVE" statusKind="live">
        <div style={{
          background: "var(--eg-iron)", color: "var(--eg-yellow)",
          border: "2px solid var(--eg-iron)",
          overflow: "hidden", position: "relative", height: 36
        }}>
          <div style={{
            display: "flex", alignItems: "center", whiteSpace: "nowrap",
            position: "absolute", top: 0, bottom: 0, left: 0,
            animation: "gs-marquee 18s linear infinite",
            fontFamily: "var(--font-mono)", fontWeight: 700, fontSize: 12,
            letterSpacing: "0.14em", textTransform: "uppercase"
          }}>
            {Array(2).fill(0).map((_, k) => (
              <span key={k} style={{ display: "inline-flex", alignItems: "center" }}>
                <span style={{ padding: "0 18px" }}>// gira-scrumlord · v0.1 · m1 · the honest one</span>
                <span style={{ color: "var(--eg-paper)" }}>·</span>
                <span style={{ padding: "0 18px" }}>// construido · registrado · cobrado</span>
                <span style={{ color: "var(--eg-paper)" }}>·</span>
                <span style={{ padding: "0 18px", color: "var(--eg-red)" }}>// sauron :666 · vigilando</span>
                <span style={{ color: "var(--eg-paper)" }}>·</span>
                <span style={{ padding: "0 18px" }}>// scrumlord · pg-boss · en marcha 14d 03:18</span>
                <span style={{ color: "var(--eg-paper)" }}>·</span>
                <span style={{ padding: "0 18px" }}>// gpl-3.0 · sin telemetría · sin terceros</span>
                <span style={{ color: "var(--eg-paper)" }}>·</span>
                <span style={{ padding: "0 18px", color: "var(--eg-yellow)" }}>// ∞ neurodivergente · mantenedor</span>
                <span style={{ color: "var(--eg-paper)" }}>·</span>
              </span>
            ))}
          </div>
        </div>
      </Spec>

      <Spec serial="GS-LIB-L07" label="FIN · END-PLATE" stage="ink">
        <div style={{ padding: "20px 0", textAlign: "center" }}>
          <div style={{
            fontFamily: "var(--font-stencil)", fontWeight: 900,
            fontSize: 96, color: "var(--eg-yellow)", letterSpacing: "0.04em", lineHeight: 0.9
          }}>FIN DE LÍNEA</div>
          <div className="mono" style={{ fontSize: 12, color: "var(--eg-yellow)", letterSpacing: "0.18em", textTransform: "uppercase", marginTop: 6, fontWeight: 700 }}>// END OF LINE · 8 CHAPTERS · ~120 PIEZAS</div>
          <div className="mono" style={{ fontSize: 11, color: "var(--eg-fg-5)", letterSpacing: "0.14em", textTransform: "uppercase", marginTop: 16 }}>
            // si añades una pieza, dale número, nombre bilingüe, propósito y un "nunca · never".
          </div>
        </div>
      </Spec>
    </Bay>
  );
}

Object.assign(window, { LoreSection });
