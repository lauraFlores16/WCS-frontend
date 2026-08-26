// ============================================================================
// CATÁLOGO DE ICONOS
// ============================================================================
// Un único sitio para todos los iconos de la interfaz. Antes había emojis
// (📄, 🔥) y glifos de texto (▶, ↻, ◀, ▴, ✓, →) repartidos por las pantallas:
// se ven distintos en cada sistema operativo, no heredan el color del tema y
// no dan aspecto formal.
//
// Todos son SVG de trazo de 24×24 con `stroke="currentColor"`, así que:
//   · heredan el color del texto donde se usen (modo claro y oscuro, estados
//     de alerta) sin tener que declarar nada;
//   · escalan sin perder nitidez;
//   · no dependen de la red ni de ninguna fuente de iconos.
//
// ── CÓMO SUSTITUIRLOS POR ICONOS DE FLATICON ──────────────────────────────
// Descarga el icono en SVG, ábrelo y copia el contenido de su <path d="…">.
// Después reemplaza la entrada correspondiente de TRAZOS:
//
//     monitoreo: "M9 20l-6-3V4l6 3 6-3 6 3v13l-6-3-6 3z",   ← pega aquí
//
// Si el SVG de Flaticon viene relleno en vez de trazo (lo habitual en sus
// packs), añade su nombre a RELLENOS para que se pinte con `fill` y sin
// `stroke`. Recuerda que la licencia gratuita de Flaticon exige atribución:
// el sitio adecuado es el pie de la pantalla de Configuración.
// ============================================================================

// Iconos que se pintan rellenos en vez de con trazo (ver nota de arriba).
const RELLENOS = new Set([]);

const TRAZOS = {
  // --- Navegación / módulos -------------------------------------------------
  dashboard: "M3 13h8V3H3zM13 21h8V11h-8zM13 3v6h8V3zM3 21h8v-6H3z",
  monitoreo: "M9 20l-6-3V4l6 3 6-3 6 3v13l-6-3-6 3zM9 4v13M15 7v13",
  simulacion: "M5 3l14 9-14 9V3z",
  escenarios: "M4 6h10M18 6h2M4 12h2M8 12h12M4 18h14M20 18h0M6 4v4M16 10v4M6 16v4",
  historial: "M3 12a9 9 0 109-9 9 9 0 00-7 3.2M3 4v5h5M12 7v5l4 2",
  comparacion: "M9 3v18M15 3v18M4 7h4M4 12h4M4 17h4M16 7h4M16 12h4M16 17h4",
  reportes: "M6 2h9l5 5v15H6zM15 2v5h5M9 13h6M9 17h6",
  usuarios: "M17 21v-2a4 4 0 00-4-4H7a4 4 0 00-4 4v2M11 11a4 4 0 100-8 4 4 0 000 8zM23 21v-2a4 4 0 00-3-3.87M16 3.13a4 4 0 010 7.75",
  roles: "M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z",
  bitacora: "M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8zM14 2v6h6M16 13H8M16 17H8M10 9H8",
  configuracion: "M12 15a3 3 0 100-6 3 3 0 000 6zM19.4 15a1.65 1.65 0 00.33 1.82l.06.06a2 2 0 11-2.83 2.83l-.06-.06a1.65 1.65 0 00-1.82-.33 1.65 1.65 0 00-1 1.51V21a2 2 0 01-4 0v-.09A1.65 1.65 0 009 19.4a1.65 1.65 0 00-1.82.33l-.06.06a2 2 0 11-2.83-2.83l.06-.06a1.65 1.65 0 00.33-1.82 1.65 1.65 0 00-1.51-1H3a2 2 0 010-4h.09A1.65 1.65 0 004.6 9a1.65 1.65 0 00-.33-1.82l-.06-.06a2 2 0 112.83-2.83l.06.06a1.65 1.65 0 001.82.33H9a1.65 1.65 0 001-1.51V3a2 2 0 014 0v.09a1.65 1.65 0 001 1.51 1.65 1.65 0 001.82-.33l.06-.06a2 2 0 112.83 2.83l-.06.06a1.65 1.65 0 00-.33 1.82V9a1.65 1.65 0 001.51 1H21a2 2 0 010 4h-.09a1.65 1.65 0 00-1.51 1z",
  capas: "M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5",
  datos: "M21 5c0 1.66-4 3-9 3S3 6.66 3 5s4-3 9-3 9 1.34 9 3zM3 5v14c0 1.66 4 3 9 3s9-1.34 9-3V5M3 12c0 1.66 4 3 9 3s9-1.34 9-3",

  // --- Acciones -------------------------------------------------------------
  menu: "M3 6h18M3 12h18M3 18h18",
  cerrar: "M18 6L6 18M6 6l12 12",
  refrescar: "M21 12a9 9 0 11-3-6.7M21 3v6h-6",
  reproducir: "M6 4l14 8-14 8V4z",
  pausa: "M8 4v16M16 4v16",
  descargar: "M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4M7 10l5 5 5-5M12 15V3",
  imprimir: "M6 9V2h12v7M6 18H4a2 2 0 01-2-2v-5a2 2 0 012-2h16a2 2 0 012 2v5a2 2 0 01-2 2h-2M6 14h12v8H6z",
  buscar: "M11 19a8 8 0 100-16 8 8 0 000 16zM21 21l-4.35-4.35",
  filtro: "M22 3H2l8 9.46V19l4 2v-8.54z",
  editar: "M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7M18.5 2.5a2.12 2.12 0 013 3L12 15l-4 1 1-4z",
  anadir: "M12 5v14M5 12h14",
  salir: "M9 21H5a2 2 0 01-2-2V5a2 2 0 012-2h4M16 17l5-5-5-5M21 12H9",

  // --- Direcciones ----------------------------------------------------------
  izquierda: "M15 18l-6-6 6-6",
  derecha: "M9 18l6-6-6-6",
  arriba: "M18 15l-6-6-6 6",
  abajo: "M6 9l6 6 6-6",
  flecha: "M5 12h14M13 6l6 6-6 6",

  // --- Estado ---------------------------------------------------------------
  verificado: "M20 6L9 17l-5-5",
  aviso: "M10.3 3.9L1.8 18a2 2 0 001.7 3h17a2 2 0 001.7-3L14.7 3.9a2 2 0 00-3.4 0zM12 9v4M12 17h.01",
  informacion: "M12 22a10 10 0 100-20 10 10 0 000 20zM12 16v-4M12 8h.01",
  punto: "M12 18a6 6 0 100-12 6 6 0 000 12z",
  reloj: "M12 22a10 10 0 100-20 10 10 0 000 20zM12 6v6l4 2",
  calendario: "M19 4H5a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2V6a2 2 0 00-2-2zM16 2v4M8 2v4M3 10h18",

  // --- Dominio: incendios y variables ambientales ---------------------------
  foco: "M12 2s5 4.5 5 10a5 5 0 01-10 0c0-1.5.8-2.6 1.5-3.5.3 1 1 1.5 1.5 1.5-.3-2 .5-4 2-6z",
  ubicacion: "M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0118 0zM12 13a3 3 0 100-6 3 3 0 000 6z",
  temperatura: "M14 14.76V3.5a2.5 2.5 0 00-5 0v11.26a4.5 4.5 0 105 0z",
  humedad: "M12 2.7l5.2 5.2a7.35 7.35 0 11-10.4 0z",
  viento: "M9.6 4.6A2 2 0 1111 8H2M12.6 19.4A2 2 0 1014 16H2M17.7 7.7A2.5 2.5 0 1119.5 12H2",
  lluvia: "M16 13v6M8 13v6M12 15v6M20 16.6A5 5 0 0018 7h-1.3A8 8 0 104 15.2",
  vegetacion: "M11 20A7 7 0 019.8 6.1C15.5 5 17 4.5 19 2c1 2 2 4.2 2 8 0 5.5-4.8 10-10 10zM2 21c0-3 1.9-5.6 4.5-6.8",
  elevacion: "M8 3l4 8 5-5 5 14H2z",
  pendiente: "M3 21h18M3 21L21 7M3 21V9",
  probabilidad: "M12 2v4M12 18v4M2 12h4M18 12h4M12 8a4 4 0 100 8 4 4 0 000-8z",
  grafica: "M4 20V10M11 20V4M18 20v-7",
  mapa: "M1 6v16l7-4 8 4 7-4V2l-7 4-8-4-7 4zM8 2v16M16 6v16",

  // --- Tema -----------------------------------------------------------------
  sol: "M12 16a4 4 0 100-8 4 4 0 000 8zM12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4",
  luna: "M21 12.8A9 9 0 1111.2 3 7 7 0 0021 12.8z",

  // --- Fase 2: historial, usuarios, bitácora y configuración ----------------
  basura: "M3 6h18M8 6V4a1 1 0 011-1h6a1 1 0 011 1v2M19 6l-1 14a2 2 0 01-2 2H8a2 2 0 01-2-2L5 6M10 11v6M14 11v6",
  candado: "M5 11h14a1 1 0 011 1v8a1 1 0 01-1 1H5a1 1 0 01-1-1v-8a1 1 0 011-1zM8 11V7a4 4 0 018 0v4",
  ordenar: "M7 4v16M4 17l3 3 3-3M17 20V4M14 7l3-3 3 3",
  llave: "M21 2l-2 2M11.4 11.6a5 5 0 11-7 7 5 5 0 017-7zM15 7l4 4M18 4l3 3",
  servidor: "M4 4h16v6H4zM4 14h16v6H4zM8 7h.01M8 17h.01",
  tabla: "M3 5h18v14H3zM3 10h18M9 10v9M15 10v9",
  enlace: "M10 13a5 5 0 007.5.5l3-3a5 5 0 00-7-7l-1.7 1.7M14 11a5 5 0 00-7.5-.5l-3 3a5 5 0 007 7l1.7-1.7",
  restablecer: "M3 12a9 9 0 109-9 9 9 0 00-7 3.2M3 4v5h5",
};

export const NOMBRES_ICONO = Object.keys(TRAZOS);

/**
 * @param {string} nombre  clave de TRAZOS
 * @param {number} tam     lado en px (24 por defecto)
 * @param {number} grosor  grosor del trazo
 */
export default function Icono({ nombre, tam = 18, grosor = 1.8, className = "", ...resto }) {
  const d = TRAZOS[nombre];
  if (!d) {
    // Un icono que no existe no debe romper la pantalla ni dejar un hueco mudo
    if (import.meta.env?.DEV) console.warn(`[Icono] no existe "${nombre}"`);
    return null;
  }
  const relleno = RELLENOS.has(nombre);
  return (
    <svg
      width={tam} height={tam} viewBox="0 0 24 24"
      fill={relleno ? "currentColor" : "none"}
      stroke={relleno ? "none" : "currentColor"}
      strokeWidth={relleno ? undefined : grosor}
      strokeLinecap="round" strokeLinejoin="round"
      className={`icono ${className}`.trim()}
      aria-hidden="true" focusable="false"
      {...resto}
    >
      <path d={d} />
    </svg>
  );
}
