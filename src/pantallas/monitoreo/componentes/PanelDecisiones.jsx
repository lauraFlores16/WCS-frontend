// ============================================================================
// DECISIONES DE LA SIMULACIÓN — contenido de la pestaña "Simulación"
// ============================================================================
// Todo lo que el sistema decidió solo antes de simular: cada parámetro con su
// valor, su fuente y por qué se eligió. Sustituye al formulario de sliders con
// números inventados que tenía el prototipo.
//
// El botón de ejecutar NO está aquí: vive en el pie fijo del panel derecho
// (nucleo/PanelDeslizable.jsx), donde queda visible sea cual sea la pestaña
// abierta y esté donde esté el scroll. Es la acción de la pantalla y no puede
// depender de haber bajado por toda la justificación.
import { useState } from "react";
import Icono from "../../../nucleo/Icono";

export default function PanelDecisiones({
  estado,            // "vacio" | "cargando" | "listo" | "error"
  diagnostico,       // [{ etiqueta, valor, fuente, nota }]
  parametros,
  nivel,
  errorMeteo,
  terreno,           // resumen de la capa OSM
  dem,               // estadísticas del DEM
  calibracion,
  metadatosMotor,    // qué usó realmente el motor en la última corrida
  onRefrescar,
  onCalibrar,
  progresoCalibracion,
  puntosGrafica,
  children,          // la curva de propagación, cuando hay
}) {
  const [expandido, setExpandido] = useState(null);

  const colorNivel =
    nivel === "ALTO" ? "var(--alerta-roja)"
      : nivel === "MEDIO" ? "var(--alerta-naranja)"
        : "var(--riesgo-bajo)";

  return (
    <div className="decisiones">
      <div className="decisiones-barra">
        {nivel && (
          <span className="decisiones-nivel" style={{ borderColor: colorNivel }}>
            <span className="decisiones-nivel-punto" style={{ background: colorNivel }} />
            Peligro <strong style={{ color: colorNivel }}>{nivel}</strong>
          </span>
        )}
        <button className="decisiones-refrescar" onClick={onRefrescar}
          disabled={estado === "cargando"}
          title="Volver a consultar Open-Meteo, NASA FIRMS y el terreno">
          <Icono nombre="refrescar" tam={14} />
          {estado === "cargando" ? "Consultando…" : "Actualizar"}
        </button>
      </div>

      {estado === "cargando" && (
        <div className="decisiones-cargando">
          Consultando Open-Meteo, NASA FIRMS, DEM Copernicus y OpenStreetMap…
        </div>
      )}

      {errorMeteo && (
        <div className="decisiones-aviso">
          <Icono nombre="aviso" tam={14} />
          <span>Sin datos en vivo. Se usan los promedios ERA5 del grid.</span>
        </div>
      )}

      {/* --- Parámetros derivados --- */}
      <div className="decisiones-lista">
        {(diagnostico || []).map((d, i) => (
          <button key={i} className={`decisiones-item${expandido === i ? " abierto" : ""}`}
            onClick={() => setExpandido(expandido === i ? null : i)}>
            <div className="decisiones-item-fila">
              <span className="decisiones-item-etiqueta">{d.etiqueta}</span>
              <span className="mono decisiones-item-valor">{d.valor}</span>
            </div>
            <div className="decisiones-item-fuente">{d.fuente}</div>
            {expandido === i && d.nota && <div className="decisiones-item-nota">{d.nota}</div>}
          </button>
        ))}
      </div>

      {/* --- Curva de propagación de la última corrida --- */}
      {puntosGrafica?.length > 0 && children}

      {/* --- Capa 1: terreno --- */}
      {(terreno || dem) && (
        <div className="decisiones-bloque">
          <div className="decisiones-bloque-titulo">Capa 1 · Terreno</div>
          {dem && (
            <div className="decisiones-dato">
              <span>Relieve (Copernicus DEM)</span>
              <span className="mono">{dem.min}–{dem.max} m · Δ{dem.desnivel} m</span>
            </div>
          )}
          {terreno && (
            <>
              <div className="decisiones-dato">
                <span>Ríos / quebradas (OSM)</span>
                <span className="mono">{terreno.rios} / {terreno.quebradas}</span>
              </div>
              <div className="decisiones-dato">
                <span>Celdas barrera hídrica</span>
                <span className="mono">{terreno.barreras_hidricas}</span>
              </div>
              <div className="decisiones-dato">
                <span>Caminos (cortafuegos)</span>
                <span className="mono">{terreno.caminos}</span>
              </div>
            </>
          )}
        </div>
      )}

      {/* --- Calibración --- */}
      <div className="decisiones-bloque">
        <div className="decisiones-bloque-titulo">Calibración de constantes K</div>
        {calibracion ? (
          <>
            <div className="decisiones-dato">
              <span>F1 vs. perímetros reales</span>
              <span className="mono">{(calibracion.f1 * 100).toFixed(1)} %</span>
            </div>
            <div className="decisiones-dato">
              <span>Calibrado el</span>
              <span className="mono">{calibracion.fecha?.slice(0, 10)}</span>
            </div>
            <div className="decisiones-dato-nota">{calibracion.metodo}</div>
          </>
        ) : (
          <div className="decisiones-dato-nota">
            Las constantes están en sus valores por defecto. La calibración las ajusta con
            evolución diferencial contra los incendios reales de 2021, 2023 y 2024.
          </div>
        )}
        {progresoCalibracion != null && (
          <div className="decisiones-barra-progreso">
            <div className="decisiones-barra-relleno" style={{ width: `${progresoCalibracion * 100}%` }} />
          </div>
        )}
        <button className="btn decisiones-btn-secundario" onClick={onCalibrar}
          disabled={progresoCalibracion != null}>
          {progresoCalibracion != null
            ? `Calibrando… ${(progresoCalibracion * 100).toFixed(0)} %`
            : "Calibrar constantes K"}
        </button>
      </div>

      {/* --- Qué usó el motor --- */}
      {metadatosMotor && (
        <div className="decisiones-bloque">
          <div className="decisiones-bloque-titulo">Motor de la última corrida</div>
          <Chip activo={metadatosMotor.usa_dem}
            texto={metadatosMotor.usa_dem
              ? `Pendiente por Δaltura (${metadatosMotor.celdas_con_dem} celdas)`
              : "Pendiente de celda (sin DEM)"} />
          <Chip activo={metadatosMotor.usa_serie_viento}
            texto={metadatosMotor.usa_serie_viento ? "Viento variable en el tiempo" : "Viento constante"} />
          <Chip activo={metadatosMotor.barreras_osm > 0}
            texto={`${metadatosMotor.barreras_osm} barreras hídricas activas`} />
          <Chip activo={metadatosMotor.saltos_spotting > 0}
            texto={`${metadatosMotor.saltos_spotting} saltos de pavesas`} />
        </div>
      )}

      {parametros && (
        <details className="decisiones-crudo">
          <summary>Ver parámetros exactos</summary>
          <pre className="mono">{JSON.stringify(
            { ...parametros, serie_viento: parametros.serie_viento ? `${parametros.serie_viento.length} horas` : null },
            null, 2)}</pre>
        </details>
      )}
    </div>
  );
}

function Chip({ activo, texto }) {
  return (
    <div className="decisiones-chip">
      <span className={`decisiones-chip-punto${activo ? " activo" : ""}`} />
      <span>{texto}</span>
    </div>
  );
}
