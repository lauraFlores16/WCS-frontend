// ============================================================================
// CLIENTE HTTP — única puerta del frontend hacia el backend
// ============================================================================
// El frontend ya no habla con Open-Meteo, Overpass ni NASA: habla SOLO con
// nuestro backend. Eso arregla de raíz el 429 (una sola fuente de peticiones,
// con cola y caché del lado servidor) y saca las claves del navegador.
//
// Los errores se lanzan con la forma { response: { status, data: { detail } } }
// que ya esperaban las pantallas cuando el proyecto hablaba con FastAPI, así
// que ninguna de ellas tuvo que cambiar por esto.
//
// SESIÓN SIN localStorage: la credencial ya no se guarda en el navegador. El
// backend la pone en una cookie httpOnly (que el JavaScript no puede leer) al
// iniciar sesión. Por eso todas las peticiones van con `credentials: "include"`:
// el navegador adjunta esa cookie solo. Nosotros nunca la tocamos.
// ============================================================================

export const API_URL =
  (import.meta.env.VITE_API_URL || "http://localhost:8000").replace(/\/$/, "");

class ErrorApi extends Error {
  constructor(mensaje, estado, extra = {}) {
    super(mensaje);
    this.name = "ErrorApi";
    // Forma compatible con axios, que es lo que esperan AuthContext y las pantallas
    this.response = { status: estado, data: { detail: mensaje, ...extra } };
    this.servicio = extra.servicio || null;
    this.reintentarEnS = extra.reintentar_en_s || null;
  }
}

/**
 * @param {string} ruta      p.ej. "/api/escenarios"
 * @param {Object} opciones  { metodo, cuerpo, señal, timeoutMs }
 * @returns el contenido de `datos` de la respuesta del backend
 */
export async function pedir(ruta, opciones = {}) {
  const { metodo = "GET", cuerpo = null, senal = null, timeoutMs = 120_000 } = opciones;

  const abortador = new AbortController();
  const reloj = setTimeout(() => abortador.abort(), timeoutMs);
  if (senal) senal.addEventListener("abort", () => abortador.abort());

  const cabeceras = {};
  if (cuerpo) cabeceras["Content-Type"] = "application/json";

  let respuesta;
  try {
    respuesta = await fetch(API_URL + ruta, {
      method: metodo,
      headers: cabeceras,
      body: cuerpo ? JSON.stringify(cuerpo) : undefined,
      signal: abortador.signal,
      credentials: "include", // envía y recibe la cookie httpOnly de sesión
    });
  } catch (e) {
    clearTimeout(reloj);
    if (e.name === "AbortError") {
      throw new ErrorApi("La petición tardó demasiado y se canceló.", 504);
    }
    // Caso típico en desarrollo: el backend no está levantado
    throw new ErrorApi(
      `No hay conexión con el servidor (${API_URL}). ¿Está corriendo "python manage.py runserver" en la carpeta backend_django?`,
      0
    );
  }
  clearTimeout(reloj);

  let json = null;
  try { json = await respuesta.json(); } catch { /* respuesta sin cuerpo */ }

  if (!respuesta.ok || json?.ok === false) {
    // 401: la sesión caducó o se revocó. La cookie la gestiona el backend; aquí
    // solo propagamos el error para que AuthContext haga logout en la interfaz.
    throw new ErrorApi(
      json?.error || `El servidor respondió ${respuesta.status}`,
      respuesta.status,
      { servicio: json?.servicio, reintentar_en_s: json?.reintentar_en_s }
    );
  }

  return json?.datos;
}

/** Igual que `pedir`, pero devuelve también la procedencia del dato. */
export async function pedirConProcedencia(ruta, opciones = {}) {
  const antes = Date.now();
  const respuesta = await fetch(API_URL + ruta, {
    credentials: "include",
  }).catch(() => null);

  if (!respuesta) {
    throw new ErrorApi(`No hay conexión con el servidor (${API_URL}).`, 0);
  }
  const json = await respuesta.json().catch(() => null);
  if (!respuesta.ok || json?.ok === false) {
    throw new ErrorApi(json?.error || `El servidor respondió ${respuesta.status}`,
      respuesta.status, { servicio: json?.servicio, reintentar_en_s: json?.reintentar_en_s });
  }
  return { datos: json.datos, procedencia: json.procedencia || null, msCliente: Date.now() - antes };
}

// Envoltorio con la forma { data } que ya usaban todas las pantallas
export const comoAxios = async (promesa) => ({ data: await promesa });

export { ErrorApi };
