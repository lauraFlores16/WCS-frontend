// Análisis de riesgo de incendio a partir de focos de calor NASA FIRMS.
//
// Idea central (correcta desde la ciencia del fuego): un foco de calor NO
// significa por sí solo que habrá incendio forestal. Puede ser una quema
// agrícola, un punto caliente aislado o un falso positivo. Lo que indica
// riesgo real de propagación es:
//   1. El TRIÁNGULO DEL FUEGO: combustible (vegetación, NDVI) + calor/sequedad
//      (poca humedad) + condiciones. Sin combustible seco, no se propaga.
//   2. La CONCENTRACIÓN de focos: varios focos agrupados en una zona con
//      vegetación son mucho más peligrosos que un foco suelto.
//   3. La PROBABILIDAD XGBoost de la celda (que ya integra topografía,
//      vegetación, clima, etc.).
//
// Este módulo agrupa los focos FIRMS en "zonas de riesgo", evalúa cada una y
// decide si HAY o NO probabilidad significativa de incendio, devolviendo las
// coordenadas de las zonas con riesgo para que el usuario elija desde dónde
// lanzar la simulación.

import { celdaMasCercana, NDVI_BARRERA } from "./capas";

// Distancia en km entre dos coordenadas (Haversine).
function distanciaKm(lat1, lon1, lat2, lon2) {
  const R = 6371;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) * Math.cos((lat2 * Math.PI) / 180) * Math.sin(dLon / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

// Radio (km) dentro del cual dos focos se consideran "del mismo grupo".
const RADIO_AGRUPACION_KM = 2.0;

// Umbrales para decidir si una zona tiene probabilidad de incendio.
const UMBRAL_PROBABILIDAD = 0.45;   // probabilidad XGBoost mínima de la zona
const MIN_FOCOS_CONCENTRADOS = 2;   // nº de focos juntos que elevan el riesgo

// Agrupa una lista de focos en clústeres por cercanía (algoritmo simple por
// vecindad: cada foco se une al primer grupo cuyo centro esté dentro del radio).
function agruparFocos(focos) {
  const grupos = [];
  for (const f of focos) {
    let asignado = false;
    for (const g of grupos) {
      if (distanciaKm(f.lat, f.lon, g.latCentro, g.lonCentro) <= RADIO_AGRUPACION_KM) {
        g.focos.push(f);
        // recalcular centro (promedio)
        g.latCentro = g.focos.reduce((s, x) => s + x.lat, 0) / g.focos.length;
        g.lonCentro = g.focos.reduce((s, x) => s + x.lon, 0) / g.focos.length;
        asignado = true;
        break;
      }
    }
    if (!asignado) {
      grupos.push({ latCentro: f.lat, lonCentro: f.lon, focos: [f] });
    }
  }
  return grupos;
}

// Evalúa el triángulo del fuego para una celda del grid.
// Devuelve { combustible, sequedad, hayCombustible }.
function evaluarTrianguloFuego(celda) {
  const ndvi = celda.ndvi ?? 0;
  const humedad = celda.humedad ?? 0.5;
  const hayCombustible = ndvi >= NDVI_BARRERA;      // vegetación suficiente
  const combustible = Math.min(ndvi / 0.8, 1);       // 0..1
  const sequedad = Math.min(Math.max(1 - humedad, 0), 1); // 0..1 (más seco = peor)
  return { combustible, sequedad, hayCombustible };
}

// Analiza los focos FIRMS y devuelve las zonas de riesgo evaluadas.
// grid = arreglo de celdas del CSV (con ndvi, humedad, prob_ignicion).
export function analizarRiesgoIncendio(focosFirms, grid) {
  if (!focosFirms || focosFirms.length === 0) {
    return { zonas: [], resumen: { total: 0, conRiesgo: 0, sinRiesgo: 0 } };
  }

  const grupos = agruparFocos(focosFirms);

  const zonas = grupos.map((g, i) => {
    const celda = celdaMasCercana(grid, g.latCentro, g.lonCentro);
    const prob = celda?.prob_ignicion ?? 0;
    const triangulo = celda ? evaluarTrianguloFuego(celda) : { combustible: 0, sequedad: 0, hayCombustible: false };
    const nFocos = g.focos.length;
    const concentrado = nFocos >= MIN_FOCOS_CONCENTRADOS;

    // Decisión de riesgo — el foco solo no basta; exige triángulo del fuego.
    // HAY riesgo si:
    //   - hay combustible (vegetación, si no, es barrera y no se propaga), Y
    //   - la probabilidad XGBoost supera el umbral, O hay focos concentrados
    //     sobre vegetación seca.
    const hayRiesgo =
      triangulo.hayCombustible &&
      (prob >= UMBRAL_PROBABILIDAD || (concentrado && triangulo.sequedad > 0.4));

    // Motivo legible de la decisión
    let motivo;
    if (!triangulo.hayCombustible) {
      motivo = "Sin combustible vegetal (zona árida) — el fuego no se propagaría.";
    } else if (hayRiesgo) {
      const razones = [];
      if (prob >= UMBRAL_PROBABILIDAD) razones.push(`probabilidad XGBoost alta (${(prob * 100).toFixed(0)}%)`);
      if (concentrado) razones.push(`${nFocos} focos concentrados`);
      if (triangulo.sequedad > 0.4) razones.push("vegetación seca");
      motivo = "Hay probabilidad de incendio: " + razones.join(", ") + ".";
    } else {
      motivo = `Foco(s) presente(s) pero bajo riesgo de propagación (probabilidad ${(prob * 100).toFixed(0)}%, ${nFocos} foco${nFocos > 1 ? "s" : ""}).`;
    }

    return {
      id: `zona-${i}`,
      lat: g.latCentro,
      lon: g.lonCentro,
      celda,                       // celda del grid (para simular: fila/columna)
      num_focos: nFocos,
      concentrado,
      probabilidad: prob,
      combustible: triangulo.combustible,
      sequedad: triangulo.sequedad,
      hay_combustible: triangulo.hayCombustible,
      hay_riesgo: hayRiesgo,
      motivo,
    };
  });

  // Ordenar: primero las zonas con riesgo, luego por probabilidad
  zonas.sort((a, b) => (b.hay_riesgo - a.hay_riesgo) || (b.probabilidad - a.probabilidad));

  const conRiesgo = zonas.filter((z) => z.hay_riesgo).length;
  return {
    zonas,
    resumen: { total: zonas.length, conRiesgo, sinRiesgo: zonas.length - conRiesgo },
  };
}

export { UMBRAL_PROBABILIDAD, MIN_FOCOS_CONCENTRADOS, RADIO_AGRUPACION_KM };
