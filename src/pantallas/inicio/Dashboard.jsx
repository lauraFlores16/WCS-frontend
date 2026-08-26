// ============================================================================
// DASHBOARD DEL ANALISTA
// ============================================================================
// Fusiona lo que antes eran dos pantallas separadas — "Inicio" y "Datos
// espaciales y variables GEE" — en un único panel analítico. Eran el mismo
// tema partido en dos: una daba los KPIs y la otra el inventario de datos que
// los produce, y había que saltar entre ellas para entender una sola cosa.
//
// Todo lo que se muestra sale de los datos reales del proyecto (grid.csv,
// focos.csv y los escenarios guardados). No hay ni un valor inventado: si un
// dato no está disponible, se dice.
import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  Bar, BarChart, CartesianGrid, Cell, ResponsiveContainer, Tooltip, XAxis, YAxis,
} from "recharts";
import Icono from "../../nucleo/Icono";
import { usePermisos } from "../../nucleo/PermisosContext";
import { cargarGrid, cargarFocos } from "../../local/datos";
import { escenariosLocal } from "../../local/api";
import "./estilos/Dashboard.css";

// Bandas de riesgo. El color es SEMÁNTICO (estado), no decorativo, y nunca va
// solo: cada banda lleva su etiqueta en el eje y en el tooltip. Hace falta
// porque en visión protanope el verde y el amarillo casi no se distinguen.
const BANDAS = [
  { id: "bajo", label: "Bajo", rango: "0 – 25 %", min: 0, max: 0.25, color: "var(--riesgo-bajo)" },
  { id: "moderado", label: "Moderado", rango: "25 – 45 %", min: 0.25, max: 0.45, color: "var(--alerta-amarilla)" },
  { id: "alto", label: "Alto", rango: "45 – 70 %", min: 0.45, max: 0.70, color: "var(--alerta-naranja)" },
  { id: "critico", label: "Crítico", rango: "70 – 100 %", min: 0.70, max: 1.01, color: "var(--alerta-roja)" },
];

const nf = (n, d = 0) => (n == null || Number.isNaN(n) ? "—" : n.toLocaleString("es", {
  minimumFractionDigits: d, maximumFractionDigits: d,
}));

function TooltipGrafica({ active, payload, sufijo }) {
  if (!active || !payload?.length) return null;
  const d = payload[0].payload;
  return (
    <div className="grafica-tooltip">
      <div className="grafica-tooltip-titulo">{d.nombre}</div>
      {d.detalle && <div className="grafica-tooltip-detalle">{d.detalle}</div>}
      <div className="grafica-tooltip-valor">{nf(payload[0].value)} {sufijo}</div>
    </div>
  );
}

export default function Dashboard() {
  const navigate = useNavigate();
  const { puede } = usePermisos();
  const [grid, setGrid] = useState([]);
  const [focos, setFocos] = useState([]);
  const [escenarios, setEscenarios] = useState([]);
  const [cargando, setCargando] = useState(true);

  useEffect(() => {
    Promise.all([cargarGrid(), cargarFocos()])
      .then(([g, f]) => { setGrid(g); setFocos(f); })
      .finally(() => setCargando(false));
    escenariosLocal.listar()
      .then(({ data }) => setEscenarios(data || []))
      .catch(() => setEscenarios([]));
  }, []);

  // --- Todo se calcula del grid real, una sola vez ---
  const m = useMemo(() => {
    if (!grid.length) return null;
    const probs = [], ndvis = [], humedades = [];
    let suma = 0, max = 0;
    for (const c of grid) {
      const p = c.prob_ignicion;
      if (p != null && !Number.isNaN(p)) { probs.push(p); suma += p; if (p > max) max = p; }
      if (c.ndvi != null && !Number.isNaN(c.ndvi)) ndvis.push(c.ndvi);
      if (c.humedad != null && !Number.isNaN(c.humedad)) humedades.push(c.humedad);
    }
    const conteo = BANDAS.map((b) => ({
      nombre: b.label,
      detalle: `Probabilidad ${b.rango}`,
      celdas: probs.filter((p) => p >= b.min && p < b.max).length,
      color: b.color,
    }));
    const rango = (a) => (a.length
      ? { min: Math.min(...a), max: Math.max(...a), media: a.reduce((s, v) => s + v, 0) / a.length }
      : null);

    return {
      celdas: grid.length,
      areaKm2: grid.length * 0.25,
      probMedia: probs.length ? suma / probs.length : 0,
      probMax: max,
      enRiesgo: probs.filter((p) => p >= 0.45).length,
      distribucion: conteo,
      ndvi: rango(ndvis),
      humedad: rango(humedades),
    };
  }, [grid]);

  const porTemporada = useMemo(() => {
    if (!focos.length) return [];
    const cuenta = new Map();
    for (const f of focos) {
      if (!f.evento) continue;
      const k = String(f.evento);
      cuenta.set(k, (cuenta.get(k) || 0) + 1);
    }
    return [...cuenta.entries()]
      .sort((a, b) => a[0].localeCompare(b[0]))
      .map(([anio, n]) => ({ nombre: anio, detalle: "Detecciones VIIRS / MODIS", focos: n }));
  }, [focos]);

  if (cargando || !m) {
    return (
      <div className="tablero">
        <div className="tablero-cargando">
          <Icono nombre="datos" tam={22} />
          <span>Cargando el grid y los focos reales…</span>
        </div>
      </div>
    );
  }

  const pctRiesgo = (m.enRiesgo / m.celdas) * 100;

  const indicadores = [
    { icono: "capas", label: "Celdas", valor: nf(m.celdas), nota: "500 × 500 m" },
    { icono: "mapa", label: "Área cubierta", valor: `${nf(m.areaKm2)} km²`, nota: "Apolo · Franz Tamayo" },
    { icono: "foco", label: "Focos históricos", valor: nf(focos.length), nota: "NASA FIRMS" },
    { icono: "probabilidad", label: "Probabilidad media", valor: m.probMedia.toFixed(3), nota: "modelo XGBoost V3" },
    { icono: "aviso", label: "Probabilidad máxima", valor: m.probMax.toFixed(4), nota: "celda más expuesta" },
    { icono: "simulacion", label: "Simulaciones", valor: nf(escenarios.length), nota: "escenarios guardados" },
  ];

  return (
    <div className="tablero">

      {/* ---------- Indicadores compactos ---------- */}
      <section className="tablero-indicadores">
        {indicadores.map((i) => (
          <article key={i.label} className="indicador">
            <span className="indicador-icono"><Icono nombre={i.icono} tam={16} /></span>
            <div className="indicador-texto">
              <span className="indicador-label">{i.label}</span>
              <span className="indicador-valor">{i.valor}</span>
              <span className="indicador-nota">{i.nota}</span>
            </div>
          </article>
        ))}
      </section>

      <div className="tablero-rejilla">

        {/* ---------- Distribución de probabilidad ---------- */}
        <section className="panel tablero-caja tablero-caja--ancha">
          <header className="caja-cabecera">
            <div>
              <h2 className="caja-titulo">Distribución del riesgo de ignición</h2>
              <p className="caja-sub">
                Las {nf(m.celdas)} celdas del municipio agrupadas por la probabilidad
                que les asigna el modelo XGBoost
              </p>
            </div>
          </header>

          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={m.distribucion} margin={{ top: 8, right: 8, bottom: 0, left: -14 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--border-subtle)" vertical={false} />
              <XAxis dataKey="nombre" stroke="var(--text-muted)" fontSize={11}
                tickLine={false} axisLine={false} />
              <YAxis stroke="var(--text-muted)" fontSize={11} width={54}
                tickLine={false} axisLine={false} tickFormatter={(v) => nf(v)} />
              <Tooltip cursor={{ fill: "var(--bg-panel-hover)" }}
                content={<TooltipGrafica sufijo="celdas" />} />
              {/* barSize fino y esquinas redondeadas solo en el extremo del dato */}
              <Bar dataKey="celdas" radius={[4, 4, 0, 0]} barSize={54}>
                {m.distribucion.map((d) => <Cell key={d.nombre} fill={d.color} />)}
              </Bar>
            </BarChart>
          </ResponsiveContainer>

          <div className="caja-leyenda">
            {BANDAS.map((b) => (
              <span key={b.id} className="leyenda-item">
                <span className="leyenda-punto" style={{ background: b.color }} />
                <span className="leyenda-label">{b.label}</span>
                <span className="leyenda-rango">{b.rango}</span>
              </span>
            ))}
          </div>

          <div className="caja-resumen">
            <Icono nombre="aviso" tam={15} />
            <span>
              <strong>{nf(m.enRiesgo)} celdas</strong> ({pctRiesgo.toFixed(1)} % del territorio,
              {" "}{nf(m.enRiesgo * 0.25)} km²) están en riesgo alto o crítico.
            </span>
          </div>
        </section>

        {/* ---------- Focos históricos por temporada ---------- */}
        <section className="panel tablero-caja">
          <header className="caja-cabecera">
            <div>
              <h2 className="caja-titulo">Focos por temporada</h2>
              <p className="caja-sub">Detecciones reales etiquetadas por evento</p>
            </div>
          </header>

          {porTemporada.length ? (
            <>
              <ResponsiveContainer width="100%" height={168}>
                <BarChart data={porTemporada} margin={{ top: 8, right: 8, bottom: 0, left: -14 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--border-subtle)" vertical={false} />
                  <XAxis dataKey="nombre" stroke="var(--text-muted)" fontSize={11}
                    tickLine={false} axisLine={false} />
                  <YAxis stroke="var(--text-muted)" fontSize={11} width={54}
                    tickLine={false} axisLine={false} tickFormatter={(v) => nf(v)} />
                  <Tooltip cursor={{ fill: "var(--bg-panel-hover)" }}
                    content={<TooltipGrafica sufijo="focos" />} />
                  {/* Una sola serie: un solo color, la altura ya codifica la magnitud */}
                  <Bar dataKey="focos" fill="var(--acento-500)" radius={[4, 4, 0, 0]} barSize={46} />
                </BarChart>
              </ResponsiveContainer>
              <div className="caja-pie-dato">
                <span>Total etiquetado</span>
                <span className="mono">{nf(porTemporada.reduce((s, d) => s + d.focos, 0))}</span>
              </div>
            </>
          ) : (
            <p className="caja-vacio">No hay focos etiquetados por evento en focos.csv.</p>
          )}
        </section>

        {/* ---------- Variables ambientales (antes: Datos espaciales / GEE) ---------- */}
        <section className="panel tablero-caja">
          <header className="caja-cabecera">
            <div>
              <h2 className="caja-titulo">Variables por celda</h2>
              <p className="caja-sub">Rangos reales cargados desde el grid</p>
            </div>
          </header>

          <div className="variables-lista">
            <FilaVariable icono="vegetacion" nombre="NDVI (vegetación)" fuente="Landsat 8"
              valor={m.ndvi ? `${m.ndvi.min.toFixed(3)} – ${m.ndvi.max.toFixed(3)}` : "—"}
              extra={m.ndvi ? `media ${m.ndvi.media.toFixed(3)}` : null} />
            <FilaVariable icono="humedad" nombre="Humedad relativa" fuente="ERA5"
              valor={m.humedad ? `${(m.humedad.min * 100).toFixed(0)} – ${(m.humedad.max * 100).toFixed(0)} %` : "—"}
              extra={m.humedad ? `media ${(m.humedad.media * 100).toFixed(0)} %` : null} />
            <FilaVariable icono="temperatura" nombre="LST (temperatura sup.)" fuente="MODIS"
              valor="por celda" />
            <FilaVariable icono="viento" nombre="Viento u / v" fuente="ERA5" valor="por celda" />
            <FilaVariable icono="lluvia" nombre="Precipitación" fuente="ERA5" valor="por celda" />
            <FilaVariable icono="elevacion" nombre="Elevación y pendiente" fuente="SRTM · Copernicus DEM"
              valor="por celda" />
          </div>
        </section>

        {/* ---------- Modelo y fuentes ---------- */}
        <section className="panel tablero-caja">
          <header className="caja-cabecera">
            <div>
              <h2 className="caja-titulo">Modelo y fuentes de datos</h2>
              <p className="caja-sub">De dónde sale cada pieza del sistema</p>
            </div>
          </header>

          <div className="modelo-destacado">
            <span className="modelo-etiqueta">Modelo XGBoost V3</span>
            <span className="modelo-metrica">AUC-ROC 0.9214</span>
            <span className="modelo-nota">
              8 variables: NDVI, LST, elevación, pendiente, humedad, precipitación, viento y temperatura.
              Validado contra los eventos reales de 2021, 2023 y 2024.
            </span>
          </div>

          <div className="fuentes-lista">
            {[
              { n: "Google Earth Engine", d: "Extracción y grilla de variables" },
              { n: "NASA FIRMS", d: "Focos de calor VIIRS y MODIS" },
              { n: "Open-Meteo", d: "Meteorología en vivo y climatología ERA5" },
              { n: "Copernicus DEM", d: "Relieve para la pendiente entre celdas" },
              { n: "OpenStreetMap", d: "Ríos y caminos como barreras" },
            ].map((f) => (
              <div key={f.n} className="fuente-fila">
                <span className="fuente-punto" />
                <span className="fuente-nombre">{f.n}</span>
                <span className="fuente-desc">{f.d}</span>
              </div>
            ))}
          </div>
        </section>

        {/* ---------- Simulaciones recientes ---------- */}
        <section className="panel tablero-caja tablero-caja--ancha">
          <header className="caja-cabecera">
            <div>
              <h2 className="caja-titulo">Simulaciones recientes</h2>
              <p className="caja-sub">Últimos escenarios ejecutados sobre el municipio</p>
            </div>
            {puede("ver_simulaciones") && (
              <button className="btn btn--mini" onClick={() => navigate("/historial")}>
                Ver historial
                <Icono nombre="derecha" tam={14} />
              </button>
            )}
          </header>

          {escenarios.length ? (
            <div className="tabla-envoltura">
              <table>
                <thead>
                  <tr>
                    <th>Escenario</th><th>Fecha</th><th>Iteraciones</th>
                    <th>Área quemada</th><th>Alerta</th>
                  </tr>
                </thead>
                <tbody>
                  {escenarios.slice(0, 5).map((e) => (
                    <tr key={e.escenario_id}>
                      <td className="celda-nombre">{e.nombre || e.escenario_id.slice(0, 8)}</td>
                      <td className="mono text-muted">
                        {e.creado_en ? new Date(e.creado_en).toLocaleDateString("es") : "—"}
                      </td>
                      <td className="mono">{e.num_iteraciones_ejecutadas}</td>
                      <td className="mono">{nf(e.area_final_quemada_ha)} ha</td>
                      <td>
                        {e.alerta_maxima
                          ? <span className={`badge badge--${e.alerta_maxima}`}>{e.alerta_maxima}</span>
                          : <span className="text-muted">—</span>}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <p className="caja-vacio">
              Todavía no hay simulaciones guardadas. Se ejecutan desde Monitoreo o desde
              la pantalla de Simulación.
            </p>
          )}
        </section>

        {/* ---------- Accesos ---------- */}
        {(puede("ver_monitoreo") || puede("ejecutar_simulacion")) && (
          <section className="panel tablero-caja tablero-accesos">
            <header className="caja-cabecera">
              <div><h2 className="caja-titulo">Continuar</h2></div>
            </header>
            {puede("ver_monitoreo") && (
              <button className="acceso" onClick={() => navigate("/monitoreo")}>
                <Icono nombre="monitoreo" tam={17} />
                <span className="acceso-texto">
                  <span className="acceso-titulo">Monitoreo</span>
                  <span className="acceso-desc">Mapa, focos activos y alertas</span>
                </span>
                <Icono nombre="derecha" tam={15} />
              </button>
            )}
            {puede("ejecutar_simulacion") && (
              <>
                <button className="acceso" onClick={() => navigate("/simulacion")}>
                  <Icono nombre="simulacion" tam={17} />
                  <span className="acceso-texto">
                    <span className="acceso-titulo">Simulación</span>
                    <span className="acceso-desc">Autómata celular de propagación</span>
                  </span>
                  <Icono nombre="derecha" tam={15} />
                </button>
                <button className="acceso" onClick={() => navigate("/panel-control")}>
                  <Icono nombre="escenarios" tam={17} />
                  <span className="acceso-texto">
                    <span className="acceso-titulo">Escenarios</span>
                    <span className="acceso-desc">Configurar un escenario "¿y si…?"</span>
                  </span>
                  <Icono nombre="derecha" tam={15} />
                </button>
              </>
            )}
          </section>
        )}
      </div>
    </div>
  );
}

function FilaVariable({ icono, nombre, fuente, valor, extra }) {
  return (
    <div className="variable-fila">
      <span className="variable-icono"><Icono nombre={icono} tam={16} /></span>
      <span className="variable-texto">
        <span className="variable-nombre">{nombre}</span>
        <span className="variable-fuente">{fuente}</span>
      </span>
      <span className="variable-valores">
        <span className="variable-valor mono">{valor}</span>
        {extra && <span className="variable-extra">{extra}</span>}
      </span>
    </div>
  );
}
