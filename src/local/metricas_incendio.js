// Cálculo de métricas del incendio simulado, para el informe.
// A partir de las iteraciones del autómata y los parámetros, deriva:
//   - Ubicación del foco (lat/lon) y elevación aproximada
//   - Duración estimada del incendio
//   - Extensión: área quemada (ha/km²) y radio/diámetro alcanzado (km)
//   - Condiciones climáticas usadas
//   - Zonas (celdas) afectadas por iteración (para la imagen de expansión)

const AREA_CELDA_HA = 25;         // celda 500x500 m
const LADO_CELDA_KM = 0.5;        // 500 m
const MINUTOS_POR_ITERACION = 15; // cada paso del autómata ≈ 15 min simulados

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

// Duración legible a partir del número de iteraciones.
function formatearDuracion(iteraciones) {
  const minutos = iteraciones * MINUTOS_POR_ITERACION;
  const horas = Math.floor(minutos / 60);
  const dias = Math.floor(horas / 24);
  if (dias >= 1) {
    const hr = horas - dias * 24;
    return `${dias} día${dias > 1 ? "s" : ""}${hr ? ` ${hr} h` : ""}`;
  }
  if (horas >= 1) {
    const min = minutos - horas * 60;
    return `${horas} h${min ? ` ${min} min` : ""}`;
  }
  return `${minutos} min`;
}

export function calcularMetricasIncendio(escenario) {
  const iteraciones = escenario.iteraciones || [];
  const ultima = iteraciones[iteraciones.length - 1] || { celdas: [], num_celdas_quemadas: 0 };
  const foco = escenario.foco_coordenadas;

  // Todas las celdas afectadas (quemadas o ardiendo) en la última iteración
  const celdasAfectadas = ultima.celdas || [];
  const totalCeldas = celdasAfectadas.length;

  // Área
  const areaHa = totalCeldas * AREA_CELDA_HA;
  const areaKm2 = areaHa / 100;

  // Radio máximo alcanzado desde el foco (km) y diámetro
  let radioKm = 0;
  if (foco && celdasAfectadas.length) {
    for (const c of celdasAfectadas) {
      const d = distanciaKm(foco.lat, foco.lon, c.lat, c.lon);
      if (d > radioKm) radioKm = d;
    }
  }
  // Extensión aproximada como diámetro (frente de fuego)
  const diametroKm = radioKm * 2;

  // Duración
  const numIter = ultima.iteracion || (iteraciones.length - 1);
  const duracionTexto = formatearDuracion(numIter);
  const duracionMin = numIter * MINUTOS_POR_ITERACION;

  // Velocidad de propagación promedio (km²/hora)
  const velocidadKm2h = duracionMin > 0 ? (areaKm2 / (duracionMin / 60)) : 0;

  // Bounding box de la zona afectada (para "zonas afectadas")
  let latMin = 90, latMax = -90, lonMin = 180, lonMax = -180;
  for (const c of celdasAfectadas) {
    if (c.lat < latMin) latMin = c.lat;
    if (c.lat > latMax) latMax = c.lat;
    if (c.lon < lonMin) lonMin = c.lon;
    if (c.lon > lonMax) lonMax = c.lon;
  }

  return {
    foco,
    totalCeldas,
    areaHa,
    areaKm2,
    radioKm,
    diametroKm,
    numIteraciones: numIter,
    duracionTexto,
    duracionMin,
    velocidadKm2h,
    boundingBox: totalCeldas ? { latMin, latMax, lonMin, lonMax } : null,
    variables: escenario.variables_promedio,
    parametros: escenario.parametros,
  };
}

// Genera un SVG con la expansión del fuego por iteraciones (mapa esquemático).
// Colorea cada celda según en qué iteración se quemó (degradado temporal),
// con el foco marcado. Sirve como "imagen de la expansión" en el informe.
export function generarImagenExpansionSVG(escenario, tam = 420) {
  const iteraciones = escenario.iteraciones || [];
  const foco = escenario.foco_coordenadas;
  if (!iteraciones.length) return "";

  // Rango espacial (usar la última iteración, que es la más extensa)
  const ultima = iteraciones[iteraciones.length - 1];
  const celdas = ultima.celdas || [];
  if (!celdas.length) return "";

  let latMin = 90, latMax = -90, lonMin = 180, lonMax = -180;
  for (const c of celdas) {
    latMin = Math.min(latMin, c.lat); latMax = Math.max(latMax, c.lat);
    lonMin = Math.min(lonMin, c.lon); lonMax = Math.max(lonMax, c.lon);
  }
  if (foco) {
    latMin = Math.min(latMin, foco.lat); latMax = Math.max(latMax, foco.lat);
    lonMin = Math.min(lonMin, foco.lon); lonMax = Math.max(lonMax, foco.lon);
  }
  const margen = 0.004;
  latMin -= margen; latMax += margen; lonMin -= margen; lonMax += margen;

  const rangoLat = latMax - latMin || 0.01;
  const rangoLon = lonMax - lonMin || 0.01;
  const escala = Math.min(tam / rangoLon, tam / rangoLat);
  const anchoSVG = Math.max(rangoLon * escala, 60);
  const altoSVG = Math.max(rangoLat * escala, 60);

  const proj = (lat, lon) => ({
    x: (lon - lonMin) * escala,
    y: (latMax - lat) * escala, // invertir Y (norte arriba)
  });

  // Para cada celda, en qué iteración apareció por primera vez
  const primeraAparicion = new Map();
  iteraciones.forEach((it, idx) => {
    for (const c of it.celdas || []) {
      if (!primeraAparicion.has(c.celda_id)) {
        primeraAparicion.set(c.celda_id, { iter: idx, lat: c.lat, lon: c.lon });
      }
    }
  });

  const maxIter = iteraciones.length - 1 || 1;
  const ladoPx = Math.max(escala * 0.0045, 2.5); // tamaño de cada celda dibujada

  // Color degradado por iteración: amarillo (temprano) -> rojo -> gris (final)
  const colorPorIter = (iter) => {
    const t = iter / maxIter;
    if (t < 0.5) {
      // amarillo -> naranja -> rojo
      const u = t / 0.5;
      const r = 255;
      const g = Math.round(200 - 120 * u);
      const b = Math.round(40 - 40 * u);
      return `rgb(${r},${g},${b})`;
    } else {
      // rojo -> gris (quemado)
      const u = (t - 0.5) / 0.5;
      const r = Math.round(232 - 140 * u);
      const g = Math.round(73 + 20 * u);
      const b = Math.round(28 + 60 * u);
      return `rgb(${r},${g},${b})`;
    }
  };

  let celdasSVG = "";
  for (const [, info] of primeraAparicion) {
    const { x, y } = proj(info.lat, info.lon);
    celdasSVG += `<rect x="${(x - ladoPx / 2).toFixed(1)}" y="${(y - ladoPx / 2).toFixed(1)}" width="${ladoPx.toFixed(1)}" height="${ladoPx.toFixed(1)}" fill="${colorPorIter(info.iter)}" opacity="0.9"/>`;
  }

  // Foco
  let focoSVG = "";
  if (foco) {
    const { x, y } = proj(foco.lat, foco.lon);
    focoSVG = `<circle cx="${x.toFixed(1)}" cy="${y.toFixed(1)}" r="5" fill="none" stroke="#111" stroke-width="2"/>
               <circle cx="${x.toFixed(1)}" cy="${y.toFixed(1)}" r="2.5" fill="#e8491c"/>`;
  }

  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${anchoSVG.toFixed(0)} ${altoSVG.toFixed(0)}" width="${anchoSVG.toFixed(0)}" height="${altoSVG.toFixed(0)}" style="background:#0e1a16;border-radius:8px">
    ${celdasSVG}
    ${focoSVG}
  </svg>`;
}

export { distanciaKm };
