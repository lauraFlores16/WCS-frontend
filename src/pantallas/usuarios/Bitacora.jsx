// ============================================================================
// BITÁCORA DE ACTIVIDAD  (permiso `ver_bitacora`)
// ============================================================================
// Registro único y compartido: lo escribe el servidor, no cada navegador. Es
// lo que se espera de una auditoría — si el usuario pudiera borrarla desde las
// herramientas de desarrollo, no serviría como registro.
//
// Cambios de la Fase 2:
//   · Fuera el `page-header`: la barra superior ya escribe «Bitácora ·
//     Registro de actividad». El hueco lo ocupa ahora la barra de filtros.
//   · Los tipos se enseñan con su nombre en español («Accesos») y no con el
//     código en mayúsculas («AUTH»), que era jerga de la base de datos.
//   · Un solo color para las fichas de tipo. Antes `alert` salía rojo y `sim`
//     naranja, con lo que la bitácora parecía un tablero de alarmas cuando lo
//     único que hace es clasificar. El rojo, en este sistema, significa fuego.
//   · Rango de fechas y exportación a CSV: una auditoría que no se puede
//     acotar ni sacar del sistema no sirve para adjuntarla a un informe.
import { useEffect, useMemo, useState } from "react";
import Icono from "../../nucleo/Icono";
import { listarBitacora } from "../../local/bitacora_store";
import "../../nucleo/estilos/Pantalla.css";
import "./estilos/GestionUsuarios.css";

const TIPOS = [
  { id: "todos", label: "Todos" },
  { id: "auth", label: "Accesos" },
  { id: "sim", label: "Simulaciones" },
  { id: "alert", label: "Alertas" },
  { id: "user", label: "Usuarios" },
  { id: "report", label: "Informes" },
  { id: "data", label: "Datos" },
  { id: "sys", label: "Sistema" },
];
const ETIQUETA = Object.fromEntries(TIPOS.map((t) => [t.id, t.label]));

const RANGOS = [
  { id: "todo", label: "Todo el historial", dias: null },
  { id: "hoy", label: "Hoy", dias: 0 },
  { id: "7", label: "Últimos 7 días", dias: 7 },
  { id: "30", label: "Últimos 30 días", dias: 30 },
];

function fechaHora(t) {
  const d = new Date(t);
  if (Number.isNaN(d.getTime())) return "—";
  const hoy = new Date();
  if (d.toDateString() === hoy.toDateString()) {
    return d.toLocaleTimeString("es-BO", { hour: "2-digit", minute: "2-digit" });
  }
  return d.toLocaleString("es-BO", {
    day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit",
  });
}

// Punto de corte del rango, en milisegundos. `dias: 0` es «desde las 00:00 de
// hoy», que no es lo mismo que «las últimas 24 horas».
function desdeCuando(dias) {
  if (dias == null) return -Infinity;
  if (dias === 0) {
    const d = new Date();
    d.setHours(0, 0, 0, 0);
    return d.getTime();
  }
  return Date.now() - dias * 86400000;
}

export default function Bitacora() {
  const [filtro, setFiltro] = useState("todos");
  const [rango, setRango] = useState("todo");
  const [busqueda, setBusqueda] = useState("");
  const [registros, setRegistros] = useState([]);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState(null);

  function cargar() {
    setCargando(true);
    setError(null);
    listarBitacora()
      .then(setRegistros)
      .catch((e) => setError(e?.response?.data?.detail || e.message))
      .finally(() => setCargando(false));
  }
  useEffect(cargar, []);

  const corte = desdeCuando(RANGOS.find((r) => r.id === rango)?.dias);

  // Cuántos registros hay de cada tipo DENTRO del rango de fechas, para poder
  // enseñar el número en cada ficha. Se cuenta sobre el rango pero no sobre la
  // búsqueda: si no, al escribir se vaciarían todas las fichas menos una.
  const conteos = useMemo(() => {
    const c = { todos: 0 };
    for (const r of registros) {
      if (r.t < corte) continue;
      c.todos += 1;
      c[r.tp] = (c[r.tp] || 0) + 1;
    }
    return c;
  }, [registros, corte]);

  const filtrados = useMemo(() => {
    const q = busqueda.trim().toLowerCase();
    return registros.filter((l) => {
      if (l.t < corte) return false;
      if (filtro !== "todos" && l.tp !== filtro) return false;
      if (q && !`${l.u} ${l.a} ${l.d}`.toLowerCase().includes(q)) return false;
      return true;
    });
  }, [registros, filtro, corte, busqueda]);

  // CSV con `;` y BOM: es lo que abre Excel en español sin pedir nada.
  function exportarCsv() {
    const filas = [
      ["Fecha", "Usuario", "Acción", "Detalle", "Tipo"],
      ...filtrados.map((l) => [
        new Date(l.t).toLocaleString("es-BO"),
        l.u, l.a, l.d, ETIQUETA[l.tp] || l.tp,
      ]),
    ];
    const csv = filas
      .map((f) => f.map((c) => `"${String(c ?? "").replace(/"/g, '""')}"`).join(";"))
      .join("\r\n");
    const url = URL.createObjectURL(
      new Blob(["﻿" + csv], { type: "text/csv;charset=utf-8;" }));
    const a = document.createElement("a");
    a.href = url;
    a.download = `bitacora_sipro_${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }

  return (
    <div className="pantalla">

      <div className="pantalla-barra">
        <div className="pantalla-barra-izq">
          <label className="pantalla-buscar">
            <Icono nombre="buscar" tam={15} />
            <input className="input" placeholder="Buscar usuario, acción o detalle…"
              value={busqueda} onChange={(e) => setBusqueda(e.target.value)} />
            {busqueda && (
              <button className="pantalla-buscar-limpiar" onClick={() => setBusqueda("")}
                aria-label="Limpiar búsqueda">
                <Icono nombre="cerrar" tam={13} />
              </button>
            )}
          </label>

          <select className="select" value={rango} onChange={(e) => setRango(e.target.value)}>
            {RANGOS.map((r) => <option key={r.id} value={r.id}>{r.label}</option>)}
          </select>

          <span className="pantalla-conteo">
            {filtrados.length === conteos.todos
              ? `${filtrados.length} registros`
              : `${filtrados.length} de ${conteos.todos}`}
          </span>
        </div>

        <div className="pantalla-barra-der">
          <button className="btn btn--mini" onClick={cargar} disabled={cargando}>
            <Icono nombre="refrescar" tam={14} />
            {cargando ? "Actualizando…" : "Actualizar"}
          </button>
          <button className="btn btn--mini" onClick={exportarCsv} disabled={!filtrados.length}>
            <Icono nombre="descargar" tam={14} />
            Exportar CSV
          </button>
        </div>
      </div>

      <div className="pantalla-fichas">
        {TIPOS.map((t) => {
          const n = conteos[t.id] || 0;
          return (
            <button key={t.id}
              className={`pantalla-ficha${filtro === t.id ? " activa" : ""}`}
              onClick={() => setFiltro(t.id)}
              disabled={t.id !== "todos" && !n}>
              {t.label}
              <span className="pantalla-ficha-n">{n}</span>
            </button>
          );
        })}
      </div>

      {error && (
        <div className="pantalla-aviso es-error">
          <Icono nombre="aviso" tam={16} />
          <span>No se pudo leer la bitácora: {error}</span>
        </div>
      )}

      <div className="panel tabla-envoltura">
        <table>
          <thead>
            <tr>
              <th>Cuándo</th><th>Usuario</th><th>Acción</th><th>Detalle</th><th>Tipo</th>
            </tr>
          </thead>
          <tbody>
            {filtrados.map((l, i) => (
              <tr key={`${l.t}-${i}`}>
                <td className="mono text-muted" style={{ whiteSpace: "nowrap" }}>{fechaHora(l.t)}</td>
                <td className="celda-nombre">{l.u}</td>
                <td>{l.a}</td>
                <td className="text-muted celda-detalle">{l.d || "—"}</td>
                <td><span className="bitacora-tag">{ETIQUETA[l.tp] || l.tp}</span></td>
              </tr>
            ))}
            {!filtrados.length && (
              <tr>
                <td colSpan={5}>
                  <div className="pantalla-vacio">
                    <Icono nombre="bitacora" tam={26} />
                    <span className="pantalla-vacio-titulo">
                      {cargando ? "Leyendo la bitácora del servidor…"
                        : error ? "No se pudo cargar"
                        : !registros.length ? "Todavía no hay actividad registrada"
                        : "Ningún registro coincide"}
                    </span>
                    {!cargando && !error && registros.length > 0 && (
                      <p>
                        Prueba a ampliar el rango de fechas o a quitar el filtro de tipo.
                      </p>
                    )}
                    {!cargando && !error && !registros.length && (
                      <p>
                        La bitácora se llena sola: inicios de sesión, simulaciones,
                        cambios de usuarios y de permisos quedan registrados aquí.
                      </p>
                    )}
                  </div>
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
