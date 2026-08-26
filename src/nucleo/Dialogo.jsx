// ============================================================================
// DIÁLOGO DE LA APLICACIÓN
// ============================================================================
// Sustituye a `window.confirm` y `window.alert`, que estaban repartidos por
// Gestión de usuarios y por el Historial. Tres razones para quitarlos:
//
//   · No son formales: el navegador los pinta con su propio estilo, con el
//     nombre del host arriba («localhost:5173 dice…»). En una defensa eso se
//     ve como un prototipo a medio hacer.
//   · Bloquean el hilo. Mientras el cuadro está abierto no se repinta nada, y
//     cualquier automatización del navegador se queda colgada hasta que
//     alguien lo cierre a mano.
//   · No se pueden redactar bien: ni negritas, ni el nombre del usuario
//     destacado, ni un botón rojo para lo que destruye datos.
//
// Se monta con createPortal en <body> por lo mismo que el menú desplegable:
// un contenedor con `overflow: auto` recorta a sus descendientes posicionados
// por muy alto que sea su z-index (ver nucleo/MenuDesplegable.jsx).
//
// Uso:
//   const [confirmar, setConfirmar] = useState(null);
//   ...
//   {confirmar && <Dialogo {...confirmar} onCerrar={() => setConfirmar(null)} />}
//   setConfirmar({
//     titulo: "Desactivar cuenta",
//     mensaje: <>No podrá iniciar sesión hasta que la reactives.</>,
//     etiquetaConfirmar: "Desactivar",
//     peligroso: true,
//     onConfirmar: async () => { await api.desactivar(u.id); recargar(); },
//   });
// ============================================================================
import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import Icono from "./Icono";
import "./estilos/Dialogo.css";

export default function Dialogo({
  titulo,
  mensaje,
  detalle = null,
  etiquetaConfirmar = "Confirmar",
  etiquetaCancelar = "Cancelar",
  peligroso = false,
  soloAviso = false,     // sin botón de confirmar: es un aviso, no una pregunta
  icono = null,
  // Si el diálogo lleva un campo dentro (una contraseña, un nombre), el foco
  // le toca a ese campo, no al botón: robárselo obliga a tabular hacia atrás.
  enfocarConfirmar = true,
  onConfirmar,
  onCerrar,
}) {
  const [trabajando, setTrabajando] = useState(false);
  const [error, setError] = useState(null);
  const refConfirmar = useRef(null);

  // Foco en el botón principal y salida con Escape: un diálogo que solo se
  // puede cerrar con el ratón es un diálogo que atrapa al usuario.
  useEffect(() => {
    if (enfocarConfirmar) refConfirmar.current?.focus();
    function alPulsar(e) {
      if (e.key === "Escape" && !trabajando) onCerrar?.();
    }
    document.addEventListener("keydown", alPulsar);
    return () => document.removeEventListener("keydown", alPulsar);
  }, [onCerrar, trabajando, enfocarConfirmar]);

  async function confirmar() {
    if (!onConfirmar) return onCerrar?.();
    setTrabajando(true);
    setError(null);
    try {
      await onConfirmar();
      onCerrar?.();
    } catch (e) {
      // El error se queda DENTRO del diálogo: cerrarlo y perder el mensaje
      // obligaría a repetir la acción para volver a verlo.
      setError(e?.response?.data?.detail || e?.message || "No se pudo completar la acción.");
      setTrabajando(false);
    }
  }

  const nombreIcono = icono || (peligroso ? "aviso" : "informacion");

  return createPortal(
    <div className="dialogo-fondo"
      onMouseDown={(e) => { if (e.target === e.currentTarget && !trabajando) onCerrar?.(); }}>
      <div className="dialogo" role="dialog" aria-modal="true" aria-label={titulo}>
        <header className="dialogo-cabecera">
          <span className={`dialogo-icono${peligroso ? " es-peligroso" : ""}`}>
            <Icono nombre={nombreIcono} tam={18} />
          </span>
          <h2 className="dialogo-titulo">{titulo}</h2>
          <button className="dialogo-cerrar" onClick={onCerrar} disabled={trabajando}
            aria-label="Cerrar">
            <Icono nombre="cerrar" tam={16} />
          </button>
        </header>

        <div className="dialogo-cuerpo">
          {mensaje && <p className="dialogo-mensaje">{mensaje}</p>}
          {detalle && <div className="dialogo-detalle">{detalle}</div>}
          {error && (
            <p className="dialogo-error">
              <Icono nombre="aviso" tam={14} />
              <span>{error}</span>
            </p>
          )}
        </div>

        <footer className="dialogo-pie">
          <button className="btn" onClick={onCerrar} disabled={trabajando}>
            {soloAviso ? "Cerrar" : etiquetaCancelar}
          </button>
          {!soloAviso && (
            <button
              ref={refConfirmar}
              className={`btn ${peligroso ? "btn--peligro" : "btn--primary"}`}
              onClick={confirmar}
              disabled={trabajando}
            >
              {trabajando ? "Trabajando…" : etiquetaConfirmar}
            </button>
          )}
        </footer>
      </div>
    </div>,
    document.body
  );
}
