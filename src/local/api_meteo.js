// Capa 2 — variables ambientales. Cliente del backend.
//
// La lógica (llamadas a Open-Meteo, climatología ERA5, índice de peligro) vive
// ahora en backend/servicios/meteo.js. Aquí solo queda pedirla. El motivo no es
// estético: con veinte pestañas abiertas el navegador le disparaba a Open-Meteo
// veinte veces lo mismo y saltaba el 429. Ahora quien llama es un único proceso,
// con cola y caché.
import { pedir } from "./cliente";

export const APOLO = { lat: -14.65, lon: -68.25 };

/**
 * Devuelve el estado meteorológico + las series + el índice de peligro.
 * El objeto incluye `procedencia`: de dónde salió el dato y su antigüedad.
 * Eso es lo que permite decir "trabajando con datos de hace 40 min" en vez de
 * enseñar un error cuando la API está limitando.
 */
export async function obtenerMeteorologia(lat = APOLO.lat, lon = APOLO.lon) {
  return pedir(`/api/ambiente/meteo?lat=${lat.toFixed(4)}&lon=${lon.toFixed(4)}`);
}

export async function obtenerClimatologia(lat = APOLO.lat, lon = APOLO.lon) {
  return pedir(`/api/ambiente/climatologia?lat=${lat.toFixed(4)}&lon=${lon.toFixed(4)}`);
}

/** El backend ya calcula el índice; se re-expone para no romper importaciones. */
export const indicePeligro = (meteo) => meteo?.peligro ?? null;
