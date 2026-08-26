// ============================================================================
// BARRA SUPERIOR
// ============================================================================
// Delgada a propósito (52 px): la navegación vive en el menú lateral y el
// espacio vertical es del mapa. Aquí solo van marca, contexto y las acciones
// que deben estar siempre a mano: nivel de amenaza, tema y sesión.
import { useRef, useState } from "react";
import Icono from "./Icono";
import MenuDesplegable from "./MenuDesplegable";
import ThreatRing from "./ThreatRing";
import { useAuth } from "./AuthContext";
import { useTema } from "./TemaContext";
import "./estilos/AppShell.css";

export default function BarraSuperior({ titulo, subtitulo, mostrarAmenaza = true }) {
  const { usuario, logout } = useAuth();
  const { tema, alternar } = useTema();
  const [menuUsuario, setMenuUsuario] = useState(false);
  const refUsuario = useRef(null);

  return (
    <header className="barra-superior">
      <div className="barra-marca">
        <img src="/sipro_simbolo.png" alt="" className="barra-simbolo"
          onError={(e) => { e.target.style.display = "none"; }} />
        <span className="barra-marca-nombre">SISPROP</span>
      </div>

      <div className="barra-contexto">
        <span className="barra-titulo">{titulo}</span>
        {subtitulo && <span className="barra-subtitulo">{subtitulo}</span>}
      </div>

      <div className="barra-acciones">
        {mostrarAmenaza && <ThreatRing />}

        <button className="barra-icono-btn" onClick={alternar}
          title={tema === "oscuro" ? "Cambiar a modo claro" : "Cambiar a modo oscuro"}
          aria-label="Cambiar tema">
          <Icono nombre={tema === "oscuro" ? "sol" : "luna"} tam={17} />
        </button>

        <button ref={refUsuario} className="barra-usuario"
          onClick={() => setMenuUsuario((v) => !v)}
          aria-expanded={menuUsuario} aria-haspopup="true">
          <span className="barra-avatar">{(usuario?.nombre || "?").charAt(0)}</span>
          <span className="barra-usuario-texto">
            <span className="barra-usuario-nombre">{usuario?.nombre}</span>
            <span className="barra-usuario-rol">{usuario?.rol}</span>
          </span>
          <Icono nombre="abajo" tam={13} />
        </button>

        <MenuDesplegable abierto={menuUsuario} onCerrar={() => setMenuUsuario(false)}
          anclaRef={refUsuario} alineacion="derecha" anchoMinimo={224}>
          <div className="menu-flotante-cabecera">
            <div className="barra-usuario-nombre">{usuario?.nombre}</div>
            <div className="text-muted" style={{ fontSize: 11 }}>{usuario?.email}</div>
          </div>
          <button className="menu-flotante-opcion" onClick={logout} role="menuitem">
            <Icono nombre="salir" tam={15} />
            Cerrar sesión
          </button>
          <div className="barra-wcs">
            <span className="barra-wcs-label">Un proyecto apoyado por</span>
            <img src="/wcs_horizontal.png" alt="Wildlife Conservation Society"
              className="barra-wcs-logo"
              onError={(e) => { e.target.style.display = "none"; }} />
          </div>
        </MenuDesplegable>
      </div>
    </header>
  );
}
