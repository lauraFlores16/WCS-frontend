// ============================================================================
// DASHBOARD DEL ADMINISTRADOR
// ============================================================================
// Deliberadamente NO es el tablero geoespacial del Analista. El Administrador
// administra el sistema: cuentas, actividad y estado. No hay mapa, ni focos,
// ni probabilidad, ni simulación — ni siquiera de consulta.
//
// Todo sale de datos reales: /api/usuarios, /api/bitacora y /api/estado.
import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis,
} from "recharts";
import Icono from "../../nucleo/Icono";
import { pedir } from "../../local/cliente";
import { usuariosApi } from "../usuarios/api";
import "./estilos/Dashboard.css";

const ETIQUETA_TIPO = {
  auth: "Accesos", sim: "Simulaciones", user: "Usuarios",
  data: "Datos", alert: "Alertas", report: "Informes", sys: "Sistema",
};

const nf = (n) => (n == null ? "—" : n.toLocaleString("es"));

function TooltipActividad({ active, payload }) {
  if (!active || !payload?.length) return null;
  const d = payload[0].payload;
  return (
    <div className="grafica-tooltip">
      <div className="grafica-tooltip-titulo">{d.nombre}</div>
      <div className="grafica-tooltip-valor">{nf(payload[0].value)} registros</div>
    </div>
  );
}

export default function DashboardAdmin() {
  const navigate = useNavigate();
  const [usuarios, setUsuarios] = useState([]);
  const [bitacora, setBitacora] = useState([]);
  const [estado, setEstado] = useState(null);
  const [cargando, setCargando] = useState(true);

  useEffect(() => {
    Promise.all([
      usuariosApi.listar().then(({ data }) => data || []).catch(() => []),
      pedir("/api/bitacora").catch(() => []),
      pedir("/api/estado").catch(() => null),
    ]).then(([u, b, e]) => {
      setUsuarios(u); setBitacora(b || []); setEstado(e);
    }).finally(() => setCargando(false));
  }, []);

  const resumen = useMemo(() => {
    const activos = usuarios.filter((u) => u.activo !== false).length;
    const porRol = new Map();
    for (const u of usuarios) porRol.set(u.rol, (porRol.get(u.rol) || 0) + 1);

    const porTipo = new Map();
    for (const b of bitacora) {
      const t = b.tipo || "data";
      porTipo.set(t, (porTipo.get(t) || 0) + 1);
    }
    const actividad = [...porTipo.entries()]
      .map(([tipo, n]) => ({ nombre: ETIQUETA_TIPO[tipo] || tipo, registros: n }))
      .sort((a, b) => b.registros - a.registros);

    return {
      total: usuarios.length,
      activos,
      inactivos: usuarios.length - activos,
      porRol: [...porRol.entries()].sort((a, b) => b[1] - a[1]),
      actividad,
    };
  }, [usuarios, bitacora]);

  if (cargando) {
    return (
      <div className="tablero">
        <div className="tablero-cargando">
          <Icono nombre="usuarios" tam={22} />
          <span>Cargando el estado del sistema…</span>
        </div>
      </div>
    );
  }

  const indicadores = [
    { icono: "usuarios", label: "Usuarios registrados", valor: nf(resumen.total), nota: "cuentas en el sistema" },
    { icono: "verificado", label: "Activos", valor: nf(resumen.activos), nota: "pueden iniciar sesión", color: "var(--riesgo-bajo)" },
    { icono: "cerrar", label: "Desactivados", valor: nf(resumen.inactivos), nota: "acceso bloqueado", color: resumen.inactivos ? "var(--alerta-naranja)" : undefined },
    { icono: "roles", label: "Roles definidos", valor: nf(resumen.porRol.length), nota: "perfiles en uso" },
    { icono: "bitacora", label: "Registros de actividad", valor: nf(bitacora.length), nota: "en la bitácora" },
  ];

  return (
    <div className="tablero">

      <section className="tablero-indicadores">
        {indicadores.map((i) => (
          <article key={i.label} className="indicador">
            <span className="indicador-icono" style={i.color ? { color: i.color } : undefined}>
              <Icono nombre={i.icono} tam={16} />
            </span>
            <div className="indicador-texto">
              <span className="indicador-label">{i.label}</span>
              <span className="indicador-valor" style={i.color ? { color: i.color } : undefined}>
                {i.valor}
              </span>
              <span className="indicador-nota">{i.nota}</span>
            </div>
          </article>
        ))}
      </section>

      <div className="tablero-rejilla">

        {/* ---------- Actividad registrada ---------- */}
        <section className="panel tablero-caja tablero-caja--ancha">
          <header className="caja-cabecera">
            <div>
              <h2 className="caja-titulo">Actividad del sistema</h2>
              <p className="caja-sub">Registros de la bitácora agrupados por tipo</p>
            </div>
            <button className="btn btn--mini" onClick={() => navigate("/bitacora")}>
              Ver bitácora
              <Icono nombre="derecha" tam={14} />
            </button>
          </header>

          {resumen.actividad.length ? (
            <ResponsiveContainer width="100%" height={192}>
              <BarChart data={resumen.actividad} layout="vertical"
                margin={{ top: 4, right: 16, bottom: 0, left: 8 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border-subtle)" horizontal={false} />
                <XAxis type="number" stroke="var(--text-muted)" fontSize={11}
                  tickLine={false} axisLine={false} />
                <YAxis type="category" dataKey="nombre" stroke="var(--text-muted)" fontSize={11}
                  width={92} tickLine={false} axisLine={false} />
                <Tooltip cursor={{ fill: "var(--bg-panel-hover)" }} content={<TooltipActividad />} />
                {/* Una sola serie: un color; la longitud ya codifica la magnitud */}
                <Bar dataKey="registros" fill="var(--acento-500)" radius={[0, 4, 4, 0]} barSize={18} />
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <p className="caja-vacio">La bitácora todavía no tiene registros.</p>
          )}
        </section>

        {/* ---------- Reparto por rol ---------- */}
        <section className="panel tablero-caja">
          <header className="caja-cabecera">
            <div>
              <h2 className="caja-titulo">Cuentas por rol</h2>
              <p className="caja-sub">Reparto actual de perfiles</p>
            </div>
          </header>

          <div className="roles-lista">
            {resumen.porRol.map(([rol, n]) => {
              const pct = resumen.total ? (n / resumen.total) * 100 : 0;
              return (
                <div key={rol} className="rol-fila">
                  <div className="rol-cabecera">
                    <span className="rol-nombre">{rol}</span>
                    <span className="rol-conteo mono">{n}</span>
                  </div>
                  <div className="rol-barra">
                    <div className="rol-barra-relleno" style={{ width: `${pct}%` }} />
                  </div>
                </div>
              );
            })}
          </div>

          <button className="btn btn--mini rol-boton" onClick={() => navigate("/usuarios")}>
            <Icono nombre="usuarios" tam={14} />
            Gestionar usuarios
          </button>
        </section>

        {/* ---------- Estado del sistema ---------- */}
        <section className="panel tablero-caja">
          <header className="caja-cabecera">
            <div>
              <h2 className="caja-titulo">Estado del sistema</h2>
              <p className="caja-sub">Servicios y almacenamiento</p>
            </div>
          </header>

          {estado ? (
            <div className="fuentes-lista">
              <EstadoFila ok nombre="Backend" desc={`${estado.servicio} · v${estado.version}`} />
              <EstadoFila ok={estado.almacen === "supabase"} nombre="Base de datos"
                desc={estado.almacen === "supabase" ? "Supabase (PostgreSQL)" : `Almacén: ${estado.almacen}`} />
              <EstadoFila ok={estado.grid_cargado} nombre="Grid espacial"
                desc={`${nf(estado.celdas)} celdas en memoria`} />
              <EstadoFila ok={estado.firms_configurada} nombre="NASA FIRMS"
                desc={estado.firms_configurada
                  ? "Clave configurada"
                  : "Sin clave: se usan focos históricos"} />
              {Object.entries(estado.colas || {}).map(([host, c]) => (
                <EstadoFila key={host} ok={c.disponible} nombre={host}
                  desc={c.disponible
                    ? `${c.peticiones_ultimo_minuto}/${c.limite_por_minuto} peticiones por minuto`
                    : `No responde · reintento en ${c.reintenta_en_s} s`} />
              ))}
            </div>
          ) : (
            <p className="caja-vacio">No se pudo consultar el estado del backend.</p>
          )}
        </section>

        {/* ---------- Últimos movimientos ---------- */}
        <section className="panel tablero-caja tablero-caja--ancha">
          <header className="caja-cabecera">
            <div>
              <h2 className="caja-titulo">Últimos movimientos</h2>
              <p className="caja-sub">Actividad más reciente registrada</p>
            </div>
          </header>

          {bitacora.length ? (
            <div className="tabla-envoltura">
              <table>
                <thead>
                  <tr><th>Fecha</th><th>Usuario</th><th>Acción</th><th>Detalle</th><th>Tipo</th></tr>
                </thead>
                <tbody>
                  {bitacora.slice(0, 8).map((b) => (
                    <tr key={b.id}>
                      <td className="mono text-muted">
                        {b.fecha ? new Date(b.fecha).toLocaleString("es", {
                          day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit",
                        }) : "—"}
                      </td>
                      <td>{b.usuario || "—"}</td>
                      <td className="celda-nombre">{b.accion}</td>
                      <td className="text-muted celda-detalle">{b.detalle || "—"}</td>
                      <td><span className="etiqueta-tipo">{ETIQUETA_TIPO[b.tipo] || b.tipo}</span></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <p className="caja-vacio">Sin movimientos registrados todavía.</p>
          )}
        </section>
      </div>
    </div>
  );
}

function EstadoFila({ ok, nombre, desc }) {
  return (
    <div className="fuente-fila">
      <span className="fuente-punto" style={{ background: ok ? "var(--riesgo-bajo)" : "var(--alerta-naranja)" }} />
      <span className="fuente-nombre">{nombre}</span>
      <span className="fuente-desc">{desc}</span>
    </div>
  );
}
