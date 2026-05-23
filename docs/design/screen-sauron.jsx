/* gira-scrumlord — Sauron (audit log, port 666)
   The whole panel runs on the dark/iron variant of the palette.
   It only watches. */

function SauronScreen() {
  const [filter, setFilter] = React.useState("ALL");
  const actions = ["ALL", "issue.move", "worklog.create", "comment.create", "rate.update", "timer.start", "session.start", "sprint.autoclose", "outbox.dispatch"];
  const visible = filter === "ALL" ? AUDIT : AUDIT.filter(a => a.action === filter);

  return (
    <div className="body" style={{ background: "var(--eg-iron)", color: "var(--eg-paper)" }}>
      <Subbar
        tabs={[
          { es: "En Vivo",    en: "Live Tail",   count: AUDIT.length, active: true },
          { es: "Consulta",   en: "Query"      },
          { es: "Salud",      en: "Health"     },
          { es: "Outbox",     en: "Outbox",    count: 4 },
        ]}
        right={
          <>
            <span className="f-pill">DESDE <b>—1h</b> <span className="x">▾</span></span>
            <span className="f-pill">ENTIDAD <b>cualquiera</b> <span className="x">▾</span></span>
            <button className="b-btn b-btn--yellow">↓ JSONL</button>
          </>
        }
      />

      {/* SAURON HERO STRIP */}
      <div style={{
        background: "var(--eg-iron)",
        borderBottom: "2px solid var(--eg-yellow)",
        padding: "16px 24px",
        display: "grid",
        gridTemplateColumns: "auto 1fr auto auto",
        gap: 24,
        alignItems: "center"
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
          {/* The eye */}
          <div style={{ position: "relative", width: 56, height: 56 }}>
            <div style={{
              position: "absolute", inset: 0,
              border: "2.5px solid var(--eg-yellow)",
              borderRadius: "50%",
              background: "radial-gradient(circle, var(--eg-red) 0%, var(--eg-iron) 70%)"
            }} />
            <div style={{
              position: "absolute", left: "50%", top: "50%",
              width: 6, height: 36, background: "var(--eg-iron)",
              transform: "translate(-50%, -50%)", borderRadius: 3,
            }} />
            <div style={{
              position: "absolute", left: "50%", top: "50%",
              width: 16, height: 36,
              border: "1.5px solid var(--eg-yellow)",
              transform: "translate(-50%, -50%)", borderRadius: "50%",
            }} />
          </div>
          <div>
            <div className="caps" style={{ color: "var(--eg-yellow)" }}>// packages/sauron</div>
            <h1 className="disp" style={{
              fontSize: 46, color: "var(--eg-paper)",
              margin: 0, lineHeight: 0.9, fontWeight: 900,
              letterSpacing: "-0.02em"
            }}>
              SAURON · AUDITORÍA
            </h1>
            <div className="mono" style={{ fontSize: 11, color: "var(--eg-fg-5)", letterSpacing: "0.14em", marginTop: 4, textTransform: "uppercase" }}>
              — AUDIT —
            </div>
          </div>
        </div>

        <div style={{ paddingLeft: 24, borderLeft: "1px dashed var(--eg-yellow)" }}>
          <div style={{ fontStyle: "italic", color: "var(--eg-fg-5)", fontSize: 14, lineHeight: 1.45, maxWidth: 460 }}>
            “Sólo observa.” · <span style={{ color: "var(--eg-fg-4)" }}>“it only watches.”</span>
            <br />
            <span style={{ fontSize: 12, color: "var(--eg-fg-4)" }}>append-only · API de sólo lectura · proceso separado</span>
          </div>
        </div>

        <div>
          <div className="caps" style={{ color: "var(--eg-fg-5)" }}>// puerto · port</div>
          <div className="disp" style={{ fontSize: 56, color: "var(--eg-yellow)", lineHeight: 0.9, letterSpacing: "-0.02em" }}>
            :666
          </div>
        </div>

        <div style={{ textAlign: "right" }}>
          <div className="caps" style={{ color: "var(--eg-fg-5)" }}>// estado · status</div>
          <div style={{ display: "flex", alignItems: "center", gap: 8, justifyContent: "flex-end" }}>
            <span style={{ width: 10, height: 10, background: "var(--eg-green)", display: "inline-block", borderRadius: "50%" }} />
            <span className="disp" style={{ fontSize: 28, color: "var(--eg-paper)", lineHeight: 1 }}>VIGILANDO</span>
          </div>
          <div className="mono" style={{ fontSize: 10, color: "var(--eg-fg-5)", letterSpacing: "0.1em", marginTop: 6 }}>
            WATCHING · UPTIME 14D 03:18:42 · 84.214 FILAS
          </div>
        </div>
      </div>

      {/* Filter strip */}
      <div style={{
        background: "var(--eg-iron-2)",
        borderBottom: "1px solid var(--eg-iron-3)",
        padding: "8px 24px",
        display: "flex", gap: 6, flexWrap: "wrap", alignItems: "center"
      }}>
        <span className="caps" style={{ color: "var(--eg-fg-5)", marginRight: 8 }}>// acción · action ·</span>
        {actions.map(a => (
          <span
            key={a}
            onClick={() => setFilter(a)}
            style={{
              padding: "3px 8px",
              fontFamily: "var(--font-mono)", fontSize: 11,
              letterSpacing: "0.06em", cursor: "pointer",
              background: filter === a ? "var(--eg-yellow)" : "transparent",
              color: filter === a ? "var(--eg-iron)" : "var(--eg-paper)",
              border: "1px solid " + (filter === a ? "var(--eg-yellow)" : "var(--eg-iron-3)"),
              fontWeight: filter === a ? 700 : 500
            }}
          >{a}</span>
        ))}
      </div>

      {/* Live tail */}
      <div style={{ flex: 1, overflow: "auto", padding: "0", background: "var(--eg-iron)" }}>
        <div style={{
          display: "grid",
          gridTemplateColumns: "120px 60px 200px 1fr 200px",
          gap: 0,
          padding: "6px 24px",
          background: "var(--eg-iron-2)",
          borderBottom: "1px solid var(--eg-iron-3)",
          fontFamily: "var(--font-mono)", fontSize: 10,
          letterSpacing: "0.12em", textTransform: "uppercase",
          color: "var(--eg-fg-5)"
        }}>
          <span>// fecha · at</span>
          <span>// actor</span>
          <span>// acción · entidad</span>
          <span>// nota · note</span>
          <span>// diff</span>
        </div>

        {visible.map((a, i) => {
          const isScrumlord = a.actor === "—";
          return (
            <div key={i} style={{
              display: "grid",
              gridTemplateColumns: "120px 60px 200px 1fr 200px",
              gap: 0,
              padding: "10px 24px",
              borderBottom: "1px solid var(--eg-iron-2)",
              fontFamily: "var(--font-mono)", fontSize: 12,
              color: "var(--eg-paper)",
              alignItems: "center",
              background: i === 0 ? "rgba(245,196,0,0.06)" : "transparent",
            }}>
              <span style={{ color: "var(--eg-fg-5)", display: "flex", alignItems: "center", gap: 6 }}>
                {i === 0 && <span style={{ width: 6, height: 6, background: "var(--eg-yellow)", display: "inline-block", borderRadius: "50%", animation: "blink 1.4s steps(2) infinite" }} />}
                14·V·26 {a.at}
              </span>
              <span>
                {isScrumlord
                  ? <span className="lore" data-lore="scrumlord · pg-boss worker" style={{ background: "var(--eg-red)", color: "var(--eg-paper)", padding: "1px 6px", fontWeight: 700 }}>DAEMON</span>
                  : <span style={{ color: "var(--eg-yellow)", fontWeight: 700 }}>{a.actor}</span>}
              </span>
              <span>
                <span style={{ color: "var(--eg-yellow)" }}>{a.action.split(".")[0]}</span>
                <span style={{ color: "var(--eg-fg-5)" }}>.{a.action.split(".")[1]}</span>
                <span style={{ color: "var(--eg-fg-5)", margin: "0 6px" }}>·</span>
                <span style={{ color: "var(--eg-paper)" }}>{a.entity}</span>
              </span>
              <span style={{ color: "var(--eg-fg-5)" }}>{a.note}</span>
              <span style={{ color: a.diff.startsWith("+") ? "var(--eg-green)" : "var(--eg-fg-5)" }}>{a.diff}</span>
            </div>
          );
        })}

        {/* footer / pretty cmdline */}
        <div style={{
          padding: "14px 24px 22px",
          color: "var(--eg-fg-5)",
          fontFamily: "var(--font-mono)", fontSize: 11
        }}>
          <span style={{ color: "var(--eg-yellow)" }}>sauron $</span> tail -f /audit --since=-1h --limit=50
          <br />
          <span style={{ color: "var(--eg-fg-4)" }}>// {visible.length} filas · streaming · último refresco hace 2 s</span>
        </div>
      </div>
    </div>
  );
}

window.SauronScreen = SauronScreen;
