// Comparación con eventos históricos.
// Después de una simulación, la compara contra los 3 eventos reales (2021,
// 2023, 2024) por ubicación del foco + variables ambientales, y muestra el
// ranking de similitud. Para el evento más parecido, muestra su resultado
// real (área quemada, velocidad, métricas de validación IoU/F1).
// Permite descargar un reporte de la comparación.
import { useEffect, useState } from "react";
import { useEscenario } from "../../nucleo/EscenarioContext";
import Icono from "../../nucleo/Icono";
import { comparacionApi } from "./api";
import { generarReporteComparacion } from "./reporte";
import "../../nucleo/estilos/Pantalla.css";
import "./estilos/Comparacion.css";

// Un valor que puede faltar no debe tumbar la pantalla: `null.toLocaleString()`
// lanza, y aquí llegan escenarios que se interrumpieron a medias.
const nf = (n, sufijo = "") =>
  n == null || Number.isNaN(Number(n))
    ? "no disponible"
    : Number(n).toLocaleString("es", { maximumFractionDigits: 4 }) + sufijo;

export default function Comparacion() {
  const { escenarioId } = useEscenario();
  const [escenarios, setEscenarios] = useState([]);
  const [seleccionado, setSeleccionado] = useState(escenarioId || "");
  const [resultado, setResultado] = useState(null);
  const [cargando, setCargando] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    comparacionApi.listarEscenarios().then(({ data }) => {
      setEscenarios(data);
      if (!seleccionado && data.length) setSeleccionado(data[0].escenario_id);
    });
  }, []);

  useEffect(() => {
    if (!seleccionado) { setResultado(null); return; }
    setCargando(true);
    setError(null);
    comparacionApi.comparar(seleccionado)
      .then(({ data }) => setResultado(data))
      .catch((e) => { setError(e.response?.data?.detail || "No se pudo comparar."); setResultado(null); })
      .finally(() => setCargando(false));
  }, [seleccionado]);

  return (
    <div className="pantalla">

      {/* La barra superior del armazón ya escribe «Comparación · Contraste con
          eventos históricos»: repetirlo aquí gastaba 90 px de alto en decir dos
          veces lo mismo. Ese hueco lo ocupa ahora el selector de escenario. */}
      <div className="pantalla-barra">
        <div className="pantalla-barra-izq">
          <select className="select comp-escenario-selector"
            value={seleccionado} onChange={(e) => setSeleccionado(e.target.value)}>
            <option value="">Selecciona un escenario simulado…</option>
            {escenarios.map((e) => (
              <option key={e.escenario_id} value={e.escenario_id}>
                {e.nombre} — {new Date(e.creado_en).toLocaleString("es-BO")}
              </option>
            ))}
          </select>
          {cargando && <span className="pantalla-conteo">Comparando…</span>}
        </div>

        {resultado && (
          <div className="pantalla-barra-der">
            <button className="btn btn--mini"
              onClick={() => generarReporteComparacion(resultado)}>
              <Icono nombre="descargar" tam={14} />
              Descargar reporte
            </button>
          </div>
        )}
      </div>

      {error && (
        <div className="pantalla-aviso es-error">
          <Icono nombre="aviso" tam={16} />
          <span>{error}</span>
        </div>
      )}

      {!seleccionado && !cargando && (
        <div className="panel">
          <div className="pantalla-vacio">
            <Icono nombre="comparacion" tam={28} />
            <span className="pantalla-vacio-titulo">
              {escenarios.length ? "Elige un escenario para compararlo"
                                 : "Todavía no hay ninguna simulación que comparar"}
            </span>
            <p>
              {escenarios.length
                ? "Se contrasta contra los tres incendios reales de 2021, 2023 y 2024 por ubicación del foco y por variables ambientales."
                : "Ejecuta una simulación desde Monitoreo o desde Simulación y vuelve aquí: se comparará con los eventos reales de 2021, 2023 y 2024."}
            </p>
          </div>
        </div>
      )}

      {resultado && (
        <>
          {/* Resumen de la simulación */}
          <div className="panel comp-resumen">
            <div className="comp-resumen-titulo">Tu simulación: {resultado.escenario.nombre}</div>
            <div className="comp-vars">
              <Var label="Área quemada" valor={nf(resultado.escenario.area_final_ha, " ha")} />
              <Var label="NDVI medio" valor={nf(resultado.escenario.variables?.ndvi)} />
              <Var label="Humedad media" valor={nf(resultado.escenario.variables?.humedad)} />
              <Var label="Viento medio" valor={nf(resultado.escenario.variables?.velocidad_viento, " m/s")} />
              <Var label="Temp. media" valor={nf(resultado.escenario.variables?.temperatura_aire, " °C")} />
              {resultado.escenario.foco && (
                <Var label="Foco (lat, lon)" valor={`${resultado.escenario.foco.lat.toFixed(3)}, ${resultado.escenario.foco.lon.toFixed(3)}`} />
              )}
            </div>
          </div>

          {/* Ranking de similitud */}
          <div className="comp-ranking">
            {resultado.ranking.map((r, i) => (
              <CardEvento key={r.evento.anio} r={r} rank={i + 1} esTop={i === 0} />
            ))}
          </div>
        </>
      )}
    </div>
  );
}

function Var({ label, valor }) {
  return (
    <div className="comp-var-item">
      <span className="comp-var-label">{label}</span>
      <span className="comp-var-valor">{valor}</span>
    </div>
  );
}

function CardEvento({ r, rank, esTop }) {
  const ev = r.evento;
  return (
    <div className={`panel comp-card${esTop ? " top" : ""}`}>
      <div className="comp-card-cabecera">
        <div style={{ display: "flex", alignItems: "center" }}>
          <span className="comp-card-rank">{rank}</span>
          <span className="comp-card-nombre">{ev.nombre}</span>
        </div>
        <div className="comp-puntaje">
          <div className="comp-puntaje-num" style={{ color: esTop ? "var(--acento-400)" : "var(--text-primary)" }}>
            {r.puntaje_total}
          </div>
          <div className="comp-puntaje-label">% similitud</div>
        </div>
      </div>

      <div className="comp-barras">
        <Barra label="Ubicación del foco" valor={r.puntaje_ubicacion}
          extra={`${r.distancia_km} km de distancia`} />
        <Barra label="Variables ambientales" valor={r.puntaje_variables} />
      </div>

      <div className="comp-detalle">
        <Detalle label="Área real quemada" valor={`${ev.area_km2} km²`} />
        <Detalle label="Duración" valor={`${ev.duracion_dias} días`} />
        <Detalle label="Velocidad" valor={`${ev.velocidad_km2_dia} km²/día`} />
        {ev.validacion && (
          <>
            <Detalle label="IoU (validación)" valor={`${ev.validacion.IoU}%`} />
            <Detalle label="Recall" valor={`${ev.validacion.Recall}%`} />
            <Detalle label="F1-score" valor={`${ev.validacion.F1}%`} />
          </>
        )}
      </div>

      {esTop && (
        <p className="text-secondary" style={{ fontSize: 12.5, marginTop: 14, lineHeight: 1.6 }}>
          <strong style={{ color: "var(--acento-400)" }}>Evento más parecido.</strong>{" "}
          Tu escenario simulado se asemeja a este incendio real. Según el evento histórico,
          con condiciones similares el fuego afectó <strong>{ev.area_km2} km²</strong> a lo largo de{" "}
          <strong>{ev.duracion_dias} días</strong> ({ev.velocidad_km2_dia} km²/día).
        </p>
      )}
    </div>
  );
}

function Barra({ label, valor, extra }) {
  return (
    <div className="comp-barra-bloque">
      <div className="comp-barra-cabecera">
        <span className="text-secondary">{label}</span>
        <span className="mono">{valor}%{extra ? ` · ${extra}` : ""}</span>
      </div>
      <div className="comp-barra-track">
        <div className="comp-barra-fill" style={{ width: `${valor}%` }} />
      </div>
    </div>
  );
}

function Detalle({ label, valor }) {
  return (
    <div className="comp-detalle-item">
      <span className="comp-detalle-label">{label}</span>
      <span className="comp-detalle-valor">{valor}</span>
    </div>
  );
}
