// Estimación del tiempo de propagación del incendio (Capa 5).
//
// A partir de los resultados de la simulación del autómata (Capa 4), calcula
// la línea de tiempo de la propagación: cuándo se alcanza cada etapa, con
// fechas y horas reales (inicio = ahora), y compara con la velocidad de un
// evento histórico similar.
//
// Cada iteración del autómata ≈ 15 minutos simulados (mismo supuesto que en
// el resto del sistema).

const MINUTOS_POR_ITERACION = 15;
const AREA_CELDA_HA = 25;

function formatFechaHora(fecha) {
  return fecha.toLocaleString("es-BO", {
    day: "2-digit", month: "2-digit", year: "numeric",
    hour: "2-digit", minute: "2-digit",
  });
}

function formatDuracion(minutos) {
  const dias = Math.floor(minutos / 1440);
  const horas = Math.floor((minutos % 1440) / 60);
  const min = Math.round(minutos % 60);
  const partes = [];
  if (dias) partes.push(`${dias} día${dias > 1 ? "s" : ""}`);
  if (horas) partes.push(`${horas} h`);
  if (min && !dias) partes.push(`${min} min`);
  return partes.join(" ") || "0 min";
}

// Genera la línea de tiempo de propagación a partir de las iteraciones.
export function calcularTiempoPropagacion(escenario, fechaInicio = new Date()) {
  const iteraciones = escenario.iteraciones || [];
  if (!iteraciones.length) return null;

  const inicio = new Date(fechaInicio);

  // Hitos clave de la propagación
  const hitos = iteraciones.map((it) => {
    const minutos = it.iteracion * MINUTOS_POR_ITERACION;
    const fecha = new Date(inicio.getTime() + minutos * 60000);
    return {
      iteracion: it.iteracion,
      minutos,
      fecha,
      fechaTexto: formatFechaHora(fecha),
      celdas_ardiendo: it.num_celdas_ardiendo,
      celdas_quemadas: it.num_celdas_quemadas,
      area_ha: it.num_celdas_quemadas * AREA_CELDA_HA,
    };
  });

  const ultima = hitos[hitos.length - 1];
  const duracionTotalMin = ultima.minutos;

  // Momento en que el fuego alcanza su máxima velocidad de expansión
  let maxCrecimiento = 0, iterPico = 0;
  for (let i = 1; i < hitos.length; i++) {
    const crecimiento = hitos[i].celdas_quemadas - hitos[i - 1].celdas_quemadas;
    if (crecimiento > maxCrecimiento) { maxCrecimiento = crecimiento; iterPico = i; }
  }

  // Velocidad promedio (ha/hora)
  const velocidadHaHora = duracionTotalMin > 0
    ? (ultima.area_ha / (duracionTotalMin / 60)) : 0;

  // Etapas resumidas (inicio, aceleración, extensión máxima)
  const etapas = [
    {
      nombre: "Inicio del incendio",
      fecha: hitos[0].fecha,
      fechaTexto: hitos[0].fechaTexto,
      descripcion: "Ignición en el foco detectado",
      area_ha: 0,
    },
    {
      nombre: "Máxima expansión",
      fecha: hitos[iterPico].fecha,
      fechaTexto: hitos[iterPico].fechaTexto,
      descripcion: `Pico de propagación: +${maxCrecimiento} celdas en 15 min`,
      area_ha: hitos[iterPico].area_ha,
    },
    {
      nombre: "Extensión final simulada",
      fecha: ultima.fecha,
      fechaTexto: ultima.fechaTexto,
      descripcion: `Área total afectada al final de la simulación`,
      area_ha: ultima.area_ha,
    },
  ];

  return {
    fechaInicio: inicio,
    fechaInicioTexto: formatFechaHora(inicio),
    fechaFin: ultima.fecha,
    fechaFinTexto: ultima.fechaTexto,
    duracionMin: duracionTotalMin,
    duracionTexto: formatDuracion(duracionTotalMin),
    velocidadHaHora: Math.round(velocidadHaHora * 10) / 10,
    areaFinalHa: ultima.area_ha,
    hitos,
    etapas,
  };
}

// Compara el tiempo de propagación simulado con un evento histórico.
export function compararConHistoricoTiempo(tiempoProp, eventoHistorico) {
  if (!eventoHistorico) return null;
  const areaSimKm2 = tiempoProp.areaFinalHa / 100;
  const areaHistKm2 = eventoHistorico.area_km2;
  const velHistKm2dia = eventoHistorico.velocidad_km2_dia;
  const velSimKm2dia = tiempoProp.duracionMin > 0
    ? (areaSimKm2 / (tiempoProp.duracionMin / 1440)) : 0;

  return {
    evento: eventoHistorico.nombre,
    area_sim_km2: Math.round(areaSimKm2 * 10) / 10,
    area_hist_km2: areaHistKm2,
    velocidad_sim_km2_dia: Math.round(velSimKm2dia * 10) / 10,
    velocidad_hist_km2_dia: velHistKm2dia,
    duracion_hist_dias: eventoHistorico.duracion_dias,
  };
}

export { formatFechaHora, formatDuracion };
