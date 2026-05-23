/* gira-scrumlord — Login (magic-link, passwordless) */

function LoginScreen() {
  const [email, setEmail] = React.useState("eneko@example.test");
  const [sent, setSent] = React.useState(false);

  return (
    <div style={{
      width: 1440, height: 900,
      background: "var(--eg-iron)",
      display: "grid", gridTemplateColumns: "1fr 580px",
      fontFamily: "var(--font-body)", color: "var(--eg-paper)",
      position: "relative", overflow: "hidden",
    }}>
      {/* Left poster panel */}
      <div style={{
        position: "relative", padding: 56, overflow: "hidden",
        background: "var(--eg-iron)",
        display: "flex", flexDirection: "column", justifyContent: "space-between"
      }}>
        {/* corner brand */}
        <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
          <div style={{
            width: 56, height: 56, background: "var(--eg-yellow)",
            border: "3px solid var(--eg-paper)",
            display: "flex", alignItems: "center", justifyContent: "center",
          }}>
            <Glyph />
          </div>
          <div>
            <div className="disp" style={{ fontSize: 22, color: "var(--eg-paper)", lineHeight: 1 }}>gira-scrumlord</div>
            <div className="mono" style={{ fontSize: 11, color: "var(--eg-yellow)", letterSpacing: "0.14em", textTransform: "uppercase", marginTop: 4 }}>
              mantenedor · maintainer
            </div>
          </div>
        </div>

        {/* hero plate */}
        <div style={{ marginTop: 40 }}>
          <div className="mono" style={{
            fontSize: 11, color: "var(--eg-yellow)", letterSpacing: "0.18em",
            textTransform: "uppercase", marginBottom: 16
          }}>
            // gestión de incidencias · autoalojable · gpl-3.0
          </div>
          <h1 className="disp" style={{
            fontSize: 110, color: "var(--eg-paper)",
            lineHeight: 0.82, margin: 0, fontWeight: 900,
            letterSpacing: "-0.03em"
          }}>
            CONSTRUIDO.<br />
            <span style={{ background: "var(--eg-yellow)", color: "var(--eg-iron)", padding: "0 0.08em" }}>REGISTRADO.</span><br />
            <span style={{ color: "var(--eg-red)" }}>COBRADO.</span>
          </h1>
          <div className="mono" style={{
            fontSize: 12, color: "var(--eg-fg-5)", letterSpacing: "0.16em",
            textTransform: "uppercase", marginTop: 16
          }}>
            — BUILT · TRACKED · PAID —
          </div>

          {/* generic value props — no tenant data, no real counts */}
          <div style={{ marginTop: 32, display: "flex", gap: 0, maxWidth: 520, border: "2px solid var(--eg-yellow)" }}>
            {[
              { es: "tablero",     en: "board" },
              { es: "tiempos",     en: "timesheet" },
              { es: "facturas",    en: "invoices" },
              { es: "mantenedor",  en: "for makers" },
            ].map((s, i) => (
              <div key={i} style={{
                flex: 1, padding: "12px 12px",
                borderRight: i < 3 ? "2px solid var(--eg-yellow)" : "none",
                background: i === 3 ? "var(--eg-yellow)" : "transparent"
              }}>
                <div className="caps" style={{ color: i === 3 ? "var(--eg-iron)" : "var(--eg-fg-5)" }}>// 0{i + 1}</div>
                <div className="disp" style={{ fontSize: 20, color: i === 3 ? "var(--eg-iron)" : "var(--eg-paper)", lineHeight: 1, marginTop: 4 }}>{s.es.toUpperCase()}</div>
                <div className="mono" style={{ fontSize: 10, color: i === 3 ? "var(--eg-iron)" : "var(--eg-fg-5)", letterSpacing: "0.12em", textTransform: "uppercase", marginTop: 4 }}>{s.en}</div>
              </div>
            ))}
          </div>
        </div>

        {/* hazard footer */}
        <div>
          <div style={{
            height: 14, background: "repeating-linear-gradient(-45deg, var(--eg-yellow) 0 14px, var(--eg-iron) 14px 28px)",
            marginBottom: 14
          }} />
          <div style={{ display: "flex", justifyContent: "space-between", gap: 18 }}>
            <div className="mono" style={{ fontSize: 10, letterSpacing: "0.14em", color: "var(--eg-fg-5)", textTransform: "uppercase" }}>
              // software libre · GPL-3.0<br />
              // sin telemetría · sin terceros
            </div>
            <div className="mono" style={{ fontSize: 10, letterSpacing: "0.14em", color: "var(--eg-yellow)", textTransform: "uppercase", textAlign: "right" }}>
              ✦ mantenedor.eus<br />
              ◉ acceso restringido
            </div>
          </div>
        </div>

        {/* Decorative diagonal "stencil" */}
        <div style={{
          position: "absolute", right: -100, top: 280,
          fontFamily: "var(--font-stencil)", fontSize: 280, fontWeight: 900,
          color: "var(--eg-iron-2)", lineHeight: 0.9,
          transform: "rotate(-90deg)", transformOrigin: "right top",
          letterSpacing: "0.04em", whiteSpace: "nowrap",
          pointerEvents: "none"
        }}>
          GIRA · SCRUMLORD
        </div>
      </div>

      {/* Right login card */}
      <div style={{
        background: "var(--eg-paper)",
        borderLeft: "12px solid var(--eg-yellow)",
        padding: "80px 56px",
        display: "flex", flexDirection: "column", justifyContent: "center",
        color: "var(--eg-iron)", position: "relative"
      }}>
        {/* perforated edge feel */}
        <div style={{
          position: "absolute", left: 12, top: 0, bottom: 0, width: 14,
          backgroundImage: "radial-gradient(circle at 7px 10px, var(--eg-iron) 1.5px, transparent 2px)",
          backgroundSize: "14px 20px"
        }} />

        <div className="plate" style={{ alignSelf: "flex-start", marginBottom: 20 }}>BOARDING · PASS · ACCESO</div>

        <h2 className="disp" style={{
          fontSize: 60, color: "var(--eg-iron)",
          lineHeight: 0.9, margin: "0 0 6px", fontWeight: 900, letterSpacing: "-0.02em"
        }}>
          ACCEDE.<br />
          SIN CONTRASEÑA.
        </h2>
        <div className="mono" style={{ fontSize: 11, color: "var(--eg-fg-3)", letterSpacing: "0.14em", textTransform: "uppercase", marginBottom: 22 }}>
          — SIGN IN · NO PASSWORD —
        </div>

        <p style={{ fontSize: 15, color: "var(--eg-fg-2)", marginBottom: 28, maxWidth: 400, lineHeight: 1.5 }}>
          Te enviamos un enlace de un solo uso. Pincha en menos de 15 minutos y entras. Los tokens se guardan como hash SHA-256. Las sesiones son HttpOnly. <span style={{ color: "var(--eg-fg-3)" }}>OIDC se enchufa después — mismo flujo, otro proveedor de identidad.</span>
        </p>

        {!sent ? (
          <form onSubmit={(e) => { e.preventDefault(); setSent(true); }}>
            <label className="caps" style={{ display: "block", marginBottom: 6 }}>// CORREO · EMAIL</label>
            <input
              value={email} onChange={(e) => setEmail(e.target.value)}
              autoFocus
              style={{
                fontFamily: "var(--font-mono)", fontSize: 16,
                background: "var(--eg-paper)",
                border: "2px solid var(--eg-iron)",
                padding: "12px 14px", width: "100%",
                boxShadow: "3px 3px 0 var(--eg-iron)"
              }}
            />

            <button type="submit" className="btn btn--yellow" style={{ marginTop: 22, width: "100%", justifyContent: "center" }}>
              Envíame el enlace · Mail me the link →
            </button>

            <div style={{
              marginTop: 22, display: "flex", justifyContent: "space-between", alignItems: "center",
              borderTop: "1px dashed var(--eg-iron)", paddingTop: 16
            }}>
              <span className="caps">// o con sso · or sso</span>
              <button type="button" className="b-btn">Continuar con OIDC ↗</button>
            </div>
          </form>
        ) : (
          <div style={{
            border: "2px solid var(--eg-iron)", background: "var(--eg-yellow)",
            padding: 18, boxShadow: "4px 4px 0 var(--eg-iron)"
          }}>
            <div className="caps" style={{ color: "var(--eg-iron)" }}>// REVISA TU BANDEJA · CHECK YOUR INBOX</div>
            <div className="disp" style={{ fontSize: 28, color: "var(--eg-iron)", lineHeight: 1.05, marginTop: 6 }}>
              Enviado. Si conocemos <span style={{ background: "var(--eg-iron)", color: "var(--eg-yellow)", padding: "0 6px" }}>{email}</span>, el enlace está en camino.
            </div>
            <div className="mono" style={{ fontSize: 11, color: "var(--eg-iron)", marginTop: 12, letterSpacing: "0.08em" }}>
              // expira en 15 minutos · un solo uso<br />
              // si no llega, revisa spam o vuelve a pedirlo
            </div>
            <button onClick={() => setSent(false)} className="b-btn" style={{ marginTop: 14, background: "var(--eg-iron)", color: "var(--eg-yellow)" }}>← Otro correo</button>
          </div>
        )}

        <div style={{ marginTop: "auto", paddingTop: 36, borderTop: "1px solid var(--eg-iron)", display: "flex", justifyContent: "space-between" }}>
          <span className="mono" style={{ fontSize: 10, color: "var(--eg-fg-3)", letterSpacing: "0.1em", textTransform: "uppercase" }}>
            autoalojable · self-hosted · GPL-3.0
          </span>
          <span className="mono" style={{ fontSize: 10, color: "var(--eg-fg-3)", letterSpacing: "0.1em", textTransform: "uppercase" }}>
            sin analítica · sin tracking
          </span>
        </div>
      </div>
    </div>
  );
}

window.LoginScreen = LoginScreen;
