// Capa 1 — topografía e hidrografía. Cliente del backend.
//
// El DEM era el que más 429 provocaba: 38 peticiones seguidas a la API de
// elevación cada vez que cambiaba el foco, desde cada pestaña. Ahora se pide
// una sola vez al backend, que las agrupa, las espacia y las guarda en disco
// SIN caducidad (el relieve no cambia). La segunda vez es instantánea.
import { pedir } from "./cliente";

/**
 * Alturas reales alrededor del foco.
 * @returns {Map} celda_id → metros   (misma forma que esperaba el motor)
 */
export async function cargarDem(foco, opciones = {}) {
  const radio = opciones.radio ?? 20;
  const datos = await pedir(
    `/api/ambiente/terreno/dem?fila=${foco.fila}&columna=${foco.columna}&radio=${radio}`
  );
  const mapa = new Map(Object.entries(datos.alturas || {}));
  mapa.estadisticas = datos.estadisticas;
  mapa.descargadas = datos.descargadas;
  return mapa;
}

/** Estadísticas de relieve para la Capa 1 (ya vienen calculadas del backend). */
export function estadisticasDem(dem) {
  if (!dem) return null;
  if (dem.estadisticas) return dem.estadisticas;
  if (!dem.size) return null;
  const vals = [...dem.values()];
  const min = Math.min(...vals), max = Math.max(...vals);
  return {
    min, max,
    media: Math.round(vals.reduce((a, b) => a + b, 0) / vals.length),
    celdas: dem.size, desnivel: Math.round(max - min),
  };
}

/**
 * Ríos, quebradas, cuerpos de agua y caminos, ya rasterizados al grid por el
 * servidor. El navegador recibe el resumen y la lista de celdas barrera, no los
 * megabytes de geometría de OpenStreetMap.
 * @returns {Object} { clases:Map, barreras:Set, resumen, procedencia }
 */
export async function cargarTerrenoOsm() {
  const datos = await pedir("/api/ambiente/terreno/osm");
  return {
    clases: new Map(Object.entries(datos.clases || {})),
    resistencia: new Map(Object.entries(datos.resistencia || {})),
    barreras: new Set(datos.barreras || []),
    resumen: datos.resumen,
    procedencia: datos.procedencia,
  };
}
