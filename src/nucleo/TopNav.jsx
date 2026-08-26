// ============================================================================
// NAVEGACIÓN SUPERIOR
// ============================================================================
// Sustituye al Sidebar izquierdo (que queda en Sidebar_anterior.jsx.bak).
//
// El motivo no es estético: la pantalla de Monitoreo necesita los DOS laterales
// —alertas a la izquierda, decisiones a la derecha— y el mapa en medio, lo más
// grande posible. Un menú vertical de 248 px se comía justo el espacio que
// ahora ocupan las alertas.
//
// Las once pantallas no caben cómodas en una fila, así que se reparten:
//   · OPERACIÓN (siempre visibles): lo que se usa a diario.
//   · ADMINISTRACIÓN (desplegable): usuarios, roles, configuración, bitácora.
// Qué ve cada quien lo sigue decidiendo la matriz de permisos, igual que antes.
import { useEffect, useRef, useState } from "react";
import { NavLink, useLocation } from "react-router-dom";
import { useAuth } from "./AuthContext";
import { usePermisos } from "./PermisosContext";
import { useTema } from "./TemaContext";
import MenuDesplegable from "./MenuDesplegable";
import ThreatRing from "./ThreatRing";
import "./estilos/AppShell.css";

// Pantallas todavía sin ruta en el backend.
const PANTALLAS_SIN_BACKEND = ["reportes"];

// `corto` es lo que se ve en la barra; `label` queda como tooltip.
const OPERACION = [
  { to: "/inicio", corto: "Inicio", label: "Panel principal", pantalla: "inicio", icon: "home" },
  { to: "/datos-espaciales", corto: "Datos", label: "P1·P2 — Datos espaciales", pantalla: "datosEspaciales", icon: "layers" },
  { to: "/monitoreo", corto: "Monitoreo", label: "P3·P4·P6 — Monitoreo", pantalla: "monitoreo", icon: "map" },
  { to: "/simulacion", corto: "Simulación", label: "Simulación de autómatas", pantalla: "simulacion", icon: "play" },
  { to: "/panel-control", corto: "Escenario", label: "P5 — Panel de control", pantalla: "panelControl", icon: "sliders" },
  { to: "/historial", corto: "Historial", label: "Historial de escenarios", pantalla: "historialEscenarios", icon: "history" },
  { to: "/comparacion", corto: "Comparación", label: "Comparación histórica", pantalla: "comparacion", icon: "compare" },
];

const ADMINISTRACION = [
  { to: "/usuarios", corto: "Gestión de usuarios", label: "Módulo 1 — Gestión de usuarios", pantalla: "gestionUsuarios", icon: "users" },
  { to: "/roles", corto: "Roles y permisos", label: "Roles y permisos", pantalla: "gestionUsuarios", icon: "shield" },
  { to: "/configuracion", corto: "Configuración", label: "Configuración del sistema", pantalla: "configuracion", icon: "settings" },
  { to: "/bitacora", corto: "Bitácora", label: "Bitácora de actividad", pantalla: "bitacora", icon: "log" },
];

const ICONS = {
  home: "M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2z M9 22V12h6v10",
  play: "M5 3l14 9-14 9V3z",
  shield: "M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z",
  settings: "M12 15a3 3 0 100-6 3 3 0 000 6zM19.4 15a1.65 1.65 0 00.33 1.82l.06.06a2 2 0 11-2.83 2.83l-.06-.06a1.65 1.65 0 00-1.82-.33 1.65 1.65 0 00-1 1.51V21a2 2 0 01-4 0v-.09A1.65 1.65 0 009 19.4a1.65 1.65 0 00-1.82.33l-.06.06a2 2 0 11-2.83-2.83l.06-.06a1.65 1.65 0 00.33-1.82 1.65 1.65 0 00-1.51-1H3a2 2 0 010-4h.09A1.65 1.65 0 004.6 9a1.65 1.65 0 00-.33-1.82l-.06-.06a2 2 0 112.83-2.83l.06.06a1.65 1.65 0 001.82.33H9a1.65 1.65 0 001-1.51V3a2 2 0 014 0v.09a1.65 1.65 0 001 1.51 1.65 1.65 0 001.82-.33l.06-.06a2 2 0 112.83 2.83l-.06.06a1.65 1.65 0 00-.33 1.82V9a1.65 1.65 0 001.51 1H21a2 2 0 010 4h-.09a1.65 1.65 0 00-1.51 1z",
  log: "M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8zM14 2v6h6M16 13H8M16 17H8M10 9H8",
  compare: "M9 3v18M15 3v18M4 7h4M4 12h4M4 17h4M16 7h4M16 12h4M16 17h4",
  layers: "M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5",
  map: "M9 20l-6-3V4l6 3 6-3 6 3v13l-6-3-6 3zM9 4v13M15 7v13",
  sliders: "M4 6h10M18 6h2M4 12h2M8 12h12M4 18h14M20 18h0 M6 4v4M16 10v4M6 16v4",
  history: "M3 12a9 9 0 109-9 9 9 0 00-7 3.2M3 4v5h5M12 7v5l4 2",
  users: "M17 21v-2a4 4 0 00-4-4H7a4 4 0 00-4 4v2M11 11a4 4 0 100-8 4 4 0 000 8zM23 21v-2a4 4 0 00-3-3.87M16 3.13a4 4 0 010 7.75",
};

function Icon({ name, tam = 16 }) {
  return (
    <svg width={tam} height={tam} viewBox="0 0 24 24" fill="none" stroke="currentColor"
      strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d={ICONS[name]} />
    </svg>
  );
}

export default function TopNav() {
  const { usuario, logout } = useAuth();
  const { puedeVerPantalla } = usePermisos();
  const { tema, alternar } = useTema();
  const { pathname } = useLocation();

  const [menuAdmin, setMenuAdmin] = useState(false);
  const [menuUsuario, setMenuUsuario] = useState(false);
  // Los refs apuntan al BOTÓN, no al contenedor: los paneles se dibujan en un
  // portal sobre <body> (ver MenuDesplegable) para que no los recorte el
  // `overflow-x` de la barra, y necesitan el rectángulo del ancla.
  const refAdmin = useRef(null);
  const refUsuario = useRef(null);

  // El clic fuera y la tecla Escape los gestiona cada MenuDesplegable.
  useEffect(() => { setMenuAdmin(false); setMenuUsuario(false); }, [pathname]);

  const visible = (item) =>
    !PANTALLAS_SIN_BACKEND.includes(item.pantalla) &&
    (item.to === "/roles" ? puedeVerPantalla("gestionUsuarios") : puedeVerPantalla(item.pantalla));

  const operacion = OPERACION.filter(visible);
  const administracion = ADMINISTRACION.filter(visible);
  const adminActivo = administracion.some((i) => i.to === pathname);

  return (
    <header className="topnav">
      {/* --- Marca --- */}
      <div className="topnav-marca">
        <img src="/sipro_simbolo.png" alt="" className="topnav-simbolo"
          onError={(e) => { e.target.style.display = "none"; }} />
        <div className="topnav-marca-texto">
          <div className="topnav-marca-nombre">SISPROP</div>
          <div className="topnav-marca-sub">Prevención y simulación de incendios</div>
        </div>
      </div>

      {/* --- Navegación --- */}
      <nav className="topnav-nav" aria-label="Navegación principal">
        {operacion.map((item) => (
          <NavLink key={item.to} to={item.to} title={item.label}
            className={({ isActive }) => `topnav-link${isActive ? " activo" : ""}`}>
            <Icon name={item.icon} />
            <span className="topnav-link-texto">{item.corto}</span>
          </NavLink>
        ))}

        {administracion.length > 0 && (
          <>
            <button ref={refAdmin}
              className={`topnav-link topnav-link--boton${adminActivo ? " activo" : ""}`}
              onClick={() => setMenuAdmin((v) => !v)}
              aria-expanded={menuAdmin} aria-haspopup="true">
              <Icon name="settings" />
              <span className="topnav-link-texto">Administración</span>
              <span className="topnav-caret">{menuAdmin ? "▴" : "▾"}</span>
            </button>
            <MenuDesplegable abierto={menuAdmin} onCerrar={() => setMenuAdmin(false)}
              anclaRef={refAdmin} alineacion="izquierda">
              {administracion.map((item) => (
                <NavLink key={item.to} to={item.to} role="menuitem"
                  onClick={() => setMenuAdmin(false)}
                  className={({ isActive }) => `topnav-desplegable-link${isActive ? " activo" : ""}`}>
                  <Icon name={item.icon} tam={15} />
                  {item.corto}
                </NavLink>
              ))}
            </MenuDesplegable>
          </>
        )}
      </nav>

      {/* --- Acciones --- */}
      <div className="topnav-acciones">
        <ThreatRing />

        <button className="topnav-icono-btn" onClick={alternar}
          title={tema === "oscuro" ? "Cambiar a modo claro" : "Cambiar a modo oscuro"}
          aria-label="Cambiar tema">
          {tema === "oscuro" ? (
            <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
              <circle cx="12" cy="12" r="4" />
              <path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4" />
            </svg>
          ) : (
            <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M21 12.8A9 9 0 1111.2 3 7 7 0 0021 12.8z" />
            </svg>
          )}
        </button>

        <button ref={refUsuario} className="topnav-usuario"
          onClick={() => setMenuUsuario((v) => !v)}
          aria-expanded={menuUsuario} aria-haspopup="true">
          <span className="topnav-usuario-avatar">{(usuario?.nombre || "?").charAt(0)}</span>
          <span className="topnav-usuario-texto">
            <span className="topnav-usuario-nombre">{usuario?.nombre}</span>
            <span className="topnav-usuario-rol mono">{usuario?.rol}</span>
          </span>
          <span className="topnav-caret">{menuUsuario ? "▴" : "▾"}</span>
        </button>
        <MenuDesplegable abierto={menuUsuario} onCerrar={() => setMenuUsuario(false)}
          anclaRef={refUsuario} alineacion="derecha" anchoMinimo={210}>
          <div className="topnav-desplegable-cabecera">
            <div className="topnav-usuario-nombre">{usuario?.nombre}</div>
            <div className="text-muted" style={{ fontSize: 11 }}>{usuario?.email}</div>
          </div>
          <button className="topnav-desplegable-link" onClick={logout} role="menuitem">
            Cerrar sesión
          </button>
          <div className="topnav-wcs">
            <span className="topnav-wcs-label">Un proyecto apoyado por</span>
            <img src="/wcs_horizontal.png" alt="Wildlife Conservation Society"
              className="topnav-wcs-logo"
              onError={(e) => { e.target.style.display = "none"; }} />
          </div>
        </MenuDesplegable>
      </div>
    </header>
  );
}
