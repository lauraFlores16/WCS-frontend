// ============================================================================
// BITÁCORA — cliente del backend
// ============================================================================
// Antes esto escribía en localStorage. Tras dividir el proyecto quedaron DOS
// bitácoras que no se veían entre sí: el backend registraba los inicios de
// sesión, las simulaciones y las calibraciones en almacen/datos/bitacora.json,
// y la pantalla de Bitácora seguía leyendo la del navegador. Un administrador
// no veía nada de lo que pasaba de verdad en el servidor, y cada navegador
// tenía su propia versión de la historia.
//
// Ahora hay una sola, en el servidor. Eso es además lo que se espera de una
// bitácora de auditoría: si el usuario puede borrarla desde las herramientas de
// desarrollo, no sirve como registro.
//
// La firma de `registrarBitacora` se mantiene posicional, igual que antes, para
// no tocar las pantallas que ya la llamaban.
// ============================================================================
import { pedir } from "./cliente";

/**
 * Registra una acción. No bloquea ni lanza: la bitácora nunca debe hacer
 * fallar la operación que la origina.
 */
export function registrarBitacora(usuario, accion, detalle, tipo = "data") {
  pedir("/api/bitacora", {
    metodo: "POST",
    cuerpo: { usuario, accion, detalle, tipo },
  }).catch(() => { /* sin sesión o backend caído: se pierde el registro, no la acción */ });
}

/**
 * @returns {Array} registros normalizados a { t, u, a, d, tp }, que es la
 * forma que ya consumía la pantalla de Bitácora.
 */
export async function listarBitacora() {
  const registros = await pedir("/api/bitacora");
  return registros.map((r) => ({
    t: r.fecha ? Date.parse(r.fecha) : Date.now(),
    u: r.usuario || "sistema",
    a: r.accion || "",
    d: r.detalle || "",
    tp: r.tipo || "data",
  }));
}
