// Comparación entre una simulación y los 3 eventos históricos reales (2021,
// 2023, 2024). Objetivo: si la simulación se parece mucho a un evento real,
// saltamos directo al resultado que tuvo ese evento (área, velocidad, métricas
// de validación IoU/F1 que Laura ya calculó).
//
// Puntaje combinado (0..100, mayor = más parecido):
//   - Similitud de UBICACIÓN del foco (distancia entre coordenadas), peso 50%
//   - Similitud de VARIABLES ambientales (NDVI, humedad, viento, temperatura), peso 50%

let _eventos = null;

export async function cargarEventosHistoricos() {
  if (!_eventos) {
    const r = await fetch("/datos/eventos_historicos.json");
    _eventos = await r.json();
  }
  return _eventos;
}

// Distancia en km aproximada entre dos coordenadas (Haversine simplificado).
function distanciaKm(lat1, lon1, lat2, lon2) {
  const R = 6371;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) * Math.cos((lat2 * Math.PI) / 180) * Math.sin(dLon / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

// Convierte una distancia (km) a un puntaje 0..1 (más cerca = más alto).
// A 0 km = 1.0; a 60 km o más = 0. (El municipio mide ~50-60 km de lado.)
function puntajeUbicacion(distKm) {
  return Math.max(0, 1 - distKm / 60);
}

// Similitud de variables ambientales: 1 - error relativo promedio normalizado.
function puntajeVariables(simVars, evVars) {
  const campos = [
    { k: "ndvi", rango: 0.8 },
    { k: "humedad", rango: 1.0 },
    { k: "velocidad_viento", rango: 5.0 },
    { k: "temperatura_aire", rango: 40.0 },
  ];
  let suma = 0, n = 0;
  for (const { k, rango } of campos) {
    if (simVars[k] == null || evVars[k] == null) continue;
    const diffNorm = Math.abs(simVars[k] - evVars[k]) / rango;
    suma += Math.max(0, 1 - diffNorm);
    n++;
  }
  return n ? suma / n : 0;
}

// Compara una simulación contra los eventos históricos y devuelve el ranking.
// `simResumen` = { foco: {lat, lon}, variables: {ndvi, humedad, velocidad_viento, temperatura_aire} }
export async function compararConHistoricos(simResumen) {
  const eventos = await cargarEventosHistoricos();

  const ranking = eventos.map((ev) => {
    const dist = distanciaKm(simResumen.foco.lat, simResumen.foco.lon, ev.foco.lat, ev.foco.lon);
    const pUbic = puntajeUbicacion(dist);
    const pVars = puntajeVariables(simResumen.variables, ev.variables_promedio);
    const puntaje = (pUbic * 0.5 + pVars * 0.5) * 100;
    return {
      evento: ev,
      distancia_km: Math.round(dist * 10) / 10,
      puntaje_ubicacion: Math.round(pUbic * 100),
      puntaje_variables: Math.round(pVars * 100),
      puntaje_total: Math.round(puntaje),
    };
  });

  ranking.sort((a, b) => b.puntaje_total - a.puntaje_total);
  return ranking;
}
