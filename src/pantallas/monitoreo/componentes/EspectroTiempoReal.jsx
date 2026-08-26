// Mini-visor "espectral" en tiempo real, arriba a la derecha del mapa.
// Reproduce la MISMA imagen de expansión que sale en el informe (cada celda
// coloreada según el momento en que se quemó: amarillo temprano → rojo → gris),
// pero dibujada solo hasta la iteración que se está reproduciendo. Así, mientras
// la simulación avanza, se ve crecer la "huella" del incendio en vivo.
import { useMemo } from "react";

// Mismo degradado que generarImagenExpansionSVG del informe.
function colorPorIter(iter, maxIter) {
  const t = maxIter ? iter / maxIter : 0;
  if (t < 0.5) {
    const u = t / 0.5;
    return `rgb(255,${Math.round(200 - 120 * u)},${Math.round(40 - 40 * u)})`;
  }
  const u = (t - 0.5) / 0.5;
  return `rgb(${Math.round(232 - 140 * u)},${Math.round(73 + 20 * u)},${Math.round(28 + 60 * u)})`;
}

export default function EspectroTiempoReal({ simulacion, indice, foco, tam = 150 }) {
  const svg = useMemo(() => {
    const iteraciones = simulacion?.iteraciones || [];
    if (!iteraciones.length) return null;

    // Rango espacial: se fija con la ÚLTIMA iteración (la más extensa) para que
    // el encuadre no salte mientras crece el fuego.
    const ultima = iteraciones[iteraciones.length - 1];
    const celdasUlt = ultima.celdas || [];
    if (!celdasUlt.length) return null;

    let latMin = 90, latMax = -90, lonMin = 180, lonMax = -180;
    for (const c of celdasUlt) {
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
    const proj = (lat, lon) => ({ x: (lon - lonMin) * escala, y: (latMax - lat) * escala });
    const ladoPx = Math.max(escala * 0.0045, 2);
    const maxIter = iteraciones.length - 1 || 1;

    // Primera aparición de cada celda, SOLO hasta el índice actual.
    const primera = new Map();
    for (let i = 0; i <= Math.min(indice, iteraciones.length - 1); i++) {
      for (const c of iteraciones[i].celdas || []) {
        if (!primera.has(c.celda_id)) primera.set(c.celda_id, { iter: i, lat: c.lat, lon: c.lon });
      }
    }

    const rects = [];
    for (const [id, info] of primera) {
      const { x, y } = proj(info.lat, info.lon);
      rects.push({
        id,
        x: +(x - ladoPx / 2).toFixed(1),
        y: +(y - ladoPx / 2).toFixed(1),
        lado: +ladoPx.toFixed(1),
        color: colorPorIter(info.iter, maxIter),
      });
    }
    let focoPt = null;
    if (foco) {
      const { x, y } = proj(foco.lat, foco.lon);
      focoPt = { x: +x.toFixed(1), y: +y.toFixed(1) };
    }
    const w = Math.max(rangoLon * escala, 40);
    const h = Math.max(rangoLat * escala, 40);
    return { rects, focoPt, w, h };
  }, [simulacion, indice, foco, tam]);

  if (!svg) return null;
  const it = simulacion.iteraciones[Math.min(indice, simulacion.iteraciones.length - 1)];
  const quemadas = it?.num_celdas_quemadas ?? 0;

  return (
    <div className="espectro-vivo">
      <div className="espectro-vivo-cab">
        <span className="espectro-vivo-punto" />
        Propagación en vivo
      </div>
      <svg viewBox={`0 0 ${svg.w} ${svg.h}`} width="100%" preserveAspectRatio="xMidYMid meet"
        style={{ display: "block", background: "#0c1512", borderRadius: 4 }}>
        {svg.rects.map((r) => (
          <rect key={r.id} x={r.x} y={r.y} width={r.lado} height={r.lado} fill={r.color} />
        ))}
        {svg.focoPt && (
          <circle cx={svg.focoPt.x} cy={svg.focoPt.y} r={3} fill="none" stroke="#fff" strokeWidth={1.5} />
        )}
      </svg>
      <div className="espectro-vivo-pie">
        iter {it?.iteracion ?? 0}/{simulacion.iteraciones.length - 1} · {(quemadas * 25).toLocaleString()} ha
      </div>
    </div>
  );
}
