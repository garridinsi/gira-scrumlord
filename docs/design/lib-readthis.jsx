/* DEPÓSITO · 00 · Lee esto · Read this first
   La sección de "qué es esto, cómo se lee, qué prometemos."
   Si la pieza no entra en ninguna sección, vuelve aquí. */

function ReadThisSection() {
  return (
    <section className="sect" id="start" style={{ background: "var(--eg-paper)" }}>
      <div className="sect__head">
        <div className="sect__num">00</div>
        <div className="sect__title-wrap">
          <div className="sect__eyebrow">// lee esto · read this first</div>
          <h2 className="sect__title">
            LEE ESTO.
            <span className="en">Promises, conventions, when to extend.</span>
          </h2>
        </div>
        <div className="sect__meta">SERIE · GS-LIB-00<br /><b>3 piezas</b> · 4 reglas<br />~6 min de lectura</div>
      </div>

      <p className="sect__intro">
        Este catálogo es la versión hablada del sistema. Cada pieza viene con un serial,
        un nombre bilingüe, una franja de uso (cuándo · use), una franja de prohibición
        (nunca · never), y, si aplica, la API. Si no encuentras una pieza, no la inventes
        aquí — pide que se añada con su prohibición incluida.
      </p>

      <div style={{ display: "grid", gridTemplateColumns: "1.6fr 1fr", gap: 28 }}>
        <div>
          <div className="bay__head">
            <span className="bay__num">01</span>
            <span className="bay__name">CONVENCIONES · CONVENTIONS</span>
            <span className="bay__en">// how to read a part</span>
          </div>

          <div className="spec" style={{ marginBottom: 20 }}>
            <div className="spec__tag">
              <div className="lhs">
                <span className="serial">GS-LIB-NN</span>
                <span>·</span>
                <span>NOMBRE DE PIEZA · PART NAME</span>
              </div>
              <div className="rhs">
                <span className="ok">// OK · STATUS</span>
                <span className="dot go" />
              </div>
            </div>
            <div className="spec__stage" style={{ padding: 24 }}>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "center", padding: "10px 0" }}>
                <span style={{
                  border: "2px dashed var(--eg-iron)",
                  padding: "16px 24px",
                  fontFamily: "var(--font-display)", fontWeight: 800,
                  fontSize: 22, color: "var(--eg-iron)",
                  textTransform: "uppercase", letterSpacing: "0.02em",
                  background: "var(--eg-paper-2)"
                }}>
                  EL SPECIMEN VA AQUÍ
                </span>
              </div>
            </div>
            <div className="spec__notes">
              <div className="col"><span className="col-head">// Cuándo · use</span>Por qué existe la pieza. En qué pantallas vive.</div>
              <div className="col"><span className="col-head">// Nunca · never</span>Dónde no debe ir. Qué la rompe.</div>
              <div className="col"><span className="col-head">// Props · api</span>Clases, atributos, parámetros.</div>
            </div>
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
            <Convention serial="A" t="Serial" en="numbered" body="Cada pieza tiene serial único (GS-LIB-Cnn / Tnn / Knn…). Sirve para referirla en PR descriptions y en bug reports — “rompe la GS-LIB-K12, ver §III.04”." />
            <Convention serial="B" t="Nombre bilingüe" en="ES + EN" body="ES en grande, EN en mono caps debajo. Si la pieza tiene nombre vasco apropiado (mantentzailea, geltoki), va en EU como tercer nombre opcional." />
            <Convention serial="C" t="Cuándo · Nunca" en="use · never" body="Toda pieza viene con cuándo Y con nunca. Una pieza sin “nunca” es una pieza que aún no entendemos." />
            <Convention serial="D" t="Variants" en="visible specimens" body="Si una pieza tiene 5 variants, las 5 aparecen en el specimen. No describimos lo que no está en pantalla." />
          </div>
        </div>

        <div>
          <div className="bay__head">
            <span className="bay__num">02</span>
            <span className="bay__name">CUATRO REGLAS · FOUR RULES</span>
            <span className="bay__en">// non-negotiable</span>
          </div>
          <ol style={{
            listStyle: "none", padding: 0, margin: 0,
            display: "flex", flexDirection: "column", gap: 10
          }}>
            {[
              { n: "01", t: "El sistema es una promesa.", body: "Si los componentes no se respetan, no son sistema; son sugerencias. La diferencia importa." },
              { n: "02", t: "Bilingüe por defecto.", body: "ES primario, EN secundario. Nada del sistema sale solo en una lengua." },
              { n: "03", t: "Sharp by default.", body: "r-0 es la norma. Hardshadow, no blur. Si propones un radius mayor, traes justificación." },
              { n: "04", t: "Honestidad sobre pulido.", body: "Empty states con voz. Errors con causa. Loading que no miente sobre el progreso." },
            ].map(r => (
              <li key={r.n} style={{
                background: "var(--eg-paper)", border: "1.5px solid var(--eg-iron)",
                padding: "10px 14px", display: "grid", gridTemplateColumns: "auto 1fr", gap: 12,
                boxShadow: "2px 2px 0 var(--eg-iron)"
              }}>
                <span style={{
                  fontFamily: "var(--font-mono)", fontWeight: 700, fontSize: 11,
                  background: "var(--eg-iron)", color: "var(--eg-yellow)",
                  padding: "3px 8px", height: "fit-content", letterSpacing: "0.12em"
                }}>{r.n}</span>
                <div>
                  <div style={{
                    fontFamily: "var(--font-display)", fontWeight: 800,
                    fontSize: 17, color: "var(--eg-iron)", textTransform: "uppercase",
                    letterSpacing: "0.01em"
                  }}>{r.t}</div>
                  <div style={{ fontSize: 13, color: "var(--eg-fg-2)", marginTop: 3, lineHeight: 1.5 }}>{r.body}</div>
                </div>
              </li>
            ))}
          </ol>

          <div className="bay__head" style={{ marginTop: 32 }}>
            <span className="bay__num">03</span>
            <span className="bay__name">FUENTE · SOURCE</span>
            <span className="bay__en">// where to dig</span>
          </div>
          <div style={{
            background: "var(--eg-iron)", color: "var(--eg-paper)",
            border: "2px solid var(--eg-iron)",
            padding: "12px 14px", fontFamily: "var(--font-mono)",
            fontSize: 11, lineHeight: 1.8, letterSpacing: "0.04em"
          }}>
            <div><span style={{ color: "var(--eg-yellow)" }}>// design tokens</span></div>
            <div>eg-tokens.css <span style={{ color: "var(--eg-fg-5)" }}>// 158 vars</span></div>
            <div><span style={{ color: "var(--eg-yellow)" }}>// app surfaces</span></div>
            <div>app.css <span style={{ color: "var(--eg-fg-5)" }}>// 372 lines</span></div>
            <div><span style={{ color: "var(--eg-yellow)" }}>// catalog</span></div>
            <div>library.css · lib-*.jsx</div>
            <div style={{ marginTop: 8, color: "var(--eg-yellow)" }}>// 6 design files · 2400 loc</div>
          </div>
        </div>
      </div>
    </section>
  );
}

function Convention({ serial, t, en, body }) {
  return (
    <div style={{ border: "1.5px solid var(--eg-iron)", background: "var(--eg-paper-2)", padding: "10px 12px" }}>
      <div style={{ display: "flex", alignItems: "baseline", gap: 8, marginBottom: 4 }}>
        <span style={{
          fontFamily: "var(--font-mono)", fontWeight: 700, fontSize: 10,
          background: "var(--eg-yellow)", color: "var(--eg-iron)",
          padding: "1px 6px", letterSpacing: "0.12em"
        }}>{serial}</span>
        <span style={{ fontFamily: "var(--font-display)", fontWeight: 800, fontSize: 15, color: "var(--eg-iron)", textTransform: "uppercase", letterSpacing: "0.01em" }}>{t}</span>
        <span className="mono" style={{ fontSize: 9.5, color: "var(--eg-fg-3)", letterSpacing: "0.12em", textTransform: "uppercase", marginLeft: "auto" }}>// {en}</span>
      </div>
      <div style={{ fontSize: 12.5, color: "var(--eg-fg-2)", lineHeight: 1.45 }}>{body}</div>
    </div>
  );
}

Object.assign(window, { ReadThisSection });
