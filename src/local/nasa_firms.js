// Capa 3 — focos activos NASA FIRMS. Cliente del backend.
//
// La MAP_KEY ya no está aquí. Antes vivía en nasa_firms_config.js, o sea, en el
// bundle que descarga el navegador: cualquiera con las herramientas de
// desarrollo abiertas la veía. Ahora está en backend/.env y no sale del
// servidor. De paso desaparece el proxy /firms-api de vite.config.js: ya no hay
// problema de CORS porque quien llama a NASA es el backend.
import { pedir } from "./cliente";

/**
 * @returns {Object} { focos, configurada, mensaje, procedencia }
 * `configurada` dice si el servidor tiene la clave puesta; el frontend lo usa
 * para explicar qué falta en vez de mostrar un error críptico.
 */
export async function cargarFocosFirmsEnVivo() {
  return pedir("/api/ambiente/firms");
}
