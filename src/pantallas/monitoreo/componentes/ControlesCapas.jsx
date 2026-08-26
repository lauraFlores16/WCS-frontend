// Botones para prender/apagar cada capa del mapa. Varias pueden estar
// activas al mismo tiempo (por ejemplo: propagación + focos históricos juntos).
//
// Las capas "focos" y "probabilidad" solo se ofrecen al rol Analista —
// en el diseño original esas eran pantallas exclusivas de Analista
// (UGR y Brigadas no debían verlas), y esa regla se conserva aunque ahora
// vivan como capas dentro de la misma pantalla de Monitoreo.
export default function ControlesCapas({ capas, alternar, rol }) {
  const opciones = [
    { key: "propagacion", label: "Propagación", paraTodos: true },
    { key: "focos", label: "Focos históricos FIRMS", soloAnalista: true },
    { key: "probabilidad", label: "Probabilidad XGBoost", soloAnalista: true },
  ].filter((op) => op.paraTodos || (op.soloAnalista && rol === "analista"));

  return (
    <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
      {opciones.map((op) => (
        <button
          key={op.key}
          onClick={() => alternar(op.key)}
          className="btn"
          style={{
            padding: "7px 14px",
            fontSize: 13,
            background: capas[op.key] ? "var(--acento-tint)" : "var(--bg-panel-raised)",
            borderColor: capas[op.key] ? "var(--acento-500)" : "var(--border-strong)",
            color: capas[op.key] ? "var(--acento-400)" : "var(--text-secondary)",
          }}
        >
          {op.label}
        </button>
      ))}
    </div>
  );
}
