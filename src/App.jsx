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
  if (iniciando) return null; // aún comprobando la cookie; no mostramos nada
  if (usuario) return <Navigate to="/inicio" replace />;
  return <Login />;
}

export default function App() {
  return (
    <AuthProvider>
      <PermisosProvider>
      <EscenarioProvider>
        <BrowserRouter>
          <Routes>
            <Route path="/login" element={<RutaLogin />} />
            <Route element={<ProtectedRoute><AppLayout /></ProtectedRoute>}>
              {/* Pantalla de inicio (dashboard) */}
              <Route path="/inicio"
                element={<ProtectedRoute pantalla="inicio"><Inicio /></ProtectedRoute>} />
              {/* Simulación de autómatas (pantalla dedicada) */}
              <Route path="/simulacion"
                element={<ProtectedRoute pantalla="simulacion"><Simulacion /></ProtectedRoute>} />
              {/* P1+P2 — Datos espaciales y variables GEE: fusionados dentro del
                  Dashboard. La ruta se conserva redirigiendo para no romper
                  enlaces guardados ni marcadores del navegador. */}
              <Route path="/datos-espaciales" element={<Navigate to="/inicio" replace />} />
              {/* P3+P4+P5+P6: Monitoreo (probabilidad XGBoost + propagación autómata + alertas) */}
              <Route path="/monitoreo"
                element={<ProtectedRoute pantalla="monitoreo"><Monitoreo /></ProtectedRoute>} />
              {/* P5: Panel de control / configurar escenario */}
              <Route path="/panel-control"
                element={<ProtectedRoute pantalla="panelControl"><PanelControl /></ProtectedRoute>} />
              {/* P5: Historial de escenarios simulados */}
              <Route path="/historial"
                element={<ProtectedRoute pantalla="historialEscenarios"><HistorialEscenarios /></ProtectedRoute>} />
              {/* Comparación con eventos históricos + reporte */}
              <Route path="/comparacion"
                element={<ProtectedRoute pantalla="comparacion"><Comparacion /></ProtectedRoute>} />
              {/* Reportes generados (lo consultan Analista y Administrador) */}
              <Route path="/reportes"
                element={<ProtectedRoute pantalla="reportes"><Reportes /></ProtectedRoute>} />
              {/* Módulo 1 · Gestión de usuarios (CRUD) — solo administrador */}
              <Route path="/usuarios"
                element={<ProtectedRoute pantalla="gestionUsuarios"><GestionUsuarios /></ProtectedRoute>} />
              <Route path="/roles"
                element={<ProtectedRoute pantalla="gestionUsuarios"><RolesPermisos /></ProtectedRoute>} />
              <Route path="/configuracion"
                element={<ProtectedRoute pantalla="configuracion"><Configuracion /></ProtectedRoute>} />
              <Route path="/bitacora"
                element={<ProtectedRoute pantalla="bitacora"><Bitacora /></ProtectedRoute>} />
            </Route>
            <Route path="*" element={<Navigate to="/inicio" replace />} />
          </Routes>
        </BrowserRouter>
      </EscenarioProvider>
      </PermisosProvider>
    </AuthProvider>
  );
}
