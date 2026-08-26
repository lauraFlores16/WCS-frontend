// ============================================================================
// ARMAZÓN DE LA APLICACIÓN
// ============================================================================
//   ┌──────────────────────────────────────────────────────────────────┐
//   │ BARRA SUPERIOR — marca · contexto · amenaza · tema · sesión      │
//   ├──────┬───────────────────────────────────────────────────────────┤
//   │ MENÚ │                                                           │
//   │ IZQ. │   CONTENIDO DE LA PANTALLA                                │
//   │ 60↔  │   (el mapa, cuando la pantalla es GIS)                    │
//   │ 232  │                                                           │
//   └──────┴───────────────────────────────────────────────────────────┘
//
// El panel derecho NO se monta aquí: es contextual, así que cada pantalla
// decide qué muestra y cuándo se abre (ver nucleo/PanelDeslizable.jsx).
import { useEffect, useState } from "react";
import { Outlet, useLocation } from "react-router-dom";
import BarraSuperior from "./BarraSuperior";
import MenuLateral, { leerPreferencia } from "./MenuLateral";
import { useAuth } from "./AuthContext";
import "./estilos/AppShell.css";

const CONTEXTO_POR_RUTA = {
  // El subtítulo de /inicio depende del rol: el tablero no es el mismo.
  "/inicio": { titulo: "Inicio", sub: "Panel analítico del municipio de Apolo" },
  "/monitoreo": { titulo: "Monitoreo", sub: "Focos de calor, capas y alertas", gis: true },
  "/simulacion": { titulo: "Simulación", sub: "Autómata celular de propagación", gis: true },
  "/panel-control": { titulo: "Escenarios de simulación", sub: "Configuración del escenario" },
  "/historial": { titulo: "Historial", sub: "Simulaciones guardadas" },
  "/comparacion": { titulo: "Comparación", sub: "Contraste con eventos históricos" },
  "/reportes": { titulo: "Reportes", sub: "Informes generados" },
  "/usuarios": { titulo: "Gestión de usuarios", sub: "Cuentas del sistema" },
  "/roles": { titulo: "Roles y permisos", sub: "Matriz de acceso por rol" },
  "/configuracion": { titulo: "Configuración", sub: "Ajustes del sistema" },
  "/bitacora": { titulo: "Bitácora", sub: "Registro de actividad" },
};

export default function AppLayout() {
  const { pathname } = useLocation();
  const { usuario } = useAuth();
  const [menuAbierto, setMenuAbierto] = useState(leerPreferencia);

  const esAdmin = usuario?.rol === "administrador";
  let ctx = CONTEXTO_POR_RUTA[pathname] || { titulo: "SISPROP", sub: null };
  if (esAdmin && pathname === "/inicio") {
    ctx = { titulo: "Inicio", sub: "Estado del sistema y actividad" };
  }

  useEffect(() => { document.title = `${ctx.titulo} · SISPROP`; }, [ctx.titulo]);

  return (
    <div className={`shell${menuAbierto ? " menu-abierto" : ""}`}>
      <BarraSuperior
        titulo={ctx.titulo}
        subtitulo={ctx.sub}
        // El anillo de amenaza mide riesgo operativo: al Administrador no le
        // corresponde y además consultaría datos que no tiene por qué ver.
        mostrarAmenaza={!esAdmin}
      />
      <div className="shell-cuerpo">
        <MenuLateral abierto={menuAbierto} setAbierto={setMenuAbierto} />
        <main className={`shell-contenido${ctx.gis ? " es-gis" : ""}`}>
          <Outlet />
        </main>
      </div>
    </div>
  );
}
