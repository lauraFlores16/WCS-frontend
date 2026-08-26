// ============================================================================
// CONTEXTO DE PERMISOS
// ============================================================================
// Carga la matriz de permisos del backend (la que edita el Administrador en
// Roles y Permisos) y expone `puede(permiso)` para el rol del usuario actual.
//
// CAMBIO IMPORTANTE: antes había aquí un atajo —
//
//     if (usuario.rol === "administrador") return true;  // el admin siempre puede
//
// — que saltaba la matriz entera. Con él, el Administrador veía y podía TODO,
// incluidos el mapa operativo, el monitoreo y la simulación. Eso contradice la
// separación de perfiles: el Administrador administra el sistema, no opera el
// GIS. El atajo se quitó y ahora también él pasa por la matriz.
//
// Y que quede claro: esto decide lo que se DIBUJA. El control de acceso real
// lo hace el backend, que rechaza las rutas operativas a quien no tiene el
// permiso. Esconder un botón no es seguridad.
import { createContext, useContext, useEffect, useState, useCallback } from "react";
import { useAuth } from "./AuthContext";
import { pedir } from "../local/cliente";

const PermisosContext = createContext(null);

// Mapa pantalla → permiso que la habilita (Módulo 1 §4.1).
export const PERMISO_DE_PANTALLA = {
  inicio: null,                         // el inicio siempre es visible
  monitoreo: "ver_monitoreo",
  datosEspaciales: "ver_variables",
  simulacion: "ejecutar_simulacion",
  panelControl: "ejecutar_simulacion",
  historialEscenarios: "ver_simulaciones",
  comparacion: "ver_simulaciones",
  reportes: "generar_reportes",
  gestionUsuarios: "gestionar_usuarios",
  configuracion: "configuracion",
  bitacora: "ver_bitacora",
};

// Respaldo por si la matriz no llega (backend caído, red cortada). Solo evita
// que la interfaz se quede vacía y sin salida; NO concede nada de verdad,
// porque cada petición la sigue validando el servidor. Debe reflejar
// api/almacen/permisos_defecto.py.
const MATRIZ_RESPALDO = {
  administrador: {
    gestionar_usuarios: true, configuracion: true, ver_bitacora: true,
    generar_reportes: true, ver_monitoreo: false, ver_variables: false,
    ver_focos: false, consultar_probabilidad: false,
    ejecutar_simulacion: false, ver_simulaciones: false,
  },
  analista: {
    ver_monitoreo: true, ver_variables: true, ver_focos: true,
    consultar_probabilidad: true, ejecutar_simulacion: true,
    ver_simulaciones: true, generar_reportes: true,
    gestionar_usuarios: false, configuracion: false, ver_bitacora: false,
  },
};

export function PermisosProvider({ children }) {
  const { usuario } = useAuth();
  const [matriz, setMatriz] = useState(null);
  const [cargando, setCargando] = useState(true);
  const [usandoRespaldo, setUsandoRespaldo] = useState(false);

  const recargar = useCallback(() => {
    if (!usuario) { setMatriz(null); setCargando(false); return; }
    setCargando(true);
    pedir("/api/permisos")
      .then((m) => { setMatriz(m); setUsandoRespaldo(false); })
      .catch(() => {
        console.warn("[permisos] no se pudo cargar la matriz; se usa el respaldo local");
        setMatriz(null);
        setUsandoRespaldo(true);
      })
      .finally(() => setCargando(false));
  }, [usuario]);

  useEffect(() => { recargar(); }, [recargar]);

  const puede = useCallback((permiso) => {
    if (!permiso) return true;                 // pantallas sin permiso asociado
    if (!usuario) return false;
    const efectiva = matriz || (usandoRespaldo ? MATRIZ_RESPALDO : null);
    if (!efectiva) return false;               // aún cargando: no se decide
    return Boolean(efectiva[usuario.rol]?.[permiso]);
  }, [usuario, matriz, usandoRespaldo]);

  const puedeVerPantalla = useCallback(
    (pantalla) => puede(PERMISO_DE_PANTALLA[pantalla]),
    [puede],
  );

  const esAdministrador = usuario?.rol === "administrador";

  return (
    <PermisosContext.Provider
      value={{ matriz, cargando, puede, puedeVerPantalla, recargar, esAdministrador }}>
      {children}
    </PermisosContext.Provider>
  );
}

export function usePermisos() {
  const ctx = useContext(PermisosContext);
  if (!ctx) throw new Error("usePermisos debe usarse dentro de <PermisosProvider>");
  return ctx;
}
