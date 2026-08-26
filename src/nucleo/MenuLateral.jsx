// ============================================================================
// MENÚ LATERAL IZQUIERDO — colapsable
// ============================================================================
// Cerrado ocupa 60 px y muestra solo iconos; abierto, 232 px con los nombres.
// La preferencia se recuerda entre sesiones, porque quien trabaja sobre el
// mapa lo quiere cerrado casi siempre y quien administra lo quiere abierto.
//
// Cerrado, cada icono muestra su nombre en un rótulo flotante al pasar por
// encima: dibujado en un portal (igual que los desplegables de antes) para que
// no lo recorte el propio menú.
import { useEffect, useRef, useState } from "react";
import { NavLink } from "react-router-dom";
import { createPortal } from "react-dom";
import Icono from "./Icono";
import { useAuth } from "./AuthContext";
import { usePermisos } from "./PermisosContext";
import { navegacionDe } from "./navegacion";
import "./estilos/AppShell.css";

const CLAVE_PREFERENCIA = "sisprop_menu_abierto";

function leerPreferencia() {
  try {
    return localStorage.getItem(CLAVE_PREFERENCIA) !== "0";
  } catch {
    return true;
  }
}

/** Rótulo flotante para el menú cerrado. */
function Rotulo({ ancla, texto, visible }) {
  const [pos, setPos] = useState(null);

  useEffect(() => {
    if (!visible || !ancla?.current) { setPos(null); return; }
    const r = ancla.current.getBoundingClientRect();
    setPos({ top: r.top + r.height / 2, left: r.right + 10 });
  }, [visible, ancla]);

  if (!visible || !pos) return null;
  return createPortal(
    <span className="menu-rotulo" style={{ top: pos.top, left: pos.left }} role="tooltip">
      {texto}
    </span>,
    document.body,
  );
}

function EntradaMenu({ item, abierto }) {
  const ref = useRef(null);
  const [encima, setEncima] = useState(false);

  return (
    <>
      <NavLink
        ref={ref}
        to={item.to}
        title={abierto ? item.descripcion : undefined}
        className={({ isActive }) => `menu-enlace${isActive ? " activo" : ""}`}
        onMouseEnter={() => setEncima(true)}
        onMouseLeave={() => setEncima(false)}
        onFocus={() => setEncima(true)}
        onBlur={() => setEncima(false)}
      >
        <span className="menu-enlace-icono"><Icono nombre={item.icono} tam={19} /></span>
        {abierto && <span className="menu-enlace-texto">{item.label}</span>}
      </NavLink>
      {!abierto && <Rotulo ancla={ref} texto={item.label} visible={encima} />}
    </>
  );
}

export default function MenuLateral({ abierto, setAbierto }) {
  const { usuario } = useAuth();
  const { puedeVerPantalla } = usePermisos();

  useEffect(() => {
    try { localStorage.setItem(CLAVE_PREFERENCIA, abierto ? "1" : "0"); } catch { /* modo privado */ }
  }, [abierto]);

  const grupos = navegacionDe(usuario?.rol)
    .map((g) => ({ ...g, items: g.items.filter((i) => puedeVerPantalla(i.pantalla)) }))
    .filter((g) => g.items.length);

  return (
    <nav className={`menu-lateral${abierto ? " abierto" : ""}`} aria-label="Navegación principal">
      <button
        className="menu-alternar"
        onClick={() => setAbierto(!abierto)}
        title={abierto ? "Contraer el menú" : "Expandir el menú"}
        aria-label={abierto ? "Contraer el menú" : "Expandir el menú"}
        aria-expanded={abierto}
      >
        <Icono nombre="menu" tam={19} />
        {abierto && <span className="menu-alternar-texto">SISPROP</span>}
      </button>

      <div className="menu-grupos">
        {grupos.map((grupo, i) => (
          <div key={grupo.titulo ?? `g${i}`} className="menu-grupo">
            {abierto && grupo.titulo && (
              <div className="menu-grupo-titulo">{grupo.titulo}</div>
            )}
            {!abierto && grupo.titulo && <div className="menu-separador" />}
            {grupo.items.map((item) => (
              <EntradaMenu key={item.to} item={item} abierto={abierto} />
            ))}
          </div>
        ))}
      </div>

      <div className="menu-pie">
        {abierto ? (
          <div className="menu-rol">
            <span className="menu-rol-etiqueta">Perfil</span>
            <span className="menu-rol-valor">{usuario?.rol}</span>
          </div>
        ) : (
          <span className="menu-rol-punto" title={usuario?.rol} />
        )}
      </div>
    </nav>
  );
}

export { leerPreferencia };
