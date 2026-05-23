/* DEPÓSITO · Parts Depot
   Catalog primitives — Sect, Bay, Spec.
   Every component in the library is wrapped in <Spec> so it
   looks like a part pulled from the rolling-stock manual:
   asset tag header up top, specimen stage in the middle,
   usage notes strip at the bottom.
*/

function Sect({ id, num, titleEs, titleEn, eyebrow, intro, meta, children }) {
  return (
    <section className="sect" id={id}>
      <div className="sect__head">
        <div className="sect__num">{num}</div>
        <div className="sect__title-wrap">
          {eyebrow && <div className="sect__eyebrow">// {eyebrow}</div>}
          <h2 className="sect__title">
            {titleEs}
            <span className="en">{titleEn}</span>
          </h2>
        </div>
        <div className="sect__meta">{meta}</div>
      </div>
      {intro && <p className="sect__intro">{intro}</p>}
      {children}
    </section>
  );
}

function Bay({ num, name, en, lede, children }) {
  return (
    <div className="bay">
      <div className="bay__head">
        <span className="bay__num">{num}</span>
        <span className="bay__name">{name}</span>
        <span className="bay__en">{en}</span>
      </div>
      {lede && <p className="bay__lede">{lede}</p>}
      {children}
    </div>
  );
}

/*
  Spec — the asset-tag wrapper.
    serial: pseudo-part-number, mono, shown left of the tag bar
    label: short ES name, mono caps
    rhs:   right side of the tag bar (status text + dot)
    stage: optional className modifier ("ink","dot","paper2","grid")
    when / dont / note: usage strips at the bottom
*/
function Spec({
  serial = "GS-LIB",
  label,
  status = "OK",
  statusKind = "ok",       // "ok" | "warn" | "live"
  stage = "",
  pad = null,              // override padding on stage
  when, dont, note, props,
  children
}) {
  const stageMod = stage ? `spec__stage--${stage}` : "";
  return (
    <div className="spec">
      <div className="spec__tag">
        <div className="lhs">
          <span className="serial">{serial}</span>
          <span>·</span>
          <span>{label}</span>
        </div>
        <div className="rhs">
          <span className={statusKind === "ok" ? "ok" : statusKind === "warn" ? "warn" : ""}>// {status}</span>
          <span className={`dot ${statusKind === "live" ? "live" : statusKind === "ok" ? "go" : ""}`} />
        </div>
      </div>
      <div
        className={`spec__stage ${stageMod}`}
        style={pad !== null ? { padding: pad } : undefined}
      >
        {children}
      </div>
      {(when || dont || note || props) && (
        <div className="spec__notes">
          {when && <div className="col"><span className="col-head">// Cuándo · use</span>{when}</div>}
          {dont && <div className="col"><span className="col-head">// Nunca · never</span>{dont}</div>}
          {props && <div className="col"><span className="col-head">// Props · api</span>{props}</div>}
          {note && <div className="col"><span className="col-head">// Nota · note</span>{note}</div>}
        </div>
      )}
    </div>
  );
}

/* Specimen caption — a small label under one item in a row */
function Cap({ es, en }) {
  return <div className="spec__cap"><b>{es}</b>{en && <> · {en}</>}</div>;
}

/* A swatch card used for color/spacing/radius/shadow */
function Swatch({ chip, name, varName, hex, use }) {
  return (
    <div className="swatch">
      <div className="swatch__chip" style={chip} />
      <div className="swatch__meta">
        <span className="name">{name}</span>
        <span className="var">var({varName})</span>
        {hex && <span className="hex">{hex}</span>}
        {use && <span className="use">{use}</span>}
      </div>
    </div>
  );
}

/* Toolbar of TOC anchors */
const TOC = [
  { kind: "h1", num: "00", href: "#start",        label: "Lee esto"          },
  { kind: "h1", num: "I",  href: "#foundations",  label: "Fundamentos"       },
  { kind: "l2",            href: "#color",        label: "01 · Color"        },
  { kind: "l2",            href: "#type",         label: "02 · Tipografía"   },
  { kind: "l2",            href: "#spacing",      label: "03 · Espaciado"    },
  { kind: "l2",            href: "#radii",        label: "04 · Radios"       },
  { kind: "l2",            href: "#shadow",       label: "05 · Sombras"      },
  { kind: "l2",            href: "#motion",       label: "06 · Movimiento"   },
  { kind: "l2",            href: "#patterns",     label: "07 · Patrones"     },
  { kind: "l2",            href: "#glyphs",       label: "08 · Glifos"       },

  { kind: "h1", num: "II", href: "#elements",     label: "Elementos"         },
  { kind: "l2",            href: "#plates",       label: "01 · Placas"       },
  { kind: "l2",            href: "#chips",        label: "02 · Chips"        },
  { kind: "l2",            href: "#types",        label: "03 · Tipo · Issue" },
  { kind: "l2",            href: "#avatars",      label: "04 · Avatares"     },
  { kind: "l2",            href: "#status",       label: "05 · Estado · dot" },
  { kind: "l2",            href: "#kbd",          label: "06 · Teclas"       },
  { kind: "l2",            href: "#bi",           label: "07 · Bilingüe"     },
  { kind: "l2",            href: "#assettag",     label: "08 · Asset-tag"    },

  { kind: "h1", num: "III",href: "#controls",     label: "Controles"         },
  { kind: "l2",            href: "#buttons",      label: "01 · Botones"      },
  { kind: "l2",            href: "#inputs",       label: "02 · Inputs"       },
  { kind: "l2",            href: "#choices",      label: "03 · Check · Radio"},
  { kind: "l2",            href: "#toggles",      label: "04 · Toggles"      },
  { kind: "l2",            href: "#segmented",    label: "05 · Segmentado"   },
  { kind: "l2",            href: "#search",       label: "06 · Búsqueda"     },
  { kind: "l2",            href: "#slider",       label: "07 · Slider"       },
  { kind: "l2",            href: "#combo",        label: "08 · Combobox"     },

  { kind: "h1", num: "IV", href: "#nav",          label: "Navegación"        },
  { kind: "l2",            href: "#tabs",         label: "01 · Pestañas"     },
  { kind: "l2",            href: "#crumbs",       label: "02 · Breadcrumbs"  },
  { kind: "l2",            href: "#pager",        label: "03 · Paginación"   },
  { kind: "l2",            href: "#stepper",      label: "04 · Stepper"      },
  { kind: "l2",            href: "#menu",         label: "05 · Menús"        },

  { kind: "h1", num: "V",  href: "#feedback",     label: "Retroalimentación" },
  { kind: "l2",            href: "#alerts",       label: "01 · Avisos"       },
  { kind: "l2",            href: "#toast",        label: "02 · Toasts"       },
  { kind: "l2",            href: "#empty",        label: "03 · Estados vacíos"},
  { kind: "l2",            href: "#loading",      label: "04 · Carga"        },
  { kind: "l2",            href: "#progress",     label: "05 · Progreso"     },
  { kind: "l2",            href: "#tip",          label: "06 · Tooltip"      },

  { kind: "h1", num: "VI", href: "#data",         label: "Datos"             },
  { kind: "l2",            href: "#stats",        label: "01 · Stats"        },
  { kind: "l2",            href: "#dl",           label: "02 · K/V"          },
  { kind: "l2",            href: "#table",        label: "03 · Tabla"        },
  { kind: "l2",            href: "#activity",     label: "04 · Actividad"    },
  { kind: "l2",            href: "#timeline",     label: "05 · Línea tiempo" },
  { kind: "l2",            href: "#charts",       label: "06 · Gráficos"     },
  { kind: "l2",            href: "#checklist",    label: "07 · Subtareas"    },

  { kind: "h1", num: "VII",href: "#comp",         label: "Composiciones"     },
  { kind: "l2",            href: "#issuecard",    label: "01 · Ticket card"  },
  { kind: "l2",            href: "#backlogrow",   label: "02 · Backlog row"  },
  { kind: "l2",            href: "#sprinthead",   label: "03 · Sprint head"  },
  { kind: "l2",            href: "#columnhead",   label: "04 · Columna head" },
  { kind: "l2",            href: "#quickcreate",  label: "05 · Crear rápido" },
  { kind: "l2",            href: "#drawerhead",   label: "06 · Drawer head"  },
  { kind: "l2",            href: "#composer",     label: "07 · Comentar"     },
  { kind: "l2",            href: "#mention",      label: "08 · Menciones"    },
  { kind: "l2",            href: "#timer",        label: "09 · Cronómetro"   },
  { kind: "l2",            href: "#invoice",      label: "10 · Línea factura"},
  { kind: "l2",            href: "#switcher",     label: "11 · Switcher"     },

  { kind: "h1", num: "VIII",href: "#lore",        label: "Lore · easter eggs"},
  { kind: "l2",             href: "#sauronrow",   label: "01 · Sauron row"   },
  { kind: "l2",             href: "#scrumlordmini",label:"02 · Scrumlord"    },
  { kind: "l2",             href: "#velociraptor",label: "03 · Velociraptor" },
  { kind: "l2",             href: "#boarding",    label: "04 · Boarding"     },
  { kind: "l2",             href: "#stamp",       label: "05 · Sello"        },
];

function DepotMast() {
  return (
    <header className="dep__mast">
      <div className="stencil">DEPÓSITO</div>
      <div style={{ position: "relative", zIndex: 1 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 18, marginBottom: 22 }}>
          <span className="plate plate--yellow" style={{ fontSize: 13 }}>GIRA · SCRUMLORD · M1</span>
          <span className="mono" style={{ color: "var(--eg-yellow)", fontSize: 11, letterSpacing: "0.16em", textTransform: "uppercase" }}>
            // catálogo de piezas · parts catalog
          </span>
          <span className="mono" style={{ marginLeft: "auto", color: "var(--eg-fg-5)", fontSize: 11, letterSpacing: "0.14em", textTransform: "uppercase" }}>
            ed. 2026.05 · rev. a · 8 chapters · ~120 parts
          </span>
        </div>
        <h1>
          DEPÓSITO.<br />
          <span className="hi">DE PIEZAS.</span><br />
          <span className="rd">PARTS DEPOT.</span>
        </h1>
        <div style={{
          display: "grid", gridTemplateColumns: "1fr 1fr 1fr 1fr",
          marginTop: 32, border: "2px solid var(--eg-yellow)", maxWidth: 1080
        }}>
          {[
            { es: "fundamentos", en: "foundations", v: "8" },
            { es: "elementos",   en: "elements",    v: "32" },
            { es: "controles",   en: "controls",    v: "24" },
            { es: "composiciones",en:"compositions",v: "+50" },
          ].map((s, i) => (
            <div key={i} style={{
              padding: "12px 16px",
              borderRight: i < 3 ? "2px solid var(--eg-yellow)" : "none",
              background: i === 3 ? "var(--eg-yellow)" : "transparent"
            }}>
              <div className="mono" style={{
                fontSize: 10, letterSpacing: "0.14em", textTransform: "uppercase",
                color: i === 3 ? "var(--eg-iron)" : "var(--eg-fg-5)"
              }}>// {s.es} · {s.en}</div>
              <div className="disp" style={{
                fontSize: 30, lineHeight: 1, marginTop: 6,
                color: i === 3 ? "var(--eg-iron)" : "var(--eg-paper)"
              }}>{s.v}</div>
            </div>
          ))}
        </div>

        <p style={{
          color: "var(--eg-fg-5)", fontSize: 15, lineHeight: 1.55,
          maxWidth: 720, marginTop: 28, marginBottom: 0
        }}>
          Cada componente entra <b style={{ color: "var(--eg-paper)" }}>numerado, etiquetado, y bilingüe</b>. Si no entra aquí, no entra en el producto. Lee el chapter <b style={{ color: "var(--eg-yellow)" }}>00 · Lee esto</b> antes de añadir nada nuevo — el sistema es una promesa que el mantenedor ya hizo.
        </p>
      </div>
    </header>
  );
}

function DepotToc() {
  return (
    <aside className="dep__toc">
      <div className="dep__toc-head">// índice · index</div>
      {TOC.map((row, i) => (
        <a key={i} href={row.href} className={row.kind}>
          {row.kind === "h1" && row.num && <span className="num">{row.num}</span>}
          <span>{row.label}</span>
        </a>
      ))}
      <div className="dep__toc-foot">
        // versión 0.1<br />
        // GPL-3.0 · sin telemetría
      </div>
    </aside>
  );
}

function DepotFoot() {
  return (
    <footer className="dep__foot">
      <div style={{ display: "grid", gridTemplateColumns: "2fr 1fr 1fr 1fr", gap: 32 }}>
        <div>
          <div className="disp" style={{ fontSize: 28, color: "var(--eg-paper)", lineHeight: 1, marginBottom: 8 }}>
            FIN DE LÍNEA · END OF LINE
          </div>
          <p style={{ color: "var(--eg-fg-5)", fontSize: 12, lineHeight: 1.6, maxWidth: 520, margin: 0 }}>
            Este catálogo se mantiene a mano. Si añades una pieza, dale número, nombre bilingüe, propósito, y un caso donde nunca debe usarse. Si una pieza no tiene <b style={{ color: "var(--eg-yellow)" }}>"nunca · never"</b>, probablemente no entiendes la pieza todavía.
          </p>
        </div>
        <div>
          <div style={{ color: "var(--eg-yellow)", letterSpacing: "0.14em", textTransform: "uppercase", marginBottom: 6 }}>// numeración</div>
          <div style={{ color: "var(--eg-fg-5)", lineHeight: 1.7 }}>
            GS-LIB-NN<br />
            §I-§VIII · 8 chapters<br />
            cada bay · 0n
          </div>
        </div>
        <div>
          <div style={{ color: "var(--eg-yellow)", letterSpacing: "0.14em", textTransform: "uppercase", marginBottom: 6 }}>// idioma</div>
          <div style={{ color: "var(--eg-fg-5)", lineHeight: 1.7 }}>
            ES principal<br />
            EN bajo cada<br />
            EU si aplica
          </div>
        </div>
        <div>
          <div style={{ color: "var(--eg-yellow)", letterSpacing: "0.14em", textTransform: "uppercase", marginBottom: 6 }}>// licencia</div>
          <div style={{ color: "var(--eg-fg-5)", lineHeight: 1.7 }}>
            GPL-3.0<br />
            código abierto<br />
            sin terceros
          </div>
        </div>
      </div>
    </footer>
  );
}

Object.assign(window, { Sect, Bay, Spec, Cap, Swatch, DepotMast, DepotToc, DepotFoot, TOC });
