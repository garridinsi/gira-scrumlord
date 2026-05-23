/* gira-scrumlord — Issue Drawer */

function IssueDrawer({ issueKey = "MTNR-42" }) {
  const issue = ISSUES.find(i => i.key === issueKey) || ISSUES[0];
  const u = USERS.find(u => u.id === issue.assignee);
  const reporter = USERS.find(u => u.id === "u1");
  const [tab, setTab] = React.useState("details");
  const [timerOn, setTimerOn] = React.useState(true);
  const [elapsed, setElapsed] = React.useState(38 * 60 + 14); // 38:14

  React.useEffect(() => {
    if (!timerOn) return;
    const t = setInterval(() => setElapsed(e => e + 1), 1000);
    return () => clearInterval(t);
  }, [timerOn]);

  const fmtSec = (s) => {
    const h = Math.floor(s / 3600), m = Math.floor((s % 3600) / 60), ss = s % 60;
    return `${String(h).padStart(2,"0")}:${String(m).padStart(2,"0")}:${String(ss).padStart(2,"0")}`;
  };

  const emergency = issue.priority === "emergency";
  const billableMin = Math.round(issue.logged * 0.92);
  const hourly = issue.rate?.hourlyCents || 11500;
  const accrued = issue.mode === "fixed"
    ? issue.fixedPriceCents
    : Math.round(billableMin / 60 * hourly);

  const tabs = [
    { id: "details",  es: "Detalles",     en: "Details" },
    { id: "comments", es: "Comentarios",  en: "Comments", count: 4 },
    { id: "worklogs", es: "Registros",    en: "Worklogs", count: 6 },
    { id: "cost",     es: "Coste",        en: "Cost"    },
    { id: "audit",    es: "Auditoría",    en: "Audit"   },
  ];

  return (
    <div className="body" style={{ position: "relative" }}>
      {/* faded board behind */}
      <div style={{ position: "absolute", inset: 0, opacity: 0.18, pointerEvents: "none", filter: "saturate(0.4)" }}>
        <Subbar tabs={[{es:"Tablero",en:"Board",active:true,count:14},{es:"Pendientes",en:"Backlog",count:31}]} />
        <div style={{ padding: 18, display: "flex", gap: 18 }}>
          {[1,2,3,4,5].map(i => (
            <div key={i} style={{ width: 240, height: 200, border: "1.5px solid var(--eg-iron)", background: "var(--eg-paper-2)" }} />
          ))}
        </div>
      </div>

      {/* drawer */}
      <div style={{
        position: "absolute", top: 0, right: 0, bottom: 0,
        width: 820, background: "var(--eg-paper)",
        borderLeft: "2px solid var(--eg-iron)",
        boxShadow: "-12px 0 0 -8px var(--eg-iron)",
        display: "flex", flexDirection: "column",
        overflow: "hidden"
      }}>
        {/* asset-tag header */}
        <div style={{
          background: emergency ? "var(--eg-red)" : "var(--eg-iron)",
          color: emergency ? "var(--eg-paper)" : "var(--eg-yellow)",
          padding: "10px 18px",
          display: "flex", alignItems: "center", gap: 12,
          fontFamily: "var(--font-mono)", fontSize: 11,
          letterSpacing: "0.14em", textTransform: "uppercase",
          borderBottom: "2px solid var(--eg-iron)"
        }}>
          <span style={{
            background: "var(--eg-yellow)", color: "var(--eg-iron)",
            padding: "3px 8px", fontWeight: 700, letterSpacing: "0.12em"
          }}>{issue.key}</span>
          <span>{issue.type} · creado 14·V·26 · actualizado hace 12 min</span>
          {emergency && (
            <span className="plate" style={{ marginLeft: "auto", background: "var(--eg-paper)", color: "var(--eg-iron)", borderColor: "var(--eg-paper)" }}>!! EMERGENCIA</span>
          )}
          <span style={{ marginLeft: emergency ? 0 : "auto", display: "flex", gap: 8 }}>
            <span style={{ cursor: "pointer" }}>↗ Abrir</span>
            <span style={{ cursor: "pointer" }}>⋯</span>
            <span style={{ cursor: "pointer" }}>✕</span>
          </span>
        </div>

        {/* hazard band on emergency */}
        {emergency && (
          <div style={{
            height: 8,
            background: "repeating-linear-gradient(-45deg, var(--eg-yellow) 0 10px, var(--eg-iron) 10px 20px)"
          }} />
        )}

        <div style={{ display: "grid", gridTemplateColumns: "1fr 280px", flex: 1, overflow: "hidden" }}>
          {/* main */}
          <div style={{ overflow: "auto", padding: "18px 22px", borderRight: "1px solid var(--eg-iron)" }}>
            <div className="caps">// título · title</div>
            <h2 className="disp" style={{
              fontSize: 30, lineHeight: 1.05, color: "var(--eg-iron)",
              margin: "4px 0 14px", textWrap: "balance", fontWeight: 900,
              letterSpacing: "-0.01em"
            }}>
              {issue.title}
            </h2>

            {/* tab bar */}
            <div style={{ display: "flex", borderBottom: "2px solid var(--eg-iron)", marginBottom: 16 }}>
              {tabs.map(t => (
                <div
                  key={t.id}
                  onClick={() => setTab(t.id)}
                  style={{
                    padding: "8px 14px",
                    cursor: "pointer",
                    background: tab === t.id ? "var(--eg-iron)" : "transparent",
                    color: tab === t.id ? "var(--eg-yellow)" : "var(--eg-fg-3)",
                    borderRight: "1px solid var(--eg-iron)",
                    display: "flex", alignItems: "center", gap: 8
                  }}
                >
                  <Bi es={t.es} en={t.en} size="tiny" tone={tab === t.id ? "ink" : ""} style={{
                    fontFamily: "var(--font-display)", fontWeight: 700,
                    fontSize: 13, textTransform: "uppercase", letterSpacing: "0.04em",
                    color: tab === t.id ? "var(--eg-yellow)" : "var(--eg-fg-3)"
                  }} />
                  {t.count != null && (
                    <span className="mono" style={{
                      fontSize: 10, padding: "1px 5px",
                      background: tab === t.id ? "var(--eg-yellow)" : "var(--eg-paper-2)",
                      color: tab === t.id ? "var(--eg-iron)" : "var(--eg-fg-3)",
                      border: "1px solid " + (tab === t.id ? "var(--eg-yellow)" : "var(--eg-iron)")
                    }}>{t.count}</span>
                  )}
                </div>
              ))}
            </div>

            {tab === "details" && <DetailsTab issue={issue} />}
            {tab === "comments" && <CommentsTab />}
            {tab === "worklogs" && <WorklogsTab />}
            {tab === "cost" && <CostTab issue={issue} accrued={accrued} hourly={hourly} billableMin={billableMin} />}
            {tab === "audit" && <AuditMiniTab />}
          </div>

          {/* sidebar */}
          <aside style={{ background: "var(--eg-paper-2)", overflow: "auto" }}>
            {/* timer */}
            <div style={{ padding: "12px 16px", borderBottom: "1px solid var(--eg-iron)", background: timerOn ? "var(--eg-yellow)" : "var(--eg-paper-2)" }}>
              <div className="caps" style={{ color: timerOn ? "var(--eg-iron)" : "var(--eg-fg-3)" }}>
                <span style={{ display: "inline-flex", alignItems: "center", gap: 6 }}>
                  {timerOn && <span style={{ width: 8, height: 8, background: "var(--eg-red)", display: "inline-block", animation: "blink 1.4s steps(2) infinite" }} />}
                  // cronómetro · timer · {timerOn ? "en marcha · running" : "parado · stopped"}
                </span>
              </div>
              <div className="mono" style={{
                fontSize: 32, fontWeight: 700, color: "var(--eg-iron)",
                letterSpacing: "-0.01em", lineHeight: 1.1, marginTop: 4
              }}>
                {fmtSec(elapsed)}
              </div>
              <div style={{ display: "flex", gap: 6, marginTop: 8 }}>
                <button onClick={() => setTimerOn(!timerOn)} className="b-btn" style={{ background: timerOn ? "var(--eg-red)" : "var(--eg-green)", color: "var(--eg-paper)", flex: 1, justifyContent: "center" }}>
                  {timerOn ? "■ Parar · Stop" : "● Iniciar · Start"}
                </button>
                <button className="b-btn" style={{ background: "var(--eg-paper)" }}>+ Registrar</button>
              </div>
            </div>

            {/* sidebar fields */}
            <SideField labelEs="estado" labelEn="status">
              <span className="plate plate--yellow">EN CURSO</span>
            </SideField>
            <SideField labelEs="asignado" labelEn="assignee">
              {u && <span style={{ display: "inline-flex", alignItems: "center", gap: 8 }}>
                <span className={"avatar avatar--" + u.hue}>{u.initials}</span> {u.name}
              </span>}
            </SideField>
            <SideField labelEs="reportador" labelEn="reporter">
              <span style={{ display: "inline-flex", alignItems: "center", gap: 8 }}>
                <span className={"avatar avatar--" + reporter.hue}>{reporter.initials}</span> {reporter.name}
              </span>
            </SideField>
            <SideField labelEs="prioridad" labelEn="priority">
              {emergency ? (
                <span className="chip chip--emergency"><span>EMERGENCIA</span></span>
              ) : (
                <span className={"chip chip--" + issue.priority}>{issue.priority}</span>
              )}
            </SideField>
            <SideField labelEs="sprint" labelEn="sprint">
              <span className="mono" style={{ fontSize: 11, fontWeight: 600 }}>S-04 · Pruebas de Freno</span>
            </SideField>
            <SideField labelEs="puntos" labelEn="story points">
              <span className="disp" style={{ fontSize: 20, color: "var(--eg-iron)" }}>{issue.points}</span>
            </SideField>
            <SideField labelEs="estimación" labelEn="estimate">
              <span className="mono" style={{ fontSize: 12 }}>{Math.round(issue.est/60*10)/10}h</span>
              <span className="mono" style={{ fontSize: 10, color: "var(--eg-fg-3)", marginLeft: 6 }}>registrado {Math.round(issue.logged/60*10)/10}h</span>
            </SideField>
            <SideField labelEs="etiquetas" labelEn="labels">
              <div style={{ display: "flex", gap: 4, flexWrap: "wrap" }}>
                {issue.labels.map(name => {
                  const l = LABELS.find(x => x.name === name);
                  return l ? <span key={l.id} className={"chip chip--" + l.color}>{l.name}</span> : null;
                })}
              </div>
            </SideField>
            <SideField labelEs="facturación" labelEn="billing">
              <span className="mono" style={{ fontSize: 11, fontWeight: 600 }}>
                {issue.mode === "fixed" ? "FIJO · FIXED" : "POR HORA · HOURLY"}
              </span>
              {issue.rate && (
                <div className="mono" style={{ fontSize: 10, color: "var(--eg-fg-3)", marginTop: 2 }}>
                  {issue.rate.cur} {(issue.rate.hourlyCents/100).toFixed(2)} /h ({issue.rate.scope})
                </div>
              )}
            </SideField>
            <SideField labelEs="serie" labelEn="serial">
              <span className="mono" style={{ fontSize: 10, color: "var(--eg-fg-3)", letterSpacing: "0.06em" }}>
                {issue.key}·HASH·a1f4·c0e2·v3
              </span>
            </SideField>
          </aside>
        </div>
      </div>
    </div>
  );
}

function SideField({ labelEs, labelEn, children }) {
  return (
    <div style={{ padding: "10px 16px", borderBottom: "1px dashed var(--eg-iron)" }}>
      <div className="caps" style={{ marginBottom: 4 }}>// {labelEs} · {labelEn}</div>
      <div>{children}</div>
    </div>
  );
}

function DetailsTab({ issue }) {
  return (
    <div>
      <div className="caps">// descripción · description · markdown</div>
      <div style={{
        background: "var(--eg-paper-2)", border: "1.5px solid var(--eg-iron)",
        padding: "12px 14px", marginTop: 6,
        fontSize: 13.5, lineHeight: 1.55, color: "var(--eg-iron)"
      }}>
        <p style={{ margin: "0 0 10px" }}>
          El planificador de pruebas de freno trata los depósitos <code>depot.gauge === "iberian"</code> como
          no reservables entre las <strong>02:00</strong> y las <strong>03:00</strong> hora local. Tras el
          cambio horario del domingo, la ventana de bloqueo se desplaza una hora y se pierde el turno de noche
          entero para Bilbo-Mercancías, Vicálvaro y Can Tunis.
        </p>
        <p style={{ margin: "0 0 10px" }}><strong>Reproducción</strong>: atrasa el reloj una hora, solicita una reserva para cualquier depósito de ancho ibérico. Devuelve 409 sin sugerencia de hueco.</p>
        <p style={{ margin: 0 }}><strong>Solución</strong>: guardar ventanas en UTC; renderizar en hora local del depósito al leer. UIC 651 §4.2 ya lo especifica.</p>
      </div>

      <div className="caps" style={{ marginTop: 18 }}>// criterios de aceptación · acceptance · 3 de 5</div>
      <ul style={{ listStyle: "none", padding: 0, marginTop: 6, fontSize: 13, color: "var(--eg-iron)" }}>
        {[
          { d: true,  t: "Ventanas guardadas como tuplas UTC en la BD" },
          { d: true,  t: "Migración rellena filas existentes" },
          { d: true,  t: "Endpoint de reserva usa depot.tz al renderizar" },
          { d: false, t: "Test de integración del cambio horario (dos veces al año)" },
          { d: false, t: "Actualizar docs operativos · ES + EN" },
        ].map((c, i) => (
          <li key={i} style={{
            display: "flex", alignItems: "center", gap: 10,
            padding: "6px 8px",
            borderBottom: "1px dashed var(--eg-rule)",
            opacity: c.d ? 0.7 : 1, textDecoration: c.d ? "line-through" : "none"
          }}>
            <span style={{
              width: 14, height: 14, border: "1.5px solid var(--eg-iron)",
              background: c.d ? "var(--eg-iron)" : "var(--eg-paper)",
              display: "inline-flex", alignItems: "center", justifyContent: "center"
            }}>{c.d && <span style={{ color: "var(--eg-yellow)", fontSize: 10, fontWeight: 700 }}>✓</span>}</span>
            {c.t}
          </li>
        ))}
      </ul>

      <div className="caps" style={{ marginTop: 18 }}>// hijos · children · 2</div>
      <div style={{ marginTop: 6 }}>
        {[ISSUES.find(i => i.key === "MTNR-37"), ISSUES.find(i => i.key === "MTNR-28")].filter(Boolean).map(c => (
          <div key={c.key} style={{
            display: "flex", alignItems: "center", gap: 10,
            padding: "6px 10px", borderBottom: "1px dashed var(--eg-rule)",
            fontSize: 13
          }}>
            <span className={"type-chip type-" + c.type}>{c.type[0].toUpperCase()}</span>
            <span className="mono" style={{ fontWeight: 600, fontSize: 11 }}>{c.key}</span>
            <span style={{ flex: 1, color: "var(--eg-iron)" }}>{c.title}</span>
            <span className="chip">{c.priority}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

function CommentsTab() {
  return (
    <div>
      {[
        { who: "JI", name: "Jon Ibarguren", when: "hace 12 min", body: "Confirmado contra UIC 651 Anexo C — la ventana de bloqueo debe vivir en UTC. Tengo un parche listo, ¿lo metemos detrás de un feature flag para el primer ciclo de cambio horario?" },
        { who: "EG", name: "Eneko Garrido", when: "hace 32 min", body: "El flag bien. Asegúrate de que scrumlord.timer-reaper no dispare durante la hora del cambio o tendremos una estampida de falsas alertas a las 03:00." },
        { who: "WC", name: "Wile E. Coyote (Acme)", when: "hace 1 h", body: "Lo vimos también en el corredor de Albuquerque. Misma forma: el turno de noche simplemente… desaparece. Los frenos funcionan en la vida real, conste." },
        { who: "MR", name: "Maite Rekalde", when: "hace 2 h", body: "Reproducción confirmada en staging. Empujo la fix a S-04, las pruebas de freno están bloqueando la programación de Bilbo-Mercancías." },
      ].map((c, i) => {
        const u = USERS.find(u => u.initials === c.who);
        return (
          <div key={i} style={{
            display: "flex", gap: 12,
            padding: "12px 0", borderBottom: i < 3 ? "1px dashed var(--eg-iron)" : "none"
          }}>
            <span className={"avatar avatar--lg avatar--" + (u?.hue || "ink")}>{c.who}</span>
            <div style={{ flex: 1 }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline" }}>
                <span style={{ fontWeight: 600, color: "var(--eg-iron)" }}>{c.name}</span>
                <span className="mono" style={{ fontSize: 10, color: "var(--eg-fg-3)", letterSpacing: "0.08em" }}>{c.when}</span>
              </div>
              <div style={{ fontSize: 13.5, color: "var(--eg-iron)", marginTop: 4, lineHeight: 1.5 }}>{c.body}</div>
            </div>
          </div>
        );
      })}
      <div style={{ marginTop: 16, border: "1.5px solid var(--eg-iron)", background: "var(--eg-paper-2)" }}>
        <div className="tag-head"><span>// responder · reply</span><span>MARKDOWN · ⌘+ENTER</span></div>
        <div style={{ padding: 12, color: "var(--eg-fg-4)", fontSize: 13 }}>Escribe una respuesta… · Type a reply…</div>
      </div>
    </div>
  );
}

function WorklogsTab() {
  const logs = [
    { who: "MR", when: "hoy, 16:38",      min: 60,  billable: true,  note: "Reproducción en staging + borrador del parche" },
    { who: "EG", when: "hoy, 16:31",      min: 45,  billable: false, note: "Pair review · casos límite de LexoRank" },
    { who: "JI", when: "hoy, 14:02",      min: 90,  billable: true,  note: "UIC 651 §4.2 · matemáticas del cambio horario" },
    { who: "MR", when: "ayer",            min: 120, billable: true,  note: "Investigación inicial + redacción de repro" },
    { who: "AL", when: "ayer",            min: 30,  billable: true,  note: "Enlace operativo · Bilbo-Mercancías" },
    { who: "EG", when: "hace 2 días",     min: 15,  billable: false, note: "Triada a S-04" },
  ];
  const total = logs.reduce((s, l) => s + l.min, 0);
  const bill  = logs.filter(l => l.billable).reduce((s, l) => s + l.min, 0);
  return (
    <div>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 0, border: "1.5px solid var(--eg-iron)", marginBottom: 14 }}>
        {[
          { l: "total",     en: "total",    v: `${Math.floor(total/60)}h ${total%60}m`,    sub: "todos los registros" },
          { l: "facturable",en: "billable", v: `${Math.floor(bill/60)}h ${bill%60}m`,      sub: `${Math.round(bill/total*100)}%` },
          { l: "devengado", en: "accrued",  v: `EUR ${Math.round(bill/60*11500/100).toLocaleString("es-ES")},00`, sub: "@ 115,00/h" },
        ].map((s, i) => (
          <div key={i} style={{ padding: "10px 12px", borderRight: i < 2 ? "1.5px solid var(--eg-iron)" : "none", background: i === 2 ? "var(--eg-yellow)" : "var(--eg-paper-2)" }}>
            <div className="caps">// {s.l} · {s.en}</div>
            <div className="disp" style={{ fontSize: 24, color: "var(--eg-iron)", lineHeight: 1.1 }}>{s.v}</div>
            <div className="mono" style={{ fontSize: 10, color: "var(--eg-fg-3)" }}>{s.sub}</div>
          </div>
        ))}
      </div>

      {logs.map((l, i) => {
        const u = USERS.find(u => u.initials === l.who);
        return (
          <div key={i} style={{
            display: "grid", gridTemplateColumns: "auto 1fr auto auto",
            gap: 12, alignItems: "center",
            padding: "8px 10px", borderBottom: "1px dashed var(--eg-iron)",
            fontSize: 13
          }}>
            <span className={"avatar avatar--" + (u?.hue || "ink")}>{l.who}</span>
            <div>
              <div style={{ color: "var(--eg-iron)" }}>{l.note}</div>
              <div className="mono" style={{ fontSize: 10, color: "var(--eg-fg-3)", letterSpacing: "0.08em", marginTop: 2 }}>{l.when}</div>
            </div>
            <span className="mono" style={{ fontSize: 11, color: "var(--eg-iron)", fontWeight: 600 }}>
              {Math.floor(l.min/60) ? `${Math.floor(l.min/60)}h ` : ""}{l.min%60}m
            </span>
            {l.billable
              ? <span className="chip chip--green">$</span>
              : <span className="chip chip--low">·</span>}
          </div>
        );
      })}
    </div>
  );
}

function CostTab({ issue, accrued, hourly, billableMin }) {
  return (
    <div>
      <div className="caps">// resolución de tarifa · rate resolution · issue → project → client → default</div>
      <div style={{
        marginTop: 6, border: "1.5px solid var(--eg-iron)", background: "var(--eg-paper-2)"
      }}>
        {[
          { scope: "issue",   target: "MTNR-42",       rate: "—",            active: false },
          { scope: "project", target: "MTNR",          rate: "EUR 115,00/h", active: true  },
          { scope: "client",  target: "Mantenedor SL", rate: "EUR 110,00/h", active: false, shadowed: true },
          { scope: "default", target: "—",             rate: "EUR  95,00/h", active: false, shadowed: true },
        ].map((r, i) => (
          <div key={i} style={{
            display: "grid", gridTemplateColumns: "80px 1fr 1fr auto",
            gap: 12, alignItems: "center",
            padding: "8px 12px",
            borderBottom: i < 3 ? "1px dashed var(--eg-iron)" : "none",
            background: r.active ? "var(--eg-yellow)" : "transparent",
            opacity: r.shadowed ? 0.45 : 1,
            textDecoration: r.shadowed ? "line-through" : "none",
          }}>
            <span className="mono" style={{ fontSize: 11, textTransform: "uppercase", letterSpacing: "0.1em", fontWeight: 600 }}>{r.scope}</span>
            <span style={{ fontSize: 13, color: "var(--eg-iron)" }}>{r.target}</span>
            <span className="mono" style={{ fontSize: 12, color: "var(--eg-iron)" }}>{r.rate}</span>
            {r.active && <span className="plate" style={{ background: "var(--eg-iron)", color: "var(--eg-yellow)" }}>← GANA · WINS</span>}
          </div>
        ))}
      </div>

      <div className="caps" style={{ marginTop: 18 }}>// coste devengado · accrued cost · (resolve-on-read · M5 hará snapshot)</div>
      <div style={{
        marginTop: 6,
        background: "var(--eg-iron)", color: "var(--eg-paper)",
        padding: 20, display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 0,
      }}>
        <div>
          <div className="caps" style={{ color: "var(--eg-fg-4)" }}>// facturable · billable</div>
          <div className="disp" style={{ fontSize: 32, color: "var(--eg-yellow)", lineHeight: 1.05 }}>
            {Math.floor(billableMin/60)}<span style={{ fontSize: 16, marginLeft: 4 }}>h</span> {billableMin%60}<span style={{ fontSize: 16, marginLeft: 4 }}>m</span>
          </div>
        </div>
        <div>
          <div className="caps" style={{ color: "var(--eg-fg-4)" }}>// × tarifa · rate</div>
          <div className="disp" style={{ fontSize: 32, color: "var(--eg-paper)", lineHeight: 1.05 }}>
            115,<span style={{ fontSize: 20 }}>00</span>
          </div>
          <div className="mono" style={{ fontSize: 10, color: "var(--eg-fg-4)", marginTop: 4 }}>EUR/HORA · ÁMBITO PROYECTO</div>
        </div>
        <div>
          <div className="caps" style={{ color: "var(--eg-fg-4)" }}>// devengado · accrued</div>
          <div className="disp" style={{ fontSize: 32, color: "var(--eg-yellow)", lineHeight: 1.05 }}>
            EUR&nbsp;{(accrued/100).toLocaleString("es-ES", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </div>
          <div className="mono" style={{ fontSize: 10, color: "var(--eg-fg-4)", marginTop: 4 }}>= round(min ÷ 60 × hourlyCents)</div>
        </div>
      </div>

      <div className="caps" style={{ marginTop: 18 }}>// cálculo · math</div>
      <pre style={{ marginTop: 6, padding: 14, fontSize: 12, lineHeight: 1.7 }}>
{`accruedCents = Math.round(billableMinutes / 60 * hourlyCents)
             = Math.round(${billableMin} / 60 * ${hourly})
             = ${accrued}    // = EUR ${(accrued/100).toFixed(2)}`}
      </pre>
    </div>
  );
}

function AuditMiniTab() {
  return (
    <div>
      <div className="caps" style={{ display: "flex", justifyContent: "space-between" }}>
        <span>// sauron · este issue · this issue</span>
        <span>↗ abrir auditoría completa (puerto :666)</span>
      </div>
      <div style={{ marginTop: 6, border: "1.5px solid var(--eg-iron)", background: "var(--eg-paper-2)" }}>
        {AUDIT.filter(a => a.entity.includes("MTNR-42")).concat([
          { at: "16:24:19", actor: "EG", action: "issue.patch", entity: "MTNR-42", note: "priority: high → emergency", diff: "+priority" },
          { at: "16:24:08", actor: "EG", action: "label.attach", entity: "MTNR-42", note: "+p0, +cost-impact", diff: "+labels" },
          { at: "14:02:18", actor: "JI", action: "worklog.create", entity: "MTNR-42", note: "+90 min · billable", diff: "+worklog" },
        ]).map((a, i) => (
          <div key={i} style={{
            display: "grid", gridTemplateColumns: "70px 30px 1fr auto",
            gap: 10, padding: "8px 12px", alignItems: "center",
            borderBottom: i < 5 ? "1px dashed var(--eg-iron)" : "none",
            fontFamily: "var(--font-mono)", fontSize: 11
          }}>
            <span style={{ color: "var(--eg-fg-3)" }}>{a.at}</span>
            <span style={{ color: "var(--eg-iron)", fontWeight: 700 }}>{a.actor}</span>
            <span><b style={{ color: "var(--eg-red)" }}>{a.action}</b> <span style={{ color: "var(--eg-fg-2)" }}>· {a.note}</span></span>
            <span style={{ color: "var(--eg-fg-4)" }}>{a.diff}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

window.IssueDrawer = IssueDrawer;
