// Panel de tiempo de propagación (Capa 5).
// Muestra la estimación temporal de la propagación tras la simulación: fecha
// y hora de inicio, duración, etapas clave con fechas/horas, y comparación
// con la velocidad de un evento histórico similar.
export default function PanelTiempoPropagacion({ tiempo, comparacionHist, onGenerarReporte }) {
  if (!tiempo) {
    return (
      <div className="tiempo-panel">
        <p className="text-muted" style={{ fontSize: 13 }}>
          Ejecuta una simulación (Capa 4) para ver aquí la estimación del tiempo de propagación.
        </p>
      </div>
    );
  }

  return (
    <div className="tiempo-panel">
      <div className="tiempo-resumen">
        <div className="tiempo-kpi">
          <span className="tiempo-kpi-label">Inicio</span>
          <span className="tiempo-kpi-valor">{tiempo.fechaInicioTexto}</span>
        </div>
        <div className="tiempo-kpi">
          <span className="tiempo-kpi-label">Duración simulada</span>
          <span className="tiempo-kpi-valor" style={{ color: "var(--alerta-naranja)" }}>{tiempo.duracionTexto}</span>
        </div>
        <div className="tiempo-kpi">
          <span className="tiempo-kpi-label">Área final</span>
          <span className="tiempo-kpi-valor">{tiempo.areaFinalHa.toLocaleString()} ha</span>
        </div>
        <div className="tiempo-kpi">
          <span className="tiempo-kpi-label">Velocidad</span>
          <span className="tiempo-kpi-valor">{tiempo.velocidadHaHora} ha/h</span>
        </div>
      </div>

      {/* Línea de tiempo de etapas */}
      <div className="tiempo-linea">
        {tiempo.etapas.map((e, i) => (
          <div key={i} className="tiempo-etapa">
            <div className="tiempo-etapa-punto" />
            {i < tiempo.etapas.length - 1 && <div className="tiempo-etapa-linea" />}
            <div className="tiempo-etapa-contenido">
              <span className="tiempo-etapa-nombre">{e.nombre}</span>
              <span className="tiempo-etapa-fecha">{e.fechaTexto}</span>
              <span className="tiempo-etapa-desc">{e.descripcion}</span>
              {e.area_ha > 0 && <span className="tiempo-etapa-area">{e.area_ha.toLocaleString()} ha afectadas</span>}
            </div>
          </div>
        ))}
      </div>

      {/* Comparación con histórico */}
      {comparacionHist && (
        <div className="tiempo-comparacion">
          <span className="tiempo-comparacion-titulo">Comparación con evento real: {comparacionHist.evento}</span>
          <div className="tiempo-comparacion-grid">
            <div>
              <span className="tiempo-comp-label">Velocidad simulada</span>
              <span className="mono">{comparacionHist.velocidad_sim_km2_dia} km²/día</span>
            </div>
            <div>
              <span className="tiempo-comp-label">Velocidad real ({comparacionHist.evento.match(/\d{4}/)?.[0] || "hist."})</span>
              <span className="mono">{comparacionHist.velocidad_hist_km2_dia} km²/día</span>
            </div>
            <div>
              <span className="tiempo-comp-label">Duración real</span>
              <span className="mono">{comparacionHist.duracion_hist_dias} días</span>
            </div>
          </div>
        </div>
      )}

      {onGenerarReporte && (
        <button className="btn btn--primary tiempo-boton-reporte" onClick={onGenerarReporte}>
          Generar reporte completo
        </button>
      )}
    </div>
  );
}
