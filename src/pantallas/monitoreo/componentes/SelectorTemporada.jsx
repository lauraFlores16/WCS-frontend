// Selector de temporada / evento climático, ANTES de simular.
// El usuario decide si incluir la estacionalidad y con qué temporada:
//   · Auto: la decide el mes actual (seca ≈ mayo–oct, lluvias ≈ nov–abr)
//   · Seca: combustible seco → más probabilidad y propagación
//   · Lluvias: combustible húmedo → menos
// Afecta delta_humedad y p_base de la simulación (el backend aplica el ajuste).
export default function SelectorTemporada({ incluir, setIncluir, temporada, setTemporada, resumen }) {
  return (
    <div className="temporada-caja">
      <label className="temporada-toggle">
        <input type="checkbox" checked={incluir} onChange={(e) => setIncluir(e.target.checked)} />
        <span>Incluir temporada</span>
      </label>

      {incluir && (
        <div className="temporada-opciones">
          {[
            { id: "auto", label: "Auto (por fecha)" },
            { id: "seca", label: "Época seca" },
            { id: "lluvias", label: "Época de lluvias" },
          ].map((op) => (
            <button
              key={op.id}
              className={`temporada-btn${temporada === op.id ? " activo" : ""}`}
              onClick={() => setTemporada(op.id)}
              type="button"
            >
              {op.label}
            </button>
          ))}
        </div>
      )}

      {incluir && resumen && (
        <div className="temporada-resumen" title={resumen.nota}>
          {resumen.etiqueta}
        </div>
      )}
    </div>
  );
}
