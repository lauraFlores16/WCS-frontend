// ============================================================================
// MAPA DE NAVEGACIÓN POR ROL
// ============================================================================
// Un solo sitio donde vive la estructura del menú. Antes la lista estaba
// dentro del componente de navegación y era la misma para todos; ahora hay dos
// experiencias distintas, que es lo que pide el sistema:
//
//   ANALISTA        trabaja sobre el mapa: análisis, monitoreo y simulación.
//   ADMINISTRADOR   administra el sistema: usuarios, actividad y configuración.
//                   NO entra al mapa operativo, ni a monitoreo, ni a simulación.
//
// Ojo: esto decide lo que se DIBUJA. Que un rol no pueda ENTRAR lo deciden la
// matriz de permisos (PermisosContext + ProtectedRoute) y, sobre todo, el
// backend, que rechaza las rutas operativas. Esconder el botón no es control
// de acceso.
// ============================================================================

/**
 * `pantalla` enlaza con PERMISO_DE_PANTALLA (PermisosContext) para saber qué
 * permiso habilita cada entrada. `icono` es una clave de Icono.jsx.
 */
export const NAV_ANALISTA = [
  {
    titulo: null,
    items: [
      { to: "/inicio", label: "Inicio", pantalla: "inicio", icono: "dashboard",
        descripcion: "Dashboard analítico: datos espaciales, variables GEE y modelo" },
    ],
  },
  {
    titulo: "Análisis operativo",
    items: [
      { to: "/monitoreo", label: "Monitoreo", pantalla: "monitoreo", icono: "monitoreo",
        descripcion: "Mapa, focos de calor, capas y alertas" },
      { to: "/simulacion", label: "Simulación", pantalla: "simulacion", icono: "simulacion",
        descripcion: "Autómata celular y propagación" },
      { to: "/panel-control", label: "Escenarios", pantalla: "panelControl", icono: "escenarios",
        descripcion: "Escenarios de simulación" },
    ],
  },
  {
    titulo: "Resultados",
    items: [
      { to: "/historial", label: "Historial", pantalla: "historialEscenarios", icono: "historial",
        descripcion: "Simulaciones guardadas" },
      { to: "/comparacion", label: "Comparación", pantalla: "comparacion", icono: "comparacion",
        descripcion: "Contraste con eventos históricos" },
      { to: "/reportes", label: "Reportes", pantalla: "reportes", icono: "reportes",
        descripcion: "Informes generados" },
    ],
  },
];

export const NAV_ADMINISTRADOR = [
  {
    titulo: null,
    items: [
      { to: "/inicio", label: "Inicio", pantalla: "inicio", icono: "dashboard",
        descripcion: "Estado del sistema y actividad" },
    ],
  },
  {
    titulo: "Administración",
    items: [
      { to: "/usuarios", label: "Usuarios", pantalla: "gestionUsuarios", icono: "usuarios",
        descripcion: "Alta, edición y estado de las cuentas" },
      { to: "/roles", label: "Roles y permisos", pantalla: "gestionUsuarios", icono: "roles",
        descripcion: "Matriz de acceso por rol" },
      { to: "/reportes", label: "Reportes", pantalla: "reportes", icono: "reportes",
        descripcion: "Informes generados en el sistema" },
      { to: "/bitacora", label: "Bitácora", pantalla: "bitacora", icono: "bitacora",
        descripcion: "Registro de actividad" },
      { to: "/configuracion", label: "Configuración", pantalla: "configuracion", icono: "configuracion",
        descripcion: "Ajustes del sistema" },
    ],
  },
];

/** Devuelve la estructura de menú que le toca a un rol. */
export function navegacionDe(rol) {
  return rol === "administrador" ? NAV_ADMINISTRADOR : NAV_ANALISTA;
}

/**
 * Pantallas puramente operativas (mapa, monitoreo, simulación). El
 * Administrador no entra aquí ni por URL directa.
 */
export const PANTALLAS_OPERATIVAS = new Set([
  "monitoreo", "simulacion", "panelControl", "comparacion",
  "historialEscenarios", "datosEspaciales",
]);
