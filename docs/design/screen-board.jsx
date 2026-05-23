/* gira-scrumlord — Board (Kanban, drag-drop, hazard stripes, emergency treatment) */

function BoardScreen() {
  const projectIssues = ISSUES.filter(i => i.key.startsWith("MTNR"));
  const [issues, setIssues] = React.useState(projectIssues);
  const [dragKey, setDragKey] = React.useState(null);
  const [overCol, setOverCol] = React.useState(null);
  const [wipDismissed, setWipDismissed] = React.useState(false);
  const [emergencyDismissed, setEmergencyDismissed] = React.useState(false);

  const cols = STATUSES.map(s => ({ ...s, issues: issues.filter(i => i.status === s.id) }));
  const wipBreached = (col) => col.wip != null && col.issues.length > col.wip;

  const onDragStart = (e, key) => {
    setDragKey(key);
    e.dataTransfer.effectAllowed = "move";
  };
  const onDragEnd = () => { setDragKey(null); setOverCol(null); };
  const onDragOver = (e, colId) => { e.preventDefault(); setOverCol(colId); };
  const onDrop = (e, colId) => {
    e.preventDefault();
    setIssues(prev => prev.map(i => i.key === dragKey ? { ...i, status: colId } : i));
    setDragKey(null); setOverCol(null);
  };

  const emergencyIssues = issues.filter(i => i.priority === "emergency");

  return (
    <div className="body">
      <Subbar
        tabs={[
          { es: "Tablero",    en: "Board",   count: issues.length, active: true },
          { es: "Pendientes", en: "Backlog", count: 31 },
          { es: "Sprints",    en: "Sprints", count: 3  },
          { es: "Informes",   en: "Reports" },
        ]}
        right={
          <>
            <span className="f-pill">SPRINT <b>S-04</b> <span className="x">▾</span></span>
            <span className="f-pill">ASIGNADO <b>cualquiera</b> <span className="x">▾</span></span>
            <span className="f-pill">ETIQUETA <b>cualquiera</b> <span className="x">▾</span></span>
            <button className="b-btn b-btn--ink">+ Nuevo ticket</button>
          </>
        }
      />

      {/* Sprint header strip — riveted iron plate look */}
      <div style={{
        display: "grid", gridTemplateColumns: "auto 1fr auto auto",
        gap: 18, alignItems: "center",
        padding: "10px 20px",
        background: "var(--eg-iron)",
        color: "var(--eg-paper)",
        borderBottom: "2px solid var(--eg-iron)"
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <span className="plate plate--yellow">SPRINT · ACTIVO</span>
          <Bi es="S-04 · Pruebas de Freno" en="S-04 · Brake Tests" tone="ink" style={{ color: "var(--eg-paper)", fontFamily: "var(--font-display)", fontSize: 18, fontWeight: 800, textTransform: "uppercase", letterSpacing: "-0.01em" }} />
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <span className="mono" style={{ fontSize: 10, color: "var(--eg-fg-5)", letterSpacing: "0.12em", textTransform: "uppercase" }}>Día 6 / 10</span>
          <div style={{
            position: "relative", height: 8, background: "var(--eg-iron-2)",
            border: "1px solid var(--eg-fg-3)", flex: 1, maxWidth: 320,
          }}>
            <div style={{ position: "absolute", inset: 0, width: "60%", background: "var(--eg-yellow)" }}></div>
            <div style={{ position: "absolute", inset: 0, width: "33%", background: "repeating-linear-gradient(-45deg, var(--eg-iron) 0 4px, var(--eg-yellow) 4px 8px)" }}></div>
          </div>
          <span className="mono" style={{ fontSize: 10, color: "var(--eg-paper)", letterSpacing: "0.1em" }}>9/21 PTS</span>
        </div>

        <div style={{ display: "flex", gap: 14, alignItems: "center", color: "var(--eg-paper)" }}>
          <span className="mono" style={{ fontSize: 11, letterSpacing: "0.1em" }}>
            <span style={{ color: "var(--eg-fg-5)" }}>TIEMPO ·</span> <b style={{ color: "var(--eg-yellow)" }}>14h 32m</b>
          </span>
          <span className="mono" style={{ fontSize: 11, letterSpacing: "0.1em" }}>
            <span style={{ color: "var(--eg-fg-5)" }}>DEVENGADO ·</span> <b style={{ color: "var(--eg-yellow)" }}>EUR 1.671,00</b>
          </span>
          <span className="mono lore" data-lore="velocidad · comprometido vs completado · últimos 5 sprints" style={{ fontSize: 11, letterSpacing: "0.1em", color: "var(--eg-yellow)" }}>
            <SpinGlyph /> <b>19,4 PTS/SPRINT</b>
          </span>
        </div>

        <div style={{ display: "flex", gap: 6 }}>
          <button className="b-btn b-btn--yellow">Cerrar sprint</button>
        </div>
      </div>

      {/* Emergency banner */}
      {emergencyIssues.length > 0 && !emergencyDismissed && (
        <div style={{
          background: "repeating-linear-gradient(-45deg, var(--eg-yellow) 0 14px, var(--eg-iron) 14px 28px)",
          padding: 6,
          borderBottom: "2px solid var(--eg-iron)"
        }}>
          <div style={{
            background: "var(--eg-red)", color: "var(--eg-paper)",
            padding: "8px 16px", display: "flex", alignItems: "center", gap: 14
          }}>
            <span className="plate" style={{ background: "var(--eg-paper)", color: "var(--eg-iron)", borderColor: "var(--eg-paper)" }}>!! EMERGENCIA</span>
            <span className="disp" style={{ color: "var(--eg-paper)", fontSize: 18 }}>
              {emergencyIssues[0].key} · {emergencyIssues[0].title}
            </span>
            <span className="mono" style={{ marginLeft: "auto", fontSize: 11, letterSpacing: "0.12em" }}>
              AVISADO · HACE 11 MIN · ACK · EG · OUTBOX→DISPATCH
            </span>
            <button className="b-btn" style={{ background: "var(--eg-iron)", color: "var(--eg-yellow)", border: "1.5px solid var(--eg-yellow)" }}>Abrir</button>
            <button onClick={() => setEmergencyDismissed(true)} className="b-btn b-btn--ghost" style={{ color: "var(--eg-paper)" }}>✕</button>
          </div>
        </div>
      )}

      {/* Columns */}
      <div style={{ flex: 1, overflow: "auto", padding: "16px 20px", background: "var(--eg-paper)" }}>
        <div style={{ display: "flex", gap: 0, height: "100%", alignItems: "flex-start" }}>
          {cols.map((c, ci) => {
            const breached = wipBreached(c);
            const colNames = {
              s1: { es: "Pendientes",  en: "Backlog" },
              s2: { es: "Por Hacer",   en: "To Do" },
              s3: { es: "En Curso",    en: "In Progress" },
              s4: { es: "En Revisión", en: "In Review" },
              s5: { es: "Hecho",       en: "Done" },
            }[c.id] || { es: c.name, en: c.name };
            return (
              <React.Fragment key={c.id}>
                <div
                  onDragOver={(e) => onDragOver(e, c.id)}
                  onDrop={(e) => onDrop(e, c.id)}
                  style={{
                    width: "var(--gs-col)", flexShrink: 0,
                    background: overCol === c.id ? "var(--eg-yellow-soft)" : "transparent",
                    transition: "background 120ms",
                    display: "flex", flexDirection: "column",
                    border: overCol === c.id ? "2px dashed var(--eg-iron)" : "2px dashed transparent",
                    minHeight: 600,
                  }}
                >
                  {/* Column header — riveted plate */}
                  <div style={{ padding: "0 6px 8px" }}>
                    <div style={{
                      background: c.cat === "done" ? "var(--eg-green)" : c.cat === "in_progress" ? "var(--eg-yellow)" : "var(--eg-paper-3)",
                      color: c.cat === "done" ? "var(--eg-paper)" : "var(--eg-iron)",
                      border: "1.5px solid var(--eg-iron)",
                      padding: "6px 10px",
                      display: "flex", justifyContent: "space-between", alignItems: "center",
                      boxShadow: "1px 1px 0 var(--eg-iron)"
                    }}>
                      <span style={{ display: "flex", alignItems: "center", gap: 8 }}>
                        <span style={{ width: 10, height: 10, background: c.cat === "done" ? "var(--eg-paper)" : "var(--eg-iron)", marginTop: 4 }} />
                        <Bi
                          es={colNames.es}
                          en={colNames.en}
                          size="tiny"
                          tone={c.cat === "done" ? "ink" : ""}
                          style={{
                            fontFamily: "var(--font-display)", fontWeight: 800,
                            fontSize: 14, textTransform: "uppercase", letterSpacing: "0.04em",
                            color: c.cat === "done" ? "var(--eg-paper)" : "var(--eg-iron)"
                          }}
                        />
                      </span>
                      <span className="mono" style={{ fontSize: 11, fontWeight: 600 }}>
                        {c.issues.length}{c.wip ? `/${c.wip}` : ""}
                      </span>
                    </div>

                    {breached && !wipDismissed && (
                      <div style={{
                        marginTop: 4,
                        padding: "6px 10px",
                        background: "repeating-linear-gradient(-45deg, var(--eg-yellow) 0 8px, var(--eg-iron) 8px 16px)",
                      }}>
                        <div style={{
                          background: "var(--eg-paper)", padding: "6px 10px",
                          display: "flex", justifyContent: "space-between", alignItems: "center",
                          border: "1.5px solid var(--eg-iron)",
                          fontFamily: "var(--font-mono)", fontSize: 10,
                          textTransform: "uppercase", letterSpacing: "0.1em", color: "var(--eg-iron)"
                        }}>
                          <span>!! WIP {c.issues.length}/{c.wip} · límite excedido · cap exceeded</span>
                          <span onClick={() => setWipDismissed(true)} style={{ cursor: "pointer", color: "var(--eg-fg-3)" }}>✕</span>
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Cards */}
                  <div style={{ display: "flex", flexDirection: "column", gap: 8, padding: "0 6px 6px" }}>
                    {c.issues.map(issue => (
                      <div
                        key={issue.key}
                        draggable
                        onDragStart={(e) => onDragStart(e, issue.key)}
                        onDragEnd={onDragEnd}
                      >
                        <IssueCard issue={issue} ghost={dragKey === issue.key} />
                      </div>
                    ))}
                    {c.issues.length === 0 && (
                      <div style={{
                        border: "1.5px dashed var(--eg-rule)",
                        padding: "20px 10px",
                        textAlign: "center",
                        fontFamily: "var(--font-mono)", fontSize: 10,
                        letterSpacing: "0.12em", color: "var(--eg-fg-4)",
                        textTransform: "uppercase"
                      }}>
                        Vacío · Empty
                      </div>
                    )}

                    {c.cat !== "done" && (
                      <button style={{
                        marginTop: 4,
                        padding: "6px 10px",
                        background: "transparent",
                        border: "1.5px dashed var(--eg-rule)",
                        cursor: "pointer",
                        fontFamily: "var(--font-display)", fontWeight: 700,
                        fontSize: 12, textTransform: "uppercase",
                        color: "var(--eg-fg-3)", letterSpacing: "0.04em",
                        textAlign: "left"
                      }}>
                        + Nuevo
                      </button>
                    )}
                  </div>
                </div>

                {/* Hazard divider between columns */}
                {ci < cols.length - 1 && (
                  <div style={{
                    width: 12, flexShrink: 0, alignSelf: "stretch",
                    background: "repeating-linear-gradient(-45deg, var(--eg-yellow) 0 6px, var(--eg-iron) 6px 12px)",
                    marginInline: 6,
                  }} />
                )}
              </React.Fragment>
            );
          })}
        </div>
      </div>
    </div>
  );
}

window.BoardScreen = BoardScreen;
