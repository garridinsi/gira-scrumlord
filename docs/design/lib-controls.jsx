/* DEPÓSITO · III · Controles · Controls */

function ControlsSection() {
  return (
    <Sect
      id="controls"
      num="III"
      eyebrow="controles · controls · 8 bays"
      titleEs="CONTROLES."
      titleEn="Levers, switches, the things humans pull."
      meta={<>SERIE · GS-LIB-K<br /><b>24 piezas</b> · primarios + secundarios<br />todos con focus visible</>}
      intro="La promesa de un control industrial: cuando lo aprietas, sabes que lo apretaste. Hover levanta la pieza para mostrar su sombra. Click la baja contra la mesa. Focus enciende el yellow."
    >
      <ButtonsBay />
      <InputsBay />
      <ChoicesBay />
      <TogglesBay />
      <SegmentedBay />
      <SearchBay />
      <SliderBay />
      <ComboBay />
    </Sect>
  );
}

/* ─── 01 · Buttons ───────────────────────────────────────── */
function ButtonsBay() {
  return (
    <Bay num="01" name="BOTONES · BUTTONS" en="// .btn (big) · .b-btn (small) · 6 variants"
      lede="Dos tamaños. El grande para CTAs primarios (login, crear sprint). El pequeño para acciones inline en tablas, toolbars, drawer headers. Cada uno tiene 6 tintas.">
      <Spec serial="GS-LIB-K01" label="BIG · PRIMARY CTA · 6 VARIANTS"
        props=".btn · --brand · --yellow · --ink · --red · --ghost"
        when="Acción de página o de modal. Una por bloque visual — el primario es la promesa, los demás son escape."
        dont="Dos brand-yellow en la misma vista. Si tienes dos CTAs, uno es secundario (ink o ghost).">
        <div className="spec__col">
          <div className="spec__row" style={{ gap: 14 }}>
            <button className="btn">Default</button>
            <button className="btn btn--brand">Brand · gold</button>
            <button className="btn btn--yellow">Yellow · hi-vis</button>
            <button className="btn btn--ink">Ink · dark</button>
            <button className="btn btn--red">Red · stop</button>
            <button className="btn btn--ghost">Ghost</button>
          </div>
          <div className="spec__row" style={{ gap: 14 }}>
            <button className="btn btn--yellow">Crea Sprint · New Sprint →</button>
            <button className="btn btn--ink">Cierra Sprint · Close →</button>
            <button className="btn btn--red">Borrar · Delete</button>
            <button className="btn" disabled style={{ opacity: 0.45, cursor: "not-allowed" }}>Disabled</button>
          </div>
        </div>
      </Spec>

      <Spec serial="GS-LIB-K02" label="SMALL · INLINE · 6 VARIANTS · ALL STATES"
        props=".b-btn · --yellow · --ink · --gold · --red · --ghost · :hover · :active"
        when="Toolbar de un drawer, filtros, paginación, acciones secundarias en filas."
        dont="Para acciones destructivas mayores. Si es destructivo, usa .btn--red grande con confirmación.">
        <div className="spec__col">
          <div className="spec__row" style={{ gap: 10 }}>
            <button className="b-btn">+ Nuevo</button>
            <button className="b-btn b-btn--yellow">+ Crear · Create</button>
            <button className="b-btn b-btn--ink">Cierre · Close</button>
            <button className="b-btn b-btn--gold">Editar</button>
            <button className="b-btn b-btn--red">Eliminar</button>
            <button className="b-btn b-btn--ghost">Cancelar</button>
          </div>
          <div className="spec__row" style={{ gap: 10 }}>
            <Cap es="default · hairline" />
            <span style={{ width: 22 }} />
            <Cap es="yellow · primary" />
            <span style={{ width: 22 }} />
            <Cap es="ink · dark" />
            <span style={{ width: 22 }} />
            <Cap es="gold · brand" />
            <span style={{ width: 22 }} />
            <Cap es="red · destructive" />
            <span style={{ width: 22 }} />
            <Cap es="ghost · escape" />
          </div>
        </div>
      </Spec>

      <Spec serial="GS-LIB-K03" label="SMALL · WITH ICON · WITH CHIP"
        when="Acciones que llevan un contexto numérico — '12 pendientes', '+3 nuevos'.">
        <div className="spec__row" style={{ gap: 12 }}>
          <button className="b-btn b-btn--ink">▍ Filtrar <span className="chip chip--yellow" style={{ marginLeft: 6, padding: "1px 6px" }}>3</span></button>
          <button className="b-btn">⊕ Añadir worklog</button>
          <button className="b-btn b-btn--yellow">▶ Iniciar timer · Start</button>
          <button className="b-btn b-btn--ink">⏸ Pausar · Pause</button>
          <button className="b-btn b-btn--red">⊗ Cancelar timer</button>
          <button className="b-btn b-btn--ghost">↗ Abrir en pestaña</button>
          <button className="b-btn">↺ Reintentar</button>
        </div>
      </Spec>

      <Spec serial="GS-LIB-K04" label="ICON-ONLY · SQUARE"
        when="Toolbars verticales o densas. Siempre con tooltip. Nunca sin label accesible."
        dont="Como única manera de hacer una acción crítica. El icono-only es agilidad, no acceso.">
        <div className="spec__row" style={{ gap: 8 }}>
          {[
            { g: "▍",  l: "filtrar" },
            { g: "↺",  l: "recargar" },
            { g: "↗",  l: "abrir" },
            { g: "⊕",  l: "añadir" },
            { g: "⊗",  l: "cancelar" },
            { g: "★",  l: "favorito" },
            { g: "⋯",  l: "más" },
          ].map(b => (
            <button key={b.l} className="b-btn" title={b.l} style={{ padding: "6px 10px", fontFamily: "var(--font-mono)", fontSize: 14 }}>
              {b.g}
            </button>
          ))}
        </div>
      </Spec>

      <Spec serial="GS-LIB-K05" label="DESTRUCTIVE · ASKS FIRST"
        when="Borrar sprint con tickets adentro, cancelar tarjeta del cliente, romper un workflow."
        dont="Sin confirmación. Sin escribir el nombre. Sin contar lo que se pierde.">
        <div style={{
          border: "2px solid var(--eg-red)", background: "var(--eg-red-soft)",
          padding: "16px 18px", boxShadow: "3px 3px 0 var(--eg-iron)", maxWidth: 540
        }}>
          <div className="mono" style={{ fontSize: 10, color: "var(--eg-iron)", fontWeight: 700, letterSpacing: "0.14em", textTransform: "uppercase", marginBottom: 6 }}>
            // borrar sprint · DELETE SPRINT · 18 TICKETS DENTRO
          </div>
          <div className="disp" style={{ fontSize: 22, color: "var(--eg-iron)", lineHeight: 1.05, marginBottom: 8 }}>
            ESCRIBE EL NOMBRE PARA CONFIRMAR.<br />
            <span style={{ color: "var(--eg-red)" }}>S-04 · BRAKE TESTS</span>
          </div>
          <input
            placeholder="S-04 · Brake Tests"
            defaultValue="S-04 · Brake "
            style={{
              fontFamily: "var(--font-mono)", fontSize: 14,
              background: "var(--eg-paper)", border: "2px solid var(--eg-iron)",
              padding: "8px 10px", width: "100%", boxShadow: "2px 2px 0 var(--eg-iron)"
            }}
          />
          <div className="spec__row" style={{ gap: 10, marginTop: 12 }}>
            <button className="b-btn b-btn--red" disabled style={{ opacity: 0.55, cursor: "not-allowed" }}>Borrar para siempre</button>
            <button className="b-btn b-btn--ghost">Cancelar · Cancel</button>
          </div>
        </div>
      </Spec>
    </Bay>
  );
}

/* ─── 02 · Inputs / Textarea / Select ────────────────────── */
function InputsBay() {
  return (
    <Bay num="02" name="INPUTS · TEXTAREA · SELECT" en="// b-2 border · yellow-soft on focus"
      lede="Borde de 2px iron, default. Al hacer focus se pinta el fondo de yellow-soft y aparece un hardshadow — la 'pieza' se levanta hacia ti. No hay placeholder gris-claro decorativo; el placeholder es un compromiso.">
      <Spec serial="GS-LIB-K06" label="TEXT INPUT · 5 STATES"
        when="Default, with-value, focus, error, disabled."
        props=":focus → bg yellow-soft + shadow 3px · :error → border red">
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 18, maxWidth: 720 }}>
          <div>
            <div className="caps" style={{ marginBottom: 4 }}>// EMPTY · default</div>
            <input placeholder="eneko@mantenedor.eus" style={{ fontFamily: "var(--font-mono)", fontSize: 14 }} />
          </div>
          <div>
            <div className="caps" style={{ marginBottom: 4 }}>// FILLED · value</div>
            <input defaultValue="eneko@mantenedor.eus" style={{ fontFamily: "var(--font-mono)", fontSize: 14 }} />
          </div>
          <div>
            <div className="caps" style={{ marginBottom: 4 }}>// FOCUSED · yellow-soft</div>
            <input
              defaultValue="MTNR-42 · brake sensor"
              style={{
                fontFamily: "var(--font-mono)", fontSize: 14,
                background: "var(--eg-yellow-soft)",
                boxShadow: "3px 3px 0 var(--eg-iron)"
              }}
              autoFocus={false}
            />
          </div>
          <div>
            <div className="caps" style={{ marginBottom: 4, color: "var(--eg-red)" }}>// ERROR · border-red</div>
            <input
              defaultValue="eneko at example"
              style={{
                fontFamily: "var(--font-mono)", fontSize: 14,
                borderColor: "var(--eg-red)",
                boxShadow: "3px 3px 0 var(--eg-red)"
              }}
            />
            <div className="mono" style={{ fontSize: 10, color: "var(--eg-red)", marginTop: 4, letterSpacing: "0.12em", textTransform: "uppercase" }}>
              ▍ FORMATO INVÁLIDO · invalid · necesita @
            </div>
          </div>
          <div>
            <div className="caps" style={{ marginBottom: 4 }}>// DISABLED · readonly</div>
            <input
              disabled
              defaultValue="GIRA-1 (immutable)"
              style={{
                fontFamily: "var(--font-mono)", fontSize: 14,
                background: "var(--eg-paper-2)", color: "var(--eg-fg-3)",
                cursor: "not-allowed", borderColor: "var(--eg-rule)",
                boxShadow: "none"
              }}
            />
          </div>
          <div>
            <div className="caps" style={{ marginBottom: 4 }}>// PREFIXED · monetary · cents</div>
            <div style={{ display: "flex" }}>
              <span style={{
                fontFamily: "var(--font-mono)", fontSize: 14, fontWeight: 700,
                background: "var(--eg-iron)", color: "var(--eg-yellow)",
                padding: "12px 12px", borderLeft: "2px solid var(--eg-iron)",
                borderTop: "2px solid var(--eg-iron)", borderBottom: "2px solid var(--eg-iron)",
                letterSpacing: "0.1em"
              }}>EUR ¢</span>
              <input
                defaultValue="6500"
                style={{
                  fontFamily: "var(--font-mono)", fontSize: 14, fontWeight: 700,
                  borderLeft: 0
                }}
              />
            </div>
          </div>
        </div>
      </Spec>

      <Spec serial="GS-LIB-K07" label="LABEL · HELP · ERROR"
        when="Cada input lleva (1) label caps mono ES+EN, (2) opcional help mono más pequeño, (3) error rojo cuando aplica.">
        <div style={{ maxWidth: 520 }}>
          <label className="caps" style={{ display: "block", marginBottom: 6, color: "var(--eg-iron)" }}>
            // TARIFA POR HORA · HOURLY RATE · EUR
          </label>
          <div style={{ display: "flex" }}>
            <span style={{
              fontFamily: "var(--font-mono)", fontSize: 14, fontWeight: 700,
              background: "var(--eg-iron)", color: "var(--eg-yellow)",
              padding: "12px 12px", border: "2px solid var(--eg-iron)",
              borderRight: 0, letterSpacing: "0.1em"
            }}>€/h</span>
            <input
              defaultValue="65"
              style={{ fontFamily: "var(--font-mono)", fontSize: 14, fontWeight: 700 }}
            />
          </div>
          <div className="mono" style={{ fontSize: 11, color: "var(--eg-fg-3)", marginTop: 6, letterSpacing: "0.06em" }}>
            // se aplica a tiempo no-billable también, sólo no se factura.
          </div>
        </div>
      </Spec>

      <Spec serial="GS-LIB-K08" label="TEXTAREA · AUTOSIZE · CHAR COUNT"
        when="Comment composer, descripción de ticket, nota de release."
        dont="Para títulos cortos. Si cabe en una línea, usa input.">
        <div style={{ maxWidth: 640 }}>
          <div style={{ position: "relative" }}>
            <textarea
              defaultValue={`Brake sensor on bogie 14 reports 0 N at full load.\n\nReproducible on every freight run after 06:42. We need to swap the unit, not the cable — already verified continuity yesterday.`}
              style={{
                fontFamily: "var(--font-body)", fontSize: 14,
                minHeight: 120, resize: "vertical", width: "100%"
              }}
            />
            <span className="mono" style={{
              position: "absolute", right: 12, bottom: 10,
              fontSize: 10, color: "var(--eg-fg-3)", letterSpacing: "0.1em",
              background: "var(--eg-paper)", padding: "1px 6px",
              border: "1px solid var(--eg-rule)"
            }}>208 / 4000</span>
          </div>
          <div className="spec__row" style={{ gap: 8, marginTop: 10 }}>
            <button className="b-btn b-btn--ghost" style={{ padding: "4px 8px" }}>B</button>
            <button className="b-btn b-btn--ghost" style={{ padding: "4px 8px", fontStyle: "italic" }}>I</button>
            <button className="b-btn b-btn--ghost" style={{ padding: "4px 8px", fontFamily: "var(--font-mono)" }}>{"<>"}</button>
            <button className="b-btn b-btn--ghost" style={{ padding: "4px 8px" }}>@</button>
            <button className="b-btn b-btn--ghost" style={{ padding: "4px 8px" }}>#</button>
            <span style={{ marginLeft: "auto" }} />
            <button className="b-btn b-btn--ghost">Cancelar</button>
            <button className="b-btn b-btn--yellow">Comentar · Comment</button>
          </div>
        </div>
      </Spec>

      <Spec serial="GS-LIB-K09" label="SELECT · NATIVE-LIKE"
        when="Estados, tipo de issue, prioridad. Nunca para listas >12 — eso es combobox."
        props="select { border:2px iron; bg paper }">
        <div className="spec__row" style={{ gap: 14, alignItems: "flex-end" }}>
          <div>
            <label className="caps" style={{ display: "block", marginBottom: 4 }}>// ESTADO · STATUS</label>
            <div style={{ position: "relative", display: "inline-block" }}>
              <select defaultValue="s3" style={{
                fontFamily: "var(--font-mono)", fontSize: 13, width: 220,
                appearance: "none", paddingRight: 32
              }}>
                <option value="s1">Backlog</option>
                <option value="s2">To Do · Por Hacer</option>
                <option value="s3">In Progress · En Curso</option>
                <option value="s4">In Review · En Revisión</option>
                <option value="s5">Done · Hecho</option>
              </select>
              <span style={{
                position: "absolute", right: 10, top: "50%", transform: "translateY(-50%)",
                pointerEvents: "none", color: "var(--eg-iron)", fontFamily: "var(--font-mono)", fontWeight: 700
              }}>▼</span>
            </div>
          </div>
          <div>
            <label className="caps" style={{ display: "block", marginBottom: 4 }}>// TIPO · TYPE</label>
            <div style={{ position: "relative", display: "inline-block" }}>
              <select defaultValue="bug" style={{
                fontFamily: "var(--font-mono)", fontSize: 13, width: 200,
                appearance: "none", paddingRight: 32
              }}>
                <option value="task">T · Tarea</option>
                <option value="bug">B · Bug</option>
                <option value="story">S · Historia</option>
                <option value="epic">E · Épica</option>
              </select>
              <span style={{
                position: "absolute", right: 10, top: "50%", transform: "translateY(-50%)",
                pointerEvents: "none", color: "var(--eg-iron)", fontFamily: "var(--font-mono)", fontWeight: 700
              }}>▼</span>
            </div>
          </div>
        </div>
      </Spec>
    </Bay>
  );
}

/* ─── 03 · Check & Radio ─────────────────────────────────── */
function ChoicesBay() {
  return (
    <Bay num="03" name="CHECK · RADIO" en="// sharp box · sharp circle"
      lede="Checkboxes cuadrados. Radios redondos. El check pintado es un cuadradito amarillo dentro del cuadrado iron — como un sello dentro de un marco. El radio pintado es un circulito rojo.">
      <Spec serial="GS-LIB-K10" label="CHECKBOX · STATES" stage="paper2"
        when="Multi-selección, filtros, asignar labels, suscripciones."
        props="20×20 · 2px iron · y-check dentro de 12×12">
        <div className="spec__col">
          <div className="spec__row" style={{ gap: 28 }}>
            <Check label="Sin marcar · unchecked" />
            <Check checked label="Marcado · checked" />
            <Check indeterminate label="Indeterminado · indeterminate" />
            <Check disabled label="Bloqueado · disabled" />
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 6, padding: "12px 0 0", borderTop: "1px dashed var(--eg-iron)", maxWidth: 360 }}>
            <div className="caps" style={{ marginBottom: 4 }}>// ETIQUETAS · LABELS</div>
            <Check checked label={<span className="chip chip--ink" style={{ marginLeft: 4 }}>infra</span>} />
            <Check label={<span className="chip chip--red" style={{ marginLeft: 4 }}>p0</span>} />
            <Check checked label={<span className="chip chip--green" style={{ marginLeft: 4 }}>freight</span>} />
            <Check label={<span className="chip chip--gold" style={{ marginLeft: 4 }}>translation</span>} />
          </div>
        </div>
      </Spec>

      <Spec serial="GS-LIB-K11" label="RADIO · SINGLE CHOICE"
        when="Una y sólo una. Priority, workflow type, billing model.">
        <div className="spec__col">
          <div className="spec__row" style={{ gap: 28 }}>
            <Radio label="Bajo · low" />
            <Radio label="Medio · medium" />
            <Radio checked label="Alto · high" />
            <Radio label="Urgente · urgent" />
            <Radio disabled label="—" />
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 6, padding: "12px 0 0", borderTop: "1px dashed var(--eg-iron)", maxWidth: 480 }}>
            <div className="caps" style={{ marginBottom: 4 }}>// MODELO DE FACTURACIÓN · BILLING MODEL</div>
            <Radio name="bill" checked label={<><b style={{ color: "var(--eg-iron)" }}>Por horas</b> · hourly — registramos cada minuto trabajado</>} />
            <Radio name="bill" label={<><b style={{ color: "var(--eg-iron)" }}>Por punto</b> · per-point — facturamos puntos completados al cerrar sprint</>} />
            <Radio name="bill" label={<><b style={{ color: "var(--eg-iron)" }}>Retainer</b> · monthly — tarifa fija mensual, capacity capped</>} />
          </div>
        </div>
      </Spec>
    </Bay>
  );
}

function Check({ checked, indeterminate, disabled, label }) {
  return (
    <label style={{
      display: "inline-flex", alignItems: "center", gap: 10,
      fontFamily: "var(--font-body)", fontSize: 13,
      color: disabled ? "var(--eg-fg-4)" : "var(--eg-iron)",
      cursor: disabled ? "not-allowed" : "pointer"
    }}>
      <span style={{
        width: 20, height: 20, border: "2px solid var(--eg-iron)",
        background: disabled ? "var(--eg-paper-2)" : "var(--eg-paper)",
        boxShadow: disabled ? "none" : "1.5px 1.5px 0 var(--eg-iron)",
        position: "relative", display: "inline-block", flexShrink: 0
      }}>
        {checked && !indeterminate && (
          <span style={{
            position: "absolute", inset: 2,
            background: "var(--eg-yellow)",
            display: "flex", alignItems: "center", justifyContent: "center",
            color: "var(--eg-iron)", fontFamily: "var(--font-mono)",
            fontWeight: 700, fontSize: 11
          }}>✓</span>
        )}
        {indeterminate && (
          <span style={{
            position: "absolute", left: 3, right: 3, top: "50%",
            height: 3, background: "var(--eg-iron)", transform: "translateY(-50%)"
          }} />
        )}
      </span>
      <span>{label}</span>
    </label>
  );
}

function Radio({ checked, disabled, label, name = "r" }) {
  return (
    <label style={{
      display: "inline-flex", alignItems: "center", gap: 10,
      fontFamily: "var(--font-body)", fontSize: 13,
      color: disabled ? "var(--eg-fg-4)" : "var(--eg-iron)",
      cursor: disabled ? "not-allowed" : "pointer"
    }}>
      <span style={{
        width: 20, height: 20, borderRadius: "50%", border: "2px solid var(--eg-iron)",
        background: disabled ? "var(--eg-paper-2)" : "var(--eg-paper)",
        boxShadow: disabled ? "none" : "1.5px 1.5px 0 var(--eg-iron)",
        position: "relative", display: "inline-block", flexShrink: 0
      }}>
        {checked && (
          <span style={{
            position: "absolute", inset: 3, borderRadius: "50%",
            background: "var(--eg-red)"
          }} />
        )}
      </span>
      <span>{label}</span>
    </label>
  );
}

/* ─── 04 · Toggles ───────────────────────────────────────── */
function TogglesBay() {
  return (
    <Bay num="04" name="TOGGLES · SWITCHES" en="// industrial mechanical"
      lede="Switch tipo interruptor de pared — rectangular, con un knob iron grande que va de izquierda (off) a derecha (on). Cuando enciende, la pista se pinta de amarillo y aparece la palabra ON · ENCENDIDO.">
      <Spec serial="GS-LIB-K12" label="TOGGLE · 3 STATES + LABEL"
        when="Settings, feature flags, billable on/off por ticket."
        dont="Para opciones que no son binarias. Si tiene un 'tal vez', es radio.">
        <div className="spec__col">
          <div className="spec__row" style={{ gap: 28 }}>
            <Toggle label="Facturable · billable" />
            <Toggle on label="Notificar · notify" />
            <Toggle disabled label="Bloqueado · locked" />
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14, padding: "12px 0 0", borderTop: "1px dashed var(--eg-iron)", maxWidth: 720 }}>
            <SettingRow label="Time tracking obligatorio" en="enforce timer · disallow manual entry" on />
            <SettingRow label="Notificación al cliente" en="email client on status change" />
            <SettingRow label="Webhooks salientes" en="outgoing webhooks" on />
            <SettingRow label="Audit log a archivo" en="audit log to file · in addition to db" />
          </div>
        </div>
      </Spec>
    </Bay>
  );
}

function Toggle({ on: initOn = false, disabled, label }) {
  const [on, setOn] = React.useState(initOn);
  React.useEffect(() => setOn(initOn), [initOn]);
  return (
    <label style={{
      display: "inline-flex", alignItems: "center", gap: 12,
      cursor: disabled ? "not-allowed" : "pointer",
      color: disabled ? "var(--eg-fg-4)" : "var(--eg-iron)",
      fontFamily: "var(--font-body)", fontSize: 13
    }}>
      <span
        onClick={() => !disabled && setOn(o => !o)}
        style={{
          width: 56, height: 28,
          background: on ? "var(--eg-yellow)" : "var(--eg-paper-2)",
          border: "2px solid var(--eg-iron)", position: "relative",
          opacity: disabled ? 0.55 : 1,
          transition: "background 100ms cubic-bezier(.2,0,0,1)"
        }}
      >
        <span style={{
          position: "absolute", top: 1, left: on ? 28 : 1,
          width: 22, height: 22, background: "var(--eg-iron)",
          transition: "left 100ms cubic-bezier(.2,0,0,1)",
          boxShadow: "1px 1px 0 var(--eg-paper-3)"
        }} />
        <span style={{
          position: "absolute", inset: 0,
          display: "flex", alignItems: "center",
          justifyContent: on ? "flex-start" : "flex-end",
          padding: "0 6px",
          fontFamily: "var(--font-mono)", fontSize: 8, fontWeight: 700,
          color: on ? "var(--eg-iron)" : "var(--eg-fg-3)",
          letterSpacing: "0.1em", pointerEvents: "none"
        }}>
          {on ? "ON" : "OFF"}
        </span>
      </span>
      <span>{label}</span>
    </label>
  );
}

function SettingRow({ label, en, on }) {
  return (
    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12, padding: "8px 12px", border: "1.5px solid var(--eg-iron)", background: "var(--eg-paper)" }}>
      <div>
        <div style={{ fontFamily: "var(--font-display)", fontWeight: 700, fontSize: 14, color: "var(--eg-iron)", textTransform: "uppercase", letterSpacing: "0.01em" }}>{label}</div>
        <div className="mono" style={{ fontSize: 10, color: "var(--eg-fg-3)", letterSpacing: "0.08em" }}>// {en}</div>
      </div>
      <Toggle on={on} />
    </div>
  );
}

/* ─── 05 · Segmented control ─────────────────────────────── */
function SegmentedBay() {
  const [t, setT] = React.useState(1);
  const [v, setV] = React.useState(0);
  return (
    <Bay num="05" name="SEGMENTADO" en="// segmented · 2–4 options"
      lede="Para alternar entre 2–4 vistas que comparten ancla mental. Más opciones que eso = tabs. Diferencia importante: tabs cambia de pantalla, segmented cambia de cómo se mira la misma pantalla.">
      <Spec serial="GS-LIB-K13" label="SEGMENTED · 3 EXAMPLES"
        props="border 2px iron · current = ink+yellow · hover = paper-2">
        <div className="spec__col">
          <Segmented
            options={["Tablero", "Lista", "Tabla"]}
            value={t} onChange={setT}
          />
          <Segmented
            options={["7d", "30d", "Sprint", "Cliente"]}
            value={v} onChange={setV}
            small
          />
          <Segmented
            options={["ES", "EN", "EU"]}
            value={0} onChange={() => {}}
            small
            title="Idioma · language"
          />
        </div>
      </Spec>
    </Bay>
  );
}

function Segmented({ options, value, onChange, small, title }) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
      {title && <span className="mono" style={{ fontSize: 11, color: "var(--eg-fg-3)", letterSpacing: "0.12em", textTransform: "uppercase" }}>// {title}</span>}
      <div style={{ display: "inline-flex", border: "2px solid var(--eg-iron)", background: "var(--eg-paper)", boxShadow: "2px 2px 0 var(--eg-iron)" }}>
        {options.map((o, i) => {
          const active = i === value;
          return (
            <button
              key={o}
              onClick={() => onChange(i)}
              style={{
                background: active ? "var(--eg-iron)" : "transparent",
                color: active ? "var(--eg-yellow)" : "var(--eg-iron)",
                border: 0, borderRight: i < options.length - 1 ? "1.5px solid var(--eg-iron)" : 0,
                fontFamily: "var(--font-display)", fontWeight: 700,
                fontSize: small ? 12 : 13,
                textTransform: "uppercase", letterSpacing: "0.04em",
                padding: small ? "6px 12px" : "8px 16px",
                cursor: "pointer"
              }}
            >{o}</button>
          );
        })}
      </div>
    </div>
  );
}

/* ─── 06 · Search ────────────────────────────────────────── */
function SearchBay() {
  return (
    <Bay num="06" name="BÚSQUEDA · SEARCH" en="// topbar variant + standalone"
      lede="Mono input. La búsqueda no es prosa, es asset numbers, sprint IDs, fragments de título. Lleva siempre un kbd hint con /.">
      <Spec serial="GS-LIB-K14" label="TOPBAR SEARCH · INK · WIDE" stage="ink"
        when="Posición central de la topbar, ancho flexible. Sin label visible — la kbd hint hace de prompt.">
        <div style={{
          background: "var(--eg-iron-2)", border: "1px solid var(--eg-iron-3)",
          padding: "10px 14px", display: "flex", alignItems: "center", gap: 12
        }}>
          <span className="mono" style={{ color: "var(--eg-yellow)", fontSize: 11, letterSpacing: "0.12em", textTransform: "uppercase", fontWeight: 700 }}>//</span>
          <input
            placeholder="Buscar · search · MTNR-42 · brake · @maite"
            defaultValue=""
            style={{
              background: "transparent", border: 0, outline: 0,
              color: "var(--eg-paper)", flex: 1, fontFamily: "var(--font-mono)", fontSize: 13,
              padding: 0
            }}
          />
          <span style={{
            fontFamily: "var(--font-mono)", fontSize: 10, fontWeight: 600,
            background: "var(--eg-iron)", color: "var(--eg-fg-5)",
            padding: "2px 6px", border: "1px solid var(--eg-iron-3)"
          }}>/</span>
        </div>
      </Spec>

      <Spec serial="GS-LIB-K15" label="STANDALONE · WITH DROPDOWN RESULTS" stage="paper2">
        <div style={{
          background: "var(--eg-paper)", border: "2px solid var(--eg-iron)",
          boxShadow: "3px 3px 0 var(--eg-iron)", maxWidth: 560
        }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10, padding: "10px 14px", borderBottom: "1.5px solid var(--eg-iron)" }}>
            <span className="mono" style={{ color: "var(--eg-fg-3)", fontSize: 11, letterSpacing: "0.12em", textTransform: "uppercase", fontWeight: 700 }}>//</span>
            <input
              defaultValue="brake"
              style={{
                background: "transparent", border: 0, outline: 0,
                color: "var(--eg-iron)", flex: 1, fontFamily: "var(--font-mono)", fontSize: 14,
                padding: 0
              }}
            />
            <span style={{ fontFamily: "var(--font-mono)", fontSize: 10, color: "var(--eg-fg-3)", letterSpacing: "0.1em" }}>3 / 84</span>
          </div>
          {[
            { k: "MTNR-42", t: "Brake sensor on bogie 14 returns 0N", chip: "B", chipCls: "type-bug" },
            { k: "MTNR-39", t: "Brake tests · timetable D-3 review",   chip: "T", chipCls: "type-task" },
            { k: "RAIL-12", t: "Bogie brake log: missing entries 04-12",chip: "S", chipCls: "type-story" },
          ].map((r, i) => (
            <div key={r.k} style={{
              padding: "10px 14px", display: "flex", alignItems: "center", gap: 12,
              borderBottom: i < 2 ? "1px dashed var(--eg-iron)" : 0,
              background: i === 0 ? "var(--eg-yellow-soft)" : "transparent"
            }}>
              <span className={`type-chip ${r.chipCls}`}>{r.chip}</span>
              <span className="mono" style={{ fontSize: 11, color: "var(--eg-iron)", fontWeight: 700, letterSpacing: "0.06em" }}>{r.k}</span>
              <span style={{ fontFamily: "var(--font-body)", fontSize: 13, color: "var(--eg-fg-2)", flex: 1 }}>{r.t.replace(/(brake)/i, (m) => m)}</span>
              {i === 0 && <span className="kbd-key" style={{ fontSize: 10, padding: "0 4px", minWidth: 0 }}>↵</span>}
            </div>
          ))}
        </div>
      </Spec>
    </Bay>
  );
}

/* ─── 07 · Slider ────────────────────────────────────────── */
function SliderBay() {
  const [v, setV] = React.useState(40);
  return (
    <Bay num="07" name="SLIDER" en="// rare · sprint capacity, font-size, opacity"
      lede="Industrial: pista cuadrada, knob también cuadrado, sin gradient. Marcas pequeñas a intervalos. Sólo cuando un input numérico no comunica el rango.">
      <Spec serial="GS-LIB-K16" label="SLIDER · 0–100 · ticks"
        props=".gs-slider · 4 ticks visible · ink knob">
        <div style={{ maxWidth: 480 }}>
          <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 6 }}>
            <span className="caps" style={{ color: "var(--eg-iron)" }}>// CAPACIDAD · CAPACITY</span>
            <span className="mono" style={{ color: "var(--eg-iron)", fontWeight: 700, fontSize: 12, letterSpacing: "0.06em" }}>{v}%</span>
          </div>
          <div style={{ position: "relative", height: 28 }}>
            <div style={{
              position: "absolute", left: 0, right: 0, top: 12, height: 6,
              background: "var(--eg-paper-3)", border: "1.5px solid var(--eg-iron)"
            }} />
            <div style={{
              position: "absolute", left: 0, top: 12, height: 6, width: `${v}%`,
              background: "var(--eg-yellow)", border: "1.5px solid var(--eg-iron)",
              borderRight: 0
            }} />
            {[0, 25, 50, 75, 100].map(p => (
              <span key={p} style={{
                position: "absolute", left: `calc(${p}% - 0.5px)`, top: 22,
                width: 1, height: 4, background: "var(--eg-iron)"
              }} />
            ))}
            <input
              type="range" min={0} max={100} value={v} onChange={(e) => setV(+e.target.value)}
              style={{
                position: "absolute", inset: 0, opacity: 0, cursor: "pointer", width: "100%", height: "100%", margin: 0
              }}
            />
            <span style={{
              position: "absolute", left: `calc(${v}% - 10px)`, top: 6,
              width: 20, height: 20, background: "var(--eg-iron)",
              boxShadow: "1.5px 1.5px 0 var(--eg-paper-3)",
              pointerEvents: "none"
            }} />
          </div>
          <div className="spec__row" style={{ gap: 16, marginTop: 14 }}>
            {[0, 25, 50, 75, 100].map(p => (
              <Cap key={p} es={`${p}%`} />
            ))}
          </div>
        </div>
      </Spec>
    </Bay>
  );
}

/* ─── 08 · Combobox / Mention picker ─────────────────────── */
function ComboBay() {
  return (
    <Bay num="08" name="COMBOBOX · MENTION" en="// users · labels · projects"
      lede="Búsqueda + lista. La diferencia con un select: lleva su propio query, y el listado incluye foto-placeholder (avatar) y context (rol, cliente).">
      <Spec serial="GS-LIB-K17" label="ASSIGN PICKER · OPEN"
        when="Asignar ticket, añadir watcher, mencionar en comentario.">
        <div style={{
          width: 360, border: "2px solid var(--eg-iron)",
          background: "var(--eg-paper)", boxShadow: "4px 4px 0 var(--eg-iron)"
        }}>
          <div style={{ padding: "8px 12px", borderBottom: "1.5px solid var(--eg-iron)", display: "flex", alignItems: "center", gap: 10 }}>
            <span className="mono" style={{ color: "var(--eg-fg-3)", fontSize: 11, letterSpacing: "0.12em", textTransform: "uppercase", fontWeight: 700 }}>@</span>
            <input
              defaultValue="ma"
              style={{
                background: "transparent", border: 0, outline: 0,
                fontFamily: "var(--font-mono)", fontSize: 13, color: "var(--eg-iron)",
                flex: 1, padding: 0
              }}
            />
            <span className="mono" style={{ fontSize: 10, color: "var(--eg-fg-3)", letterSpacing: "0.1em" }}>esc</span>
          </div>
          {[
            { hue: "yellow", initials: "MR", name: "Maite Rekalde",        role: "member · staff",    chip: "STAFF",  hi: true },
            { hue: "gold",   initials: "JI", name: "Jon Ibarguren",        role: "member · staff",    chip: "STAFF" },
            { hue: "red",    initials: "WC", name: "Wile E. Coyote",       role: "viewer · client",   chip: "CLIENT", warn: true },
            { hue: "yellow", initials: "RR", name: "R. Runner",            role: "viewer · client",   chip: "CLIENT", warn: true },
          ].map((u, i) => (
            <div key={u.initials} style={{
              display: "flex", alignItems: "center", gap: 10, padding: "8px 12px",
              borderBottom: i < 3 ? "1px dashed var(--eg-iron)" : 0,
              background: u.hi ? "var(--eg-yellow-soft)" : "transparent"
            }}>
              <span className={`avatar avatar--${u.hue}`}>{u.initials}</span>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontFamily: "var(--font-display)", fontWeight: 700, fontSize: 14, color: "var(--eg-iron)", textTransform: "uppercase", letterSpacing: "0.01em" }}>{u.name}</div>
                <div className="mono" style={{ fontSize: 10, color: "var(--eg-fg-3)", letterSpacing: "0.08em" }}>// {u.role}</div>
              </div>
              <span className={u.warn ? "chip chip--red" : "chip"} style={{ fontSize: 9, padding: "1px 6px" }}>{u.chip}</span>
              {u.hi && <span className="kbd-key" style={{ fontSize: 10, padding: "0 4px", minWidth: 0 }}>↵</span>}
            </div>
          ))}
          <div style={{ padding: "6px 12px", display: "flex", justifyContent: "space-between", alignItems: "center", background: "var(--eg-paper-2)", borderTop: "1px dashed var(--eg-iron)" }}>
            <span className="mono" style={{ fontSize: 10, color: "var(--eg-fg-3)", letterSpacing: "0.1em", textTransform: "uppercase" }}>
              <span className="kbd-key" style={{ fontSize: 9, padding: "0 4px", minWidth: 0 }}>↑</span> <span className="kbd-key" style={{ fontSize: 9, padding: "0 4px", minWidth: 0 }}>↓</span> navegar
            </span>
            <span className="mono" style={{ fontSize: 10, color: "var(--eg-fg-3)", letterSpacing: "0.1em", textTransform: "uppercase" }}>
              2 staff · 2 client
            </span>
          </div>
        </div>
      </Spec>

      <Spec serial="GS-LIB-K18" label="LABEL PICKER · MULTI" stage="paper2"
        when="Aplicar varias labels a un ticket — selección múltiple, con counter en la trigger.">
        <div style={{ display: "flex", gap: 18, alignItems: "flex-start" }}>
          <div className="f-pill">▍ <b>Labels</b> · <span className="chip chip--ink" style={{ fontSize: 9 }}>infra</span> <span className="chip chip--green" style={{ fontSize: 9 }}>freight</span> <span style={{ color: "var(--eg-fg-3)" }}>+2</span></div>

          <div style={{
            width: 280, border: "2px solid var(--eg-iron)",
            background: "var(--eg-paper)", boxShadow: "3px 3px 0 var(--eg-iron)"
          }}>
            <div style={{ padding: "6px 10px", borderBottom: "1.5px solid var(--eg-iron)", display: "flex", alignItems: "center", gap: 8 }}>
              <span className="mono" style={{ fontSize: 11, color: "var(--eg-fg-3)", fontWeight: 700 }}>//</span>
              <input placeholder="filtrar labels"
                style={{ border: 0, outline: 0, background: "transparent", flex: 1, fontFamily: "var(--font-mono)", fontSize: 12 }} />
            </div>
            {[
              { n: "infra",      c: "ink",    on: true },
              { n: "p0",         c: "red",    on: false },
              { n: "freight",    c: "green",  on: true },
              { n: "translation",c: "gold",   on: true },
              { n: "needs-spec", c: "yellow", on: false },
              { n: "cost-impact",c: "red",    on: true },
              { n: "lore",       c: "ink",    on: false },
            ].map((l, i) => (
              <label key={l.n} style={{
                display: "flex", alignItems: "center", gap: 10, padding: "6px 10px",
                cursor: "pointer", borderBottom: i < 6 ? "1px dashed var(--eg-iron)" : 0
              }}>
                <Check checked={l.on} label={<span className={`chip chip--${l.c}`} style={{ marginLeft: 2 }}>{l.n}</span>} />
              </label>
            ))}
          </div>
        </div>
      </Spec>
    </Bay>
  );
}

Object.assign(window, { ControlsSection });
