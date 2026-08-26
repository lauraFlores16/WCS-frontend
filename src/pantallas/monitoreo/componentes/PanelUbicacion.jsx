// ============================================================================
// PANEL DE UBICACIÓN — contenido contextual del panel derecho
// ============================================================================
// Lo que el Analista necesita saber de la celda que acaba de tocar en el mapa,
// sin salir del mapa. Es la pieza que cierra el flujo:
//
//   MAPA → seleccionar → consultar variables → valorar riesgo → simular
//
// REGLA: aquí no se inventa ni un número. Cada dato tiene su origen real:
//   · del grid (grid.csv): probabilidad XGBoost, NDVI, humedad ERA5, viento
//     medio, pendiente. Son valores por celda, precalculados.
//   · del DEM (Copernicus, vía backend): elevación. Solo si la ventana del
//     DEM llegó a descargarse.
//   · de Open-Meteo: temperatura, humedad y viento del MOMENTO, más
//     precipitación. Es del municipio, no de la celda: se dice explícitamente.
// Lo que no está disponible se marca como tal en vez de rellenarse.
import Icono from "../../../nucleo/Icono";

const AREA_CELDA_HA = 25;

const ROSA = ["N", "NNE", "NE", "ENE", "E", "ESE", "SE", "SSE",
              "S", "SSO", "SO", "OSO", "O", "ONO", "NO", "NNO"];

function direccionDe(u, v) {
  if (!u && !v) return null;
  const grados = (270 - (Math.atan2(v, u) * 180) / Math.PI + 360) % 360;
  return { grados: Math.round(grados), rosa: ROSA[Math.round(grados / 22.5) % 16] };
}

function nivelDe(p) {
  if (p == null) return null;
  if (p >= 0.70) return { label: "Crítico", color: "var(--alerta-roja)" };
  if (p >= 0.45) return { label: "Alto", color: "var(--alerta-naranja)" };
  if (p >= 0.25) return { label: "Moderado", color: "var(--alerta-amarilla)" };
  return { label: "Bajo", color: "var(--riesgo-bajo)" };
}

function Dato({ icono, etiqueta, valor, unidad, nota, ausente }) {
  return (
    <div className={`dato${ausente ? " ausente" : ""}`}>
      <span className="dato-icono"><Icono nombre={icono} tam={15} /></span>
      <span className="dato-texto">
        <span className="dato-etiqueta">{etiqueta}</span>
        {nota && <span className="dato-nota">{nota}</span>}
      </span>
      <span className="dato-valor mono">
        {ausente ? <span className="dato-ausente">no disponible</span> : (
          <>{valor}{unidad && <span className="dato-unidad">{unidad}</span>}</>
        )}
      </span>
    </div>
  );
}

function Seccion({ titulo, children }) {
  return (
    <section className="ubi-seccion">
      <h3 className="ubi-seccion-titulo">{titulo}</h3>
      <div className="ubi-seccion-cuerpo">{children}</div>
    </section>
  );
}

export default function PanelUbicacion({ celda, meteo, dem, focoFirms, onSimularAqui, onConsolaAqui, puedeSimular }) {
  if (!celda) {
    return (
      <div className="ubi-vacio">
        <Icono nombre="ubicacion" tam={26} />
        <p>Ninguna ubicación seleccionada.</p>
        <p className="ubi-vacio-pista">
          Toca una celda del mapa, un foco de calor o una alerta para ver aquí sus
          variables ambientales y su probabilidad de ignición.
        </p>
      </div>
    );
  }

  const prob = celda.prob_ignicion;
  const nivel = nivelDe(prob);
  const viento = direccionDe(celda.viento_u, celda.viento_v);
  const velViento = Math.hypot(celda.viento_u ?? 0, celda.viento_v ?? 0);
  const elevacion = dem?.get?.(celda.id) ?? dem?.[celda.id];
  const actual = meteo?.actual;

  return (
    <div className="ubi">

      {/* ---------- Cabecera con el nivel de riesgo ---------- */}
      {nivel && (
        <div className="ubi-riesgo" style={{ borderColor: nivel.color }}>
          <div className="ubi-riesgo-cab">
            <span className="ubi-riesgo-punto" style={{ background: nivel.color }} />
            <span className="ubi-riesgo-nivel">Riesgo <strong style={{ color: nivel.color }}>{nivel.label}</strong></span>
            <span className="ubi-riesgo-pct mono">{(prob * 100).toFixed(1)} %</span>
          </div>
          <div className="ubi-riesgo-barra">
            <div className="ubi-riesgo-relleno"
              style={{ width: `${Math.min(prob * 100, 100)}%`, background: nivel.color }} />
          </div>
          <span className="ubi-riesgo-fuente">Probabilidad de ignición · modelo XGBoost V3</span>
        </div>
      )}

      {/* ---------- Información espacial ---------- */}
      <Seccion titulo="Ubicación">
        <Dato icono="ubicacion" etiqueta="Municipio" valor="Apolo" nota="Franz Tamayo, La Paz" />
        <Dato icono="capas" etiqueta="Celda" valor={`${celda.fila} · ${celda.columna}`} nota="fila · columna" />
        <Dato icono="mapa" etiqueta="Coordenadas"
          valor={`${celda.lat.toFixed(4)}, ${celda.lon.toFixed(4)}`} nota="latitud, longitud" />
        <Dato icono="capas" etiqueta="Área" valor={AREA_CELDA_HA} unidad=" ha" nota="500 × 500 m" />
      </Seccion>

      {/* ---------- Foco FIRMS, si se llegó desde uno ---------- */}
      {focoFirms && (
        <Seccion titulo="Foco de calor detectado">
          <Dato icono="calendario" etiqueta="Detección"
            valor={focoFirms.fecha || "—"} nota={focoFirms.hora ? `hora ${focoFirms.hora} UTC` : null} />
          <Dato icono="foco" etiqueta="Potencia radiativa"
            valor={focoFirms.frp ?? "—"} unidad={focoFirms.frp != null ? " MW" : ""}
            ausente={focoFirms.frp == null} nota="FRP" />
          <Dato icono="verificado" etiqueta="Confianza"
            valor={focoFirms.confianza ?? "—"} ausente={focoFirms.confianza == null} />
          <Dato icono="datos" etiqueta="Satélite" valor={focoFirms.satelite || "VIIRS"} />
        </Seccion>
      )}

      {/* ---------- Variables de la celda (grid) ---------- */}
      <Seccion titulo="Variables de la celda">
        <Dato icono="vegetacion" etiqueta="NDVI" nota="vegetación · Landsat 8"
          valor={celda.ndvi != null ? celda.ndvi.toFixed(3) : null} ausente={celda.ndvi == null} />
        <Dato icono="humedad" etiqueta="Humedad" nota="promedio ERA5 del grid"
          valor={celda.humedad != null ? (celda.humedad * 100).toFixed(0) : null}
          unidad=" %" ausente={celda.humedad == null} />
        <Dato icono="viento" etiqueta="Viento medio" nota={viento ? `dirección ${viento.rosa} (${viento.grados}°)` : "promedio ERA5"}
          valor={velViento ? velViento.toFixed(2) : null} unidad=" m/s" ausente={!velViento} />
        <Dato icono="pendiente" etiqueta="Pendiente" nota="SRTM"
          valor={celda.pendiente_grados != null ? celda.pendiente_grados.toFixed(1) : null}
          unidad="°" ausente={celda.pendiente_grados == null} />
        <Dato icono="elevacion" etiqueta="Elevación" nota="Copernicus DEM"
          valor={elevacion != null ? Math.round(elevacion) : null}
          unidad=" m" ausente={elevacion == null} />
      </Seccion>

      {/* ---------- Meteorología en vivo ---------- */}
      <Seccion titulo="Condiciones actuales">
        {actual ? (
          <>
            <Dato icono="temperatura" etiqueta="Temperatura" nota="Open-Meteo"
              valor={actual.temperatura_c != null ? actual.temperatura_c.toFixed(1) : null}
              unidad=" °C" ausente={actual.temperatura_c == null} />
            <Dato icono="humedad" etiqueta="Humedad relativa" nota="ahora mismo"
              valor={actual.humedad_relativa != null ? (actual.humedad_relativa * 100).toFixed(0) : null}
              unidad=" %" ausente={actual.humedad_relativa == null} />
            <Dato icono="viento" etiqueta="Viento"
              nota={actual.viento_direccion != null
                ? `del ${ROSA[Math.round(actual.viento_direccion / 22.5) % 16]}`
                : "velocidad actual"}
              valor={actual.viento_ms != null ? actual.viento_ms.toFixed(1) : null}
              unidad=" m/s" ausente={actual.viento_ms == null} />
            <Dato icono="viento" etiqueta="Ráfagas" nota="máximo instantáneo"
              valor={actual.rafaga_ms ? actual.rafaga_ms.toFixed(1) : null}
              unidad=" m/s" ausente={!actual.rafaga_ms} />
            <Dato icono="lluvia" etiqueta="Precipitación" nota="acumulada en la hora"
              valor={actual.precipitacion_mm != null ? actual.precipitacion_mm.toFixed(1) : null}
              unidad=" mm" ausente={actual.precipitacion_mm == null} />
            {meteo?.sequedad && (
              <Dato icono="reloj" etiqueta="Sin lluvia" nota="sequedad acumulada"
                valor={meteo.sequedad.horas_sin_lluvia} unidad=" h" />
            )}
          </>
        ) : (
          <p className="ubi-sin-datos">
            Sin meteorología en vivo. El sistema trabaja con los promedios ERA5 del grid,
            que son los que ves arriba.
          </p>
        )}

        {meteo?.procedencia && (
          <p className="ubi-procedencia">
            <Icono nombre="informacion" tam={13} />
            <span>
              {meteo.procedencia.reciente
                ? "Datos del municipio, actualizados hace pocos minutos."
                : `Copia de hace ${meteo.procedencia.edad_minutos} min (la fuente no responde ahora).`}
            </span>
          </p>
        )}
      </Seccion>

      {puedeSimular && (onSimularAqui || onConsolaAqui) && (
        <div className="ubi-acciones">
          {onSimularAqui && (
            <button className="btn btn--primary ubi-simular" onClick={() => onSimularAqui(celda)}>
              <Icono nombre="simulacion" tam={15} />
              Simular desde esta celda
            </button>
          )}
          {/* Dos caminos desde el mismo punto: la corrida completa da el
              resultado de una vez; la consola la deja viva para poder pararla
              y meterle una tormenta a mitad. */}
          {onConsolaAqui && (
            <button className="btn ubi-simular" onClick={() => onConsolaAqui(celda)}>
              <Icono nombre="grafica" tam={15} />
              Abrir la consola aquí
            </button>
          )}
        </div>
      )}
    </div>
  );
}
