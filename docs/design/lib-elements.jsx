/* DEPÓSITO · II · Elementos · Elements */

function ElementsSection() {
  return (
    <Sect
      id="elements"
      num="II"
      eyebrow="elementos · elements · 8 bays"
      titleEs="ELEMENTOS."
      titleEn="The smallest things that wear the brand."
      meta={<>SERIE · GS-LIB-E<br /><b>32 piezas</b> · todas hechas de fundamentos<br />no acepta ninguna pieza nueva sin estos</>}
      intro="Después del color y el tipo vienen las piezas atómicas — placas, chips, avatares, status dots, glifos de teclado, asset tags. Si lo ves en pantalla y no es un Composición, probablemente es uno de éstos."
    >
      <PlatesBay />
      <ChipsBay />
      <TypeChipsBay />
      <AvatarsBay />
      <StatusBay />
      <KbdBay />
      <BiBay />
      <AssetTagBay />
    </Sect>
  );
}

/* ─── 01 · Plates ────────────────────────────────────────── */
function PlatesBay() {
  return (
    <Bay num="01" name="PLACAS · RIVETED PLATES" en="// .plate · default / yellow / red"
      lede="La placa es el componente firma del sistema. Iron por defecto, hi-vis para énfasis, red para emergencia. Los rivets amarillos a izquierda y derecha la atornillan al chasis.">
      <Spec serial="GS-LIB-E01" label="PLACAS · 3 VARIANTS"
        props=".plate · .plate--yellow · .plate--red"
        when="Etiqueta corta riveted sobre una hero. Como subtítulo arriba de un H1. Como header de un drawer."
        dont="Nunca dentro de body. Nunca con texto >24 caracteres. La placa no es un chip — el chip es ligero, la placa es protocolo.">
        <div className="spec__row" style={{ gap: 18 }}>
          <span className="plate">BOARDING · PASS</span>
          <span className="plate plate--yellow">PROYECTO · NUEVO</span>
          <span className="plate plate--red">EMERGENCIA · STOP</span>
          <span className="plate" style={{ fontSize: 13 }}>GIRA · SCRUMLORD · M1</span>
          <span className="plate plate--yellow" style={{ fontSize: 9 }}>// MUY · PEQUEÑA</span>
        </div>
      </Spec>
    </Bay>
  );
}

/* ─── 02 · Chips ─────────────────────────────────────────── */
function ChipsBay() {
  return (
    <Bay num="02" name="CHIPS · ASSET-TAG PILLS" en="// 5 brand + 5 priority + custom"
      lede="Los chips son las etiquetas baratas — labels, tags, status pequeño. La diferencia con la placa: el chip lleva mucha info por línea y no tiene rivets.">
      <Spec serial="GS-LIB-E02" label="BRAND VARIANTS"
        props=".chip · --yellow · --gold · --ink · --red · --green"
        when="Categoría neutra. Color sólo si el chip lleva semántica (estado, tipo, dueño).">
        <div className="spec__row" style={{ gap: 10 }}>
          <span className="chip">neutral</span>
          <span className="chip chip--yellow">yellow</span>
          <span className="chip chip--gold">gold</span>
          <span className="chip chip--ink">ink</span>
          <span className="chip chip--red">red</span>
          <span className="chip chip--green">green</span>
        </div>
      </Spec>

      <Spec serial="GS-LIB-E03" label="PRIORITY · TICKETS · ASCENDING"
        props=".chip--low · medium · high · urgent · emergency"
        when="Sólo en tickets / sprint rows / drawer header. La emergencia tiene hazard stripes — la única que muerde a la pantalla."
        dont="Nunca uses emergency fuera de un ticket. Nunca lo hagas el default. Es un grito, no una etiqueta.">
        <div className="spec__col">
          <div className="spec__row" style={{ gap: 10 }}>
            <span className="chip chip--low">low</span>
            <span className="chip chip--medium">medium</span>
            <span className="chip chip--high">high</span>
            <span className="chip chip--urgent">urgent</span>
            <span className="chip chip--emergency"><span>EMERGENCIA</span></span>
          </div>
          <div className="spec__row" style={{ gap: 10 }}>
            <Cap es="bajo · low" />
            <span style={{ width: 56 }} />
            <Cap es="medio · med" />
            <span style={{ width: 36 }} />
            <Cap es="alto · high" />
            <span style={{ width: 44 }} />
            <Cap es="urgente · urgent" />
            <span style={{ width: 24 }} />
            <Cap es="emergencia · break-glass" />
          </div>
        </div>
      </Spec>

      <Spec serial="GS-LIB-E04" label="LABELS · CUSTOM" stage="paper2"
        when="Tags de proyecto definidos por el cliente. Se pintan del color que el usuario elige; preview de las opciones brand-safe.">
        <div className="spec__row" style={{ gap: 10 }}>
          <span className="chip chip--ink">infra</span>
          <span className="chip chip--red">p0</span>
          <span className="chip chip--green">freight</span>
          <span className="chip chip--gold">translation</span>
          <span className="chip chip--yellow">needs-spec</span>
          <span className="chip chip--red">cost-impact</span>
          <span className="chip chip--ink">lore</span>
          <span className="chip">euskara</span>
        </div>
      </Spec>
    </Bay>
  );
}

/* ─── 03 · Type-chips (issue type indicator) ─────────────── */
function TypeChipsBay() {
  return (
    <Bay num="03" name="TIPO · ISSUE TYPE" en="// .type-chip · T B S E"
      lede="Cuadrado de 18px que acompaña a cada ticket. Una sola letra. Cuatro colores fijos. Aprendes el sistema en 5 segundos.">
      <Spec serial="GS-LIB-E05" label="TYPE CHIPS · TASK · BUG · STORY · EPIC"
        props="T = task (paper) · B = bug (red) · S = story (green) · E = epic (ink)">
        <div className="spec__row" style={{ gap: 28, alignItems: "flex-start" }}>
          {[
            { cls: "type-task",  ltr: "T", es: "tarea",   en: "task" },
            { cls: "type-bug",   ltr: "B", es: "bug",     en: "bug" },
            { cls: "type-story", ltr: "S", es: "historia",en: "story" },
            { cls: "type-epic",  ltr: "E", es: "épica",   en: "epic" },
          ].map(t => (
            <div key={t.cls} style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 8 }}>
              <div className={`type-chip ${t.cls}`}>{t.ltr}</div>
              <Cap es={t.es} en={t.en} />
            </div>
          ))}
        </div>
      </Spec>
    </Bay>
  );
}

/* ─── 04 · Avatars ───────────────────────────────────────── */
function AvatarsBay() {
  return (
    <Bay num="04" name="AVATARES · INITIALS" en="// no images · type-first"
      lede="Sin fotos. Iniciales mono sobre un fondo de marca. El usuario elige su tinta — yellow, gold, green, red, ink, paper. Default es paper-2.">
      <Spec serial="GS-LIB-E06" label="AVATAR · TWO SIZES · SIX HUES"
        props=".avatar (22px) · .avatar--lg (32px) · --yellow / --gold / --green / --red / --ink">
        <div className="spec__col">
          <div className="spec__row" style={{ gap: 14, alignItems: "center" }}>
            <span className="avatar">EG</span>
            <span className="avatar avatar--yellow">MR</span>
            <span className="avatar avatar--gold">JI</span>
            <span className="avatar avatar--green">AL</span>
            <span className="avatar avatar--red">WC</span>
            <span className="avatar avatar--ink">RR</span>
            <span style={{ marginLeft: 24, fontFamily: "var(--font-mono)", fontSize: 11, color: "var(--eg-fg-3)", letterSpacing: "0.12em", textTransform: "uppercase" }}>22 PX · INLINE</span>
          </div>
          <div className="spec__row" style={{ gap: 14, alignItems: "center" }}>
            <span className="avatar avatar--lg">EG</span>
            <span className="avatar avatar--lg avatar--yellow">MR</span>
            <span className="avatar avatar--lg avatar--gold">JI</span>
            <span className="avatar avatar--lg avatar--green">AL</span>
            <span className="avatar avatar--lg avatar--red">WC</span>
            <span className="avatar avatar--lg avatar--ink">RR</span>
            <span style={{ marginLeft: 24, fontFamily: "var(--font-mono)", fontSize: 11, color: "var(--eg-fg-3)", letterSpacing: "0.12em", textTransform: "uppercase" }}>32 PX · HEADER</span>
          </div>
        </div>
      </Spec>

      <Spec serial="GS-LIB-E07" label="STACKED · MULTI-ASSIGNEE"
        when="Hasta 3 visibles + counter. Más de 3 personas en un ticket es 'falta scope', no falta UI."
        dont="Stacks circulares (overlapping rings). Nuestros avatares son cuadrados — solapan en cuadrado.">
        <div className="spec__row" style={{ gap: 20 }}>
          <div style={{ display: "inline-flex" }}>
            <span className="avatar avatar--gold" style={{ marginRight: -8 }}>EG</span>
            <span className="avatar avatar--yellow" style={{ marginRight: -8 }}>MR</span>
            <span className="avatar avatar--green">AL</span>
          </div>
          <div style={{ display: "inline-flex" }}>
            <span className="avatar avatar--ink" style={{ marginRight: -8 }}>EG</span>
            <span className="avatar avatar--red" style={{ marginRight: -8 }}>WC</span>
            <span className="avatar avatar--gold" style={{ marginRight: -8 }}>JI</span>
            <span className="avatar" style={{
              background: "var(--eg-iron)", color: "var(--eg-yellow)"
            }}>+4</span>
          </div>
          <div style={{ display: "inline-flex" }}>
            <span className="avatar" style={{ background: "var(--eg-paper-3)", color: "var(--eg-fg-3)" }}>?</span>
            <span className="mono" style={{ marginLeft: 8, fontSize: 11, color: "var(--eg-fg-3)", letterSpacing: "0.1em", textTransform: "uppercase" }}>sin asignar · unassigned</span>
          </div>
        </div>
      </Spec>
    </Bay>
  );
}

/* ─── 05 · Status dots & live indicators ─────────────────── */
function StatusBay() {
  return (
    <Bay num="05" name="ESTADO · DOTS" en="// go · stop · wait · live"
      lede="Cuatro semáforos. Verde 'va', rojo 'para', amarillo 'espera', y rojo intermitente para 'en vivo'. Si pestañea, está sucediendo ahora.">
      <Spec serial="GS-LIB-E08" label="STATUS DOTS · 4 STATES" status="LIVE" statusKind="live">
        <div className="spec__row" style={{ gap: 32 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <span style={{ width: 12, height: 12, background: "var(--eg-green)", borderRadius: "50%", border: "1.5px solid var(--eg-iron)" }} />
            <span className="mono" style={{ fontSize: 11, letterSpacing: "0.12em", textTransform: "uppercase", color: "var(--eg-iron)" }}>OK · GO</span>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <span style={{ width: 12, height: 12, background: "var(--eg-red)", borderRadius: "50%", border: "1.5px solid var(--eg-iron)" }} />
            <span className="mono" style={{ fontSize: 11, letterSpacing: "0.12em", textTransform: "uppercase", color: "var(--eg-iron)" }}>FAIL · STOP</span>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <span style={{ width: 12, height: 12, background: "var(--eg-yellow)", borderRadius: "50%", border: "1.5px solid var(--eg-iron)" }} />
            <span className="mono" style={{ fontSize: 11, letterSpacing: "0.12em", textTransform: "uppercase", color: "var(--eg-iron)" }}>WAIT · CAUTION</span>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <span style={{ width: 12, height: 12, background: "var(--eg-red)", borderRadius: "50%", border: "1.5px solid var(--eg-iron)", animation: "blink 1.4s steps(2) infinite" }} />
            <span className="mono" style={{ fontSize: 11, letterSpacing: "0.12em", textTransform: "uppercase", color: "var(--eg-iron)" }}>LIVE · NOW</span>
          </div>
        </div>
      </Spec>

      <Spec serial="GS-LIB-E09" label="STATUS INLINE · WITH PLATE"
        when="En toolbars, headers de daemon, scrumlord overview." stage="ink">
        <div className="spec__row" style={{ gap: 18 }}>
          <span className="plate plate--yellow" style={{ fontSize: 11 }}>SCRUMLORD · DAEMON</span>
          <span style={{ display: "inline-flex", alignItems: "center", gap: 6 }}>
            <span style={{ width: 8, height: 8, background: "var(--eg-green)", borderRadius: "50%", border: "1px solid var(--eg-iron)" }} />
            <span className="mono" style={{ fontSize: 11, color: "var(--eg-yellow)", letterSpacing: "0.12em", textTransform: "uppercase", fontWeight: 700 }}>RUN · 14d 03:18</span>
          </span>
          <span className="plate plate--red" style={{ fontSize: 11 }}>SAURON · :666</span>
          <span style={{ display: "inline-flex", alignItems: "center", gap: 6 }}>
            <span style={{ width: 8, height: 8, background: "var(--eg-red)", borderRadius: "50%", border: "1px solid var(--eg-paper)", animation: "blink 1.4s steps(2) infinite" }} />
            <span className="mono" style={{ fontSize: 11, color: "var(--eg-yellow)", letterSpacing: "0.12em", textTransform: "uppercase", fontWeight: 700 }}>WATCHING</span>
          </span>
        </div>
      </Spec>
    </Bay>
  );
}

/* ─── 06 · Kbd keys ──────────────────────────────────────── */
function KbdBay() {
  const single = ["A", "B", "C", "G", "N", "P", "/", "?", "Esc"];
  return (
    <Bay num="06" name="TECLAS · KEYBOARD" en="// .kbd-key · raised, mono"
      lede="Mismo lenguaje que las placas — sharp, bordered, con offset shadow chiquito. No usamos iconos de tecla; usamos texto.">
      <Spec serial="GS-LIB-E10" label="KBD · SINGLE & COMBO"
        when="Tooltip de atajos, menú de comandos, ayuda inline."
        props=".kbd-key">
        <div className="spec__col">
          <div className="spec__row" style={{ gap: 8 }}>
            {single.map(k => <span key={k} className="kbd-key">{k}</span>)}
          </div>
          <div className="spec__row" style={{ gap: 16 }}>
            <span style={{ display: "inline-flex", alignItems: "center", gap: 6 }}>
              <span className="kbd-key">⌘</span><span style={{ color: "var(--eg-fg-3)" }}>+</span><span className="kbd-key">K</span>
              <span className="mono" style={{ marginLeft: 10, fontSize: 11, color: "var(--eg-fg-3)", letterSpacing: "0.1em", textTransform: "uppercase" }}>// abrir command palette</span>
            </span>
          </div>
          <div className="spec__row" style={{ gap: 16 }}>
            <span style={{ display: "inline-flex", alignItems: "center", gap: 6 }}>
              <span className="kbd-key">G</span><span style={{ color: "var(--eg-fg-3)" }}>→</span><span className="kbd-key">B</span>
              <span className="mono" style={{ marginLeft: 10, fontSize: 11, color: "var(--eg-fg-3)", letterSpacing: "0.1em", textTransform: "uppercase" }}>// go board</span>
            </span>
            <span style={{ display: "inline-flex", alignItems: "center", gap: 6 }}>
              <span className="kbd-key">N</span>
              <span className="mono" style={{ marginLeft: 6, fontSize: 11, color: "var(--eg-fg-3)", letterSpacing: "0.1em", textTransform: "uppercase" }}>// nuevo ticket</span>
            </span>
            <span style={{ display: "inline-flex", alignItems: "center", gap: 6 }}>
              <span className="kbd-key">/</span>
              <span className="mono" style={{ marginLeft: 6, fontSize: 11, color: "var(--eg-fg-3)", letterSpacing: "0.1em", textTransform: "uppercase" }}>// focus search</span>
            </span>
          </div>
        </div>
      </Spec>
    </Bay>
  );
}

/* ─── 07 · Bilingual stacks ──────────────────────────────── */
function BiBay() {
  return (
    <Bay num="07" name="BILINGÜE · BI" en="// es primary · en secondary"
      lede="Convención de signage ferroviario. El display en grande (ES), y debajo o al lado, la línea mono pequeña con la traducción (EN). Cuatro variants — column, inline, big, tiny.">
      <Spec serial="GS-LIB-E11" label="BI · COLUMN (default)"
        when="Headers de página, hero plates, navegación."
        props=".bi · .bi__es · .bi__en">
        <div className="spec__row" style={{ gap: 56, alignItems: "flex-start" }}>
          <span className="bi">
            <span className="bi__es disp" style={{ fontSize: 36, color: "var(--eg-iron)" }}>TABLERO</span>
            <span className="bi__en">// board</span>
          </span>
          <span className="bi bi--big">
            <span className="bi__es disp" style={{ fontSize: 56, color: "var(--eg-iron)" }}>PENDIENTES</span>
            <span className="bi__en">// backlog</span>
          </span>
          <span className="bi bi--tiny">
            <span className="bi__es disp" style={{ fontSize: 18, color: "var(--eg-iron)" }}>AJUSTES</span>
            <span className="bi__en">// settings</span>
          </span>
        </div>
      </Spec>

      <Spec serial="GS-LIB-E12" label="BI · INLINE · DASH-DIVIDED"
        when="Botones, labels en filas estrechas, breadcrumbs. La barra vertical de la ES corta a la EN.">
        <div className="spec__col">
          <span className="bi bi--inline" style={{ color: "var(--eg-iron)" }}>
            <span className="bi__es disp" style={{ fontSize: 18 }}>NUEVO TICKET</span>
            <span className="bi__en">new issue</span>
          </span>
          <span className="bi bi--inline" style={{ color: "var(--eg-iron)" }}>
            <span className="bi__es disp" style={{ fontSize: 18 }}>CIERRA SPRINT</span>
            <span className="bi__en">close sprint</span>
          </span>
          <span className="bi bi--inline" style={{ color: "var(--eg-iron)" }}>
            <span className="bi__es disp" style={{ fontSize: 18 }}>ARRASTRAR PARA REORDENAR</span>
            <span className="bi__en">drag to reorder</span>
          </span>
        </div>
      </Spec>

      <Spec serial="GS-LIB-E13" label="BI · ON INK" stage="ink"
        when="Subtítulos en posters dark, daemon panels, login hero."
        props=".bi--on-ink">
        <div className="spec__row" style={{ gap: 48 }}>
          <span className="bi bi--on-ink">
            <span className="bi__es disp" style={{ fontSize: 36, color: "var(--eg-paper)" }}>MANTENEDOR</span>
            <span className="bi__en">// maintainer · mantentzailea</span>
          </span>
          <span className="bi bi--big bi--on-ink">
            <span className="bi__es disp" style={{ fontSize: 48, color: "var(--eg-yellow)" }}>EN MARCHA</span>
            <span className="bi__en" style={{ color: "var(--eg-yellow)", opacity: 0.7 }}>// running · 14d 03:18</span>
          </span>
        </div>
      </Spec>
    </Bay>
  );
}

/* ─── 08 · Asset-tag header strip ────────────────────────── */
function AssetTagBay() {
  return (
    <Bay num="08" name="ASSET-TAG HEADER" en="// .tag-head · dashed rule + mono caption"
      lede="El strip que va arriba de cada card, panel y drawer. Lleva tres datos: serial, etiqueta corta, y un status. Es el rasgo más distintivo del sistema — todo lo que importa lo lleva.">
      <Spec serial="GS-LIB-E14" label="ASSET-TAG · 3 STATUSES"
        props=".tag-head · .tag-head .dot · .live"
        when="Encima de toda card o panel. Sólo si la card lleva información estructural (no decorativa)."
        dont="Como header de toolbar. No es navegación, es identificación.">
        <div className="spec__col">
          {[
            { sn: "MTNR-42", lbl: "// EMERGENCIA · BRAKE SENSOR", st: "VIGILADO", dot: "live" },
            { sn: "GIRA-12", lbl: "// HISTORIA · MAGIC-LINK AUTH", st: "EN CURSO", dot: "" },
            { sn: "RAIL-08", lbl: "// BUG · BOGIE LOG DUPLICATES", st: "OK · MERGED", dot: "go" },
            { sn: "ANVL-03", lbl: "// TAREA · API RATE-LIMIT", st: "PENDIENTE", dot: "" },
          ].map((r, i) => (
            <div key={i} style={{ border: "1.5px solid var(--eg-iron)", background: "var(--eg-paper)", boxShadow: "2px 2px 0 var(--eg-iron)" }}>
              <div className="tag-head">
                <span><b style={{ color: "var(--eg-iron)" }}>{r.sn}</b> · {r.lbl}</span>
                <span style={{ display: "inline-flex", alignItems: "center", gap: 8 }}>
                  <span>{r.st}</span>
                  <span className={`dot ${r.dot}`} style={r.dot === "go" ? { background: "var(--eg-green)" } : undefined} />
                </span>
              </div>
              <div style={{ padding: "10px 14px", fontFamily: "var(--font-body)", fontSize: 13, color: "var(--eg-fg-2)" }}>
                Cuerpo de la card. La pieza estructural va aquí — el resto es presentación.
              </div>
            </div>
          ))}
        </div>
      </Spec>

      <Spec serial="GS-LIB-E15" label="HAZARD STRIPE · SECTION TRANSITION"
        when="Cierre o apertura de bloques de alta carga semántica. Entre módulos de admin y módulos públicos.">
        <div className="spec__col">
          <div className="bg-hazard" style={{ height: 18, border: "1.5px solid var(--eg-iron)" }} />
          <div className="bg-hazard-thin" style={{ height: 14, border: "1.5px solid var(--eg-iron)" }} />
          <div style={{ display: "grid", gridTemplateColumns: "auto 1fr auto", gap: 12, alignItems: "center", border: "1.5px solid var(--eg-iron)", padding: "0 0 0 0", background: "var(--eg-paper)" }}>
            <div className="bg-hazard" style={{ width: 24, height: 56 }} />
            <div style={{ padding: "8px 0" }}>
              <div className="disp" style={{ fontSize: 18, color: "var(--eg-iron)" }}>ZONA · ADMIN · MUTACIÓN POSIBLE</div>
              <div className="mono" style={{ fontSize: 10, color: "var(--eg-fg-3)", letterSpacing: "0.14em", textTransform: "uppercase" }}>// nothing here is reversible without a manual rollback</div>
            </div>
            <div className="bg-hazard" style={{ width: 24, height: 56 }} />
          </div>
        </div>
      </Spec>
    </Bay>
  );
}

Object.assign(window, { ElementsSection });
