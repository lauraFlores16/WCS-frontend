// Genera un informe completo del incendio simulado como HTML descargable.
// Incluye: logos WCS, ubicación (lat/lon + altitud), duración estimada,
// extensión en km, zonas afectadas, imagen de la expansión del fuego y las
// condiciones climáticas de la simulación.
// El HTML se abre en cualquier navegador y se puede imprimir a PDF (Ctrl+P).
import { calcularMetricasIncendio, generarImagenExpansionSVG } from "../../local/metricas_incendio";

// Estima la elevación (altitud) del foco a partir de la pendiente de la celda.
// Nota: el grid del prototipo no trae elevación absoluta por celda; se muestra
// la pendiente real y se indica la altitud media del municipio como referencia.
const ALTITUD_MEDIA_APOLO_M = 1414; // altitud aproximada de Apolo (referencia)

export function generarInformeIncendio(escenario) {
  const m = calcularMetricasIncendio(escenario);
  const svgExpansion = generarImagenExpansionSVG(escenario, 460);
  const fecha = new Date().toLocaleString("es-BO");
  const foco = m.foco || { lat: 0, lon: 0 };
  const v = m.variables || {};
  const p = m.parametros || {};

  // Condiciones climáticas: variables promedio de la zona + ajustes del escenario
  const tempBase = v.temperatura_aire != null ? v.temperatura_aire : null;
  const tempAjustada = tempBase != null ? (tempBase + (p.delta_temperatura_c || 0)) : null;
  const humedadBase = v.humedad != null ? v.humedad : null;
  const humedadAjustada = humedadBase != null
    ? Math.min(Math.max(humedadBase + (p.delta_humedad || 0), 0), 1) : null;
  const vientoBase = v.velocidad_viento != null ? v.velocidad_viento : null;
  const vientoAjustado = vientoBase != null ? (vientoBase * (p.multiplicador_viento || 1)) : null;

  const fmt = (x, dec = 2) => (x == null ? "—" : Number(x).toFixed(dec));
  const pct = (x) => (x == null ? "—" : (x * 100).toFixed(0) + " %");

  const html = `<!DOCTYPE html>
<html lang="es"><head><meta charset="utf-8">
<title>Informe de incendio simulado — SIPRO FIRE</title>
<style>
  * { box-sizing: border-box; }
  body { font-family: -apple-system, Segoe UI, Roboto, Arial, sans-serif; color: #1a2b25; max-width: 920px; margin: 0 auto; padding: 32px 28px; }
  .cab { display: flex; align-items: center; justify-content: space-between; border-bottom: 3px solid #2fafa6; padding-bottom: 16px; margin-bottom: 8px; }
  .cab-logos { display: flex; align-items: center; gap: 20px; }
  .cab-logos img { height: 62px; }
  .cab-tit { text-align: right; }
  .cab-tit h1 { color: #23847d; font-size: 20px; margin: 0; }
  .cab-tit .s { color: #7c908a; font-size: 12px; }
  .meta { color: #7c908a; font-size: 12px; margin-bottom: 24px; }
  h2 { font-size: 15px; color: #184D2B; border-bottom: 1.5px solid #cfe0d9; padding-bottom: 5px; margin-top: 26px; }
  .grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(150px, 1fr)); gap: 14px; margin-top: 12px; }
  .kpi { background: #f5faf8; border: 1px solid #d5e0dc; border-radius: 8px; padding: 12px 14px; }
  .kpi .n { font-size: 22px; font-weight: 700; color: #1a2b25; font-family: 'Courier New', monospace; }
  .kpi .l { font-size: 10.5px; color: #7c908a; text-transform: uppercase; letter-spacing: .03em; margin-top: 2px; }
  .kpi.alerta .n { color: #e8491c; }
  table { width: 100%; border-collapse: collapse; margin-top: 10px; font-size: 13px; }
  th, td { border: 1px solid #d5e0dc; padding: 7px 11px; text-align: left; }
  th { background: #eef5f2; font-weight: 600; }
  .fig { text-align: center; margin: 16px 0; }
  .fig svg { border: 1px solid #d5e0dc; }
  .fig .cap { font-size: 11px; color: #7c908a; font-style: italic; margin-top: 6px; }
  .leyenda { display: flex; justify-content: center; gap: 16px; margin-top: 8px; font-size: 11px; color: #555; flex-wrap: wrap; }
  .leyenda span { display: inline-flex; align-items: center; gap: 4px; }
  .leyenda i { width: 12px; height: 12px; border-radius: 2px; display: inline-block; }
  .pie { margin-top: 36px; border-top: 1px solid #d5e0dc; padding-top: 12px; font-size: 10.5px; color: #99aaa4; }
  .destacado { background: #fff4f0; border-left: 4px solid #e8491c; padding: 12px 16px; border-radius: 6px; margin-top: 12px; font-size: 13px; }
</style></head><body>

  <div class="cab">
    <div class="cab-logos">
      <img src="/logo_wcs.svg" alt="WCS" onerror="this.style.display='none'"/>
      <img src="/logo.png" alt="SIPRO FIRE" onerror="this.style.display='none'"/>
    </div>
    <div class="cab-tit">
      <h1>Informe de Incendio Forestal Simulado</h1>
      <div class="s">SIPRO FIRE · Municipio Franz Tamayo (Apolo), La Paz — Bolivia</div>
    </div>
  </div>
  <div class="meta">
    Escenario: <strong>${escenario.nombre || "—"}</strong> · Generado: ${fecha} ·
    Responsable: ${escenario.creado_por || "—"}
  </div>

  <div class="destacado">
    Se ha detectado un <strong>probable incendio forestal</strong> en las coordenadas
    <strong>${fmt(foco.lat, 5)}, ${fmt(foco.lon, 5)}</strong>. Bajo las condiciones simuladas,
    el fuego alcanzaría una extensión aproximada de <strong>${fmt(m.areaKm2, 1)} km²</strong>
    (${m.areaHa.toLocaleString()} ha) con un frente de propagación de hasta
    <strong>${fmt(m.diametroKm, 1)} km</strong> en un lapso de <strong>${m.duracionTexto}</strong>.
    ${p.temporada ? `El escenario se simuló considerando <strong>${p.temporada.etiqueta.toLowerCase()}</strong>.` : ""}
  </div>

  <h2>1. Ubicación del foco</h2>
  <div class="grid">
    <div class="kpi"><div class="n">${fmt(foco.lat, 5)}</div><div class="l">Latitud</div></div>
    <div class="kpi"><div class="n">${fmt(foco.lon, 5)}</div><div class="l">Longitud</div></div>
    <div class="kpi"><div class="n">${ALTITUD_MEDIA_APOLO_M} m</div><div class="l">Altitud (ref. Apolo)</div></div>
    <div class="kpi"><div class="n">${fmt(p.foco_fila, 0)}, ${fmt(p.foco_columna, 0)}</div><div class="l">Celda (fila, col)</div></div>
  </div>

  <h2>2. Tiempo de estación y extensión</h2>
  <div class="grid">
    <div class="kpi alerta"><div class="n">${m.duracionTexto}</div><div class="l">Duración estimada</div></div>
    <div class="kpi alerta"><div class="n">${fmt(m.areaKm2, 1)}</div><div class="l">Área quemada (km²)</div></div>
    <div class="kpi"><div class="n">${m.areaHa.toLocaleString()}</div><div class="l">Área quemada (ha)</div></div>
    <div class="kpi"><div class="n">${fmt(m.diametroKm, 1)} km</div><div class="l">Frente de fuego (diámetro)</div></div>
    <div class="kpi"><div class="n">${fmt(m.radioKm, 2)} km</div><div class="l">Radio máximo</div></div>
    <div class="kpi"><div class="n">${fmt(m.velocidadKm2h, 2)}</div><div class="l">Velocidad (km²/h)</div></div>
  </div>

  <h2>3. Imagen de la expansión del fuego</h2>
  <div class="fig">
    ${svgExpansion}
    <div class="cap">Figura 1. Propagación del incendio desde el foco (○). El color indica el momento de quema: amarillo (inicio) → rojo → gris (final).</div>
    <div class="leyenda">
      <span><i style="background:rgb(255,200,40)"></i> Inicio</span>
      <span><i style="background:rgb(232,73,28)"></i> Intermedio</span>
      <span><i style="background:rgb(92,93,88)"></i> Final (quemado)</span>
      <span>○ Foco de ignición</span>
    </div>
  </div>

  <h2>4. Zonas afectadas</h2>
  <table>
    <tr><th>Parámetro</th><th>Valor</th></tr>
    <tr><td>Total de celdas afectadas</td><td>${m.totalCeldas.toLocaleString()} (celdas de 500 × 500 m)</td></tr>
    <tr><td>Área total afectada</td><td>${m.areaHa.toLocaleString()} ha · ${fmt(m.areaKm2, 2)} km²</td></tr>
    ${m.boundingBox ? `
    <tr><td>Extensión norte–sur</td><td>${fmt(m.boundingBox.latMax, 4)} a ${fmt(m.boundingBox.latMin, 4)} (lat.)</td></tr>
    <tr><td>Extensión este–oeste</td><td>${fmt(m.boundingBox.lonMin, 4)} a ${fmt(m.boundingBox.lonMax, 4)} (lon.)</td></tr>` : ""}
    <tr><td>Iteraciones simuladas</td><td>${m.numIteraciones} (paso ≈ 15 min)</td></tr>
  </table>

  <h2>5. Condiciones climáticas</h2>
  <table>
    <tr><th>Variable</th><th>Valor de la zona (GEE)</th><th>Ajuste del escenario</th><th>Valor aplicado</th></tr>
    <tr>
      <td>Temporada / evento climático</td>
      <td>—</td>
      <td>${p.temporada ? (p.temporada.por_fecha ? "Automática por fecha" : "Elegida manualmente") : "No incluida"}</td>
      <td><strong>${p.temporada ? p.temporada.etiqueta : "Sin estacionalidad"}</strong></td>
    </tr>
    <tr>
      <td>Temperatura del aire</td>
      <td>${fmt(tempBase, 1)} °C</td>
      <td>${p.delta_temperatura_c != null ? (p.delta_temperatura_c >= 0 ? "+" : "") + p.delta_temperatura_c + " °C" : "—"}</td>
      <td><strong>${fmt(tempAjustada, 1)} °C</strong></td>
    </tr>
    <tr>
      <td>Humedad relativa</td>
      <td>${pct(humedadBase)}</td>
      <td>${p.delta_humedad != null ? (p.delta_humedad >= 0 ? "+" : "") + (p.delta_humedad * 100).toFixed(0) + " %" : "—"}</td>
      <td><strong>${pct(humedadAjustada)}</strong></td>
    </tr>
    <tr>
      <td>Velocidad del viento</td>
      <td>${fmt(vientoBase, 2)} m/s</td>
      <td>${p.multiplicador_viento != null ? "× " + p.multiplicador_viento.toFixed(1) : "—"}</td>
      <td><strong>${fmt(vientoAjustado, 2)} m/s</strong></td>
    </tr>
    <tr>
      <td>NDVI (vegetación / combustible)</td>
      <td>${fmt(v.ndvi, 3)}</td>
      <td>—</td>
      <td><strong>${fmt(v.ndvi, 3)}</strong></td>
    </tr>
    <tr>
      <td>Probabilidad base de propagación</td>
      <td>—</td><td>—</td>
      <td><strong>${fmt(p.p_base, 2)}</strong></td>
    </tr>
  </table>

  <div class="pie">
    Informe generado por SIPRO FIRE (Sistema Inteligente de Prevención y Simulación de Incendios Forestales).
    Las cifras corresponden a una simulación mediante autómata celular y modelo XGBoost sobre datos satelitales
    (NASA FIRMS, Landsat, MODIS, ERA5, SRTM). La altitud indicada es la media referencial del municipio de Apolo.
    Documento con fines de análisis y planificación; no constituye un parte oficial de emergencia.
  </div>
</body></html>`;

  // Devuelve el HTML (para mostrarlo en un modal). La descarga la maneja el visor.
  return html;
}
