// Pantalla exclusiva del rol Administrador (Módulo 1 · CRUD de usuarios).
// Seguridad en 2 capas (ninguna confía solo en el frontend):
//   1. Frontend: la ruta se protege por permiso "gestionar_usuarios", y aquí se
//      ocultan/deshabilitan acciones sobre la propia cuenta.
//   2. Backend: cada endpoint exige sesión + rol administrador, y además rechaza
//      que un admin se desactive o se quite su propio rol. Aunque alguien
//      manipule el frontend, el API igual lo bloquea. Esa es la capa que importa.
import { useEffect, useMemo, useState } from "react";
import { useAuth } from "../../nucleo/AuthContext";
import Icono from "../../nucleo/Icono";
import Dialogo from "../../nucleo/Dialogo";
import { usuariosApi } from "./api";
import "../../nucleo/estilos/Pantalla.css";
import "./estilos/GestionUsuarios.css";

const ROLES = ["administrador", "analista", "ugr", "brigada"];
const ETIQUETA_ROL = {
  administrador: "Administrador", analista: "Analista Espacial",
  ugr: "UGR", brigada: "Brigada",
};

function formatearFecha(iso) {
  if (!iso) return "Nunca";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "Nunca";
  return d.toLocaleString("es-BO", { dateStyle: "medium", timeStyle: "short" });
}

export default function GestionUsuarios() {
  const { usuario: usuarioActual } = useAuth();
  const [usuarios, setUsuarios] = useState([]);
  const [cargando, setCargando] = useState(true);

  // Crear usuario (con confirmación de contraseña, Módulo 1 §3.2)
  const [nuevo, setNuevo] = useState({ email: "", password: "", confirmar: "", nombre: "", rol: "analista", activo: true });
  const [error, setError] = useState(null);
  // El formulario de alta estaba SIEMPRE desplegado encima de la tabla y se
  // llevaba ~200 px de alto en una pantalla cuyo trabajo diario es consultar,
  // no crear. Ahora se abre desde la barra de herramientas.
  const [creando, setCreando] = useState(false);

  // Confirmación en la app, en lugar de window.confirm (ver más abajo).
  const [confirmacion, setConfirmacion] = useState(null);

  // Búsqueda y filtrado (Módulo 1 §3.1)
  const [busqueda, setBusqueda] = useState("");
  const [filtroRol, setFiltroRol] = useState("");
  const [filtroEstado, setFiltroEstado] = useState("");

  // Modales
  const [editando, setEditando] = useState(null);   // edición completa
  const [errorEdicion, setErrorEdicion] = useState(null);
  const [detalle, setDetalle] = useState(null);      // ver detalle (solo lectura)
  const [restableciendo, setRestableciendo] = useState(null); // usuario al que se le resetea
  const [passTemporal, setPassTemporal] = useState("");
  const [errorReset, setErrorReset] = useState(null);
  const [avisoReset, setAvisoReset] = useState(null);

  function cargar() {
    setCargando(true);
    usuariosApi.listar().then(({ data }) => setUsuarios(data)).finally(() => setCargando(false));
  }
  useEffect(cargar, []);

  // ---- Lista filtrada ----
  const usuariosFiltrados = useMemo(() => {
    const q = busqueda.trim().toLowerCase();
    return usuarios.filter((u) => {
      if (filtroRol && u.rol !== filtroRol) return false;
      if (filtroEstado === "activo" && !u.activo) return false;
      if (filtroEstado === "inactivo" && u.activo) return false;
      if (q && !(`${u.nombre} ${u.email}`.toLowerCase().includes(q))) return false;
      return true;
    });
  }, [usuarios, busqueda, filtroRol, filtroEstado]);

  // ---- Crear ----
  async function crear(e) {
    e.preventDefault();
    setError(null);
    if (nuevo.password !== nuevo.confirmar) {
      setError("Las contraseñas no coinciden.");
      return;
    }
    if (nuevo.password.length < 6) {
      setError("La contraseña debe tener al menos 6 caracteres.");
      return;
    }
    try {
      await usuariosApi.crear({
        email: nuevo.email, password: nuevo.password,
        nombre: nuevo.nombre, rol: nuevo.rol, activo: nuevo.activo,
      });
      setNuevo({ email: "", password: "", confirmar: "", nombre: "", rol: "analista", activo: true });
      setCreando(false);   // el alta terminó: el formulario se recoge solo
      cargar();
    } catch (err) {
      setError(err.response?.data?.detail || "No se pudo crear el usuario.");
    }
  }

  // ---- Cambiar rol rápido desde la tabla ----
  // Antes esto usaba window.confirm + alert. Se cambian por el diálogo de la
  // aplicación: los del navegador bloquean el hilo, salen con el nombre del
  // host encima («localhost:5173 dice…») y no dejan destacar el nombre de la
  // cuenta afectada, que es el dato que hay que leer antes de confirmar.
  function cambiarRol(u, rol) {
    if (rol === u.rol) return;
    setConfirmacion({
      titulo: "Cambiar el rol de la cuenta",
      mensaje: (
        <>Vas a cambiar a <strong>{u.nombre}</strong> de <strong>{ETIQUETA_ROL[u.rol]}</strong> a{" "}
        <strong>{ETIQUETA_ROL[rol]}</strong>. Cambia de inmediato a qué pantallas
        puede entrar.</>
      ),
      detalle: <div>{u.email}</div>,
      etiquetaConfirmar: "Cambiar rol",
      onConfirmar: async () => { await usuariosApi.actualizar(u.id, { rol }); cargar(); },
    });
  }

  // ---- Activar / desactivar ----
  function desactivar(u) {
    setConfirmacion({
      titulo: "Desactivar la cuenta",
      peligroso: true,
      mensaje: (
        <><strong>{u.nombre}</strong> no podrá iniciar sesión hasta que la reactives.
        El registro se conserva: es un borrado lógico, no se elimina nada.</>
      ),
      detalle: <div>{u.email} · {ETIQUETA_ROL[u.rol]}</div>,
      etiquetaConfirmar: "Desactivar",
      onConfirmar: async () => { await usuariosApi.desactivar(u.id); cargar(); },
    });
  }

  function reactivar(u) {
    setConfirmacion({
      titulo: "Reactivar la cuenta",
      mensaje: <><strong>{u.nombre}</strong> volverá a poder iniciar sesión.</>,
      detalle: <div>{u.email} · {ETIQUETA_ROL[u.rol]}</div>,
      etiquetaConfirmar: "Reactivar",
      onConfirmar: async () => { await usuariosApi.actualizar(u.id, { activo: true }); cargar(); },
    });
  }

  // ---- Edición completa ----
  function abrirEdicion(u) { setEditando({ ...u }); setErrorEdicion(null); }
  async function guardarEdicion(e) {
    e.preventDefault();
    setErrorEdicion(null);
    const esUnoMismo = editando.id === usuarioActual?.usuario_id || editando.email === usuarioActual?.usuario_id;
    if (esUnoMismo && editando.rol !== "administrador") { setErrorEdicion("No puedes quitarte tu propio rol de administrador."); return; }
    if (esUnoMismo && editando.activo === false) { setErrorEdicion("No puedes desactivar tu propia cuenta."); return; }
    try {
      await usuariosApi.actualizar(editando.id, { nombre: editando.nombre, rol: editando.rol, activo: editando.activo });
      setEditando(null); cargar();
    } catch (err) { setErrorEdicion(err.response?.data?.detail || "No se pudo guardar."); }
  }

  // ---- Restablecer contraseña ----
  function abrirReset(u) { setRestableciendo(u); setPassTemporal(""); setErrorReset(null); setAvisoReset(null); }
  async function confirmarReset() {
    setErrorReset(null);
    if (passTemporal.length < 6) { setErrorReset("La contraseña temporal debe tener al menos 6 caracteres."); return; }
    try {
      await usuariosApi.restablecerPassword(restableciendo.id, passTemporal);
      setAvisoReset(`Contraseña restablecida para ${restableciendo.nombre}. Debe entrar con la nueva.`);
      setRestableciendo(null);
      setTimeout(() => setAvisoReset(null), 6000);
    } catch (err) { setErrorReset(err.response?.data?.detail || "No se pudo restablecer."); }
  }

  const esUnoMismo = (u) => u.id === usuarioActual?.usuario_id || u.email === usuarioActual?.usuario_id;

  return (
    <div className="pantalla">

      <div className="pantalla-barra">
        <div className="pantalla-barra-izq">
          <label className="pantalla-buscar">
            <Icono nombre="buscar" tam={15} />
            <input className="input" placeholder="Buscar por nombre o correo…"
              value={busqueda} onChange={(e) => setBusqueda(e.target.value)} />
            {busqueda && (
              <button className="pantalla-buscar-limpiar" onClick={() => setBusqueda("")}
                aria-label="Limpiar búsqueda">
                <Icono nombre="cerrar" tam={13} />
              </button>
            )}
          </label>

          <select className="select" value={filtroRol} onChange={(e) => setFiltroRol(e.target.value)}>
            <option value="">Todos los roles</option>
            {ROLES.map((r) => <option key={r} value={r}>{ETIQUETA_ROL[r]}</option>)}
          </select>
          <select className="select" value={filtroEstado} onChange={(e) => setFiltroEstado(e.target.value)}>
            <option value="">Todos los estados</option>
            <option value="activo">Activos</option>
            <option value="inactivo">Inactivos</option>
          </select>

          <span className="pantalla-conteo">
            {usuariosFiltrados.length === usuarios.length
              ? `${usuarios.length} cuentas`
              : `${usuariosFiltrados.length} de ${usuarios.length}`}
          </span>
        </div>

        <div className="pantalla-barra-der">
          <button className="btn btn--mini" onClick={cargar} disabled={cargando}>
            <Icono nombre="refrescar" tam={14} />
            {cargando ? "Actualizando…" : "Actualizar"}
          </button>
          <button className="btn btn--primary btn--mini"
            onClick={() => { setCreando((v) => !v); setError(null); }}>
            <Icono nombre={creando ? "cerrar" : "anadir"} tam={14} />
            {creando ? "Cancelar alta" : "Nuevo usuario"}
          </button>
        </div>
      </div>

      {avisoReset && (
        <div className="pantalla-aviso es-ok">
          <Icono nombre="verificado" tam={16} />
          <span>{avisoReset}</span>
        </div>
      )}

      {/* ---- Crear usuario (plegado por defecto) ---- */}
      {creando && (
        <form onSubmit={crear} className="panel usuarios-form-crear">
          <div>
            <label className="field-label">Correo</label>
            <input className="input" type="email" required autoFocus value={nuevo.email}
              onChange={(e) => setNuevo((n) => ({ ...n, email: e.target.value }))} />
          </div>
          <div>
            <label className="field-label">Nombre completo</label>
            <input className="input" required value={nuevo.nombre}
              onChange={(e) => setNuevo((n) => ({ ...n, nombre: e.target.value }))} />
          </div>
          <div>
            <label className="field-label">Contraseña</label>
            <input className="input" type="password" required value={nuevo.password}
              onChange={(e) => setNuevo((n) => ({ ...n, password: e.target.value }))} />
          </div>
          <div>
            <label className="field-label">Confirmar contraseña</label>
            <input className="input" type="password" required value={nuevo.confirmar}
              onChange={(e) => setNuevo((n) => ({ ...n, confirmar: e.target.value }))} />
          </div>
          <div>
            <label className="field-label">Rol</label>
            <select className="select" value={nuevo.rol}
              onChange={(e) => setNuevo((n) => ({ ...n, rol: e.target.value }))}>
              {ROLES.map((r) => <option key={r} value={r}>{ETIQUETA_ROL[r]}</option>)}
            </select>
          </div>
          <div>
            <label className="field-label">Estado</label>
            <select className="select" value={nuevo.activo ? "activo" : "inactivo"}
              onChange={(e) => setNuevo((n) => ({ ...n, activo: e.target.value === "activo" }))}>
              <option value="activo">Activo</option>
              <option value="inactivo">Inactivo</option>
            </select>
          </div>
          <button className="btn btn--primary">
            <Icono nombre="anadir" tam={15} />
            Crear usuario
          </button>
        </form>
      )}

      {error && (
        <div className="pantalla-aviso es-error">
          <Icono nombre="aviso" tam={16} />
          <span>{error}</span>
        </div>
      )}

      <div className="panel tabla-envoltura">
        <table>
          <thead>
            <tr>
              <th>Nombre</th><th>Correo</th><th>Rol</th><th>Estado</th>
              <th>Último acceso</th><th />
            </tr>
          </thead>
          <tbody>
            {usuariosFiltrados.map((u) => (
              <tr key={u.id}>
                <td className="celda-nombre">
                  {u.nombre} {esUnoMismo(u) && <span className="text-muted">(tú)</span>}
                </td>
                <td className="text-muted">{u.email}</td>
                <td>
                  <select className="select usuarios-rol-select" value={u.rol}
                    disabled={esUnoMismo(u) && u.rol === "administrador"}
                    title={esUnoMismo(u) && u.rol === "administrador"
                      ? "No puedes quitarte tu propio rol de administrador" : ""}
                    onChange={(e) => cambiarRol(u, e.target.value)}>
                    {ROLES.map((r) => <option key={r} value={r}>{ETIQUETA_ROL[r]}</option>)}
                  </select>
                </td>
                {/* El estado va con punto Y con palabra: el color solo no basta. */}
                <td>
                  <span className="estado-con-punto">
                    <span className={`punto-estado${u.activo ? " es-ok" : ""}`} />
                    {u.activo ? "Activo" : "Inactivo"}
                  </span>
                </td>
                <td className="text-muted" style={{ fontSize: 12.5 }}>
                  {formatearFecha(u.ultimo_acceso)}
                </td>
                <td className="celda-acciones">
                  <button className="btn btn--mini btn--icono" onClick={() => setDetalle(u)}
                    title="Ver detalle" aria-label={`Detalle de ${u.nombre}`}>
                    <Icono nombre="informacion" tam={14} />
                  </button>
                  <button className="btn btn--mini btn--icono" onClick={() => abrirEdicion(u)}
                    title="Editar" aria-label={`Editar ${u.nombre}`}>
                    <Icono nombre="editar" tam={14} />
                  </button>
                  <button className="btn btn--mini btn--icono" onClick={() => abrirReset(u)}
                    title="Restablecer contraseña" aria-label={`Restablecer la contraseña de ${u.nombre}`}>
                    <Icono nombre="llave" tam={14} />
                  </button>
                  {esUnoMismo(u) ? (
                    <span className="text-muted" style={{ fontSize: 12, marginLeft: 6 }}>
                      Tu cuenta
                    </span>
                  ) : u.activo ? (
                    <button className="btn btn--peligro btn--mini" onClick={() => desactivar(u)}>
                      Desactivar
                    </button>
                  ) : (
                    <button className="btn btn--mini" onClick={() => reactivar(u)}>
                      <Icono nombre="restablecer" tam={14} />
                      Reactivar
                    </button>
                  )}
                </td>
              </tr>
            ))}
            {!usuariosFiltrados.length && (
              <tr>
                <td colSpan={6}>
                  <div className="pantalla-vacio">
                    <Icono nombre="usuarios" tam={26} />
                    <span className="pantalla-vacio-titulo">
                      {cargando ? "Cargando cuentas…" : "Ninguna cuenta coincide"}
                    </span>
                    {!cargando && (
                      <p>Prueba a quitar los filtros de rol o estado, o a limpiar la búsqueda.</p>
                    )}
                  </div>
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      <div className="pantalla-aviso">
        <Icono nombre="candado" tam={16} />
        <span>
          Desactivar es un <strong>borrado lógico</strong>: el registro se conserva y la
          cuenta deja de poder entrar. Ningún administrador puede desactivarse a sí mismo
          ni quitarse su propio rol, y el servidor lo rechaza aunque se fuerce desde el
          navegador.
        </span>
      </div>

      {confirmacion && (
        <Dialogo {...confirmacion} onCerrar={() => setConfirmacion(null)} />
      )}

      {/* ---- Modal: editar ---- */}
      {editando && (
        <div className="usuarios-modal-fondo" onClick={() => setEditando(null)}>
          <div className="usuarios-modal panel" onClick={(e) => e.stopPropagation()}>
            <h2 className="usuarios-modal-titulo">Editar usuario</h2>
            <form onSubmit={guardarEdicion}>
              <div className="usuarios-modal-campo">
                <label className="field-label">Nombre completo</label>
                <input className="input" value={editando.nombre} onChange={(e) => setEditando((u) => ({ ...u, nombre: e.target.value }))} required />
              </div>
              <div className="usuarios-modal-campo">
                <label className="field-label">Correo</label>
                <input className="input" value={editando.email} disabled title="El correo identifica la cuenta y no se cambia" />
                <span className="usuarios-modal-hint">El correo identifica la cuenta y no se modifica.</span>
              </div>
              <div className="usuarios-modal-campo">
                <label className="field-label">Rol</label>
                <select className="select" value={editando.rol} onChange={(e) => setEditando((u) => ({ ...u, rol: e.target.value }))}>
                  {ROLES.map((r) => <option key={r} value={r}>{ETIQUETA_ROL[r]}</option>)}
                </select>
              </div>
              <div className="usuarios-modal-campo">
                <label className="field-label">Estado</label>
                <select className="select" value={editando.activo ? "activo" : "inactivo"} onChange={(e) => setEditando((u) => ({ ...u, activo: e.target.value === "activo" }))}>
                  <option value="activo">Activo</option>
                  <option value="inactivo">Inactivo</option>
                </select>
              </div>
              <p className="usuarios-modal-hint">Para cambiar la contraseña, usa el botón «Contraseña» de la tabla.</p>
              {errorEdicion && <p className="usuarios-error">{errorEdicion}</p>}
              <div className="usuarios-modal-acciones">
                <button type="button" className="btn" onClick={() => setEditando(null)}>Cancelar</button>
                <button type="submit" className="btn btn--primary">Guardar cambios</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ---- Modal: ver detalle (solo lectura) ---- */}
      {detalle && (
        <div className="usuarios-modal-fondo" onClick={() => setDetalle(null)}>
          <div className="usuarios-modal panel" onClick={(e) => e.stopPropagation()}>
            <h2 className="usuarios-modal-titulo">Detalle del usuario</h2>
            <dl className="usuarios-detalle">
              <dt>ID</dt><dd className="mono">{detalle.id}</dd>
              <dt>Nombre completo</dt><dd>{detalle.nombre}</dd>
              <dt>Correo</dt><dd>{detalle.email}</dd>
              <dt>Rol</dt><dd>{ETIQUETA_ROL[detalle.rol]}</dd>
              <dt>Estado</dt><dd>{detalle.activo ? "Activo" : "Inactivo"}</dd>
              <dt>Último acceso</dt><dd>{formatearFecha(detalle.ultimo_acceso)}</dd>
              <dt>Creado</dt><dd>{formatearFecha(detalle.creado_en)}</dd>
            </dl>
            <div className="usuarios-modal-acciones">
              <button className="btn btn--primary" onClick={() => setDetalle(null)}>Cerrar</button>
            </div>
          </div>
        </div>
      )}

      {/* ---- Modal: restablecer contraseña ---- */}
      {restableciendo && (
        <div className="usuarios-modal-fondo" onClick={() => setRestableciendo(null)}>
          <div className="usuarios-modal panel" onClick={(e) => e.stopPropagation()} style={{ maxWidth: 420 }}>
            <h2 className="usuarios-modal-titulo">Restablecer contraseña</h2>
            <p className="text-muted" style={{ fontSize: 13, marginBottom: 14 }}>
              Asigna una contraseña temporal para <strong>{restableciendo.nombre}</strong> ({restableciendo.email}).
              Sus sesiones abiertas se cerrarán y deberá entrar con la nueva.
            </p>
            <label className="field-label">Nueva contraseña temporal</label>
            <input className="input" type="text" value={passTemporal} autoFocus
              onChange={(e) => setPassTemporal(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && confirmarReset()}
              placeholder="mínimo 6 caracteres" />
            {errorReset && <p className="usuarios-error">{errorReset}</p>}
            <div className="usuarios-modal-acciones">
              <button className="btn" onClick={() => setRestableciendo(null)}>Cancelar</button>
              <button className="btn btn--primary" onClick={confirmarReset} disabled={!passTemporal}>Restablecer</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
