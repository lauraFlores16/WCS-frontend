// Verificación AUTOMÁTICA de probabilidad de incendio (Capas 2 y 3).
//
// Combina tres fuentes para decidir la probabilidad de que un foco activo
// derive en incendio forestal:
//   1. PROBABILIDAD XGBoost de la celda (ya integra topografía, vegetación, clima).
//   2. VARIABLES METEOROLÓGICAS de la zona (regla 30-30-30 adaptada a los datos
//      ERA5 disponibles: temperatura, humedad, viento — ver nota abajo).
//   3. UBICACIÓN respecto a años anteriores: cercanía a focos históricos reales
//      (2021, 2023, 2024), porque una zona que ya se quemó antes es más propensa.
//
// NOTA SOBRE 30-30-30: la regla operacional de bomberos (T≥30°C, HR≤30%,
// viento≥30 km/h) usa umbrales de condiciones extremas puntuales. Los datos
// ERA5 del grid son promedios y no alcanzan esos extremos (viento ~1-2 km/h,
// humedad 22-40%). Por eso aquí la 30-30-30 se evalúa de forma RELATIVA:
// qué tan cerca está cada variable de su umbral crítico, normalizado al rango
// real de los datos. Así el indicador es informativo y coherente, y esta
// limitación queda documentada como parte del análisis metodológico.

import { celdaMasCercana, NDVI_BARRERA } from "./capas";

function distanciaKm(lat1, lon1, lat2, lon2) {
  const R = 6371;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) * Math.cos((lat2 * Math.PI) / 180) * Math.sin(dLon / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

// --- Componente meteorológico (regla 30-30-30 adaptada) ---
// Devuelve 0..1 según qué tan favorables a la propagación son las condiciones.
// Umbrales críticos de la regla y rangos reales de los datos ERA5 del grid.
const T_CRITICA = 30, T_RANGO = [10, 35];       // °C
const HR_CRITICA = 0.30, HR_RANGO = [0.20, 0.45]; // fracción
const V_CRITICO = 30, V_RANGO_KMH = [0, 8];      // km/h (rango real ampliado)

function componenteMeteorologico(celda, parametrosEscenario = {}) {
  // Temperatura: el grid no trae temp absoluta; usamos una base + ajuste del
  // escenario si existe, o una temperatura típica de temporada seca (25°C).
  const tempBase = 25 + (parametrosEscenario.delta_temperatura_c || 0);
  // Humedad real de la celda, con ajuste del escenario
  const humedad = Math.min(Math.max((celda.humedad ?? 0.35) + (parametrosEscenario.delta_humedad || 0), 0), 1);
  // Viento real de la celda (m/s -> km/h), con multiplicador del escenario
  const vientoMs = Math.sqrt((celda.viento_u ?? 0) ** 2 + (celda.viento_v ?? 0) ** 2)
    * (parametrosEscenario.multiplicador_viento || 1);
  const vientoKmh = vientoMs * 3.6;

  // Cada sub-factor 0..1: qué tan cerca del umbral crítico (relativo al rango real)
  const fTemp = Math.min(Math.max((tempBase - T_RANGO[0]) / (T_CRITICA - T_RANGO[0]), 0), 1);
  const fHum = Math.min(Math.max((HR_RANGO[1] - humedad) / (HR_RANGO[1] - HR_CRITICA), 0), 1);
  const fViento = Math.min(Math.max((vientoKmh - V_RANGO_KMH[0]) / (V_RANGO_KMH[1] - V_RANGO_KMH[0]), 0), 1);

  // ¿Cuántas de las 3 condiciones 30-30-30 se cumplen (aunque sea de forma relativa alta)?
  const condiciones = {
    temperatura: { valor: tempBase, umbral: T_CRITICA, cumple: tempBase >= T_CRITICA, factor: fTemp },
    humedad: { valor: humedad, umbral: HR_CRITICA, cumple: humedad <= HR_CRITICA, factor: fHum },
    viento: { valor: vientoKmh, umbral: V_CRITICO, cumple: vientoKmh >= V_CRITICO, factor: fViento },
  };
  const puntaje = (fTemp + fHum + fViento) / 3;
  return { puntaje, condiciones };
}

// --- Componente histórico (cercanía a incendios de años anteriores) ---
function componenteHistorico(lat, lon, eventosHistoricos) {
  if (!eventosHistoricos || !eventosHistoricos.length) return { puntaje: 0, eventoCercano: null, distanciaKm: null };
  let masCercano = null, minDist = Infinity;
  for (const ev of eventosHistoricos) {
    const d = distanciaKm(lat, lon, ev.foco.lat, ev.foco.lon);
    if (d < minDist) { minDist = d; masCercano = ev; }
  }
  // A 0 km = 1.0; a 30 km o más = 0
  const puntaje = Math.max(0, 1 - minDist / 30);
  return { puntaje, eventoCercano: masCercano, distanciaKm: Math.round(minDist * 10) / 10 };
}

// Pesos de cada componente en la probabilidad final
const PESO_XGBOOST = 0.45;
const PESO_METEO = 0.35;
const PESO_HISTORICO = 0.20;

// Verifica la probabilidad de incendio para una ubicación (lat/lon).
export function verificarProbabilidadIncendio(lat, lon, grid, eventosHistoricos, parametrosEscenario = {}) {
  const celda = celdaMasCercana(grid, lat, lon);
  if (!celda) return null;

  const hayCombustible = (celda.ndvi ?? 0) >= NDVI_BARRERA;
  const probXgb = celda.prob_ignicion ?? 0;
  const meteo = componenteMeteorologico(celda, parametrosEscenario);
  const historico = componenteHistorico(lat, lon, eventosHistoricos);

  // Probabilidad combinada (0..1). Si no hay combustible, se reduce drásticamente.
  let probabilidad =
    probXgb * PESO_XGBOOST +
    meteo.puntaje * PESO_METEO +
    historico.puntaje * PESO_HISTORICO;
  if (!hayCombustible) probabilidad *= 0.15; // zona árida: casi no se propaga

  probabilidad = Math.min(Math.max(probabilidad, 0), 1);

  // Nivel legible
  let nivel, colorNivel;
  if (probabilidad >= 0.66) { nivel = "ALTA"; colorNivel = "#e13a3a"; }
  else if (probabilidad >= 0.4) { nivel = "MEDIA"; colorNivel = "#f0902f"; }
  else { nivel = "BAJA"; colorNivel = "#4caf50"; }

  return {
    celda,
    lat, lon,
    probabilidad,
    porcentaje: Math.round(probabilidad * 100),
    nivel,
    colorNivel,
    hayCombustible,
    componentes: {
      xgboost: Math.round(probXgb * 100),
      meteorologico: Math.round(meteo.puntaje * 100),
      historico: Math.round(historico.puntaje * 100),
    },
    meteo,
    historico,
  };
}

export { distanciaKm };
