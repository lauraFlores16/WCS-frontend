// ============================================================================
// HISTORIAL DE ESCENARIOS  (permiso `ver_simulaciones`)
// ============================================================================
// La lista de todo lo que se ha simulado, con el informe de cada escenario.
//
// Cambios de la Fase 2
// --------------------
//   · Fuera el `page-header` duplicado (la barra superior ya pone «Historial ·
//     Simulaciones guardadas»).
//   · Búsqueda, orden por columna y filtro por alerta máxima. Una tabla que
//     solo crece y no se puede ordenar deja de servir a la tercera semana.
//   · `alert()` fuera: el error de generación se enseña en la propia pantalla,
//     que además no bloquea el hilo del navegador.
//   · Borrar escenario. El backend ya lo soportaba (DELETE /api/escenarios/:id,
//     que arrastra sus alertas e informes), pero no había forma de llamarlo
//     desde la interfaz.
//   · `area_final_quemada_ha.toLocaleString()` reventaba la pantalla entera si
//     el campo venía a null —un escenario interrumpido, por ejemplo—. Ahora se
//     formatea con guarda.
import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { escenariosApi } from "../../nucleo/api/escenarios";
import { escenariosLocal, informesLocal } from "../../local/api";
import { useEscenario } from "../../nucleo/EscenarioContext";
import { usePermisos } from "../../nucleo/PermisosContext";
import Icono from "../../nucleo/Icono";
import Dialogo from "../../nucleo/Dialogo";
import { generarInformeIncendio } from "./informe_incendio";
import VisorInforme from "./VisorInforme";
import "../../nucleo/estilos/Pantalla.css";
import "./estilos/HistorialEscenarios.css";

const ALERTAS = [
  { id: "", label: "Todas las alertas" },
  { id: "roja", label: "Solo alerta roja" },
  { id: "naranja", label: "Solo alerta naranja" },
  { id: "amarilla", label: "Solo alerta amarilla" },
];

const COLUMNAS = [
  { id: "nombre", etiqueta: "Escenario", ordenable: true },
  { id: "creado_en", etiqueta: "Fecha", ordenable: true },
  { id: "num_iteraciones_ejecutadas", etiqueta: "Iteraciones", ordenable: true },
  { id: "area_final_quemada_ha", etiqueta: "Área quemada", ordenable: true },
  { id: "alerta_maxima", etiqueta: "Alerta máxima", ordenable: false },
];

// Un número que puede no venir no debe tumbar la tabla entera.
const nf = (n, sufijo = "") =>
  n == null || Number.isNaN(Number(n))
    ? "—"
    : Number(n).toLocaleString("es", { maximumFractionDigits: 1 }) + sufijo;

const fecha = (iso) => {
  const d = new Date(iso);
  return Number.isNaN(d.getTime())
    ? "—"
    : d.toLocaleString("es-BO", { dateStyle: "medium", timeStyle: "short" });
};

export default function HistorialEscenarios() {
  const [escenarios, setEscenarios] = useState([]);
  const [cargando, setCargando] = useState(true);
  const [generando, setGenerando] = useState(null);
  const [informe, setInforme] = useState(null);      // { html, nombre }
  const [error, setError] = useState(null);
  const [borrando, setBorrando] = useState(null);    // escenario a borrar

  const [busqueda, setBusqueda] = useState("");
  const [filtroAlerta, setFiltroAlerta] = useState("");
  const [orden, setOrden] = useState({ campo: "creado_en", desc: true });

  const { seleccionarEscenario } = useEscenario();
  const { puede } = usePermisos();
  const navigate = useNavigate();

  function cargar() {
    setCargando(true);
    escenariosApi.listar()
      .then(({ data }) => { setEscenarios(data || []); setError(null); })
      .catch((e) => setError(e?.response?.data?.detail || e.message))
      .finally(() => setCargando(false));
  }
  useEffect(cargar, []);

  const visibles = useMemo(() => {
    const q = busqueda.trim().toLowerCase();
    const lista = escenarios.filter((e) => {
      if (filtroAlerta && e.alerta_maxima !== filtroAlerta) return false;
      if (q && !`${e.nombre || ""} ${e.escenario_id}`.toLowerCase().includes(q)) return false;
      return true;
    });
    const { campo, desc } = orden;
    return lista.sort((a, b) => {
      const va = campo === "nombre" ? (a.nombre || a.escenario_id) : a[campo];
      const vb = campo === "nombre" ? (b.nombre || b.escenario_id) : b[campo];
      if (va == null) return 1;
      if (vb == null) return -1;
      const cmp = typeof va === "string" ? va.localeCompare(vb, "es") : va - vb;
      return desc ? -cmp : cmp;
    });
  }, [escenarios, busqueda, filtroAlerta, orden]);

  function ordenarPor(campo) {
    setOrden((o) => (o.campo === campo ? { campo, desc: !o.desc } : { campo, desc: true }));
  }

  function verEnMapa(id) {
    seleccionarEscenario(id);
    navigate("/monitoreo");
  }

  async function verInforme(id) {
    setGenerando(id);
    setError(null);
    try {
      const { data } = await escenariosLocal.obtenerCompleto(id);
      const html = generarInformeIncendio(data);
      setInforme({ html, nombre: data.nombre });
      // Se guarda para tener el historial de lo entregado. Si el guardado
      // falla, el informe se enseña igual: verlo no depende de archivarlo.
      informesLocal.guardar({
        escenario_id: id, nombre: data.nombre, html,
        resumen: { area_final_ha: data.area_final_ha ?? null },
      }).catch(() => {});
    } catch (e) {
      setError(`No se pudo generar el informe: ${e?.response?.data?.detail || e.message}`);
    } finally {
      setGenerando(null);
    }
  }

  const puedeVerMapa = puede("ver_monitoreo");

  return (
    <div className="pantalla">

      <div className="pantalla-barra">
        <div className="pantalla-barra-izq">
          <label className="pantalla-buscar">
            <Icono nombre="buscar" tam={15} />
            <input className="input" placeholder="Buscar escenario…"
              value={busqueda} onChange={(e) => setBusqueda(e.target.value)} />
            {busqueda && (
              <button className="pantalla-buscar-limpiar" onClick={() => setBusqueda("")}
                aria-label="Limpiar búsqueda">
                <Icono nombre="cerrar" tam={13} />
              </button>
            )}
          </label>

          <select className="select" value={filtroAlerta}
            onChange={(e) => setFiltroAlerta(e.target.value)}>
            {ALERTAS.map((a) => <option key={a.id} value={a.id}>{a.label}</option>)}
          </select>

          <span className="pantalla-conteo">
            {visibles.length === escenarios.length
              ? `${escenarios.length} escenarios`
              : `${visibles.length} de ${escenarios.length}`}
          </span>
        </div>

        <div className="pantalla-barra-der">
          <button className="btn btn--mini" onClick={cargar} disabled={cargando}>
            <Icono nombre="refrescar" tam={14} />
            {cargando ? "Actualizando…" : "Actualizar"}
          </button>
        </div>
      </div>

      {error && (
        <div className="pantalla-aviso es-error">
          <Icono nombre="aviso" tam={16} />
          <span>{error}</span>
        </div>
      )}

      {visibles.length ? (
        <div className="panel tabla-envoltura">
          <table>
            <thead>
              <tr>
                {COLUMNAS.map((c) => (
                  <th key={c.id}>
                    {c.ordenable ? (
                      <button className={`tabla-orden${orden.campo === c.id ? " activa" : ""}`}
                        onClick={() => ordenarPor(c.id)}>
                        {c.etiqueta}
                        <Icono nombre={orden.campo === c.id && !orden.desc ? "arriba" : "abajo"} tam={12} />
                      </button>
                    ) : c.etiqueta}
                  </th>
                ))}
                <th />
              </tr>
            </thead>
            <tbody>
              {visibles.map((e) => (
                <tr key={e.escenario_id}>
                  <td className="celda-nombre">
                    {e.nombre || <span className="mono">{e.escenario_id.slice(0, 8)}</span>}
                  </td>
                  <td className="mono text-muted">{fecha(e.creado_en)}</td>
                  <td className="mono">{nf(e.num_iteraciones_ejecutadas)}</td>
                  <td className="mono">{nf(e.area_final_quemada_ha, " ha")}</td>
                  <td>
                    {e.alerta_maxima
                      ? <span className={`badge badge--${e.alerta_maxima}`}>{e.alerta_maxima}</span>
                      : <span className="text-muted">—</span>}
                  </td>
                  <td className="celda-acciones">
                    {puedeVerMapa && (
                      <button className="btn btn--mini" onClick={() => verEnMapa(e.escenario_id)}
                        title="Abrir este escenario sobre el mapa">
                        <Icono nombre="mapa" tam={14} />
                        Ver en mapa
                      </button>
                    )}
                    <button className="btn btn--primary btn--mini"
                      onClick={() => verInforme(e.escenario_id)}
                      disabled={generando === e.escenario_id}>
                      <Icono nombre="reportes" tam={14} />
                      {generando === e.escenario_id ? "Generando…" : "Informe"}
                    </button>
                    <button className="btn btn--peligro btn--mini btn--icono"
                      onClick={() => setBorrando(e)}
                      title="Eliminar este escenario"
                      aria-label={`Eliminar ${e.nombre || e.escenario_id}`}>
                      <Icono nombre="basura" tam={14} />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <div className="panel">
          <div className="pantalla-vacio">
            <Icono nombre="historial" tam={28} />
            <span className="pantalla-vacio-titulo">
              {cargando ? "Cargando escenarios…"
                : escenarios.length ? "Ningún escenario coincide"
                : "Todavía no se ha ejecutado ninguna simulación"}
            </span>
            {!cargando && !escenarios.length && (
              <p>
                Cada simulación que ejecutes desde Monitoreo o desde Simulación queda
                guardada aquí, con su informe.
              </p>
            )}
            {!cargando && escenarios.length > 0 && (
              <p>Prueba a quitar el filtro de alerta o a limpiar la búsqueda.</p>
            )}
          </div>
        </div>
      )}

      {informe && (
        <VisorInforme html={informe.html} nombre={informe.nombre}
          onCerrar={() => setInforme(null)} />
      )}

      {borrando && (
        <Dialogo
          titulo="Eliminar escenario"
          peligroso
          etiquetaConfirmar="Eliminar"
          onCerrar={() => setBorrando(null)}
          onConfirmar={async () => {
            await escenariosLocal.borrar(borrando.escenario_id);
            cargar();
          }}
          mensaje={
            <>Se eliminará <strong>{borrando.nombre || borrando.escenario_id.slice(0, 8)}</strong> junto
            con sus alertas e informes. Esta acción no se puede deshacer.</>
          }
          detalle={
            <>
              <div>Ejecutado: {fecha(borrando.creado_en)}</div>
              <div>Iteraciones: {nf(borrando.num_iteraciones_ejecutadas)}</div>
              <div>Área quemada: {nf(borrando.area_final_quemada_ha, " ha")}</div>
            </>
          }
        />
      )}
    </div>
  );
}
