// ============================================================================
// LOS CINCO ESCENARIOS AMBIENTALES DE LA PANTALLA DE SIMULACIÓN
// ============================================================================
// ESTO NO ES UN SISTEMA DE ESCENARIOS NUEVO. Es una tabla de presets que se
// traduce a lo que el motor YA acepta. Nada de aquí llega al servidor como un
// concepto propio: todo sale por dos puertas que ya existían.
//
//   PUERTA 1 — parámetros de la corrida (motor/automata.py, líneas 282-284)
//       multiplicador_viento    ya existía, ya se enviaba desde esta pantalla
//       delta_humedad           ídem
//       delta_temperatura_c     ídem
//
//   PUERTA 2 — el guion de sucesos meteorológicos (motor/escenarios.py)
//       El autómata lee `parametros.guion` y se lo pasa a
//       `escenarios.ambiente_en_paso()`. Es el mismo canal que usa la Consola
//       interactiva para inyectar una tormenta a mitad de corrida. Aquí se usa
//       con `paso_inicio: 0` y sin duración, o sea: la condición ambiental rige
//       toda la corrida en vez de ser un suceso puntual.
//
// Por qué LLUVIA y CRÍTICO van por la puerta 2 y no por la 1:
//
//   · LLUVIA no se puede representar subiendo la humedad. El motor tiene un
//     canal de precipitación propio (`lluvia_mm_h`) que hace dos cosas que la
//     humedad no hace: frena la propagación con f_lluvia = 1/(1+K·mm_h) Y
//     apaga celdas ya ardiendo (K_LLUVIA_EXT). Ese canal solo se alimenta
//     desde el pronóstico o desde el guion. Por eso: guion.
//
//   · CRÍTICO es «la peor combinación». El catálogo del backend ya declara
//     cuál es —`viento_seco`, el efecto föhn: viento máximo y secado máximo
//     empujando en la misma dirección— con su justificación escrita para la
//     defensa. Inventar aquí unos números propios sería peor y además
//     quedarían sin respaldo.
//
// Las magnitudes NO se escriben en este archivo: se leen del catálogo que
// sirve `GET /api/simulacion/escenarios`. Si mañana se recalibra un efecto en
// el backend, esta pantalla lo refleja sola.
//
// Los escenarios cambian CONDICIONES AMBIENTALES. No tocan las reglas R1-R4
// del autómata, que siguen exactamente donde estaban.
// ============================================================================

/**
 * @typedef {Object} PresetEscenario
 * @property {string}  id
 * @property {string}  nombre
 * @property {string}  resumen          una línea para la tarjeta
 * @property {string}  descripcion      qué representa
 * @property {string}  icono            clave de Icono.jsx
 * @property {string}  [eventoCatalogo] id del catálogo del backend (puerta 2)
 * @property {number}  [vientoMult]     multiplicador de viento (puerta 1)
 * @property {number}  [humedadFactor]  factor sobre la humedad base (puerta 1)
 * @property {number}  [tempDelta]      °C a sumar (puerta 1)
 */

/** @type {PresetEscenario[]} */
export const ESCENARIOS_AMBIENTALES = [
  {
    id: "base",
    nombre: "Base",
    resumen: "Sin cambios",
    descripcion:
      "Las condiciones tal como vienen del pronóstico y del grid. Es la " +
      "referencia contra la que se miden los demás escenarios.",
    icono: "informacion",
  },
  {
    id: "lluvia",
    nombre: "Lluvia",
    resumen: "Precipitación",
    descripcion:
      "Precipitación sostenida sobre la zona. Usa el canal de lluvia del " +
      "motor, no un aumento de humedad: además de frenar el avance, apaga " +
      "celdas de baja intensidad.",
    icono: "lluvia",
    eventoCatalogo: "lluvia_moderada",
  },
  {
    id: "viento_alto",
    nombre: "Viento alto",
    resumen: "Viento ×1.5",
    descripcion:
      "El viento arrecia y mantiene su dirección. Es la palanca que más " +
      "acelera el frente en este modelo.",
    icono: "viento",
    vientoMult: 1.5,
  },
  {
    id: "baja_humedad",
    nombre: "Baja humedad",
    resumen: "Humedad ×0.70",
    descripcion:
      "Ambiente seco: el combustible fino pierde humedad y prende con menos " +
      "energía. Efecto real pero suave comparado con el viento.",
    icono: "humedad",
    humedadFactor: 0.7,
  },
  {
    id: "critico",
    nombre: "Crítico",
    resumen: "Condición severa",
    descripcion:
      "Peor caso del catálogo: viento fuerte y aire muy seco a la vez, sin " +
      "precipitación. Combina temperatura alta, humedad baja y viento máximo.",
    icono: "aviso",
    eventoCatalogo: "viento_seco",
  },
];

export const ESCENARIO_POR_DEFECTO = "base";

export const presetPorId = (id) =>
  ESCENARIOS_AMBIENTALES.find((e) => e.id === id) || ESCENARIOS_AMBIENTALES[0];

// ---------------------------------------------------------------------------
// AMBIENTE DE PARTIDA
// ---------------------------------------------------------------------------
/**
 * Reúne las condiciones BASE de las cuatro variables que se muestran.
 *
 * Prioridad: pronóstico real (`meteo.actual`, que ya devuelve
 * /api/simulacion/parametros-auto) y, si no hay, las referencias de la
 * temporada que publica el propio catálogo del backend. Nunca valores
 * inventados en el frontend.
 *
 * @param {Object} meteo        `meteo` de parametros-auto (puede ser null)
 * @param {Object} referencias  `referencias` del catálogo (puede ser null)
 * @param {Object} celda        celda del grid del foco (puede ser null)
 */
export function ambienteBase(meteo, referencias, celda) {
  const a = meteo?.actual || null;
  const ref = referencias || {};

  // Humedad: la que mueve el autómata es la del COMBUSTIBLE (fracción del
  // grid), no la humedad relativa del aire. Se prefiere la de la celda del
  // foco; si no hay foco, la mediana del grid que publica el backend.
  const humedad =
    celda?.humedad ??
    ref.humedad_grid?.mediana ??
    ref.humedad_temporada ??
    null;

  return {
    temperatura_c: a?.temperatura_c ?? ref.temperatura_temporada_c ?? null,
    humedad,
    humedad_relativa: a?.humedad_relativa ?? null,
    viento_ms: a?.viento_ms ?? ref.viento_temporada_ms ?? null,
    viento_grados: a?.viento_direccion ?? null,
    lluvia_mm_h: a?.precipitacion_mm ?? 0,
    ndvi: celda?.ndvi ?? null,
    fuente: a ? (meteo?.fuente || "pronóstico en vivo") : "referencias ERA5 de la temporada",
  };
}

// ---------------------------------------------------------------------------
// APLICAR UN PRESET
// ---------------------------------------------------------------------------
/**
 * Traduce un preset a: (a) los parámetros de la corrida, (b) el guion, y
 * (c) la tabla Base → Escenario que se enseña en pantalla.
 *
 * @param {PresetEscenario} preset
 * @param {Object} base        salida de `ambienteBase()`
 * @param {Array}  catalogo    `escenarios` de GET /api/simulacion/escenarios
 * @param {Object} parametrosBase  `parametros` de parametros-auto
 */
export function aplicarEscenario(preset, base, catalogo, parametrosBase) {
  const pb = parametrosBase || {};
  const entrada = preset.eventoCatalogo
    ? (catalogo || []).find((e) => e.id === preset.eventoCatalogo)
    : null;
  const efectos = entrada?.efectos || {};

  // ---- (a) parámetros de la corrida — puerta 1 ----------------------------
  const multiplicador_viento = Number(
    ((pb.multiplicador_viento ?? 1) * (preset.vientoMult ?? 1)).toFixed(3)
  );

  // `delta_humedad` es un DESPLAZAMIENTO sobre la fracción de humedad, no un
  // factor. Para expresar «×0.70» hay que convertirlo con la humedad base.
  const desplazamientoFactor =
    preset.humedadFactor != null && base.humedad != null
      ? base.humedad * (preset.humedadFactor - 1)
      : 0;
  const delta_humedad = Number(
    ((pb.delta_humedad ?? 0) + desplazamientoFactor).toFixed(4)
  );

  const delta_temperatura_c = Number(
    ((pb.delta_temperatura_c ?? 0) + (preset.tempDelta ?? 0)).toFixed(2)
  );

  // ---- (b) guion — puerta 2 ----------------------------------------------
  // Mismo formato que `escenarios.crear_evento()` del backend. `paso_inicio: 0`
  // y `duracion_pasos: null` = la condición rige toda la corrida, que es lo
  // que distingue un ESCENARIO de un suceso inyectado a mitad de camino.
  const guion = entrada
    ? [{
        id: entrada.id,
        nombre: entrada.nombre,
        familia: entrada.familia,
        paso_inicio: 0,
        duracion_pasos: null,
        intensidad: null,
        efectos: { ...entrada.efectos },
      }]
    : [];

  // ---- (c) tabla Base → Escenario ----------------------------------------
  // El escenario se muestra aplicando los MISMOS efectos que verá el motor.
  const tempEsc =
    base.temperatura_c == null
      ? null
      : base.temperatura_c + (efectos.temperatura_delta_c ?? 0) + (preset.tempDelta ?? 0);

  const humEsc =
    base.humedad == null
      ? null
      : Math.max(
          base.humedad +
            (efectos.humedad_delta ?? 0) +
            desplazamientoFactor,
          0
        );

  let vientoEsc = base.viento_ms;
  if (vientoEsc != null) {
    if (efectos.viento_ms_fijar != null) vientoEsc = efectos.viento_ms_fijar;
    else vientoEsc = (vientoEsc + (efectos.viento_ms_delta ?? 0)) * (preset.vientoMult ?? 1);
  }

  const lluviaEsc = Math.max(base.lluvia_mm_h ?? 0, efectos.lluvia_mm_h ?? 0);

  const variables = [
    {
      clave: "temperatura",
      etiqueta: "Temperatura",
      unidad: "°C",
      base: base.temperatura_c,
      escenario: tempEsc,
      formato: (v) => (v == null ? "—" : `${v.toFixed(1)} °C`),
    },
    {
      clave: "humedad",
      etiqueta: "Humedad",
      unidad: "%",
      base: base.humedad,
      escenario: humEsc,
      // La humedad del combustible es una fracción 0-1; se enseña en % para
      // que sea legible, pero el motor sigue recibiendo la fracción.
      formato: (v) => (v == null ? "—" : `${(v * 100).toFixed(1)} %`),
    },
    {
      clave: "viento",
      etiqueta: "Viento",
      unidad: "km/h",
      base: base.viento_ms,
      escenario: vientoEsc,
      formato: (v) => (v == null ? "—" : `${(v * 3.6).toFixed(1)} km/h`),
    },
    {
      clave: "lluvia",
      etiqueta: "Precipitación",
      unidad: "mm/h",
      base: base.lluvia_mm_h ?? 0,
      escenario: lluviaEsc,
      formato: (v) => (v == null ? "—" : `${Number(v).toFixed(1)} mm/h`),
    },
  ].map((v) => {
    const cambiada =
      v.base != null && v.escenario != null
        ? Math.abs(v.escenario - v.base) > 1e-6
        : false;
    const variacion =
      cambiada && v.base ? ((v.escenario - v.base) / Math.abs(v.base)) * 100 : null;
    return { ...v, cambiada, variacion };
  });

  return {
    parametros: { multiplicador_viento, delta_humedad, delta_temperatura_c },
    guion,
    variables,
    // Para la ficha del escenario activo: de dónde sale la magnitud.
    justificacion: entrada?.justificacion || null,
    familia: entrada?.familia_nombre || entrada?.familia || null,
  };
}
