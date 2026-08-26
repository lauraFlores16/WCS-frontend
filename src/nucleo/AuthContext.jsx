// ============================================================================
// CONTEXTO DE AUTENTICACIÓN — sesión por cookie httpOnly, sin localStorage
// ============================================================================
// Antes el token y el perfil vivían en localStorage. Eso tenía dos problemas:
// cualquier script en la página podía leer el token (riesgo de XSS), y el
// "cierre de sesión" solo borraba el navegador, sin avisar al servidor.
//
// Ahora:
//   · El token va en una cookie httpOnly que el JavaScript NO puede leer. La
//     pone y la quita el backend; el navegador la envía sola en cada petición.
//   · Al arrancar, se pregunta a /api/auth/yo QUIÉN es el usuario. Si la cookie
//     es válida, responde el perfil; si no, se queda sin sesión. Así el estado
//     de "quién soy" se reconstruye del servidor, no de una copia local.
//   · logout() llama al servidor para revocar la sesión de verdad.
// ============================================================================
import { createContext, useContext, useState, useCallback, useEffect } from "react";
import { authApi } from "./api/auth";

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [usuario, setUsuario] = useState(null);
  // `iniciando` cubre el primer chequeo de sesión: hasta que sepamos si hay
  // cookie válida, no se decide si mostrar el login o la app.
  const [iniciando, setIniciando] = useState(true);
  const [cargando, setCargando] = useState(false);
  const [error, setError] = useState(null);

  // Al montar: ¿hay una sesión viva? (la cookie viaja sola)
  useEffect(() => {
    let vivo = true;
    authApi.yo()
      .then(({ data }) => { if (vivo) setUsuario({ usuario_id: data.usuario_id, nombre: data.nombre, rol: data.rol }); })
      .catch(() => { if (vivo) setUsuario(null); })
      .finally(() => { if (vivo) setIniciando(false); });
    return () => { vivo = false; };
  }, []);

  const login = useCallback(async (email, password) => {
    setCargando(true);
    setError(null);
    try {
      const { data } = await authApi.login(email, password);
      const perfil = { usuario_id: data.usuario_id, nombre: data.nombre, rol: data.rol };
      // No se guarda nada en localStorage: la cookie httpOnly ya quedó puesta
      // por el backend en esta misma respuesta.
      setUsuario(perfil);
      return perfil;
    } catch (e) {
      const mensaje = e.response?.data?.detail || "No se pudo iniciar sesión";
      setError(mensaje);
      throw new Error(mensaje);
    } finally {
      setCargando(false);
    }
  }, []);

  const logout = useCallback(async () => {
    try { await authApi.logout(); } catch { /* aunque falle la red, cerramos en la interfaz */ }
    setUsuario(null);
  }, []);

  return (
    <AuthContext.Provider value={{ usuario, login, logout, cargando, error, iniciando }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth debe usarse dentro de <AuthProvider>");
  return ctx;
}

// Mapeo pantalla -> roles permitidos. Espejo de los guardas del backend.
// Si cambias permisos, actualiza este objeto Y la ruta correspondiente en el backend.
export const PERMISOS_PANTALLA = {
  inicio: ["analista", "ugr", "brigada", "administrador"],
  simulacion: ["analista", "ugr", "brigada", "administrador"],
  datosEspaciales: ["analista", "ugr", "brigada", "administrador"],
  monitoreo: ["analista", "ugr", "brigada", "administrador"],
  panelControl: ["analista", "ugr"],
  historialEscenarios: ["analista", "ugr"],
  comparacion: ["analista", "ugr"],
  gestionUsuarios: ["administrador"],
};

export function tieneAcceso(rol, pantalla) {
  return PERMISOS_PANTALLA[pantalla]?.includes(rol);
}
