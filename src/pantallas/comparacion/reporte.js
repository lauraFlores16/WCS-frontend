// Genera un reporte de la comparación como archivo HTML descargable.
// (En el prototipo frontend no hay reportlab/PDF del backend; un HTML se
// abre en cualquier navegador y se puede imprimir a PDF con Ctrl+P.)
export function generarReporteComparacion(resultado) {
  const { escenario, ranking } = resultado;
  const top = ranking[0];
  const fecha = new Date().toLocaleString();

  const filasRanking = ranking.map((r, i) => `
    <tr${i === 0 ? ' style="background:#eafaf7"' : ""}>
      <td style="text-align:center;font-weight:700">${i + 1}</td>
      <td>${r.evento.nombre}</td>
      <td style="text-align:center;font-weight:700;color:#23847d">${r.puntaje_total}%</td>
      <td style="text-align:center">${r.puntaje_ubicacion}% (${r.distancia_km} km)</td>
      <td style="text-align:center">${r.puntaje_variables}%</td>
      <td style="text-align:center">${r.evento.area_km2} km²</td>
      <td style="text-align:center">${r.evento.duracion_dias} d</td>
      <td style="text-align:center">${r.evento.validacion ? r.evento.validacion.F1 + "%" : "—"}</td>
    </tr>`).join("");

  const html = `<!DOCTYPE html>
<html lang="es"><head><meta charset="utf-8">
<title>Reporte de comparación — SIPRO FIRE</title>
<style>
  body { font-family: -apple-system, Segoe UI, Roboto, sans-serif; color: #1a2b25; max-width: 900px; margin: 40px auto; padding: 0 24px; }
  h1 { color: #23847d; font-size: 22px; margin-bottom: 4px; }
  .sub { color: #7c908a; font-size: 13px; margin-bottom: 24px; }
  h2 { font-size: 15px; border-bottom: 2px solid #2fafa6; padding-bottom: 6px; margin-top: 28px; }
  table { width: 100%; border-collapse: collapse; margin-top: 12px; font-size: 13px; }
  th, td { border: 1px solid #d5e0dc; padding: 7px 10px; }
  th { background: #f0f6f4; text-align: left; }
  .box { background: #f7fbfa; border: 1px solid #d5e0dc; border-radius: 6px; padding: 14px 18px; margin-top: 12px; }
  .kpi { display: inline-block; margin-right: 32px; }
  .kpi-num { font-size: 22px; font-weight: 700; }
  .kpi-lbl { font-size: 11px; color: #7c908a; text-transform: uppercase; }
  .destacado { background: #eafaf7; border-left: 4px solid #2fafa6; }
  .pie { margin-top: 40px; font-size: 11px; color: #99aaa4; border-top: 1px solid #d5e0dc; padding-top: 12px; }
</style></head><body>
  <h1>SIPRO FIRE — Reporte de comparación histórica</h1>
  <div class="sub">Sistema Inteligente de Prevención y Simulación de Incendios Forestales · Municipio Franz Tamayo (Apolo), La Paz · Generado: ${fecha}</div>

  <h2>Escenario simulado</h2>
  <div class="box">
    <strong>${escenario.nombre}</strong>
    <div style="margin-top:12px">
      <span class="kpi"><span class="kpi-num">${escenario.area_final_ha.toLocaleString()}</span><br><span class="kpi-lbl">ha quemadas</span></span>
      <span class="kpi"><span class="kpi-num">${escenario.variables.ndvi}</span><br><span class="kpi-lbl">NDVI medio</span></span>
      <span class="kpi"><span class="kpi-num">${escenario.variables.humedad}</span><br><span class="kpi-lbl">Humedad</span></span>
      <span class="kpi"><span class="kpi-num">${escenario.variables.velocidad_viento}</span><br><span class="kpi-lbl">Viento</span></span>
      <span class="kpi"><span class="kpi-num">${escenario.variables.temperatura_aire}°</span><br><span class="kpi-lbl">Temperatura</span></span>
    </div>
    ${escenario.foco ? `<div style="margin-top:8px;font-size:12px;color:#7c908a">Foco de ignición: ${escenario.foco.lat.toFixed(4)}, ${escenario.foco.lon.toFixed(4)}</div>` : ""}
  </div>

  <h2>Ranking de similitud con eventos reales</h2>
  <table>
    <thead><tr>
      <th style="text-align:center">#</th><th>Evento histórico</th>
      <th style="text-align:center">Similitud total</th>
      <th style="text-align:center">Ubicación</th>
      <th style="text-align:center">Variables</th>
      <th style="text-align:center">Área real</th>
      <th style="text-align:center">Duración</th>
      <th style="text-align:center">F1 valid.</th>
    </tr></thead>
    <tbody>${filasRanking}</tbody>
  </table>

  <h2>Conclusión</h2>
  <div class="box destacado">
    El escenario simulado se asemeja más al evento <strong>${top.evento.nombre}</strong>
    (similitud ${top.puntaje_total}%: ${top.puntaje_ubicacion}% por ubicación del foco a ${top.distancia_km} km,
    ${top.puntaje_variables}% por variables ambientales).
    Bajo condiciones similares, ese incendio real afectó <strong>${top.evento.area_km2} km²</strong>
    durante <strong>${top.evento.duracion_dias} días</strong>
    (velocidad ${top.evento.velocidad_km2_dia} km²/día).
    ${top.evento.validacion ? `La validación del modelo contra este evento obtuvo IoU ${top.evento.validacion.IoU}%, Recall ${top.evento.validacion.Recall}% y F1 ${top.evento.validacion.F1}%.` : ""}
  </div>

  <div class="pie">
    Comparación calculada con puntaje combinado (50% ubicación del foco por distancia geográfica,
    50% similitud de variables ambientales: NDVI, humedad, viento, temperatura).
    Datos históricos: NASA FIRMS / dNBR, temporadas secas 2021, 2023 y 2024.
  </div>
</body></html>`;

  const blob = new Blob([html], { type: "text/html;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `reporte_comparacion_${escenario.nombre.replace(/[^a-z0-9]/gi, "_")}.html`;
  a.click();
  URL.revokeObjectURL(url);
}
