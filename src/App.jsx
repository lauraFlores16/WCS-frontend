import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider, useAuth } from "./nucleo/AuthContext";
import { EscenarioProvider } from "./nucleo/EscenarioContext";
import { PermisosProvider } from "./nucleo/PermisosContext";
import ProtectedRoute from "./nucleo/ProtectedRoute";
import AppLayout from "./nucleo/AppLayout";

import Login from "./pantallas/login/Login";
import Inicio from "./pantallas/inicio/Inicio";
import Simulacion from "./pantallas/simulacion/Simulacion";
import Monitoreo from "./pantallas/monitoreo/Monitoreo";
import Error404 from "./pantallas/error/Error404";
import PanelControl from "./pantallas/panel-control/PanelControl";
import HistorialEscenarios from "./pantallas/historial/HistorialEscenarios";
import Comparacion from "./pantallas/comparacion/Comparacion";
import Reportes from "./pantallas/reportes/Reportes";
import GestionUsuarios from "./pantallas/usuarios/GestionUsuarios";
import RolesPermisos from "./pantallas/usuarios/RolesPermisos";
import Configuracion from "./pantallas/usuarios/Configuracion";
import Bitacora from "./pantallas/usuarios/Bitacora";

function RutaLogin() {
  const { usuario, iniciando } = useAuth();

  if (iniciando) return null;

  if (usuario) {
    return <Navigate to="/inicio" replace />;
  }

  return <Login />;
}

export default function App() {
  return (
    <AuthProvider>
      <PermisosProvider>
        <EscenarioProvider>
          <BrowserRouter>
            <Routes>

              {/* Login */}
              <Route path="/login" element={<RutaLogin />} />

              {/* Pantallas protegidas */}
              <Route
                element={
                  <ProtectedRoute>
                    <AppLayout />
                  </ProtectedRoute>
                }
              >

                {/* Inicio */}
                <Route
                  path="/inicio"
                  element={
                    <ProtectedRoute pantalla="inicio">
                      <Inicio />
                    </ProtectedRoute>
                  }
                />

                {/* Simulación */}
                <Route
                  path="/simulacion"
                  element={
                    <ProtectedRoute pantalla="simulacion">
                      <Simulacion />
                    </ProtectedRoute>
                  }
                />

                {/* Datos espaciales fusionados con Dashboard */}
                <Route
                  path="/datos-espaciales"
                  element={<Navigate to="/inicio" replace />}
                />

                {/* Monitoreo */}
                <Route
                  path="/monitoreo"
                  element={
                    <ProtectedRoute pantalla="monitoreo">
                      <Monitoreo />
                    </ProtectedRoute>
                  }
                />

                {/* Panel de control */}
                <Route
                  path="/panel-control"
                  element={
                    <ProtectedRoute pantalla="panelControl">
                      <PanelControl />
                    </ProtectedRoute>
                  }
                />

                {/* Historial */}
                <Route
                  path="/historial"
                  element={
                    <ProtectedRoute pantalla="historialEscenarios">
                      <HistorialEscenarios />
                    </ProtectedRoute>
                  }
                />

                {/* Comparación */}
                <Route
                  path="/comparacion"
                  element={
                    <ProtectedRoute pantalla="comparacion">
                      <Comparacion />
                    </ProtectedRoute>
                  }
                />

                {/* Reportes */}
                <Route
                  path="/reportes"
                  element={
                    <ProtectedRoute pantalla="reportes">
                      <Reportes />
                    </ProtectedRoute>
                  }
                />

                {/* Gestión de usuarios */}
                <Route
                  path="/usuarios"
                  element={
                    <ProtectedRoute pantalla="gestionUsuarios">
                      <GestionUsuarios />
                    </ProtectedRoute>
                  }
                />

                {/* Roles */}
                <Route
                  path="/roles"
                  element={
                    <ProtectedRoute pantalla="gestionUsuarios">
                      <RolesPermisos />
                    </ProtectedRoute>
                  }
                />

                {/* Configuración */}
                <Route
                  path="/configuracion"
                  element={
                    <ProtectedRoute pantalla="configuracion">
                      <Configuracion />
                    </ProtectedRoute>
                  }
                />

                {/* Bitácora */}
                <Route
                  path="/bitacora"
                  element={
                    <ProtectedRoute pantalla="bitacora">
                      <Bitacora />
                    </ProtectedRoute>
                  }
                />

              </Route>

              {/* ERROR 404 */}
              <Route path="*" element={<Error404 />} />

            </Routes>
          </BrowserRouter>
        </EscenarioProvider>
      </PermisosProvider>
    </AuthProvider>
  );
}