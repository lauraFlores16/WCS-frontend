/**
 * Qué ve cada rol en el menú lateral.
 *
 *     npx vite-node scripts/comprobar_menu_por_rol.mjs
 *
 * POR QUÉ ESTA COMPROBACIÓN
 *   El menú se filtra cruzando tres archivos: `navegacion.js` (las entradas),
 *   `PERMISO_DE_PANTALLA` (qué permiso habilita cada una) y la matriz de
 *   permisos. Un descuido en cualquiera de los tres deja una pantalla visible
 *   para quien no debería verla, y mirándolo a ojo no se detecta: hay que
 *   entrar con cada rol y revisar el menú entero.
 *
 *   Aquí se calcula. Si el brigadista acaba viendo Simulación, falla.
 *
 * OJO — ESTO NO ES CONTROL DE ACCESO
 *   Comprueba lo que se VE, no lo que se PUEDE. Que una entrada no salga en
 *   el menú no impide escribir la URL a mano. La barrera de verdad está en el
 *   servidor y se prueba en backend_django/pruebas/prueba_brigadista.py.
 */
import { NAV_ANALISTA, NAV_ADMINISTRADOR, navegacionDe } from "../src/nucleo/navegacion.js";
import { PERMISO_DE_PANTALLA } from "../src/nucleo/PermisosContext.jsx";

// Misma matriz que api/almacen/permisos_defecto.py. Si las dos se separan,
// la interfaz enseñaría algo distinto de lo que el servidor permite.
const MATRIZ = {
  administrador: {
    gestionar_usuarios: true, configuracion: true, ver_bitacora: true,
    generar_reportes: true, ver_monitoreo: false, ver_variables: false,
    ver_focos: false, consultar_probabilidad: false, ejecutar_simulacion: false,
    ver_simulaciones: false, reportar_incendio: false, ver_reportes_campo: false,
  },
  analista: {
    ver_monitoreo: true, ver_variables: true, ver_focos: true,
    consultar_probabilidad: true, ejecutar_simulacion: true,
    ver_simulaciones: true, generar_reportes: true, gestionar_usuarios: false,
    configuracion: false, ver_bitacora: false,
    reportar_incendio: false, ver_reportes_campo: true,
  },
  ugr: {
    ver_monitoreo: true, ver_variables: true, ver_focos: true,
    consultar_probabilidad: true, ejecutar_simulacion: false,
    ver_simulaciones: true, generar_reportes: true, gestionar_usuarios: false,
    configuracion: false, ver_bitacora: false,
    reportar_incendio: false, ver_reportes_campo: true,
  },
  brigada: {
    ver_monitoreo: true, ver_variables: true, ver_focos: true,
    consultar_probabilidad: false, ejecutar_simulacion: false,
    ver_simulaciones: false, generar_reportes: false, gestionar_usuarios: false,
    configuracion: false, ver_bitacora: false,
    reportar_incendio: true, ver_reportes_campo: true,
  },
};

// Lo que cada rol DEBE ver. El brigadista es el requisito nuevo: solo Inicio
// y Monitoreo, nada técnico ni administrativo.
const ESPERADO = {
  brigada: ["Inicio", "Monitoreo"],
  analista: ["Inicio", "Monitoreo", "Simulación", "Escenarios", "Historial",
             "Comparación", "Reportes"],
  ugr: ["Inicio", "Monitoreo", "Historial", "Comparación", "Reportes"],
  administrador: null,   // no se fija: su menú es el administrativo
};

let fallos = 0;

for (const rol of Object.keys(MATRIZ)) {
  const m = MATRIZ[rol];
  const puede = (p) => (p === null || p === undefined ? p === null : !!m[p]);

  const visibles = [];
  for (const g of navegacionDe(rol)) {
    for (const it of g.items || []) {
      const perm = PERMISO_DE_PANTALLA[it.pantalla];
      if (perm === undefined) {
        console.log(`  ! ${rol}: la entrada "${it.label}" usa la pantalla ` +
                    `"${it.pantalla}", que no está en PERMISO_DE_PANTALLA`);
        fallos++;
        continue;
      }
      if (puede(perm)) visibles.push(it.label);
    }
  }

  console.log(`\n  ${rol.toUpperCase()}`);
  console.log(`    ve: ${visibles.join(" · ") || "(nada)"}`);

  const esperado = ESPERADO[rol];
  if (!esperado) continue;

  const sobran = visibles.filter((v) => !esperado.includes(v));
  const faltan = esperado.filter((v) => !visibles.includes(v));
  if (sobran.length) { console.log(`    FALLO — le SOBRAN: ${sobran.join(", ")}`); fallos++; }
  if (faltan.length) { console.log(`    FALLO — le FALTAN: ${faltan.join(", ")}`); fallos++; }
  if (!sobran.length && !faltan.length) console.log("    OK");
}

console.log();
if (fallos) {
  console.log(`${fallos} problema(s) en el menú por rol.`);
  process.exit(1);
}
console.log("El menú de cada rol es el que debe ser.");
console.log("Recuerda: esto es lo que se VE. Lo que se PUEDE lo prueba");
console.log("backend_django/pruebas/prueba_brigadista.py contra el servidor.");
