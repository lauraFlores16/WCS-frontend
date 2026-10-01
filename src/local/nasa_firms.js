// Dos fuentes de focos, dos funciones, dos capas.
//
// NASA FIRMS y la base histórica del proyecto no son intercambiables. Antes el
// backend devolvía históricos cuando no había activos, y el mapa los pintaba
// igual: un foco de 2019 aparecía como detección actual.
import { pedir } from "./cliente";

/**
 * Focos activos de NASA FIRMS. NUNCA devuelve históricos.
 * @returns {Object} { estado, focos, activos, periodo, mensaje, detalle, ... }
 *   estado: "correcto" | "sin_focos" | "sin_clave" | "error"
 */
export async function cargarFocosFirmsEnVivo(zona = "apolo") {
  return pedir(`/api/ambiente/firms?zona=${encodeURIComponent(zona)}`);
}

/** Focos históricos del proyecto. Fuente distinta, capa distinta. */
export async function cargarFocosHistoricos(zona = "apolo", opciones = {}) {
  const p = new URLSearchParams({ zona, limite: opciones.limite ?? 2000 });
  if (opciones.desde) p.set("desde", opciones.desde);
  if (opciones.hasta) p.set("hasta", opciones.hasta);
  return pedir(`/api/ambiente/focos-historicos?${p}`);
}
