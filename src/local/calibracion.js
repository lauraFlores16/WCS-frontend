// Calibración de las constantes K. Cliente del backend.
//
// Antes corría en la pestaña y la congelaba unos 36 segundos. Ahora se lanza en
// el servidor, que responde al instante, y el frontend va preguntando el
// progreso. La pestaña queda utilizable mientras tanto.
import { pedir } from "./cliente";

/** @returns { actual, historial, en_curso } */
export async function estadoCalibracion() {
  return pedir("/api/calibracion");
}

export async function leerCalibracion() {
  const { actual } = await estadoCalibracion();
  return actual;
}

/**
 * Lanza la calibración y va informando del progreso hasta que termina.
 * @param {Object} opciones { onProgreso, poblacion, generaciones, ventanaDias }
 * @returns el resultado final de la calibración
 */
export async function calibrar(opciones = {}) {
  const { onProgreso = null, intervaloMs = 1000, ...ajustes } = opciones;

  await pedir("/api/calibracion", { metodo: "POST", cuerpo: ajustes });

  return new Promise((resolver, rechazar) => {
    const reloj = setInterval(async () => {
      try {
        const estado = await estadoCalibracion();
        if (estado.en_curso) {
          if (onProgreso) onProgreso(estado.en_curso.progreso);
          return;
        }
        clearInterval(reloj);
        if (onProgreso) onProgreso(1);
        if (estado.actual) resolver(estado.actual);
        else rechazar(new Error("La calibración terminó sin resultado. Revisa la consola del backend."));
      } catch (e) {
        clearInterval(reloj);
        rechazar(e);
      }
    }, intervaloMs);
  });
}
