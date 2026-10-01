/**
 * Informe de validación externa.
 *
 * Abre una ventana con el informe maquetado para imprimir o guardar como PDF
 * desde el propio navegador. No hace falta ninguna librería nueva: el diálogo
 * de impresión de Chrome ya guarda en PDF, y meter una dependencia de
 * generación de PDF para esto sería cargar el proyecto sin necesidad.
 *
 * Todos los valores salen de `validacion_rbq.json`. Si un dato falta, sale un
 * guion: nunca un cero, que se leería como un resultado real.
 */

const pct = (v) => (v == null ? "—" : `${(v * 100).toFixed(1)} %`);
const km2 = (v) => (v == null ? "—" : `${Number(v).toFixed(2)} km²`);
const num = (v) => (v == null ? "—" : Number(v).toLocaleString("es-BO"));

export function generarInformeValidacion(datos, imagenes = {}) {
  if (!datos) return;

  const m = datos.metricas || {};
  const a = datos.areas || {};
  const c = datos.confusion || {};
  const comp = datos.complementarias || {};
  const mod = datos.modelo || {};
  const ev = datos.evento || {};
  const cob = datos.cobertura || {};

  const fecha = new Date().toLocaleString("es-BO");

  const html = `<!DOCTYPE html>
<html lang="es"><head><meta charset="utf-8">
<title>Validación externa del autómata celular — ${datos.area} ${datos.anio}</title>
<style>
  @page { size: letter; margin: 2cm; }
  body { font-family: Calibri, "Segoe UI", system-ui, sans-serif;
         color: #1E293B; font-size: 10.5pt; line-height: 1.5; margin: 0; }
  h1 { font-size: 16pt; color: #0F766E; margin: 0 0 4px; }
  h2 { font-size: 12pt; color: #0F766E; margin: 22px 0 8px;
       border-bottom: 1px solid #D6E1EA; padding-bottom: 4px; }
  .sub { color: #475569; margin: 0 0 18px; font-size: 10pt; }
  table { width: 100%; border-collapse: collapse; margin: 8px 0 4px; }
  th, td { text-align: left; padding: 5px 8px; border-bottom: 1px solid #E2E8F0; }
  th { font-size: 9pt; text-transform: uppercase; letter-spacing: .04em;
       color: #475569; font-weight: 700; }
  td.n, th.n { text-align: right; font-variant-numeric: tabular-nums; }
  .destacado td { font-weight: 700; background: #F0FDFA; }
  .matriz td { text-align: center; font-size: 12pt; font-weight: 700; }
  .matriz td small { display: block; font-size: 8pt; font-weight: 600;
                     letter-spacing: .06em; margin-top: 2px; }
  .tp { background: #DCFCE7; } .fp { background: #FEF3C7; }
  .fn { background: #DBEAFE; } .tn { background: #F1F5F9; }
  .demo { border: 2px solid #DC2626; background: #FEF2F2; color: #7F1D1D;
          padding: 10px 14px; border-radius: 4px; margin: 0 0 16px;
          font-size: 10pt; }
  .nota { font-size: 9pt; color: #475569; background: #F8FAFC;
          border-left: 3px solid #94A3B8; padding: 8px 12px; margin: 10px 0; }
  .comport { display: inline-block; padding: 4px 14px; border-radius: 4px;
             font-weight: 700; letter-spacing: .04em; }
  .sobre { background: #FEF3C7; color: #92400E; }
  .sub2  { background: #DBEAFE; color: #1E40AF; }
  .figs { display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 10px; margin: 10px 0; }
  .figs figure { margin: 0; }
  .figs img { width: 100%; border: 1px solid #D6E1EA; border-radius: 4px; }
  .figs figcaption { font-size: 8.5pt; color: #475569; margin-top: 4px;
                     text-align: center; }
  footer { margin-top: 26px; padding-top: 10px; border-top: 1px solid #D6E1EA;
           font-size: 8.5pt; color: #64748B; }
  @media print { .noimp { display: none; } }
  .noimp { position: fixed; top: 12px; right: 12px; }
  .noimp button { font: inherit; padding: 8px 16px; border-radius: 6px;
                  border: 1px solid #0F766E; background: #0F766E; color: #fff;
                  cursor: pointer; }
</style></head><body>

<div class="noimp"><button onclick="window.print()">Imprimir o guardar en PDF</button></div>

<h1>SIPRO FIRE — Validación externa del autómata celular</h1>
<p class="sub">
  Municipio de ${datos.area}, departamento del ${datos.departamento} ·
  Evento ${datos.anio} · Informe generado el ${fecha}
</p>

${datos._demo ? `<div class="demo">
  <strong>⚠ DATOS DE DEMOSTRACIÓN — NO USAR</strong><br>
  ${datos._demo_aviso || "Este informe se generó con datos sintéticos."}
</div>` : ""}

<div class="nota">
  <strong>Alcance.</strong> Esta prueba evalúa exclusivamente el modelo de
  propagación (autómata celular). No evalúa el modelo de predicción de
  ocurrencia (XGBoost), que se entrenó y se validó con datos de Apolo. Los
  focos iniciales proceden de observación satelital, no de la predicción.
</div>

<h2>1. Evento</h2>
<table>
  <tr><th>Evento</th><td>${ev.id || "—"}</td></tr>
  <tr><th>Fecha inicial</th><td>${ev.fecha_inicio || "—"}</td></tr>
  <tr><th>Fecha final</th><td>${ev.fecha_fin || "—"}</td></tr>
  <tr><th>Duración</th><td>${ev.duracion_h != null ? `${ev.duracion_h} h` : "—"}</td></tr>
  <tr><th>Focos NASA FIRMS</th><td>${num(ev.focos_firms)}</td></tr>
  <tr><th>Sensor principal</th><td>${ev.sensor_principal || "—"}</td></tr>
  <tr><th>Criterio de selección</th><td>${ev.criterio_seleccion || "—"}</td></tr>
</table>
<div class="nota">
  NASA FIRMS detecta anomalías térmicas, no superficie quemada. Se utilizó para
  localizar el evento, acotar su periodo y determinar los focos iniciales. La
  superficie observada procede del índice dNBR sobre imagen satelital.
</div>

<h2>2. Configuración de la validación</h2>
<table>
  <tr><th>Resolución espacial</th><td>500 × 500 m (0,25 km² por celda)</td></tr>
  <tr><th>Vecindad</th><td>Moore — radio ${mod.radio} — ${mod.vecinos} vecinos</td></tr>
  <tr><th>Repeticiones estocásticas</th><td>${num(mod.corridas)}</td></tr>
  <tr><th>Umbral de quema simulada</th><td>${mod.umbral_prob_quemada ?? "—"} de las corridas</td></tr>
  <tr><th>p_base congelado</th><td>${mod.p_base ?? "—"}</td></tr>
  <tr><th>Parámetros congelados el</th><td>${mod.parametros_congelados_el || "—"}</td></tr>
  <tr><th>Modelo digital de elevación</th><td>${mod.usa_dem ? "sí" : "no"}</td></tr>
  <tr><th>Barreras de terreno (OSM)</th><td>${mod.usa_barreras_osm ? "sí" : "no"}</td></tr>
  <tr><th>Clima horario del evento</th><td>${mod.usa_clima_horario ? "sí (ERA5)" : "no"}</td></tr>
</table>
<div class="nota">
  Los parámetros del autómata se fijaron a partir de la calibración realizada en
  Apolo y no se modificaron con los resultados de ${datos.area}. Es la condición
  que hace de esta una validación externa independiente.
</div>

<h2>3. Superficie afectada</h2>
<table>
  <tr><th>Indicador</th><th class="n">Valor</th></tr>
  <tr><td>Área observada (dNBR)</td><td class="n">${km2(a.observada_km2)}</td></tr>
  <tr><td>Área simulada (autómata)</td><td class="n">${km2(a.simulada_km2)}</td></tr>
  <tr><td>Diferencia</td><td class="n">${a.diferencia_km2 >= 0 ? "+" : ""}${km2(a.diferencia_km2)}</td></tr>
  <tr class="destacado"><td>Error relativo</td><td class="n">${
    a.error_relativo_pct == null ? "—" : `${a.error_relativo_pct.toFixed(2)} %`}</td></tr>
</table>
<p>Comportamiento: <span class="comport ${
  datos.comportamiento === "SOBREESTIMACIÓN" ? "sobre" : "sub2"}">${
  datos.comportamiento || "—"}</span></p>

<h2>4. Matriz de confusión espacial</h2>
<table class="matriz">
  <tr><th></th><th style="text-align:center">Observado quemado</th>
      <th style="text-align:center">Observado no quemado</th></tr>
  <tr><th>Simulado quemado</th>
      <td class="tp">${num(c.tp)}<small>TP</small></td>
      <td class="fp">${num(c.fp)}<small>FP</small></td></tr>
  <tr><th>Simulado no quemado</th>
      <td class="fn">${num(c.fn)}<small>FN</small></td>
      <td class="tn">${num(c.tn)}<small>TN</small></td></tr>
</table>
<div class="nota">
  Celdas evaluadas: ${num(cob.celdas_evaluadas)}. Se excluyeron
  ${num(cob.celdas_excluidas_sin_dato)} celdas sin observación satelital válida
  (nube, sombra o agua); esas celdas no se contabilizaron como acierto ni como
  error.
</div>

<h2>5. Métricas</h2>
<table>
  <tr><th>Métrica</th><th class="n">Resultado</th><th>Interpretación</th></tr>
  <tr class="destacado"><td>IoU</td><td class="n">${pct(m.iou)}</td>
      <td>Superposición espacial entre superficie simulada y observada</td></tr>
  <tr class="destacado"><td>Precision</td><td class="n">${pct(m.precision)}</td>
      <td>Proporción del área simulada que coincide con la observada</td></tr>
  <tr class="destacado"><td>Recall</td><td class="n">${pct(m.recall)}</td>
      <td>Proporción del área observada representada por la simulación</td></tr>
  <tr class="destacado"><td>F1-score</td><td class="n">${pct(m.f1)}</td>
      <td>Media armónica de Precision y Recall</td></tr>
  <tr><td>Accuracy</td><td class="n">${pct(m.accuracy)}</td>
      <td><em>Complementaria.</em> Dominada por las celdas no quemadas</td></tr>
  <tr><td>Error angular</td><td class="n">${
    comp.error_angular_grados == null ? "—" : `${comp.error_angular_grados.toFixed(2)}°`}</td>
      <td><em>Complementaria.</em> Desviación de la dirección de propagación</td></tr>
  <tr><td>Distancia entre centroides</td><td class="n">${
    comp.distancia_centroides_km == null ? "—" : `${comp.distancia_centroides_km.toFixed(2)} km`}</td>
      <td><em>Complementaria.</em> Separación entre ambas superficies</td></tr>
</table>
<div class="nota">
  La Accuracy no se utiliza como métrica principal: con
  ${num(c.tn)} verdaderos negativos sobre ${num(cob.celdas_evaluadas)} celdas
  evaluadas, un valor elevado reflejaría la extensión no afectada del municipio
  antes que la calidad de la representación de la propagación.
</div>

${imagenes.observado || imagenes.simulado || imagenes.comparacion ? `
<h2>6. Representación espacial</h2>
<div class="figs">
  ${imagenes.observado ? `<figure><img src="${imagenes.observado}" alt="Superficie observada">
    <figcaption>Figura 1. Superficie quemada observada (dNBR).</figcaption></figure>` : ""}
  ${imagenes.simulado ? `<figure><img src="${imagenes.simulado}" alt="Superficie simulada">
    <figcaption>Figura 2. Propagación simulada por el autómata celular.</figcaption></figure>` : ""}
  ${imagenes.comparacion ? `<figure><img src="${imagenes.comparacion}" alt="Comparación">
    <figcaption>Figura 3. Comparación espacial: TP, FP y FN.</figcaption></figure>` : ""}
</div>` : ""}

<h2>${imagenes.observado ? "7" : "6"}. Análisis</h2>
<p>
  La simulación representó el ${pct(m.recall)} de la superficie observada. Del
  área simulada, el ${pct(m.precision)} coincide con la observada. El valor de
  IoU obtenido, ${pct(m.iou)}, expresa el grado de superposición espacial entre
  ambas superficies. El área simulada fue de ${km2(a.simulada_km2)} frente a
  ${km2(a.observada_km2)} observados, lo que corresponde a
  ${datos.comportamiento === "SOBREESTIMACIÓN" ? "una sobreestimación" : "una subestimación"}
  del ${a.error_relativo_pct == null ? "—" : `${a.error_relativo_pct.toFixed(2)} %`}${
    comp.error_angular_grados != null
      ? `. El error angular de la dirección principal de propagación fue de ${comp.error_angular_grados.toFixed(1)}°`
      : ""}.
</p>

<h2>${imagenes.observado ? "8" : "7"}. Limitaciones</h2>
<ul>
  <li>La prueba evalúa la reproducción del patrón espacial de un evento
      histórico, no la exactitud predictiva operativa del modelo.</li>
  <li>La superficie observada depende del umbral de dNBR adoptado, fijado según
      el criterio de severidad de la escala USGS.</li>
  <li>El autómata es estocástico; los resultados corresponden a la agregación de
      ${num(mod.corridas)} repeticiones y no a una realización única.</li>
  <li>Las celdas sin observación satelital válida quedaron excluidas del
      cálculo, lo que reduce el dominio efectivo de evaluación.</li>
  ${(datos.advertencias || []).map((t) => `<li>${t}</li>`).join("")}
</ul>

<footer>
  SIPRO FIRE — Sistema de monitoreo y simulación de incendios forestales ·
  Municipio de ${datos.area}, departamento del ${datos.departamento} ·
  Cálculo del ${datos.fecha_calculo ? new Date(datos.fecha_calculo).toLocaleString("es-BO") : "—"}
</footer>

</body></html>`;

  const v = window.open("", "_blank");
  if (!v) {
    alert("El navegador bloqueó la ventana del informe. Permite las ventanas "
          + "emergentes para este sitio y vuelve a intentarlo.");
    return;
  }
  v.document.write(html);
  v.document.close();
}
