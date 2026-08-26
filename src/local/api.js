// ============================================================================
// API DEL FRONTEND  →  ahora es un CLIENTE del backend Express
// ============================================================================
// Antes este archivo ERA el backend: ejecutaba el autómata, evaluaba alertas y
// guardaba escenarios en localStorage. Todo eso se mudó a backend/.
//
// Se conservan a propósito los MISMOS nombres exportados y la misma forma de
// respuesta ({ data }) que antes, así que ninguna pantalla tuvo que cambiar por
// la división cliente/servidor: solo cambia de dónde salen los datos.
//
// Lo único que sigue calculándose aquí son las lecturas directas del grid
// (probabilidad por celda, focos históricos, detección del foco más probable).
// Son consultas de solo lectura sobre un CSV estático que el navegador ya tiene
// descargado para pintar el mapa: mandarlas al servidor solo añadiría latencia.
// ============================================================================

import { pedir } from "./cliente";
import { cargarGrid, cargarFocos } from "./datos";
import { compararConHistoricos } from "./comparacion";

const AREA_POR_CELDA_HA = 25.0;
const ok = (data) => Promise.resolve({ data });

// ---------------------------------------------------------------------------
// Autenticación — la contraseña se comprueba en el servidor
// ---------------------------------------------------------------------------
export const authLocal = {
  login: async (email, password) =>
    ok(await pedir("/api/auth/login", { metodo: "POST", cuerpo: { email, password } })),
  yo: async () => ok(await pedir("/api/auth/yo")),
  // Cierra la sesión en el servidor (revoca el token y borra la cookie).
  logout: async () => ok(await pedir("/api/auth/logout", { metodo: "POST" })),
};

// ---------------------------------------------------------------------------
// Simulación — el autómata corre en el servidor
// ---------------------------------------------------------------------------
export const simulacionLocal = {
  /**
   * @param {Object} parametros
   * @param {Object} opciones  { radioDem }
   * El DEM y las barreras de OSM ya NO se mandan desde el navegador: el backend
   * los resuelve desde su propia caché, así que la petición es pequeña.
   */
  ejecutar: async (parametros, opciones = {}) =>
    ok(await pedir("/api/simulacion/ejecutar", {
      metodo: "POST",
      cuerpo: { parametros, radioDem: opciones.radioDem },
      timeoutMs: 180_000,
    })),

  obtener: async (escenarioId) => ok(await pedir(`/api/simulacion/${escenarioId}`)),

  /** Parámetros derivados automáticamente (meteorología real, FIRMS, calibración). */
  parametrosAuto: async ({ fila, columna, horas } = {}) => {
    const q = new URLSearchParams();
    if (fila != null) q.set("fila", fila);
    if (columna != null) q.set("columna", columna);
    if (horas != null) q.set("horas", horas);
    const cadena = q.toString();
    return ok(await pedir(`/api/simulacion/parametros-auto${cadena ? `?${cadena}` : ""}`));
  },
};

// ---------------------------------------------------------------------------
// Escenarios (Historial)
// ---------------------------------------------------------------------------
export const escenariosLocal = {
  listar: async () => ok(await pedir("/api/escenarios")),
  obtenerCompleto: async (escenarioId) => ok(await pedir(`/api/escenarios/${escenarioId}`)),
  borrar: async (escenarioId) =>
    ok(await pedir(`/api/escenarios/${escenarioId}`, { metodo: "DELETE" })),
};

// ---------------------------------------------------------------------------
// Alertas
// ---------------------------------------------------------------------------
// Una sola petición trae activas + historial; se cachea un momento para que las
// dos llamadas seguidas de Monitoreo no se conviertan en dos viajes.
const cacheAlertas = new Map();
async function alertasDe(escenarioId) {
  const guardado = cacheAlertas.get(escenarioId);
  if (guardado && Date.now() - guardado.ts < 3000) return guardado.datos;
  const datos = await pedir(`/api/escenarios/${escenarioId}/alertas`);
  cacheAlertas.set(escenarioId, { ts: Date.now(), datos });
  return datos;
}

export const alertasLocal = {
  historial: async (escenarioId) => ok((await alertasDe(escenarioId)).historial),
  activas: async (escenarioId) => ok((await alertasDe(escenarioId)).activas),
  // Alertas de riesgo del municipio (probabilidad + meteo), sin simulación.
  riesgo: async () => ok((await pedir("/api/alertas/riesgo")).activas),
};

// ---------------------------------------------------------------------------
// Monitoreo
// ---------------------------------------------------------------------------
export const monitoreoLocal = {
  simulacion: (escenarioId) => simulacionLocal.obtener(escenarioId),
  alertasActivas: (escenarioId) => alertasLocal.activas(escenarioId),
  alertasHistorial: (escenarioId) => alertasLocal.historial(escenarioId),
  alertasRiesgo: () => alertasLocal.riesgo(),
  graficaPropagacion: async (escenarioId) => ok(await pedir(`/api/escenarios/${escenarioId}/grafica`)),

  // --- Lecturas del grid: se resuelven en el navegador, ver nota de arriba ---
  focosHistoricos: async (evento) => {
    const focos = await cargarFocos();
    const filtrados = evento ? focos.filter((f) => String(f.evento) === String(evento)) : focos;
    return ok(filtrados.map((f) => ({
      id: f.id, lat: f.lat, lon: f.lon, fecha: f.fecha,
      confianza: f.confianza != null ? String(f.confianza) : null,
      evento_asociado: f.evento ? String(f.evento) : null,
    })));
  },

  probabilidad: async () => {
    const grid = await cargarGrid();
    return ok(grid.map((c) => ({
      celda_id: c.id, lat: c.lat, lon: c.lon, probabilidad: c.prob_ignicion,
    })));
  },

  detectarFoco: async () => {
    const grid = await cargarGrid();
    let mejor = null;
    for (const c of grid) {
      if (c.prob_ignicion == null || isNaN(c.prob_ignicion)) continue;
      if (!mejor || c.prob_ignicion > mejor.prob_ignicion) mejor = c;
    }
    if (!mejor) throw new Error("No se pudo detectar ningún foco en el grid.");
    return ok({
      id: mejor.id, fila: mejor.fila, columna: mejor.columna,
      lat: mejor.lat, lon: mejor.lon, prob_ignicion: mejor.prob_ignicion,
    });
  },
};

// ---------------------------------------------------------------------------
// Eventos históricos y comparación
// ---------------------------------------------------------------------------
export const historicosLocal = {
  listar: async () => ok(await pedir("/api/historicos")),

  comparar: async (escenarioId) => {
    const esc = await pedir(`/api/escenarios/${escenarioId}`);
    if (!esc.variables_promedio || !esc.foco_coordenadas) {
      const e = new Error("Este escenario no tiene datos suficientes para comparar (re-ejecuta la simulación).");
      e.response = { status: 400, data: { detail: e.message } };
      throw e;
    }
    const ranking = await compararConHistoricos({
      foco: esc.foco_coordenadas,
      variables: esc.variables_promedio,
    });
    return ok({
      escenario: {
        nombre: esc.nombre,
        area_final_ha: esc.area_final_ha,
        variables: esc.variables_promedio,
        foco: esc.foco_coordenadas,
      },
      ranking,
    });
  },
};

// ---------------------------------------------------------------------------
// Informes (se guardan en el backend / base de datos)
// ---------------------------------------------------------------------------
export const informesLocal = {
  // Guarda el HTML del informe ya generado. `resumen` es opcional (área, nivel…).
  guardar: async ({ escenario_id, nombre, html, resumen }) =>
    ok(await pedir("/api/informes", {
      metodo: "POST",
      cuerpo: { escenario_id, nombre, html, resumen },
    })),
  listar: async () => ok(await pedir("/api/informes")),
  obtener: async (id) => ok(await pedir(`/api/informes/${id}`)),
};

// ---------------------------------------------------------------------------
// Bitácora
// ---------------------------------------------------------------------------
export const bitacoraLocal = {
  listar: async () => ok(await pedir("/api/bitacora")),
  registrar: (entrada) =>
    pedir("/api/bitacora", { metodo: "POST", cuerpo: entrada }).catch(() => null),
};

/**
 * Se mantiene exportada por compatibilidad: antes reconstruía las iteraciones
 * comprimidas en deltas. Ahora el backend ya las devuelve reconstruidas, así
 * que solo hace falta para escenarios en formato antiguo.
 */
export function reconstruirIteraciones(esc) {
  if (esc?.iteraciones) return esc.iteraciones;
  if (!esc?.iteraciones_delta) return [];
  const estado = new Map();
  return esc.iteraciones_delta.map((d) => {
    for (const c of d.cambios) estado.set(c.celda_id, c);
    const celdas = [];
    for (const c of estado.values()) {
      if (c.estado === "ardiendo" || c.estado === "quemada" || c.estado === "quemado") celdas.push(c);
    }
    return {
      iteracion: d.iteracion,
      num_celdas_ardiendo: d.num_celdas_ardiendo,
      num_celdas_quemadas: d.num_celdas_quemadas,
      celdas,
    };
  });
}

export { AREA_POR_CELDA_HA };
