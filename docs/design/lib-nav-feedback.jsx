/* DEPÓSITO · IV · Navegación + V · Retroalimentación */

function NavSection() {
  return (
    <Sect
      id="nav"
      num="IV"
      eyebrow="navegación · navigation · 5 bays"
      titleEs="NAVEGACIÓN."
      titleEn="Where you are. Where you're going."
      meta={<>SERIE · GS-LIB-N<br /><b>12 piezas</b> · siempre indica el lugar</>}
      intro="La navegación dice tres cosas: dónde estás, dónde puedes ir, qué tienes detrás. Si alguna de las tres no está clara, falta una pieza."
    >
      <TabsBay />
      <CrumbsBay />
      <PagerBay />
      <StepperBay />
      <MenuBay />
    </Sect>
  );
}

function FeedbackSection() {
  return (
    <Sect
      id="feedback"
      num="V"
      eyebrow="retroalimentación · feedback · 6 bays"
      titleEs="RETROALIMENTACIÓN."
      titleEn="Did it work. Is it loading. What just happened."
      meta={<>SERIE · GS-LIB-V<br /><b>14 piezas</b> · honestidad por encima de pulido</>}
      intro="El sistema debe contar lo que sabe y callar lo que no. Empty states con voz. Errores con causa. Loading que no miente sobre el progreso."
    >
      <AlertsBay />
      <ToastBay />
      <EmptyBay />
      <LoadingBay />
      <ProgressBay />
      <TooltipBay />
    </Sect>
  );
}

/* ─── IV.01 Tabs ─────────────────────────────────────────── */
function TabsBay() {
  const [t, setT] = React.useState(0);
  return (
    <Bay num="01" name="PESTAÑAS · TABS" en="// .subbar variant"
      lede="Para cambiar de pantalla dentro de un módulo. Ink activo + yellow tipo. Cada tab puede llevar un counter (.ct) con conteo en mono.">
      <Spec serial="GS-LIB-N01" label="SUBBAR TABS · WITH COUNT" pad={0}>
        <div className="subbar">
          {[
            { es: "Tablero",    en: "Board",     count: 18, active: t === 0 },
            { es: "Pendientes", en: "Backlog",   count: 27, active: t === 1 },
            { es: "Sprints",    en: "Sprints",   count:  4, active: t === 2 },
            { es: "Resumen",    en: "Summary",   count: null,active: t === 3 },
            { es: "Auditoría",  en: "Audit · :666", count: 1208, active: t === 4 },
          ].map((tab, i) => (
            <div key={i} className={`subbar__tab ${tab.active ? "active" : ""}`} onClick={() => setT(i)}>
              <span className="bi bi--inline" style={{ color: "inherit" }}>
                <span className="bi__es">{tab.es}</span>
                <span className="bi__en" style={{ color: tab.active ? "var(--eg-yellow)" : "var(--eg-fg-3)" }}>{tab.en}</span>
              </span>
              {tab.count !== null && <span className="ct">{tab.count}</span>}
            </div>
          ))}
          <div className="subbar__right">
            <button className="b-btn b-btn--ghost">▍ Filtrar</button>
            <button className="b-btn b-btn--ink">+ Nuevo ticket</button>
          </div>
        </div>
      </Spec>

      <Spec serial="GS-LIB-N02" label="INLINE TABS · SECONDARY" stage="paper2"
        when="Dentro de un panel — auditoría / actividad / documentos.">
        <div style={{ display: "inline-flex", border: "2px solid var(--eg-iron)", background: "var(--eg-paper)" }}>
          {["Actividad · Activity", "Comentarios · Comments · 3", "Worklog · 12h"].map((l, i) => (
            <button key={l} style={{
              fontFamily: "var(--font-mono)", fontSize: 11,
              letterSpacing: "0.12em", textTransform: "uppercase",
              padding: "8px 14px", border: 0, borderRight: i < 2 ? "1.5px solid var(--eg-iron)" : 0,
              background: i === 0 ? "var(--eg-iron)" : "transparent",
              color: i === 0 ? "var(--eg-yellow)" : "var(--eg-iron)",
              cursor: "pointer", fontWeight: 600
            }}>{l}</button>
          ))}
        </div>
      </Spec>
    </Bay>
  );
}

/* ─── IV.02 Breadcrumbs ──────────────────────────────────── */
function CrumbsBay() {
  return (
    <Bay num="02" name="MIGAS · BREADCRUMBS" en="// // separator · mono"
      lede="Slashes mono entre nodos. El último es el actual y va en disp uppercase. Los anteriores son links iron con underline yellow.">
      <Spec serial="GS-LIB-N03" label="BREADCRUMB · 4 LEVELS">
        <div style={{ fontFamily: "var(--font-mono)", fontSize: 12, color: "var(--eg-fg-3)", letterSpacing: "0.08em", textTransform: "uppercase" }}>
          <a href="#" style={{ color: "var(--eg-iron)", fontWeight: 600 }}>Mantenedor SL</a>
          <span style={{ margin: "0 8px", color: "var(--eg-fg-4)" }}>/</span>
          <a href="#" style={{ color: "var(--eg-iron)", fontWeight: 600 }}>MTNR · Freight</a>
          <span style={{ margin: "0 8px", color: "var(--eg-fg-4)" }}>/</span>
          <a href="#" style={{ color: "var(--eg-iron)", fontWeight: 600 }}>S-04 · Brake tests</a>
          <span style={{ margin: "0 8px", color: "var(--eg-fg-4)" }}>/</span>
          <span style={{ fontFamily: "var(--font-display)", fontSize: 18, color: "var(--eg-iron)", fontWeight: 800, letterSpacing: 0 }}>MTNR-42</span>
        </div>
      </Spec>

      <Spec serial="GS-LIB-N04" label="BREADCRUMB · COLLAPSED · ELLIPSIS" stage="paper2">
        <div style={{ fontFamily: "var(--font-mono)", fontSize: 12, color: "var(--eg-fg-3)", letterSpacing: "0.08em", textTransform: "uppercase" }}>
          <a href="#" style={{ color: "var(--eg-iron)", fontWeight: 600 }}>Mantenedor SL</a>
          <span style={{ margin: "0 8px", color: "var(--eg-fg-4)" }}>/</span>
          <span style={{ display: "inline-flex", alignItems: "center", gap: 6 }}>
            <span style={{
              border: "1.5px solid var(--eg-iron)", padding: "1px 6px",
              background: "var(--eg-paper)", color: "var(--eg-iron)", cursor: "pointer"
            }}>···</span>
          </span>
          <span style={{ margin: "0 8px", color: "var(--eg-fg-4)" }}>/</span>
          <a href="#" style={{ color: "var(--eg-iron)", fontWeight: 600 }}>S-04 · Brake tests</a>
          <span style={{ margin: "0 8px", color: "var(--eg-fg-4)" }}>/</span>
          <span style={{ fontFamily: "var(--font-display)", fontSize: 18, color: "var(--eg-iron)", fontWeight: 800, letterSpacing: 0 }}>MTNR-42</span>
        </div>
      </Spec>
    </Bay>
  );
}

/* ─── IV.03 Pager ────────────────────────────────────────── */
function PagerBay() {
  return (
    <Bay num="03" name="PAGINACIÓN · PAGER" en="// numbered + range"
      lede="Página actual riveted como una placa amarilla. Las demás como botones small. Indicador de rango mono a la derecha — '1–25 de 84'.">
      <Spec serial="GS-LIB-N05" label="PAGER · 5 PAGES + RANGE">
        <div className="spec__row" style={{ gap: 12, justifyContent: "space-between" }}>
          <div className="spec__row" style={{ gap: 6 }}>
            <button className="b-btn" style={{ padding: "6px 10px" }}>←</button>
            <button className="b-btn">1</button>
            <button className="b-btn b-btn--yellow" style={{ boxShadow: "1.5px 1.5px 0 var(--eg-iron)" }}>2</button>
            <button className="b-btn">3</button>
            <button className="b-btn">4</button>
            <span className="mono" style={{ padding: "0 6px", color: "var(--eg-fg-3)", fontWeight: 700 }}>…</span>
            <button className="b-btn">12</button>
            <button className="b-btn" style={{ padding: "6px 10px" }}>→</button>
          </div>
          <div className="mono" style={{ fontSize: 11, color: "var(--eg-fg-3)", letterSpacing: "0.12em", textTransform: "uppercase" }}>
            // <b style={{ color: "var(--eg-iron)" }}>26–50</b> de <b style={{ color: "var(--eg-iron)" }}>286</b> · página 2/12
          </div>
        </div>
      </Spec>
    </Bay>
  );
}

/* ─── IV.04 Stepper ──────────────────────────────────────── */
function StepperBay() {
  return (
    <Bay num="04" name="STEPPER · WIZARD" en="// numbered · iron tickmarks"
      lede="Para wizards de onboarding, create-project flow. Los pasos completados llevan check yellow, el actual lleva placa amarilla, los siguientes ink-3.">
      <Spec serial="GS-LIB-N06" label="STEPPER · 4 PASOS" stage="paper2">
        <div style={{ display: "flex", alignItems: "center", gap: 0, maxWidth: 920 }}>
          {[
            { n: 1, t: "Cliente",     en: "client",   done: true },
            { n: 2, t: "Proyecto",    en: "project",  done: true },
            { n: 3, t: "Workflow",    en: "workflow", active: true },
            { n: 4, t: "Tarifas",     en: "rates",    next: true },
          ].map((s, i, arr) => (
            <React.Fragment key={s.n}>
              <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 8, flexShrink: 0 }}>
                <span style={{
                  width: 36, height: 36, display: "flex", alignItems: "center", justifyContent: "center",
                  fontFamily: "var(--font-mono)", fontWeight: 700, fontSize: 14,
                  border: "2px solid var(--eg-iron)",
                  background: s.done ? "var(--eg-yellow)" : s.active ? "var(--eg-iron)" : "var(--eg-paper)",
                  color: s.active ? "var(--eg-yellow)" : "var(--eg-iron)",
                  boxShadow: s.active ? "2px 2px 0 var(--eg-yellow)" : "none"
                }}>{s.done ? "✓" : s.n}</span>
                <span className="bi" style={{ alignItems: "center" }}>
                  <span className="bi__es" style={{ fontFamily: "var(--font-display)", fontWeight: 800, fontSize: 13, color: "var(--eg-iron)", textTransform: "uppercase" }}>{s.t}</span>
                  <span className="bi__en" style={{ textAlign: "center" }}>// {s.en}</span>
                </span>
              </div>
              {i < arr.length - 1 && (
                <div style={{
                  flex: 1, height: 2,
                  background: arr[i + 1].done || arr[i].done ? "var(--eg-iron)" : "var(--eg-paper-3)",
                  margin: "0 0 28px",
                  ...(arr[i + 1].active ? {
                    backgroundImage: "linear-gradient(to right, var(--eg-iron) 50%, var(--eg-rule) 50%)"
                  } : {})
                }} />
              )}
            </React.Fragment>
          ))}
        </div>
      </Spec>
    </Bay>
  );
}

/* ─── IV.05 Menu ─────────────────────────────────────────── */
function MenuBay() {
  return (
    <Bay num="05" name="MENÚS · DROPDOWNS" en="// open panels · with sections"
      lede="Panel con asset-tag header, items en filas con kbd hint a la derecha. Divisores dashed entre secciones. Hover yellow-soft.">
      <Spec serial="GS-LIB-N07" label="ACTION MENU · 3 SECTIONS · OPEN" stage="paper2">
        <div style={{
          width: 280, border: "2px solid var(--eg-iron)",
          background: "var(--eg-paper)", boxShadow: "4px 4px 0 var(--eg-iron)"
        }}>
          <div className="tag-head">
            <span><b style={{ color: "var(--eg-iron)" }}>MTNR-42</b> · ACCIONES</span>
            <span>// 9 items</span>
          </div>
          {[
            { lbl: "Editar título · Edit title",     kbd: "E" },
            { lbl: "Asignar · Assign",               kbd: "A" },
            { lbl: "Cambiar estado · Change status", kbd: "S" },
            { lbl: "Mover a sprint · Move",          kbd: "M" },
            { divider: true },
            { lbl: "Iniciar timer · Start",  kbd: "T", hi: true },
            { lbl: "Añadir worklog · Log",   kbd: "L" },
            { divider: true },
            { lbl: "Duplicar · Duplicate",   kbd: "D" },
            { lbl: "Eliminar · Delete",      kbd: "⌫", danger: true },
          ].map((m, i) => m.divider ? (
            <div key={`d${i}`} style={{ borderTop: "1px dashed var(--eg-iron)", margin: 0 }} />
          ) : (
            <div key={m.lbl} style={{
              display: "flex", justifyContent: "space-between", alignItems: "center",
              padding: "7px 12px", cursor: "pointer",
              background: m.hi ? "var(--eg-yellow-soft)" : "transparent",
              color: m.danger ? "var(--eg-red)" : "var(--eg-iron)",
              fontFamily: "var(--font-body)", fontSize: 13
            }}>
              <span style={{ fontWeight: m.hi ? 600 : 400 }}>{m.lbl}</span>
              <span className="kbd-key" style={{ fontSize: 10, padding: "0 5px", minWidth: 0 }}>{m.kbd}</span>
            </div>
          ))}
        </div>
      </Spec>

      <Spec serial="GS-LIB-N08" label="COMMAND PALETTE · ⌘K · FAST FIND" stage="ink">
        <div style={{
          width: 560, background: "var(--eg-paper)",
          border: "2px solid var(--eg-yellow)",
          boxShadow: "6px 6px 0 var(--eg-iron-3)"
        }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10, padding: "10px 14px", borderBottom: "1.5px solid var(--eg-iron)" }}>
            <span style={{
              fontFamily: "var(--font-mono)", fontWeight: 700, fontSize: 11,
              background: "var(--eg-iron)", color: "var(--eg-yellow)",
              padding: "2px 6px", letterSpacing: "0.1em"
            }}>⌘K</span>
            <input
              defaultValue="cierra sprint"
              style={{
                background: "transparent", border: 0, outline: 0,
                fontFamily: "var(--font-mono)", fontSize: 14, color: "var(--eg-iron)",
                flex: 1, padding: 0
              }}
            />
            <span className="mono" style={{ fontSize: 10, color: "var(--eg-fg-3)", letterSpacing: "0.1em" }}>3 results</span>
          </div>
          {[
            { sec: "// sprints",  items: [
              { lbl: "Cerrar S-04 · Brake tests", sub: "MTNR · 18 tickets · 22 pts comp.", hi: true },
            ]},
            { sec: "// proyectos · projects", items: [
              { lbl: "Crear sprint nuevo · New sprint", sub: "MTNR · capacity 40h" },
            ]},
            { sec: "// ajustes · settings", items: [
              { lbl: "Workflow · estados de cierre", sub: "/settings/workflow" },
            ]},
          ].map((s, gi) => (
            <div key={s.sec}>
              <div style={{ padding: "6px 14px 4px", background: "var(--eg-paper-2)", borderBottom: "1px dashed var(--eg-iron)" }} className="caps">{s.sec}</div>
              {s.items.map((it, i) => (
                <div key={i} style={{
                  display: "flex", justifyContent: "space-between", alignItems: "center",
                  padding: "8px 14px", cursor: "pointer",
                  background: it.hi ? "var(--eg-yellow-soft)" : "transparent",
                  borderBottom: gi < 2 ? "1px dashed var(--eg-iron)" : 0
                }}>
                  <div>
                    <div style={{ fontFamily: "var(--font-display)", fontWeight: 700, fontSize: 14, color: "var(--eg-iron)", textTransform: "uppercase", letterSpacing: "0.01em" }}>{it.lbl}</div>
                    <div className="mono" style={{ fontSize: 10, color: "var(--eg-fg-3)", letterSpacing: "0.08em" }}>// {it.sub}</div>
                  </div>
                  {it.hi && <span className="kbd-key" style={{ fontSize: 10, padding: "0 4px", minWidth: 0 }}>↵</span>}
                </div>
              ))}
            </div>
          ))}
          <div style={{ padding: "6px 14px", display: "flex", justifyContent: "space-between", alignItems: "center", background: "var(--eg-paper-2)", borderTop: "1.5px solid var(--eg-iron)" }}>
            <span className="mono" style={{ fontSize: 10, color: "var(--eg-fg-3)", letterSpacing: "0.1em", textTransform: "uppercase" }}>
              <span className="kbd-key" style={{ fontSize: 9, padding: "0 4px", minWidth: 0 }}>↑</span> <span className="kbd-key" style={{ fontSize: 9, padding: "0 4px", minWidth: 0 }}>↓</span> mover · <span className="kbd-key" style={{ fontSize: 9, padding: "0 4px", minWidth: 0 }}>↵</span> ejecutar · <span className="kbd-key" style={{ fontSize: 9, padding: "0 4px", minWidth: 0 }}>esc</span> cerrar
            </span>
          </div>
        </div>
      </Spec>
    </Bay>
  );
}

/* ───── V · FEEDBACK ─────────────────────────────────────── */

/* V.01 Alerts / Banners */
function AlertsBay() {
  return (
    <Bay num="01" name="AVISOS · ALERTS" en="// info · success · warn · danger"
      lede="Caja con un strip vertical lateral del color semántico, padding mediano, mono caps para el título y body normal. Sin gradiente. Sin emoji.">
      <Spec serial="GS-LIB-V01" label="ALERT · 4 SEMANTIC · WITH LEADING STRIP">
        <div className="spec__col" style={{ gap: 14 }}>
          <Alert tone="info"    title="INFO · NUEVO MIEMBRO INVITADO" en="A new member has been invited">
            Maite Rekalde recibió el enlace de magic-link. Expira en 15 min, un solo uso.
          </Alert>
          <Alert tone="success" title="OK · SPRINT CERRADO" en="Sprint S-04 closed">
            18 tickets · 22 pts completados · 5 pts arrastrados a S-05.
            <br /><span className="mono" style={{ fontSize: 11, color: "var(--eg-fg-3)", letterSpacing: "0.06em" }}>// velocity.snapshot escrito · scrumlord ack 16:18:01</span>
          </Alert>
          <Alert tone="warn"    title="AVISO · WIP LÍMITE EXCEDIDO" en="WIP limit breached">
            <b>In Progress</b> tiene 6 tickets · límite 5. Otro arrastre añadirá un flag a la columna. No se bloquea — la marca queda en la auditoría.
          </Alert>
          <Alert tone="danger"  title="EMERGENCIA · SAURON DETECTÓ ANOMALÍA" en="Audit anomaly">
            Un export masivo de timesheets en los últimos 60s · <b>1208 filas en una sola request</b>. ¿Eras tú?
            <br /><span className="mono" style={{ fontSize: 11, color: "var(--eg-fg-3)", letterSpacing: "0.06em" }}>// audit log · :666 · evt-22918</span>
          </Alert>
        </div>
      </Spec>

      <Spec serial="GS-LIB-V02" label="INLINE NOTE · COMPACT" stage="paper2"
        when="Bajo un input. Help-text persistente. Una sola línea, mono.">
        <div className="spec__col" style={{ gap: 8 }}>
          <InlineNote tone="info">// el límite WIP no bloquea — registra y avisa, nunca interrumpe.</InlineNote>
          <InlineNote tone="warn">// si dejas el timer corriendo &gt;12h, scrumlord lo cierra automáticamente.</InlineNote>
          <InlineNote tone="danger">// formato de email inválido. esperado: nombre@dominio.</InlineNote>
          <InlineNote tone="ok">// guardado · saved · 16:42:08.</InlineNote>
        </div>
      </Spec>
    </Bay>
  );
}

function Alert({ tone = "info", title, en, children }) {
  const colors = {
    info:    { strip: "var(--eg-info)",    bg: "#e8eff8" },
    success: { strip: "var(--eg-green)",   bg: "var(--eg-green-soft)" },
    warn:    { strip: "var(--eg-yellow)",  bg: "var(--eg-yellow-soft)" },
    danger:  { strip: "var(--eg-red)",     bg: "var(--eg-red-soft)" },
  }[tone];
  return (
    <div style={{
      display: "grid", gridTemplateColumns: "8px 1fr auto",
      border: "1.5px solid var(--eg-iron)", background: colors.bg,
      boxShadow: "2px 2px 0 var(--eg-iron)"
    }}>
      <div style={{ background: colors.strip, borderRight: "1.5px solid var(--eg-iron)" }} />
      <div style={{ padding: "10px 14px" }}>
        <div className="mono" style={{ fontSize: 10, fontWeight: 700, letterSpacing: "0.14em", color: "var(--eg-iron)", textTransform: "uppercase" }}>// {title} <span style={{ opacity: 0.6, fontWeight: 500 }}>· {en}</span></div>
        <div style={{ fontSize: 13, color: "var(--eg-fg-1)", marginTop: 4, lineHeight: 1.5 }}>{children}</div>
      </div>
      <div style={{ padding: "10px 12px", display: "flex", alignItems: "flex-start" }}>
        <button className="b-btn b-btn--ghost" style={{ padding: "2px 6px", fontFamily: "var(--font-mono)" }}>✕</button>
      </div>
    </div>
  );
}

function InlineNote({ tone, children }) {
  const c = {
    info:   "var(--eg-info)",
    ok:     "var(--eg-green)",
    warn:   "var(--eg-yellow-hi)",
    danger: "var(--eg-red)",
  }[tone];
  return (
    <div style={{
      display: "inline-flex", alignItems: "center", gap: 10,
      borderLeft: `4px solid ${c}`, padding: "4px 10px",
      background: "var(--eg-paper)", border: "1px solid var(--eg-rule)", borderLeftWidth: 4, borderLeftColor: c,
      fontFamily: "var(--font-mono)", fontSize: 11, color: "var(--eg-iron)", letterSpacing: "0.06em"
    }}>{children}</div>
  );
}

/* V.02 Toast */
function ToastBay() {
  return (
    <Bay num="02" name="TOAST · NOTIFICACIONES" en="// transient · bottom-right · 4s"
      lede="Caja iron con franja yellow a la izquierda. 320–360px. Vive 4 segundos. Si necesita más tiempo, no es toast — es alert.">
      <Spec serial="GS-LIB-V03" label="TOASTS · 3 TONES" stage="paper2">
        <div className="spec__col" style={{ gap: 14, alignItems: "flex-start" }}>
          <Toast tone="ok"     title="WORKLOG GUARDADO" body="01:24 sumadas a MTNR-42 — 247h totales en el sprint." />
          <Toast tone="warn"   title="TIMER REAPED" body="GIRA-1 corría desde hace 13h. scrumlord lo cerró a 12h00m00s." />
          <Toast tone="danger" title="CONFLICTO DE EDICIÓN" body="MTNR-42 fue editado por Maite hace 4s. Recarga para ver." action="Recargar" />
        </div>
      </Spec>
    </Bay>
  );
}

function Toast({ tone = "ok", title, body, action }) {
  const stripe = {
    ok:     "var(--eg-green)",
    warn:   "var(--eg-yellow)",
    danger: "var(--eg-red)",
  }[tone];
  return (
    <div style={{
      width: 360, background: "var(--eg-iron)", color: "var(--eg-paper)",
      border: "2px solid var(--eg-iron)", boxShadow: "4px 4px 0 var(--eg-paper-3)",
      display: "grid", gridTemplateColumns: "8px 1fr auto"
    }}>
      <div style={{ background: stripe }} />
      <div style={{ padding: "10px 14px" }}>
        <div className="mono" style={{ fontSize: 10, fontWeight: 700, letterSpacing: "0.14em", color: "var(--eg-yellow)", textTransform: "uppercase" }}>// {title}</div>
        <div style={{ fontSize: 12, color: "var(--eg-paper)", marginTop: 3 }}>{body}</div>
      </div>
      <div style={{ padding: "10px 12px", display: "flex", alignItems: "center", gap: 8 }}>
        {action && <button className="b-btn b-btn--yellow" style={{ padding: "4px 8px" }}>{action}</button>}
        <button style={{ background: "transparent", border: 0, color: "var(--eg-fg-5)", fontFamily: "var(--font-mono)", cursor: "pointer" }}>✕</button>
      </div>
    </div>
  );
}

/* V.03 Empty states */
function EmptyBay() {
  return (
    <Bay num="03" name="ESTADOS VACÍOS · EMPTY" en="// 'vías vacías' · with voice"
      lede="Cada vacío es una oportunidad de decir lo que el módulo es. Voz seca, instrucción clara, una sola CTA primaria.">
      <Spec serial="GS-LIB-V04" label="EMPTY · FULL POSTER" stage="paper2">
        <div style={{
          maxWidth: 520, border: "2px solid var(--eg-iron)", background: "var(--eg-paper)",
          boxShadow: "6px 6px 0 var(--eg-iron)", margin: "12px auto"
        }}>
          <div className="bg-hazard" style={{ height: 14 }} />
          <div style={{ padding: "26px 28px" }}>
            <div className="plate" style={{ marginBottom: 14 }}>SIN COMENTARIOS · NO COMMENTS</div>
            <div className="disp" style={{ fontSize: 36, color: "var(--eg-iron)", lineHeight: 0.95, margin: "0 0 8px" }}>
              EL DRAWER ESTÁ EN SILENCIO.<br />
              <span style={{ color: "var(--eg-red)" }}>DI ALGO.</span>
            </div>
            <div className="mono" style={{ fontSize: 11, color: "var(--eg-fg-3)", letterSpacing: "0.14em", textTransform: "uppercase", marginBottom: 12 }}>
              — NO ONE HAS WRITTEN HERE YET —
            </div>
            <p style={{ fontSize: 13, color: "var(--eg-fg-2)", margin: 0, lineHeight: 1.5 }}>
              El primer comentario suele ser un “qué descubriste”. Si quieres que el cliente vea esto, marca <b>visible para cliente</b>. La auditoría lo registra igual.
            </p>
            <div style={{ display: "flex", gap: 8, marginTop: 16 }}>
              <button className="b-btn b-btn--yellow">+ Primer comentario</button>
              <button className="b-btn">Insertar plantilla</button>
            </div>
          </div>
        </div>
      </Spec>

      <Spec serial="GS-LIB-V05" label="EMPTY · COMPACT · LIST">
        <div style={{
          border: "1.5px dashed var(--eg-iron)", padding: "22px 18px",
          background: "var(--eg-paper-2)",
          display: "flex", flexDirection: "column", alignItems: "center", gap: 8,
          maxWidth: 520, margin: "0 auto"
        }}>
          <div className="disp" style={{ fontSize: 22, color: "var(--eg-iron)" }}>SIN WORKLOG ESTA SEMANA.</div>
          <div className="mono" style={{ fontSize: 11, color: "var(--eg-fg-3)", letterSpacing: "0.14em", textTransform: "uppercase" }}>// no time logged this week</div>
          <button className="b-btn b-btn--yellow" style={{ marginTop: 8 }}>Iniciar timer · Start</button>
        </div>
      </Spec>

      <Spec serial="GS-LIB-V06" label="ERROR STATE · 'DESCARRILAMIENTO'" stage="paper2">
        <div style={{
          maxWidth: 560, border: "2px solid var(--eg-red)", background: "var(--eg-paper)",
          boxShadow: "6px 6px 0 var(--eg-red)", margin: "0 auto"
        }}>
          <div style={{ background: "var(--eg-red)", padding: "8px 14px", color: "var(--eg-paper)" }}>
            <div className="mono" style={{ fontSize: 10, letterSpacing: "0.14em", textTransform: "uppercase", fontWeight: 700 }}>// HTTP 502 · UPSTREAM SIN RESPUESTA</div>
          </div>
          <div style={{ padding: "20px 22px" }}>
            <div className="disp" style={{ fontSize: 36, color: "var(--eg-iron)", lineHeight: 0.95 }}>
              DESCARRILAMIENTO.<br />
              <span style={{ color: "var(--eg-red)" }}>EL TREN NO LLEGÓ.</span>
            </div>
            <div className="mono" style={{ fontSize: 11, color: "var(--eg-fg-3)", letterSpacing: "0.14em", textTransform: "uppercase", marginTop: 6, marginBottom: 12 }}>
              — DERAILMENT · UPSTREAM IS DOWN —
            </div>
            <p style={{ fontSize: 13, color: "var(--eg-fg-2)", margin: 0, lineHeight: 1.5 }}>
              Nuestro backend está aquí. El servicio del que dependía esta vista (<code>/api/auth/oidc/refresh</code>) tardó más de 8s. Reintenta. Si vuelve a fallar, abre auditoría y mira el evento <code>evt-22918</code>.
            </p>
            <div className="spec__row" style={{ gap: 8, marginTop: 16 }}>
              <button className="b-btn b-btn--red">↺ Reintentar</button>
              <button className="b-btn">Ir a auditoría · :666</button>
              <button className="b-btn b-btn--ghost">Copiar request id</button>
            </div>
          </div>
        </div>
      </Spec>
    </Bay>
  );
}

/* V.04 Loading + Skeleton */
function LoadingBay() {
  return (
    <Bay num="04" name="CARGA · LOADING" en="// hazard-thin · skeleton blocks"
      lede="El loading principal es una franja de hazard fina animada. Nunca un círculo rotando. El skeleton son cajas de paper-2 que respetan la jerarquía exacta del contenido que viene.">
      <Spec serial="GS-LIB-V07" label="HAZARD LOADER · INDETERMINATE" status="LIVE" statusKind="live">
        <div className="spec__col">
          <div style={{ height: 10, border: "1.5px solid var(--eg-iron)", overflow: "hidden", position: "relative" }}>
            <div style={{
              position: "absolute", inset: 0, width: "200%",
              background: "repeating-linear-gradient(-45deg, var(--eg-yellow) 0 12px, var(--eg-iron) 12px 24px)",
              animation: "gs-stripe 1.2s linear infinite"
            }} />
          </div>
          <div className="mono" style={{ fontSize: 11, color: "var(--eg-fg-3)", letterSpacing: "0.12em", textTransform: "uppercase" }}>
            // cargando · loading · sin saber cuánto · no eta
          </div>
        </div>
      </Spec>

      <Spec serial="GS-LIB-V08" label="SKELETON · BOARD CARD" stage="paper2">
        <div style={{ display: "flex", gap: 14 }}>
          {[1, 2, 3].map(i => (
            <div key={i} style={{
              width: 240, background: "var(--eg-paper)",
              border: "1.5px solid var(--eg-iron)", boxShadow: "2px 2px 0 var(--eg-iron)"
            }}>
              <div style={{ padding: "6px 10px", borderBottom: "1px dashed var(--eg-iron)" }}>
                <div style={{ width: 80, height: 10, background: "var(--eg-paper-3)", animation: "gs-pulse 1.3s ease-in-out infinite" }} />
              </div>
              <div style={{ padding: "12px 12px" }}>
                <div style={{ width: "92%", height: 12, background: "var(--eg-paper-3)", marginBottom: 8, animation: "gs-pulse 1.3s ease-in-out infinite" }} />
                <div style={{ width: "70%", height: 12, background: "var(--eg-paper-3)", marginBottom: 14, animation: "gs-pulse 1.3s ease-in-out infinite .15s" }} />
                <div style={{ display: "flex", gap: 6 }}>
                  <div style={{ width: 40, height: 14, background: "var(--eg-paper-3)", animation: "gs-pulse 1.3s ease-in-out infinite .3s" }} />
                  <div style={{ width: 56, height: 14, background: "var(--eg-paper-3)", animation: "gs-pulse 1.3s ease-in-out infinite .45s" }} />
                </div>
              </div>
            </div>
          ))}
        </div>
      </Spec>

      <Spec serial="GS-LIB-V09" label="LOADING · WITH PROGRESS · KNOWN ETA"
        when="Solo cuando sabes el progreso real. Mentir con progreso falso destruye confianza.">
        <div style={{ maxWidth: 480 }}>
          <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 6 }}>
            <span className="caps" style={{ color: "var(--eg-iron)" }}>// IMPORTANDO TICKETS · 247 / 312</span>
            <span className="mono" style={{ fontSize: 11, color: "var(--eg-iron)", fontWeight: 700, letterSpacing: "0.06em" }}>79%</span>
          </div>
          <div style={{ height: 14, border: "2px solid var(--eg-iron)", background: "var(--eg-paper-2)", overflow: "hidden" }}>
            <div style={{ height: "100%", width: "79%", background: "var(--eg-yellow)", borderRight: "1.5px solid var(--eg-iron)" }} />
          </div>
          <div className="mono" style={{ fontSize: 10, color: "var(--eg-fg-3)", letterSpacing: "0.06em", marginTop: 6 }}>
            // 65 tickets restantes · eta 18s · no cierres la pestaña.
          </div>
        </div>
      </Spec>
    </Bay>
  );
}

/* V.05 Progress + Checklists */
function ProgressBay() {
  return (
    <Bay num="05" name="PROGRESO · PROGRESS" en="// linear · sleepers · checklist"
      lede="Tres formas: barra lineal yellow (para conocido), railway-sleepers segmentos (para discreto, p.ej. 'pasos del workflow'), y la checklist (subtareas).">
      <Spec serial="GS-LIB-V10" label="LINEAR · PERCENT">
        <div className="spec__col" style={{ maxWidth: 480 }}>
          {[
            { lbl: "Sprint S-04 · brake tests", p: 64, sub: "22 / 34 pts completados" },
            { lbl: "Workflow · M1",             p: 100,sub: "completo · listo para release" },
            { lbl: "Onboarding · Acme",         p: 12, sub: "1 de 8 pasos hechos" },
          ].map(r => (
            <div key={r.lbl}>
              <div style={{ display: "flex", justifyContent: "space-between" }}>
                <span style={{ fontFamily: "var(--font-display)", fontWeight: 700, fontSize: 13, color: "var(--eg-iron)", textTransform: "uppercase", letterSpacing: "0.01em" }}>{r.lbl}</span>
                <span className="mono" style={{ fontSize: 11, color: "var(--eg-iron)", fontWeight: 700, letterSpacing: "0.06em" }}>{r.p}%</span>
              </div>
              <div style={{ height: 10, border: "1.5px solid var(--eg-iron)", background: "var(--eg-paper-2)", margin: "4px 0", overflow: "hidden" }}>
                <div style={{
                  height: "100%", width: `${r.p}%`,
                  background: r.p === 100 ? "var(--eg-green)" : "var(--eg-yellow)",
                  borderRight: r.p < 100 ? "1.5px solid var(--eg-iron)" : 0
                }} />
              </div>
              <div className="mono" style={{ fontSize: 10, color: "var(--eg-fg-3)", letterSpacing: "0.06em" }}>// {r.sub}</div>
            </div>
          ))}
        </div>
      </Spec>

      <Spec serial="GS-LIB-V11" label="SLEEPERS · DISCRETE STEPS" stage="paper2"
        when="Cuando el progreso son pasos contables, no porcentaje. Workflow del ticket: backlog → todo → in-progress → review → done.">
        <div className="spec__col">
          <SleepersProgress steps={["Backlog", "To Do", "In Prog", "Review", "Done"]} current={2} />
          <SleepersProgress steps={["Cliente", "Proyecto", "Workflow", "Tarifas", "Equipo"]} current={1} />
          <SleepersProgress steps={["Pull", "Build", "Tests", "Deploy"]} current={3} />
        </div>
      </Spec>

      <Spec serial="GS-LIB-V12" label="CHECKLIST · SUBTASKS"
        when="Dentro de un drawer de ticket. Subtareas son hijas, no tickets — no llevan asset key.">
        <div style={{ maxWidth: 480 }}>
          <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 8 }}>
            <span className="caps">// SUBTAREAS · SUBTASKS</span>
            <span className="mono" style={{ fontSize: 11, color: "var(--eg-iron)", fontWeight: 700, letterSpacing: "0.06em" }}>3 / 5 ✓</span>
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
            {[
              { d: true,  t: "Reproducir el fallo en runtime",         time: "00:34" },
              { d: true,  t: "Aislar el componente — sensor o cable",  time: "01:08" },
              { d: true,  t: "Confirmar con manual de bogie",          time: "00:18" },
              { d: false, t: "Pedir pieza a almacén central",          time: "—"     },
              { d: false, t: "Pruebas post-cambio en S-05",            time: "—"     },
            ].map((s, i) => (
              <label key={i} style={{
                display: "flex", alignItems: "center", gap: 10,
                padding: "8px 12px", background: "var(--eg-paper)",
                border: "1.5px solid var(--eg-iron)",
                textDecoration: s.d ? "line-through" : "none",
                color: s.d ? "var(--eg-fg-3)" : "var(--eg-iron)",
                cursor: "pointer"
              }}>
                <Check checked={s.d} />
                <span style={{ flex: 1, fontFamily: "var(--font-body)", fontSize: 13 }}>{s.t}</span>
                <span className="mono" style={{ fontSize: 10, color: s.d ? "var(--eg-fg-4)" : "var(--eg-iron)", letterSpacing: "0.08em", fontWeight: 700 }}>{s.time}</span>
              </label>
            ))}
          </div>
        </div>
      </Spec>
    </Bay>
  );
}

function SleepersProgress({ steps, current }) {
  return (
    <div>
      <div style={{ display: "flex", gap: 4 }}>
        {steps.map((s, i) => (
          <div key={s} style={{
            flex: 1, height: 22, border: "1.5px solid var(--eg-iron)",
            background: i < current ? "var(--eg-yellow)" : i === current ? "repeating-linear-gradient(-45deg, var(--eg-yellow) 0 6px, var(--eg-iron) 6px 12px)" : "var(--eg-paper)",
            display: "flex", alignItems: "center", justifyContent: "center"
          }}>
            <span className="mono" style={{ fontSize: 10, color: i === current ? "var(--eg-paper)" : "var(--eg-iron)", fontWeight: 700, letterSpacing: "0.06em", textTransform: "uppercase" }}>{s}</span>
          </div>
        ))}
      </div>
      <div className="mono" style={{ fontSize: 10, color: "var(--eg-fg-3)", letterSpacing: "0.08em", marginTop: 4 }}>
        // paso {current + 1} de {steps.length} · {steps[current]} en curso
      </div>
    </div>
  );
}

/* V.06 Tooltip */
function TooltipBay() {
  return (
    <Bay num="06" name="TOOLTIP · LORE TOOLTIP" en="// .lore · ink + yellow border"
      lede="Tooltip es la respuesta a 'qué es esto?'. Lore-tooltip es la respuesta a 'por qué se llama así?' — apuntando a Sauron, Scrumlord, Velociraptor. Mismo render, diferente intención.">
      <Spec serial="GS-LIB-V13" label="TOOLTIP · STANDARD" stage="paper2">
        <div style={{ display: "flex", gap: 32, padding: "40px 0", justifyContent: "center" }}>
          <span className="lore" data-lore="// pg-boss worker que cierra sprints y limpia timers" style={{ display: "inline-flex" }}>
            <span className="plate">SCRUMLORD</span>
          </span>
          <span className="lore" data-lore="// audit log · puerto :666 · ve todo, no edita nada" style={{ display: "inline-flex" }}>
            <span className="plate plate--red">SAURON · :666</span>
          </span>
          <span className="lore" data-lore="// adaptadores frágiles, M4 · funciona por accidente" style={{ display: "inline-flex" }}>
            <span className="plate plate--yellow">CHAOS</span>
          </span>
        </div>
        <Cap es="hover sobre las placas · hover the plates" />
      </Spec>
    </Bay>
  );
}

Object.assign(window, { NavSection, FeedbackSection });
