/* gira-scrumlord — Settings: Rates resolution + Clients */

function SettingsScreen() {
  return (
    <div className="body">
      <Subbar
        tabs={[
          { es: "Clientes",     en: "Clients",      count: 3,  active: true },
          { es: "Tarifas",      en: "Rates",        count: 12 },
          { es: "Miembros",     en: "Members",      count: 6 },
          { es: "Workflow",     en: "Workflow"            },
          { es: "Integraciones",en: "Integrations"        },
        ]}
        right={
          <>
            <button className="b-btn">+ Tarifa</button>
            <button className="b-btn b-btn--ink">+ Cliente</button>
          </>
        }
      />

      <div style={{ flex: 1, overflow: "auto", padding: "18px 22px", background: "var(--eg-paper)" }}>
        {/* Section header */}
        <div style={{
          display: "grid", gridTemplateColumns: "1fr auto", gap: 24, alignItems: "end",
          borderBottom: "2px solid var(--eg-iron)", paddingBottom: 8, marginBottom: 18
        }}>
          <div>
            <h1 className="disp" style={{ fontSize: 44, lineHeight: 0.9, color: "var(--eg-iron)", margin: 0, fontWeight: 900, letterSpacing: "-0.02em" }}>
              CLIENTES &amp; TARIFAS
            </h1>
            <div className="mono" style={{ fontSize: 11, color: "var(--eg-fg-3)", letterSpacing: "0.14em", marginTop: 4, textTransform: "uppercase" }}>
              — CLIENTS &amp; RATES —
            </div>
          </div>
          <div className="mono" style={{ fontSize: 10, color: "var(--eg-fg-3)", letterSpacing: "0.12em", textAlign: "right" }}>
            SÓLO ADMIN · ADMIN ONLY · AUDITADO POR SAURON<br />
            AISLAMIENTO DE DATOS EN LA CAPA DE DATOS
          </div>
        </div>

        {/* Clients */}
        <section style={{ marginBottom: 22, border: "2px solid var(--eg-iron)" }}>
          <div className="tag-head" style={{ background: "var(--eg-yellow)", padding: "8px 14px", borderColor: "var(--eg-iron)" }}>
            <span>// CLIENTES · CLIENTS · 3</span>
            <span>SÓLO LECTURA PARA USUARIOS CLIENTE · AISLAMIENTO ESTRICTO POR FILA</span>
          </div>
          <div>
            {CLIENTS.map((c, i) => (
              <div key={c.id} style={{
                display: "grid",
                gridTemplateColumns: "60px 1.5fr 80px 1fr 1fr 1fr auto",
                gap: 14, alignItems: "center",
                padding: "12px 16px",
                borderBottom: i < CLIENTS.length - 1 ? "1px solid var(--eg-rule)" : "none",
                background: i % 2 ? "var(--eg-paper)" : "var(--eg-paper-2)",
              }}>
                <span className={"avatar avatar--lg avatar--" + (c.slug === "mantenedor" ? "green" : c.slug === "acme" ? "red" : "ink")}>
                  {c.slug === "mantenedor" ? "MS" : c.slug === "acme" ? "AC" : "IN"}
                </span>
                <div>
                  <div className="disp" style={{ fontSize: 20, color: "var(--eg-iron)", lineHeight: 1 }}>{c.name}</div>
                  <div className="mono" style={{ fontSize: 10, color: "var(--eg-fg-3)", letterSpacing: "0.1em", marginTop: 3 }}>
                    SLUG · {c.slug}
                  </div>
                </div>
                <span className="plate plate--yellow">{c.currency}</span>
                <Mini labelEs="proyectos"    labelEn="projects"    value={c.projects} />
                <Mini labelEs="abiertos"     labelEn="open issues" value={c.openIssues} />
                <Mini
                  labelEs="devengado ytd"
                  labelEn="ytd accrued"
                  value={c.accruedCents ? `${c.currency === "USD" ? "$" : "€"} ${(c.accruedCents/100).toLocaleString("es-ES")},00` : "—"}
                  mono
                />
                <div style={{ display: "flex", gap: 6 }}>
                  <button className="b-btn">Abrir</button>
                  <button className="b-btn b-btn--ghost">⋯</button>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* Rates - resolution table */}
        <section style={{ marginBottom: 22, border: "2px solid var(--eg-iron)", background: "var(--eg-paper)" }}>
          <div className="tag-head" style={{ background: "var(--eg-iron)", color: "var(--eg-yellow)", padding: "8px 14px", borderColor: "var(--eg-iron)" }}>
            <span>// TARIFAS · RATES · cadena de resolución · issue → project → client → default</span>
            <span>EL ÁMBITO PRIORITARIO DESCIENDE · PRIMER MATCH GANA</span>
          </div>

          <div style={{
            display: "grid",
            gridTemplateColumns: "120px 180px 1fr 130px 100px 80px 80px",
            gap: 0,
            background: "var(--eg-paper-3)",
            borderBottom: "1.5px solid var(--eg-iron)",
            padding: "8px 14px",
            fontFamily: "var(--font-mono)", fontSize: 10,
            letterSpacing: "0.12em", textTransform: "uppercase",
            color: "var(--eg-fg-3)"
          }}>
            <span>// ámbito · scope</span>
            <span>// objetivo · target</span>
            <span>// aplica a · applies to</span>
            <span>// tarifa · rate</span>
            <span>// moneda · currency</span>
            <span>// modificado · updated</span>
            <span></span>
          </div>

          {[
            { scope: "issue",   target: "MTNR-18",       applies: "Traducir plantillas de alertas (ES → EU)",  rate: "90,00",  cur: "EUR", upd: "hace 2 d", who: "EG" },
            { scope: "project", target: "MTNR",          applies: "Mantenedor · Freight Scheduling Engine",   rate: "115,00", cur: "EUR", upd: "hace 11 d", who: "EG" },
            { scope: "project", target: "RAIL",          applies: "Mantenedor · Rolling-Stock Audit",         rate: "115,00", cur: "EUR", upd: "hace 21 d", who: "EG" },
            { scope: "client",  target: "Mantenedor SL", applies: "Todos los proyectos de Mantenedor (fallback)",rate: "110,00", cur: "EUR", upd: "hace 4 m", who: "EG" },
            { scope: "client",  target: "Acme Corp",     applies: "Todos los proyectos de Acme",              rate: "175,00", cur: "USD", upd: "hace 3 h",  who: "AL" },
            { scope: "default", target: "—",             applies: "Todo lo demás",                            rate: "95,00",  cur: "EUR", upd: "hace 6 m", who: "EG" },
          ].map((r, i) => (
            <div key={i} style={{
              display: "grid",
              gridTemplateColumns: "120px 180px 1fr 130px 100px 80px 80px",
              gap: 0, alignItems: "center",
              padding: "10px 14px",
              borderBottom: i < 5 ? "1px dashed var(--eg-rule)" : "none",
              fontSize: 13
            }}>
              <span>
                <span className="plate" style={{
                  background: r.scope === "issue" ? "var(--eg-red)" : r.scope === "project" ? "var(--eg-yellow)" : r.scope === "client" ? "var(--eg-gold)" : "var(--eg-paper-3)",
                  color: r.scope === "issue" ? "var(--eg-paper)" : "var(--eg-iron)",
                  borderColor: "var(--eg-iron)"
                }}>{r.scope}</span>
              </span>
              <span className="mono" style={{ fontSize: 12, fontWeight: 600, color: "var(--eg-iron)" }}>{r.target}</span>
              <span style={{ color: "var(--eg-iron)" }}>{r.applies}</span>
              <span className="disp" style={{ fontSize: 20, color: "var(--eg-iron)" }}>
                {r.rate.split(",")[0]},<span style={{ fontSize: 12, color: "var(--eg-fg-3)" }}>{r.rate.split(",")[1]}</span>
                <span style={{ fontSize: 11, marginLeft: 4, color: "var(--eg-fg-3)" }}>/h</span>
              </span>
              <span className="mono" style={{ fontSize: 11, fontWeight: 600 }}>{r.cur}</span>
              <span className="mono" style={{ fontSize: 10, color: "var(--eg-fg-3)" }}>
                {r.upd}<br /><span style={{ color: "var(--eg-iron)" }}>{r.who}</span>
              </span>
              <div style={{ display: "flex", gap: 4 }}>
                <button className="b-btn b-btn--ghost" style={{ fontSize: 11, padding: "4px 6px" }}>editar</button>
              </div>
            </div>
          ))}
        </section>

        {/* Resolution flowchart */}
        <section style={{ border: "2px solid var(--eg-iron)", background: "var(--eg-paper)" }}>
          <div className="tag-head" style={{ background: "var(--eg-paper-2)", padding: "8px 14px" }}>
            <span>// EJEMPLO · EXAMPLE · MTNR-18 · paseo de resolución</span>
            <span>PRIMER MATCH GANA · NUNCA FLOATS</span>
          </div>
          <div style={{ padding: 18, display: "flex", gap: 0, alignItems: "stretch" }}>
            {[
              { scope: "issue",   target: "MTNR-18",        rate: "90,00 EUR/h",   match: true,  label: "★ MATCH · GANA" },
              { scope: "project", target: "MTNR",           rate: "115,00 EUR/h",  match: false, label: "shadowed · tapado" },
              { scope: "client",  target: "Mantenedor SL",  rate: "110,00 EUR/h",  match: false, label: "shadowed · tapado" },
              { scope: "default", target: "—",              rate: "95,00 EUR/h",   match: false, label: "shadowed · tapado" },
            ].map((s, i, arr) => (
              <React.Fragment key={i}>
                <div style={{
                  flex: 1,
                  border: "1.5px solid var(--eg-iron)",
                  background: s.match ? "var(--eg-yellow)" : "var(--eg-paper-2)",
                  padding: 12,
                  opacity: s.match ? 1 : 0.55,
                  position: "relative"
                }}>
                  <div className="caps" style={{ color: "var(--eg-iron)" }}>// {s.scope}</div>
                  <div className="disp" style={{ fontSize: 18, color: "var(--eg-iron)", lineHeight: 1.1, marginTop: 4 }}>{s.target}</div>
                  <div className="mono" style={{ fontSize: 13, marginTop: 6, color: "var(--eg-iron)", fontWeight: s.match ? 700 : 500, textDecoration: s.match ? "none" : "line-through" }}>{s.rate}</div>
                  <div className="mono" style={{ fontSize: 10, marginTop: 8, color: s.match ? "var(--eg-iron)" : "var(--eg-fg-3)", letterSpacing: "0.12em", textTransform: "uppercase", fontWeight: 700 }}>
                    {s.label}
                  </div>
                </div>
                {i < arr.length - 1 && (
                  <div style={{
                    width: 32, display: "flex", alignItems: "center", justifyContent: "center",
                    color: "var(--eg-iron)", fontFamily: "var(--font-display)", fontSize: 24, fontWeight: 900
                  }}>→</div>
                )}
              </React.Fragment>
            ))}
          </div>
          <div style={{ borderTop: "1px dashed var(--eg-iron)", padding: "10px 18px", background: "var(--eg-paper-2)" }}>
            <code style={{ background: "transparent", border: 0, padding: 0, fontSize: 12 }}>
              resolveHourlyCents{`({ issue: 9000, project: 11500, client: 11000, default: 9500 })`} =&gt; <b style={{ color: "var(--eg-iron)" }}>9000</b>
              <span style={{ color: "var(--eg-fg-3)" }}>{`  // issue.rate gana · wins`}</span>
            </code>
          </div>
        </section>
      </div>
    </div>
  );
}

function Mini({ labelEs, labelEn, label, value, mono }) {
  return (
    <div>
      <div className="caps">// {labelEs || label}{labelEn ? " · " + labelEn : ""}</div>
      <div className={mono ? "mono" : "disp"} style={{ fontSize: mono ? 12 : 18, color: "var(--eg-iron)", fontWeight: mono ? 600 : 800, lineHeight: 1.1 }}>{value}</div>
    </div>
  );
}

window.SettingsScreen = SettingsScreen;
