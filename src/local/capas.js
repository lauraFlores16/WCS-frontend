// Clasificación de celdas para las 3 capas del mapa.
// Traduce los datos crudos del grid (pendiente, ndvi, humedad) a colores y a
// las REGLAS que gobiernan la simulación del autómata — para que la Capa 1
// (topografía + zonas donde el fuego no se propaga) y la Capa 2 (efectos
// ambientales) sean visibles, no solo números internos.

// Mismo umbral que usa el autómata (automata.js -> NDVI_BARRERA).
// Celdas con NDVI por debajo = suelo árido/seco/roca: el fuego NO se propaga.
export const NDVI_BARRERA = 0.10;

// ---------------------------------------------------------------------------
// CAPA 1 — Topografía + barreras (dónde el fuego NO se propaga)
// ---------------------------------------------------------------------------
// Color por pendiente (relieve). Las celdas-barrera (sin vegetación) se marcan
// en un color distinto porque son una REGLA de la simulación: zona seca/pelada
// donde el fuego se detiene.
export function colorTopografia(celda) {
  if (celda.ndvi < NDVI_BARRERA) {
    return { color: "#c98a3a", tipo: "barrera", label: "Zona árida — el fuego no se propaga" };
  }
  const p = celda.pendiente_grados ?? 0;
  // Verde-oscuro (llano) -> ocre (empinado). Más pendiente = fuego sube más rápido.
  if (p < 5) return { color: "#1f4d2e", tipo: "llano", label: "Terreno llano (0–5°)" };
  if (p < 15) return { color: "#3c6b34", tipo: "suave", label: "Pendiente suave (5–15°)" };
  if (p < 25) return { color: "#7d8a2e", tipo: "moderada", label: "Pendiente moderada (15–25°)" };
  return { color: "#a86a2a", tipo: "empinada", label: "Pendiente empinada (>25°)" };
}

// ---------------------------------------------------------------------------
// CAPA 2 — Efectos ambientales (combustible/riesgo por vegetación y sequedad)
// ---------------------------------------------------------------------------
// Combina NDVI (combustible: más vegetación = más material que arde) con
// humedad (más seco = arde más fácil). Escala verde (bajo riesgo) -> rojo (alto).
export function colorAmbiental(celda) {
  const ndvi = celda.ndvi ?? 0;
  const humedad = celda.humedad ?? 0.5;
  if (ndvi < NDVI_BARRERA) {
    return { color: "#5c6268", riesgo: 0, label: "Sin combustible vegetal" };
  }
  // "Riesgo de combustible": mucha vegetación seca = peor. Normalizado 0..1.
  const combustible = Math.min(ndvi / 0.8, 1);          // 0..1 según NDVI
  const sequedad = Math.min(Math.max(1 - humedad, 0), 1); // 0..1 según lo seco
  const riesgo = combustible * 0.6 + sequedad * 0.4;
  const r = Math.round(60 + (232 - 60) * riesgo);
  const g = Math.round(175 - (175 - 73) * riesgo);
  const b = Math.round(80 - (80 - 28) * riesgo);
  return { color: `rgb(${r},${g},${b})`, riesgo, label: `Riesgo ambiental ${(riesgo * 100).toFixed(0)}%` };
}

// ---------------------------------------------------------------------------
// CAPA 3 — Mallado (probabilidad de ignición XGBoost)
// ---------------------------------------------------------------------------
export function colorProbabilidad(prob) {
  const p = Math.min(Math.max(prob ?? 0, 0), 1);
  const r = Math.round(76 + (232 - 76) * p);
  const g = Math.round(175 + (73 - 175) * p);
  const b = Math.round(80 + (28 - 80) * p);
  return `rgb(${r},${g},${b})`;
}

// Encuentra la celda más cercana a unas coordenadas dadas (para poner el foco
// haciendo clic o escribiendo lat/lon). Devuelve la celda o null.
export function celdaMasCercana(celdas, lat, lon) {
  let mejor = null;
  let mejorDist = Infinity;
  for (const c of celdas) {
    const d = (c.lat - lat) ** 2 + (c.lon - lon) ** 2;
    if (d < mejorDist) { mejorDist = d; mejor = c; }
  }
  return mejor;
}
