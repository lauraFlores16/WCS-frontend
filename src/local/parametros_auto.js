// Derivación automática de los parámetros de simulación. Cliente del backend.
//
// Toda la lógica (elegir el foco por FRP de FIRMS, calcular Δ contra la
// climatología ERA5, escalar p_base por el peligro del momento) vive en
// backend/motor/parametros.js. Aquí solo se pide el resultado ya cocinado, que
// además llega cacheado del servidor: abrir Monitoreo dos veces seguidas no
// vuelve a golpear ninguna API externa.
import { pedir } from "./cliente";

/**
 * @param {Object} opciones { foco, horizonteHoras }
 * @returns { parametros, diagnostico, meteo, climatologia, peligro, nivel, errorMeteo }
 */
export async function derivarParametros(opciones = {}) {
  const { foco = null, coordenadas = null, horizonteHoras = 6, temporada = null } = opciones;
  const q = new URLSearchParams();
  if (foco?.fila != null) {
    q.set("fila", foco.fila);
    q.set("columna", foco.columna);
  } else if (coordenadas?.lat != null) {
    // Región fuera del grid: se manda lat/lon y el backend ancla a la celda más
    // cercana del modelo.
    q.set("lat", coordenadas.lat);
    q.set("lon", coordenadas.lon);
  }
  q.set("horas", horizonteHoras);
  // Temporada / evento climático (opcional): incluir sí/no y cuál.
  if (temporada?.incluir) {
    q.set("incluir_estacion", "1");
    q.set("estacion", temporada.temporada || "auto");
  }
  return pedir(`/api/simulacion/parametros-auto?${q.toString()}`);
}

export function rosaDeLosVientos(grados) {
  if (grados == null) return "—";
  const dirs = ["N", "NNE", "NE", "ENE", "E", "ESE", "SE", "SSE",
                "S", "SSO", "SO", "OSO", "O", "ONO", "NO", "NNO"];
  return dirs[Math.round(grados / 22.5) % 16];
}
