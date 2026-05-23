/* DEPÓSITO · I · Fundamentos · Foundations */

function FoundationsSection() {
  return (
    <Sect
      id="foundations"
      num="I"
      eyebrow="fundamentos · foundations · 8 bays"
      titleEs="FUNDAMENTOS."
      titleEn="The atoms we don't break."
      meta={<>SERIE · GS-LIB-F<br /><b>158 tokens</b> · 1 stylesheet<br />eg-tokens.css · v3.1</>}
      intro="Cada otra pieza está hecha de éstas. Son la promesa del sistema: color que no negocia, tipo que no negocia, espacio que no negocia. El día que negociamos, el sistema deja de ser sistema."
    >
      <ColorBay />
      <TypeBay />
      <SpacingBay />
      <RadiiBay />
      <ShadowBay />
      <MotionBay />
      <PatternsBay />
      <GlyphsBay />
    </Sect>
  );
}

/* ─── 01 · Color ─────────────────────────────────────────── */
function ColorBay() {
  const hero = [
    { name: "YELLOW",  varN: "--eg-yellow", hex: "#F5C400", chip: { background: "var(--eg-yellow)" },               use: "Brand pulse. CTA. Stamps." },
    { name: "IRON",    varN: "--eg-iron",   hex: "#0B1620", chip: { background: "var(--eg-iron)" },                 use: "Ink. Borders. Plates." },
    { name: "RED",     varN: "--eg-red",    hex: "#D9211E", chip: { background: "var(--eg-red)" },                  use: "Stop signal. Errors. Wildcard." },
    { name: "PAPER",   varN: "--eg-paper",  hex: "#F4F1E8", chip: { background: "var(--eg-paper)", borderBottomColor: "var(--eg-rule)" }, use: "Default surface." },
  ];
  const support = [
    { name: "GOLD",      varN: "--eg-gold",    hex: "#E5A700", chip: { background: "var(--eg-gold)" },     use: "Autism-pride pulse. Brand v3.1." },
    { name: "GREEN",     varN: "--eg-green",   hex: "#1B7F4A", chip: { background: "var(--eg-green)" },    use: "Go signal. Success. Ferroviario." },
    { name: "YELLOW-LO", varN: "--eg-yellow-lo", hex: "#FDE17A", chip: { background: "var(--eg-yellow-lo)" }, use: "Yellow tint, focus rings." },
    { name: "YELLOW-SOFT", varN: "--eg-yellow-soft", hex: "#FFF3B8", chip: { background: "var(--eg-yellow-soft)" }, use: "Active input bg." },
    { name: "IRON-2",    varN: "--eg-iron-2",  hex: "#182431", chip: { background: "var(--eg-iron-2)" },   use: "Stencil layer / divider on ink." },
    { name: "IRON-3",    varN: "--eg-iron-3",  hex: "#2E3C4B", chip: { background: "var(--eg-iron-3)" },   use: "Subtle border on ink." },
    { name: "RED-SOFT",  varN: "--eg-red-soft",hex: "#FFD9D7", chip: { background: "var(--eg-red-soft)" }, use: "Error background, never copy." },
    { name: "GREEN-SOFT",varN: "--eg-green-soft",hex: "#D2EBDE", chip: { background: "var(--eg-green-soft)" }, use: "Success background." },
  ];
  const paper = [
    { name: "PAPER",   varN: "--eg-paper",   hex: "#F4F1E8", chip: { background: "var(--eg-paper)" } },
    { name: "PAPER-2", varN: "--eg-paper-2", hex: "#EBE7D8", chip: { background: "var(--eg-paper-2)" } },
    { name: "PAPER-3", varN: "--eg-paper-3", hex: "#DDD6C0", chip: { background: "var(--eg-paper-3)" } },
    { name: "RULE",    varN: "--eg-rule",    hex: "#C6BFA6", chip: { background: "var(--eg-rule)" } },
    { name: "FG-5",    varN: "--eg-fg-5",    hex: "#B6BCC3", chip: { background: "var(--eg-fg-5)" } },
    { name: "FG-4",    varN: "--eg-fg-4",    hex: "#8E96A1", chip: { background: "var(--eg-fg-4)" } },
    { name: "FG-3",    varN: "--eg-fg-3",    hex: "#5A6573", chip: { background: "var(--eg-fg-3)" } },
    { name: "FG-2",    varN: "--eg-fg-2",    hex: "#2A3543", chip: { background: "var(--eg-fg-2)" } },
  ];
  const ndColors = [
    { hex: "#E40303", name: "ND-RED" },
    { hex: "#FF8C00", name: "ND-ORANGE" },
    { hex: "#FFED00", name: "ND-YELLOW" },
    { hex: "#008026", name: "ND-GREEN" },
    { hex: "#004CFF", name: "ND-BLUE" },
    { hex: "#732982", name: "ND-VIOLET" },
  ];

  return (
    <Bay num="01" name="COLOR" en="// 4-stamp + supporting"
      lede="Cuatro sellos heroicos, sin gradientes. Cuatro. No cinco. Si hace falta otro, ya hace falta diseño, no color.">
      <Spec serial="GS-LIB-C01" label="HERO · 4-STAMP" status="CANONICAL" stage="paper2"
        when="Casi todo. Default surface es paper. Ink son los bordes y plates. Yellow son los CTAs. Red es la palabra final."
        dont="No gradientes. Nunca dos heroes mezclados. Nunca yellow sobre paper sin un border iron — se pierde el ojo."
        note="Estos cuatro son la marca. Cualquier elemento que no sea ninguno de estos cuatro está pidiendo permiso.">
        <div className="lib-grid-4">
          {hero.map(s => <Swatch key={s.name} {...s} />)}
        </div>
      </Spec>

      <Spec serial="GS-LIB-C02" label="SUPPORTING · TINTS · SEMANTIC" status="USE-WITH-CARE"
        when="Gold sostituye a yellow cuando yellow está sobreusado en una pantalla. Green sólo para 'go' / 'success'. Tintes paper-N para superficies stacked."
        dont="No uses gold para errores. No uses red-soft como CTA. Las tintas no son colores nuevos — son el mismo color a media voz.">
        <div className="lib-grid-4">
          {support.map(s => <Swatch key={s.name} {...s} />)}
        </div>
      </Spec>

      <Spec serial="GS-LIB-C03" label="ESCALA PAPER · INK · FG" status="OK"
        when="Backgrounds: paper / paper-2 / paper-3 en orden (default → más profundo). Texto: fg-1 → fg-5, donde fg-1 es lo más oscuro."
        note="rule es el border default sobre paper. Sobre ink se usa iron-3 como hairline.">
        <div className="lib-grid-8">
          {paper.map(s => <Swatch key={s.name} {...s} />)}
        </div>
      </Spec>

      <Spec serial="GS-LIB-C04" label="ND PRIDE · INFINITY · GOLD" status="LIVE" statusKind="live"
        when="∞ banner en el footer del producto. Settings → Accesibilidad. Día Mundial del Autismo (2 abril)."
        dont="No decorativo. No 'colorful' por colorful. Es una declaración explícita del mantenedor. Sin esa declaración, no se usa.">
        <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
          <div style={{
            height: 56, border: "2px solid var(--eg-iron)",
            background: "var(--nd-gradient)", position: "relative"
          }}>
            <span style={{
              position: "absolute", left: 14, top: "50%", transform: "translateY(-50%)",
              fontFamily: "var(--font-stencil)", fontSize: 40, fontWeight: 900,
              color: "var(--eg-iron)", letterSpacing: "0.04em"
            }}>∞</span>
            <span className="mono" style={{
              position: "absolute", right: 14, top: "50%", transform: "translateY(-50%)",
              fontSize: 11, letterSpacing: "0.14em", textTransform: "uppercase",
              color: "var(--eg-iron)", fontWeight: 700,
              background: "var(--eg-paper)", padding: "2px 8px",
              border: "1.5px solid var(--eg-iron)"
            }}>nd-gradient · honra al ∞</span>
          </div>
          <div className="lib-grid-6">
            {ndColors.map(c => (
              <div key={c.name}>
                <div style={{ height: 52, border: "1.5px solid var(--eg-iron)", background: c.hex }} />
                <Cap es={c.name} en={c.hex} />
              </div>
            ))}
          </div>
        </div>
      </Spec>
    </Bay>
  );
}

/* ─── 02 · Type ──────────────────────────────────────────── */
function TypeBay() {
  return (
    <Bay num="02" name="TIPOGRAFÍA" en="// 4 families · uppercase signage"
      lede="Cuatro voces, un registro. Display para señal. Stencil para sello. DM Sans para conversación. Mono para asset numbers, fechas, código, código.">
      <Spec serial="GS-LIB-T01" label="DISPLAY · BIG SHOULDERS · 900"
        when="Headlines, hero, plates, asset tags, section titles. Siempre UPPERCASE."
        dont="Nunca para body. Nunca italic. Nunca <50px en hero — pierde su peso.">
        <div style={{ display: "flex", flexDirection: "column", gap: 18 }}>
          <div className="disp" style={{ fontSize: 132, lineHeight: 0.82, color: "var(--eg-iron)" }}>MANTENEDOR.</div>
          <div className="disp" style={{ fontSize: 72, lineHeight: 0.86, color: "var(--eg-iron)" }}>CONSTRUIDO. REGISTRADO. COBRADO.</div>
          <div className="disp" style={{ fontSize: 36, lineHeight: 0.95, color: "var(--eg-iron)" }}>EL TREN SALE A LAS 06:42</div>
          <div className="disp" style={{ fontSize: 22, lineHeight: 1.05, color: "var(--eg-iron)" }}>FREIGHT SCHEDULING ENGINE · S-04 · BRAKE TESTS</div>
        </div>
      </Spec>

      <Spec serial="GS-LIB-T02" label="STENCIL · DEPARTURE · GLYPH"
        when="Sellos de pasaporte, monogramas EG, hi-vis backgrounds en posters. Para el chapter-number gigante de cada sección."
        dont="No para texto continuo. Nunca <60px. Es decorativo, no de lectura.">
        <div style={{ display: "flex", alignItems: "center", gap: 32 }}>
          <div style={{
            fontFamily: "var(--font-stencil)", fontWeight: 900,
            fontSize: 220, lineHeight: 0.8, color: "var(--eg-yellow)",
            WebkitTextStroke: "3px var(--eg-iron)", paintOrder: "stroke fill"
          }}>EG</div>
          <div style={{
            fontFamily: "var(--font-stencil)", fontWeight: 900,
            fontSize: 96, lineHeight: 0.9, color: "var(--eg-iron)"
          }}>BILBO</div>
          <div style={{
            fontFamily: "var(--font-stencil)", fontWeight: 700,
            fontSize: 64, lineHeight: 0.9, color: "var(--eg-red)"
          }}>666</div>
        </div>
      </Spec>

      <Spec serial="GS-LIB-T03" label="BODY · DM SANS · 300–700" stage="paper2"
        when="Todo body, párrafos, formularios, labels, descripciones. Bilingüe-friendly."
        dont="Nunca uppercase para body. Si quieres uppercase, usa Display.">
        <div style={{ maxWidth: 640, display: "flex", flexDirection: "column", gap: 14, color: "var(--eg-fg-2)" }}>
          <p style={{ fontSize: 22, fontWeight: 700, color: "var(--eg-iron)", lineHeight: 1.3, margin: 0 }}>
            Lead · 22px · 700 — La pieza llega al taller, la pieza sale del taller. Lo demás es ruido.
          </p>
          <p style={{ fontSize: 16, lineHeight: 1.55, margin: 0 }}>
            Body · 16px · 400 — Una persona mantiene WordPress en euskara, un servidor federado de fotografía ferroviaria, y el back-office Java que ayuda a programar trenes en el estado español. El mantenedor es craft. Si la mesa que hizo tu abuelo todavía aguanta, también aguanta esto.
          </p>
          <p style={{ fontSize: 14, lineHeight: 1.5, margin: 0 }}>
            Small · 14px · 400 — La caja pequeña debajo de un tooltip, un help-text bajo un input, la fila de un menú secundario, todo cabe aquí. Si es más pequeño que esto, vuélvelo mono.
          </p>
          <p style={{ fontSize: 12, lineHeight: 1.5, margin: 0, color: "var(--eg-fg-3)" }}>
            Footnote · 12px · 400 — Términos, condiciones, fecha del último deploy, número de versión, todo lo que tiene que estar pero no se mira. Si tiene que llamar la atención, no es footnote.
          </p>
        </div>
      </Spec>

      <Spec serial="GS-LIB-T04" label="MONO · JETBRAINS · 400–700"
        when="Asset numbers (MTNR-42), fechas, horas, código, version strings, badges, timetable rows. Tracking 0.06–0.14em en CAPS."
        dont="Nunca como display largo — fatiga el ojo. Mono uppercase sólo para labels, no para frases.">
        <div className="mono" style={{ display: "flex", flexDirection: "column", gap: 8, color: "var(--eg-iron)" }}>
          <div style={{ fontSize: 22, fontWeight: 700, letterSpacing: "0.04em" }}>MTNR-42 · 2026-05-24 · 16:42:08</div>
          <div style={{ fontSize: 14, fontWeight: 600 }}>const points = committed - completed; // === 0 ? 'liquidado' : 'arrastre'</div>
          <div style={{ fontSize: 11, fontWeight: 600, letterSpacing: "0.14em", textTransform: "uppercase", color: "var(--eg-fg-3)" }}>
            // ABIERTO · 27 ABIERTOS · 14H DESDE EL ÚLTIMO CIERRE
          </div>
          <div style={{ fontSize: 9.5, fontWeight: 500, letterSpacing: "0.12em", textTransform: "uppercase", color: "var(--eg-fg-3)" }}>
            // gira-init-2026-05-22 · serial · gpl-3.0
          </div>
        </div>
      </Spec>

      <Spec serial="GS-LIB-T05" label="ESCALA · SCALE" stage="grid"
        when="Usa la escala. No inventes tamaños intermedios. Si necesitas algo entre fs-2xl y fs-3xl, mira si tu jerarquía está rota."
        props="fs-xxs:10 · fs-xs:12 · fs-sm:14 · fs-md:16 · fs-lg:18 · fs-xl:22 · fs-2xl:28 · fs-3xl:36 · fs-4xl:48 · fs-5xl:64 · fs-6xl:96 · fs-7xl:144">
        <div style={{ display: "flex", alignItems: "baseline", gap: 12, flexWrap: "wrap" }}>
          {[10,12,14,16,18,22,28,36,48,64,96].map(n => (
            <div key={n} style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 4 }}>
              <div className="disp" style={{ fontSize: n, lineHeight: 1, color: "var(--eg-iron)" }}>Aa</div>
              <Cap es={`${n}px`} />
            </div>
          ))}
        </div>
      </Spec>
    </Bay>
  );
}

/* ─── 03 · Spacing ───────────────────────────────────────── */
function SpacingBay() {
  const steps = [
    { n: 0,  v: "0"   },
    { n: 1,  v: "4px" },
    { n: 2,  v: "8px" },
    { n: 3,  v: "12px"},
    { n: 4,  v: "16px"},
    { n: 5,  v: "20px"},
    { n: 6,  v: "24px"},
    { n: 7,  v: "32px"},
    { n: 8,  v: "40px"},
    { n: 9,  v: "56px"},
    { n:10,  v: "72px"},
    { n:11,  v: "96px"},
    { n:12,  v: "144px"},
  ];
  return (
    <Bay num="03" name="ESPACIADO" en="// 4-pt grid · s-0 → s-13"
      lede="Cuatro puntos. No tres, no cinco, no 'pixel-perfect a ojo'. Las parejas comunes son s-3 (padding interior), s-6 (separación de cards), s-9 (sección).">
      <Spec serial="GS-LIB-S01" label="ESCALA · SPACING SCALE"
        props="s-0 · s-1 · s-2 · s-3 · s-4 · s-5 · s-6 · s-7 · s-8 · s-9 · s-10 · s-11 · s-12"
        when="s-1/s-2 dentro de chips. s-3/s-4 padding interior de inputs y cards. s-6 entre cards. s-9 entre secciones.">
        <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
          {steps.map(s => (
            <div key={s.n} style={{ display: "flex", alignItems: "center", gap: 14 }}>
              <span className="mono" style={{ width: 64, fontSize: 11, color: "var(--eg-fg-3)", letterSpacing: "0.1em", textTransform: "uppercase" }}>s-{s.n}</span>
              <span className="mono" style={{ width: 60, fontSize: 11, color: "var(--eg-iron)" }}>{s.v}</span>
              <div style={{ height: 14, background: "var(--eg-iron)", width: `var(--s-${s.n})` }} />
            </div>
          ))}
        </div>
      </Spec>
    </Bay>
  );
}

/* ─── 04 · Radii ─────────────────────────────────────────── */
function RadiiBay() {
  const radii = [
    { n: "r-0",    v: "0",     desc: "default · sharp por defecto" },
    { n: "r-1",    v: "2px",   desc: "chips finos, casi imperceptible" },
    { n: "r-2",    v: "4px",   desc: "casos blandos, raro" },
    { n: "r-3",    v: "8px",   desc: "casi nunca · sólo el sello redondo" },
    { n: "r-pill", v: "999px", desc: "círculos: dots, avatares, departure stamp" },
  ];
  return (
    <Bay num="04" name="RADIOS" en="// industrial · sharp"
      lede="r-0 es la norma. Cualquier radio mayor a 2px exige justificación. La marca tiene aristas, no esquinas.">
      <Spec serial="GS-LIB-R01" label="RADII" status="r-0 IS LAW">
        <div style={{ display: "flex", gap: 18, flexWrap: "wrap" }}>
          {radii.map(r => (
            <div key={r.n} style={{ textAlign: "center" }}>
              <div style={{
                width: 96, height: 96, background: "var(--eg-yellow)",
                border: "2px solid var(--eg-iron)", borderRadius: r.v,
                boxShadow: "3px 3px 0 var(--eg-iron)"
              }} />
              <div className="mono" style={{ marginTop: 8, fontSize: 11, color: "var(--eg-iron)", fontWeight: 700, letterSpacing: "0.1em", textTransform: "uppercase" }}>{r.n} · {r.v}</div>
              <div className="mono" style={{ marginTop: 2, fontSize: 10, color: "var(--eg-fg-3)", letterSpacing: "0.06em" }}>{r.desc}</div>
            </div>
          ))}
        </div>
      </Spec>
    </Bay>
  );
}

/* ─── 05 · Shadow ────────────────────────────────────────── */
function ShadowBay() {
  const sh = [
    { n: "sh-tap",  v: "2px 2px 0 iron", lift: "translate(-2px,-2px)", desc: "Hover de chips, tap micro." },
    { n: "sh-card", v: "4px 4px 0 iron", lift: "translate(-3px,-3px)", desc: "Cards, panels, drawers." },
    { n: "sh-deep", v: "8px 8px 0 iron", lift: "translate(-4px,-4px)", desc: "Empty-state poster, modals." },
  ];
  return (
    <Bay num="05" name="SOMBRAS" en="// offset hardshadow · no blur"
      lede="Industrial = sólido. Sombra dura, sin desenfoque. Hover levanta la pieza hacia arriba-izquierda, dejando ver la sombra.">
      <Spec serial="GS-LIB-Z01" label="HARDSHADOW · 3 STEPS" status="OK">
        <div className="lib-grid-3" style={{ gridTemplateColumns: "1fr 1fr 1fr", gap: 28 }}>
          {sh.map(s => (
            <div key={s.n} style={{ textAlign: "center" }}>
              <div style={{
                width: 160, height: 100, background: "var(--eg-paper)",
                border: "2px solid var(--eg-iron)",
                boxShadow: s.v.replace("iron", "var(--eg-iron)"),
                margin: "0 auto 14px",
                display: "flex", alignItems: "center", justifyContent: "center",
                fontFamily: "var(--font-mono)", fontSize: 12, fontWeight: 700,
                color: "var(--eg-iron)", letterSpacing: "0.1em"
              }}>
                {s.n.toUpperCase()}
              </div>
              <div className="mono" style={{ fontSize: 11, color: "var(--eg-iron)", fontWeight: 700, letterSpacing: "0.1em" }}>{s.v}</div>
              <div className="mono" style={{ fontSize: 10, color: "var(--eg-fg-3)", letterSpacing: "0.06em", marginTop: 3 }}>{s.desc}</div>
            </div>
          ))}
        </div>
      </Spec>
    </Bay>
  );
}

/* ─── 06 · Motion ────────────────────────────────────────── */
function MotionBay() {
  const [tick, setTick] = React.useState(0);
  React.useEffect(() => {
    const id = setInterval(() => setTick(t => (t + 1) % 4), 1100);
    return () => clearInterval(id);
  }, []);
  return (
    <Bay num="06" name="MOVIMIENTO" en="// 100–360ms · ease-station"
      lede="Mecánico, no acolchado. Las cosas son o no son. Sin bounce, sin overshoot, sin fade lento. dur-1 = micro. dur-2 = default. dur-3 = reservado.">
      <Spec serial="GS-LIB-M01" label="DURACIONES · EASE" status="LIVE" statusKind="live"
        props="dur-1: 100ms · dur-2: 200ms · dur-3: 360ms · ease: cubic-bezier(.2,0,0,1)"
        note="prefers-reduced-motion → todo a 0.01ms. No es opcional.">
        <div style={{ display: "flex", gap: 28, alignItems: "flex-end" }}>
          {[
            { n: "dur-1 · 100ms", d: 100, color: "var(--eg-yellow)" },
            { n: "dur-2 · 200ms", d: 200, color: "var(--eg-gold)" },
            { n: "dur-3 · 360ms", d: 360, color: "var(--eg-red)" },
          ].map((m, i) => (
            <div key={m.n} style={{ flex: 1 }}>
              <div style={{
                position: "relative", height: 64,
                border: "1.5px dashed var(--eg-iron)",
                background: "var(--eg-paper-2)",
                overflow: "hidden"
              }}>
                <div style={{
                  position: "absolute", top: 16, left: 8, width: 32, height: 32,
                  background: m.color, border: "2px solid var(--eg-iron)",
                  transform: tick === 0 ? "translateX(0)" : `translateX(${tick * (i + 1) * 60}px)`,
                  transition: `transform ${m.d}ms cubic-bezier(.2,0,0,1)`
                }} />
              </div>
              <div className="mono" style={{ marginTop: 8, fontSize: 11, color: "var(--eg-iron)", fontWeight: 700, letterSpacing: "0.1em", textTransform: "uppercase" }}>{m.n}</div>
            </div>
          ))}
        </div>
      </Spec>
    </Bay>
  );
}

/* ─── 07 · Patterns ──────────────────────────────────────── */
function PatternsBay() {
  const pats = [
    { name: "hazard",       cls: "bg-hazard",      note: "Transitions, posters, alert leading edge." },
    { name: "hazard-thin",  cls: "bg-hazard-thin", note: "Chips de emergencia, badges, focus bands." },
    { name: "sleepers",     cls: "bg-sleepers",    note: "Railway sleepers. Decorative dividers." },
    { name: "timetable",    cls: "bg-timetable",   note: "Grid backgrounds en specimen stage." },
    { name: "dot",          cls: "bg-dot",         note: "Subtle texture on paper, never on ink." },
  ];
  return (
    <Bay num="07" name="PATRONES" en="// stripes · sleepers · grids"
      lede="Cuatro patrones repetibles. Cada uno significa algo concreto. Si haces uno nuevo, le quitas significado a los existentes.">
      <Spec serial="GS-LIB-P01" label="HAZARD · SLEEPERS · GRID · DOT" status="OK">
        <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
          {pats.map(p => (
            <div key={p.name}>
              <div className={p.cls} style={{ height: 56, border: "1.5px solid var(--eg-iron)" }} />
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginTop: 6 }}>
                <span className="mono" style={{ fontSize: 11, color: "var(--eg-iron)", fontWeight: 700, letterSpacing: "0.12em", textTransform: "uppercase" }}>.{p.cls}</span>
                <span className="mono" style={{ fontSize: 10, color: "var(--eg-fg-3)", letterSpacing: "0.06em" }}>// {p.note}</span>
              </div>
            </div>
          ))}
        </div>
      </Spec>
    </Bay>
  );
}

/* ─── 08 · Glyphs ────────────────────────────────────────── */
function GlyphsBay() {
  const glyphs = [
    { g: "//", u: "mono prefix · ‘comment voice’" },
    { g: "§",  u: "section reference · 'véase §IV'" },
    { g: "→",  u: "transition / hand-off" },
    { g: "←",  u: "back / undo / revert" },
    { g: "▍",  u: "thick vertical · status accent" },
    { g: "●",  u: "live dot · use red.live" },
    { g: "◉",  u: "ringed dot · watching" },
    { g: "✦",  u: "running daemon" },
    { g: "★",  u: "favorite / starred" },
    { g: "◆",  u: "diamond · key milestone" },
    { g: "▲",  u: "up / delta+" },
    { g: "▼",  u: "down / delta-" },
    { g: "⊕",  u: "add / new" },
    { g: "⊗",  u: "cancel / killed" },
    { g: "✕",  u: "remove · NEVER alone, always near label" },
    { g: "—",  u: "em-dash · 'sin valor'" },
    { g: "·",  u: "middle dot · separator de stamps" },
    { g: "↗",  u: "external link" },
    { g: "↺",  u: "retry / reload" },
    { g: "∞",  u: "ND infinity · pride only" },
  ];
  return (
    <Bay num="08" name="GLIFOS" en="// no icon library · puntuación mono"
      lede="No usamos iconografía decorativa. La marca habla con puntuación mono y placeholders fotográficos. Si necesitas iconos, Lucide stroke-1.5, raro.">
      <Spec serial="GS-LIB-G01" label="MONO GLYPH SET"
        when="Inline en labels mono. Como bullets, status markers, separators."
        dont="Como icono decorativo en un button. Para CTAs usa texto, no glifos.">
        <div style={{ display: "grid", gridTemplateColumns: "repeat(5, 1fr)", gap: 14 }}>
          {glyphs.map(g => (
            <div key={g.g} style={{
              border: "1.5px solid var(--eg-iron)",
              background: "var(--eg-paper-2)",
              padding: "14px 12px",
              display: "flex", flexDirection: "column",
              alignItems: "flex-start", gap: 6
            }}>
              <div className="mono" style={{ fontSize: 28, color: "var(--eg-iron)", fontWeight: 700, lineHeight: 1 }}>{g.g}</div>
              <div className="mono" style={{ fontSize: 10, color: "var(--eg-fg-3)", letterSpacing: "0.06em" }}>{g.u}</div>
            </div>
          ))}
        </div>
      </Spec>
    </Bay>
  );
}

Object.assign(window, { FoundationsSection });
