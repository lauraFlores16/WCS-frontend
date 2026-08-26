import { Navigate } from "react-router-dom";
import { useAuth } from "./AuthContext";
import { usePermisos } from "./PermisosContext";

// Protege una ruta según la MATRIZ DE PERMISOS (no un rol fijo). `pantalla` es
// la clave del mapa PERMISO_DE_PANTALLA; si el rol del usuario no tiene el
// permiso correspondiente, se muestra "acceso restringido".
export default function ProtectedRoute({ pantalla, children }) {
  const { usuario, iniciando } = useAuth();
  const { puedeVerPantalla, cargando } = usePermisos();

  // Mientras se comprueba la sesión o se cargan los permisos, no decidimos nada
  // (evita parpadeos hacia /login o hacia "acceso restringido" al recargar).
  if (iniciando || (usuario && cargando)) {
    return (
      <div className="page" style={{ display: "grid", placeItems: "center", minHeight: "60vh" }}>
        <p className="text-muted">Comprobando acceso…</p>
      </div>
    );
  }

  if (!usuario) return <Navigate to="/login" replace />;

  if (!puedeVerPantalla(pantalla)) {
    return (
      <div className="page">
        <div className="panel" style={{ padding: 28, maxWidth: 480 }}>
          <h2 style={{ marginBottom: 8 }}>Acceso restringido</h2>
          <p className="text-muted">
            Tu rol (<span className="mono">{usuario.rol}</span>) no tiene permiso para ver{" "}
            {pantalla || "esta sección"}. El administrador puede cambiar esto en Roles y permisos.
          </p>
        </div>
      </div>
    );
  }

  return children;
}
