// ============================================================================
// ROLES Y PERMISOS  ·  la matriz de acceso del sistema
// ============================================================================
// La matriz es EDITABLE y manda de verdad: al guardar (con confirmación por
// contraseña) el backend la persiste, y cada endpoint la consulta antes de
// responder. No es una pantalla decorativa.
//
// Lo que se corrige en la Fase 2
// ------------------------------
// Esta pantalla era el último sitio donde quedaba el atajo del administrador.
// Decía, en la fila y en el `title` de cada celda:
//
//     «El administrador siempre tiene todos los permisos»
//
// y bloqueaba su columna entera. Eso ya no es cierto —y era justo lo que se
// arregló en el backend—: el Administrador **no** tiene los permisos
// operativos (mapa, focos, probabilidad, simulación), porque su trabajo es
// administrar el sistema, no operar el análisis. Con la columna bloqueada, la
// pantalla enseñaba una matriz que contradecía a la que el servidor aplica.
//
// Ahora la columna del administrador se edita como las demás, salvo los cuatro
// permisos que lo dejarían sin poder administrar —esos sí están fijos, porque
// quitárselos deja el sistema sin nadie que pueda volver a entrar—. Los
// operativos se marcan como «reservados al perfil de análisis» y se explican.
import { useEffect, useMemo, useState } from "react";
import { useAuth } from "../../nucleo/AuthContext";
import { usePermisos } from "../../nucleo/PermisosContext";
import Icono from "../../nucleo/Icono";
import Dialogo from "../../nucleo/Dialogo";
import { pedir } from "../../local/cliente";
import "../../nucleo/estilos/Pantalla.css";
import "./estilos/GestionUsuarios.css";

// Espejo de backend_django/api/almacen/permisos_defecto.py
const PERMISOS = [
  { id: "ver_monitoreo", etiqueta: "Ver monitoreo", grupo: "operacion" },
  { id: "ver_variables", etiqueta: "Ver variables ambientales", grupo: "operacion" },
  { id: "ver_focos", etiqueta: "Ver focos (NASA FIRMS)", grupo: "operacion" },
  { id: "consultar_probabilidad", etiqueta: "Consultar probabilidad de incendio", grupo: "operacion" },
  { id: "ejecutar_simulacion", etiqueta: "Ejecutar simulación (autómata)", grupo: "operacion" },
  { id: "ver_simulaciones", etiqueta: "Ver simulaciones e historial", grupo: "operacion" },
  { id: "generar_reportes", etiqueta: "Generar informes y reportes", grupo: "comun" },
  { id: "gestionar_usuarios", etiqueta: "Gestionar usuarios (CRUD)", grupo: "administracion" },
  { id: "configuracion", etiqueta: "Configuración del sistema", grupo: "administracion" },
  { id: "ver_bitacora", etiqueta: "Ver bitácora", grupo: "administracion" },
];

const GRUPOS = [
  { id: "operacion", titulo: "Operación del GIS", sub: "Mapa, focos, probabilidad y simulación" },
  { id: "comun", titulo: "Documentación", sub: "Salidas del sistema" },
  { id: "administracion", titulo: "Administración", sub: "Cuentas, ajustes y auditoría" },
];

const ROLES = [
  { id: "administrador", nombre: "Administrador" },
  { id: "analista", nombre: "Analista" },
  { id: "ugr", nombre: "UGR" },
  { id: "brigada", nombre: "Brigada" },
];

// Permisos que el administrador NO puede perder: sin ellos nadie podría volver
// a entrar a gestionar el sistema, y la matriz quedaría sin salida.
const IMPRESCINDIBLES_ADMIN = new Set(["gestionar_usuarios", "configuracion", "ver_bitacora"]);

export default function RolesPermisos() {
  const { usuario } = useAuth();
  const { recargar: recargarPermisosApp } = usePermisos();
  const esAdmin = usuario?.rol === "administrador";

  const [matriz, setMatriz] = useState(null);
  const [original, setOriginal] = useState(null);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState(null);

  const [confirmando, setConfirmando] = useState(false);
  const [password, setPassword] = useState("");
  const [guardando, setGuardando] = useState(false);
  const [mensaje, setMensaje] = useState(null);

  useEffect(() => {
    pedir("/api/permisos")
      .then((m) => { setMatriz(m); setOriginal(structuredClone(m)); })
      .catch((e) => setError(e?.response?.data?.detail || e.message))
      .finally(() => setCargando(false));
  }, []);

  const cambios = useMemo(() => {
    if (!matriz || !original) return [];
    const lista = [];
    for (const r of ROLES) {
      for (const p of PERMISOS) {
        const antes = Boolean(original[r.id]?.[p.id]);
        const ahora = Boolean(matriz[r.id]?.[p.id]);
        if (antes !== ahora) lista.push({ rol: r.nombre, permiso: p.etiqueta, ahora });
      }
    }
    return lista;
  }, [matriz, original]);

  function bloqueado(rolId, permisoId) {
    if (!esAdmin) return "Solo el administrador puede modificar la matriz.";
    if (rolId === "administrador" && IMPRESCINDIBLES_ADMIN.has(permisoId)) {
      return "El administrador no puede perder este permiso: sin él nadie podría administrar el sistema.";
    }
    return null;
  }

  function alternar(rolId, permisoId) {
    if (bloqueado(rolId, permisoId)) return;
    setMatriz((m) => ({
      ...m,
      [rolId]: { ...m[rolId], [permisoId]: !m[rolId]?.[permisoId] },
    }));
    setMensaje(null);
  }

  async function guardar() {
    setGuardando(true);
    setMensaje(null);
    try {
      const guardada = await pedir("/api/permisos", {
        metodo: "PUT",
        cuerpo: { matriz, password },
      });
      setMatriz(guardada);
      setOriginal(structuredClone(guardada));
      setConfirmando(false);
      setPassword("");
      setMensaje({ tipo: "ok", texto: "Permisos guardados. Los cambios ya están activos." });
      recargarPermisosApp();  // refresca el acceso en toda la app sin recargar
    } catch (e) {
      setMensaje({
        tipo: "error",
        texto: e?.response?.data?.detail || "No se pudieron guardar los permisos.",
      });
      throw e;   // lo recoge el diálogo y lo enseña dentro
    } finally {
      setGuardando(false);
    }
  }

  if (cargando) {
    return (
      <div className="pantalla">
        <div className="pantalla-vacio">
          <Icono nombre="roles" tam={26} />
          <span>Cargando la matriz de permisos…</span>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="pantalla">
        <div className="pantalla-aviso es-error">
          <Icono nombre="aviso" tam={16} />
          <span>No se pudo cargar la matriz: {error}</span>
        </div>
      </div>
    );
  }

  return (
    <div className="pantalla">

      <div className="pantalla-barra">
        <div className="pantalla-barra-izq">
          <span className="pantalla-conteo">
            {cambios.length
              ? `${cambios.length} cambio${cambios.length > 1 ? "s" : ""} sin guardar`
              : "Sin cambios pendientes"}
          </span>
        </div>
        {esAdmin && (
          <div className="pantalla-barra-der">
            <button className="btn btn--mini"
              onClick={() => { setMatriz(structuredClone(original)); setMensaje(null); }}
              disabled={!cambios.length || guardando}>
              <Icono nombre="restablecer" tam={14} />
              Descartar
            </button>
            <button className="btn btn--primary btn--mini"
              onClick={() => setConfirmando(true)}
              disabled={!cambios.length || guardando}>
              <Icono nombre="verificado" tam={14} />
              Guardar cambios
            </button>
          </div>
        )}
      </div>

      {mensaje && (
        <div className={`pantalla-aviso ${mensaje.tipo === "ok" ? "es-ok" : "es-error"}`}>
          <Icono nombre={mensaje.tipo === "ok" ? "verificado" : "aviso"} tam={16} />
          <span>{mensaje.texto}</span>
        </div>
      )}

      {!esAdmin && (
        <div className="pantalla-aviso">
          <Icono nombre="candado" tam={16} />
          <span>
            Vista de solo lectura. La matriz solo la modifica el administrador, y el
            servidor rechaza el cambio aunque se fuerce desde el navegador.
          </span>
        </div>
      )}

      <div className="panel tabla-envoltura">
        <table className="roles-matriz">
          <thead>
            <tr>
              <th style={{ width: "38%" }}>Permiso</th>
              {ROLES.map((r) => (
                <th key={r.id} style={{ textAlign: "center" }}>{r.nombre}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {GRUPOS.map((g) => (
              <Fragmento key={g.id}>
                <tr className="roles-grupo">
                  <td colSpan={ROLES.length + 1}>
                    <span className="roles-grupo-titulo">{g.titulo}</span>
                    <span className="roles-grupo-sub">{g.sub}</span>
                  </td>
                </tr>
                {PERMISOS.filter((p) => p.grupo === g.id).map((p) => (
                  <tr key={p.id}>
                    <td className="celda-nombre">{p.etiqueta}</td>
                    {ROLES.map((r) => {
                      const activo = Boolean(matriz?.[r.id]?.[p.id]);
                      const motivo = bloqueado(r.id, p.id);
                      return (
                        <td key={r.id} style={{ textAlign: "center" }}>
                          <button type="button"
                            className={`roles-celda${activo ? " activa" : ""}${motivo ? " fija" : ""}`}
                            onClick={() => alternar(r.id, p.id)}
                            disabled={Boolean(motivo)}
                            aria-pressed={activo}
                            aria-label={`${p.etiqueta} · ${r.nombre}: ${activo ? "permitido" : "denegado"}`}
                            title={motivo || (activo ? "Permitido · clic para denegar"
                                                     : "Denegado · clic para permitir")}>
                            <Icono nombre={activo ? "verificado" : "cerrar"} tam={14} />
                          </button>
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </Fragmento>
            ))}
          </tbody>
        </table>
      </div>

      <div className="pantalla-aviso">
        <Icono nombre="informacion" tam={16} />
        <span>
          El <strong>Administrador</strong> no tiene por defecto los permisos de
          operación del GIS: administra el sistema, no opera el análisis. Es una
          decisión de diseño, no una limitación de la pantalla — si se le marcan
          aquí, el servidor se los concede de verdad. Guardar exige confirmar con
          la contraseña de administrador y los cambios se aplican al instante.
        </span>
      </div>

      {confirmando && (
        <Dialogo
          titulo="Confirmar cambios en los permisos"
          icono="candado"
          etiquetaConfirmar="Confirmar y guardar"
          enfocarConfirmar={false}   // el foco va al campo de la contraseña
          onConfirmar={guardar}
          onCerrar={() => { setConfirmando(false); setPassword(""); }}
          mensaje={
            <>Vas a cambiar quién puede hacer qué en el sistema. Escribe tu contraseña
            de administrador para confirmar.</>
          }
          detalle={
            <>
              {cambios.map((c, i) => (
                <div key={i}>
                  {c.ahora ? "+ " : "− "}{c.rol}: {c.permiso}
                </div>
              ))}
              <label className="field-label" style={{ marginTop: 12 }}>
                Contraseña de administrador
              </label>
              <input className="input" type="password" value={password} autoFocus
                onChange={(e) => setPassword(e.target.value)} />
            </>
          }
        />
      )}
    </div>
  );
}

// <tbody> no admite <div>, así que los grupos se agrupan con un fragmento.
function Fragmento({ children }) {
  return <>{children}</>;
}
