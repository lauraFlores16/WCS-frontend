// ============================================================================
// CLIENTE DE LA CONSOLA INTERACTIVA
// ============================================================================
// La simulación de siempre (`/api/simulacion/ejecutar`) resuelve las 40
// iteraciones de un tirón. Esto es lo otro: una sesión que vive en el servidor
// y avanza a tandas, para poder pararla, meterle una tormenta y seguir.
//
// El servidor manda SOLO las iteraciones nuevas de cada tanda; acumularlas es
// trabajo de quien llama (ver `ConsolaClima.jsx`). Mandar la película entera en
// cada paso multiplicaría el tráfico por el número de tandas y en una malla de
// 36.390 celdas eso se nota.
import { pedir } from "../../local/cliente";

export const consolaApi = {
  /** El catálogo de sucesos meteorológicos que se pueden inyectar. */
  catalogo: () => pedir("/api/simulacion/escenarios"),

  /**
   * Abre una sesión.
   * @param {object} parametros  los mismos que la simulación normal
   * @param {object} opciones    { pasos_iniciales, guion, usar_terreno }
   */
  iniciar: (parametros, opciones = {}) =>
    pedir("/api/simulacion/consola", {
      metodo: "POST",
      cuerpo: { parametros, ...opciones },
    }),

  /** Avanza `pasos` iteraciones. Devuelve solo las nuevas. */
  avanzar: (sesionId, pasos = 5) =>
    pedir(`/api/simulacion/consola/${sesionId}/avanzar`, {
      metodo: "POST",
      cuerpo: { pasos },
    }),

  /** Corre de golpe lo que quede: «ya he visto bastante». */
  completar: (sesionId) =>
    pedir(`/api/simulacion/consola/${sesionId}/avanzar`, {
      metodo: "POST",
      cuerpo: { completar: true },
    }),

  /**
   * Mete un suceso a partir del paso actual. No se puede hacia atrás: los
   * pasos ya calculados están calculados, y reescribirlos sería falsear la
   * corrida (el servidor lo rechaza con un 400 que lo explica).
   */
  inyectar: (sesionId, escenario, extra = {}) =>
    pedir(`/api/simulacion/consola/${sesionId}/inyectar`, {
      metodo: "POST",
      cuerpo: { escenario, ...extra },
    }),

  /** Guarda la sesión como escenario: aparece en el Historial. */
  guardar: (sesionId, nombre, descripcion) =>
    pedir(`/api/simulacion/consola/${sesionId}/guardar`, {
      metodo: "POST",
      cuerpo: { nombre, descripcion },
    }),

  cerrar: (sesionId) =>
    pedir(`/api/simulacion/consola/${sesionId}`, { metodo: "DELETE" }),
};
