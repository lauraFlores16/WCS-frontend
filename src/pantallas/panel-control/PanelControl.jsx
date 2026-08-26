// Panel de control — ahora los parámetros llegan RELLENOS.
//
// Antes: DEFAULTS con foco_fila 40, columna 40, p_base 0.3… números escritos a
// mano que no representaban nada. Ahora, al abrir la pantalla, se consulta
// Open-Meteo (condiciones reales), NASA FIRMS (focos activos), el DEM
// Copernicus y OpenStreetMap, y cada campo llega con su valor derivado y una
// nota que explica de dónde salió.
//
// Los sliders siguen siendo editables a propósito: sirven para hacer
// "¿y si...?" (¿y si el viento fuera el doble? ¿y si hubiera 5 °C más?).
// El botón "Restaurar valores automáticos" devuelve el escenario real.
import { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { useEscenario } from "../../nucleo/EscenarioContext";
import { derivarParametros } from "../../local/parametros_auto";
import { cargarDem, cargarTerrenoOsm, estadisticasDem } from "../../local/api_terreno";
import { leerCalibracion } from "../../local/calibracion";
import { simulacionLocal } from "../../local/api";
import "./estilos/PanelControl.css";

export default function PanelControl() {
  const { seleccionarEscenario, foco } = useEscenario();
  const navigate = useNavigate();

  const [auto, setAuto] = useState(null);       // resultado de derivarParametros
  const [form, setForm] = useState(null);       // copia editable
  const [dem, setDem] = useState(null);
  const [terreno, setTerreno] = useState(null);
  const [estado, setEstado] = useState("cargando");
  const [enviando, setEnviando] = useState(false);
  const [error, setError] = useState(null);

  const [calibracion, setCalibracion] = useState(null);

  useEffect(() => {
    leerCalibracion().then(setCalibracion).catch(() => setCalibracion(null));
  }, []);

  const derivar = useCallback(async () => {
    setEstado("cargando");
    setError(null);
    try {
      // Una sola llamada al backend: él resuelve meteorología, climatología,
      // FIRMS y calibración, y responde desde su caché si ya lo tenía.
      const resultado = await derivarParametros({ foco });
      setAuto(resultado);
      setForm({ ...resultado.parametros });

      // Capa 1: relieve alrededor del foco + hidrografía del municipio.
      // Si alguna falla no se corta el flujo: el escenario ya es utilizable.
      try {
        setDem(await cargarDem({
          fila: resultado.parametros.foco_fila,
          columna: resultado.parametros.foco_columna,
        }, { radio: 20 }));
      } catch (e) { console.warn("DEM no disponible:", e.message); }

      try { setTerreno(await cargarTerrenoOsm()); }
      catch (e) { console.warn("OSM no disponible:", e.message); }

      setEstado("listo");
    } catch (e) {
      console.error(e);
      setError(e.response?.data?.detail || e.message);
      setEstado("error");
    }
  }, [foco]);

  useEffect(() => { derivar(); }, [derivar]);

  const set = (campo) => (e) => {
    const val = e.target.type === "number" || e.target.type === "range"
      ? Number(e.target.value) : e.target.value;
    setForm((f) => ({ ...f, [campo]: val }));
  };

  // ¿El usuario tocó algo respecto del valor automático?
  const modificado = (campo) =>
    auto && form && String(auto.parametros[campo]) !== String(form[campo]);

  async function ejecutar(e) {
    e.preventDefault();
    setEnviando(true);
    setError(null);
    try {
      // El DEM, las barreras de OSM y las constantes calibradas ya no viajan
      // desde el navegador: el backend los tiene en su caché.
      const { data } = await simulacionLocal.ejecutar(form, { radioDem: 20 });
      seleccionarEscenario(data.escenario_id);
      navigate("/monitoreo");
    } catch (err) {
      setError(err.response?.data?.detail || err.message || "No se pudo ejecutar la simulación.");
    } finally {
      setEnviando(false);
    }
  }

  if (estado === "cargando" || !form) {
    return (
      <div className="page">
        <div className="page-header">
          <div>
            <h1 className="page-title">Panel de control</h1>
            <p className="page-subtitle">Derivando el escenario a partir de datos en vivo…</p>
          </div>
        </div>
        <div className="panel panel-control-form">
          <p className="text-muted" style={{ fontSize: 13 }}>
            El backend está consultando Open-Meteo (condiciones actuales y climatología
            ERA5), NASA FIRMS (focos activos), el DEM Copernicus (relieve) y OpenStreetMap
            (ríos y caminos). Si alguna no responde, el escenario se arma igual con los
            promedios ERA5 del grid y aquí se indicará con qué se trabajó.
          </p>
          {error && <div className="panel-control-error">{error}</div>}
        </div>
      </div>
    );
  }

  const est = estadisticasDem(dem);

  return (
    <div className="page">
      <div className="page-header">
        <div>
          <h1 className="page-title">Panel de control</h1>
          <p className="page-subtitle">
            Escenario derivado automáticamente · edita cualquier campo para explorar hipótesis
          </p>
        </div>
        <button className="btn" onClick={derivar} disabled={estado === "cargando"}>
          Restaurar valores automáticos
        </button>
      </div>

      {/* --- Resumen de las fuentes usadas --- */}
      <div className="panel panel-control-fuentes">
        {(auto?.diagnostico || []).map((d, i) => (
          <div key={i} className="panel-control-fuente">
            <div className="panel-control-fuente-etiqueta">{d.etiqueta}</div>
            <div className="mono panel-control-fuente-valor">{d.valor}</div>
            <div className="panel-control-fuente-origen">{d.fuente}</div>
            {d.nota && <div className="panel-control-fuente-nota">{d.nota}</div>}
          </div>
        ))}
        {est && (
          <div className="panel-control-fuente">
            <div className="panel-control-fuente-etiqueta">Relieve</div>
            <div className="mono panel-control-fuente-valor">{est.min}–{est.max} m</div>
            <div className="panel-control-fuente-origen">Copernicus DEM GLO-90</div>
            <div className="panel-control-fuente-nota">
              {est.celdas} celdas con altura real · desnivel {est.desnivel} m.
              El factor de pendiente usa la diferencia de altura entre la celda que arde y su vecina.
            </div>
          </div>
        )}
        {terreno?.resumen && (
          <div className="panel-control-fuente">
            <div className="panel-control-fuente-etiqueta">Hidrografía</div>
            <div className="mono panel-control-fuente-valor">
              {terreno.resumen.barreras_hidricas} celdas barrera
            </div>
            <div className="panel-control-fuente-origen">OpenStreetMap · Overpass</div>
            <div className="panel-control-fuente-nota">
              {terreno.resumen.rios} ríos · {terreno.resumen.quebradas} quebradas ·
              {" "}{terreno.resumen.caminos} caminos (cortafuegos)
            </div>
          </div>
        )}
      </div>

      {auto?.errorMeteo && (
        <div className="panel-control-error" style={{ marginBottom: 14 }}>
          Trabajando con los promedios ERA5 empaquetados en grid.csv: la API
          meteorológica no está disponible en este momento.
        </div>
      )}

      <form onSubmit={ejecutar} className="panel panel-control-form">
        <Campo label="Nombre del escenario" auto={modificado("nombre_escenario")}>
          <input className="input" value={form.nombre_escenario} onChange={set("nombre_escenario")} />
        </Campo>

        <div className="panel-control-fila-doble">
          <Campo label="Fila del foco" auto={modificado("foco_fila")}>
            <input type="number" className="input" value={form.foco_fila} onChange={set("foco_fila")} required />
          </Campo>
          <Campo label="Columna del foco" auto={modificado("foco_columna")}>
            <input type="number" className="input" value={form.foco_columna} onChange={set("foco_columna")} required />
          </Campo>
        </div>

        <Slider label="Temperatura (Δ °C respecto a la climatología ERA5)" campo="delta_temperatura_c"
          value={form.delta_temperatura_c} onChange={set("delta_temperatura_c")}
          min={-10} max={15} step={0.5} modificado={modificado("delta_temperatura_c")}
          formato={(v) => `${v > 0 ? "+" : ""}${v} °C`} />

        <Slider label="Viento (multiplicador de la serie horaria real)" campo="multiplicador_viento"
          value={form.multiplicador_viento} onChange={set("multiplicador_viento")}
          min={0.1} max={5} step={0.1} modificado={modificado("multiplicador_viento")}
          formato={(v) => `×${v.toFixed(1)}`}
          ayuda={form.serie_viento
            ? `Serie real de ${form.serie_viento.length} h cargada. ×1.0 = viento tal como está previsto.`
            : "Sin serie en vivo: multiplica el viento ERA5 promedio del grid."} />

        <Slider label="Humedad (Δ respecto a la climatología ERA5)" campo="delta_humedad"
          value={form.delta_humedad} onChange={set("delta_humedad")}
          min={-1} max={1} step={0.05} modificado={modificado("delta_humedad")}
          formato={(v) => `${v > 0 ? "+" : ""}${(v * 100).toFixed(0)}%`} />

        <Slider label="Probabilidad base de propagación" campo="p_base"
          value={form.p_base} onChange={set("p_base")}
          min={0.01} max={1} step={0.01} modificado={modificado("p_base")}
          formato={(v) => v.toFixed(2)}
          ayuda={calibracion
            ? `Calibrada con evolución diferencial contra perímetros reales (F1 ${(calibracion.f1 * 100).toFixed(1)}%), ajustada por el peligro meteorológico de hoy.`
            : "Sin calibrar. Córrela desde Monitoreo → panel de decisiones → «Calibrar constantes K»."} />

        <Slider label="Número de iteraciones" campo="num_iteraciones"
          value={form.num_iteraciones} onChange={set("num_iteraciones")}
          min={1} max={200} step={1} modificado={modificado("num_iteraciones")}
          formato={(v) => `${v} pasos · ${((v * (form.minutos_por_iteracion || 15)) / 60).toFixed(1)} h simuladas`} />

        {error && <div className="panel-control-error">{error}</div>}

        <button type="submit" className="btn btn--primary" disabled={enviando} style={{ width: "100%" }}>
          {enviando ? "Ejecutando simulación…" : "Ejecutar simulación"}
        </button>
      </form>
    </div>
  );
}

function Campo({ label, children, auto }) {
  return (
    <div className="panel-control-campo">
      <label className="field-label">
        {label}
        {auto && <span className="panel-control-editado">editado</span>}
      </label>
      {children}
    </div>
  );
}

function Slider({ label, value, onChange, min, max, step, formato, modificado, ayuda }) {
  return (
    <div className="panel-control-slider">
      <div className="panel-control-slider-cabecera">
        <label className="field-label" style={{ marginBottom: 8 }}>
          {label}
          {modificado && <span className="panel-control-editado">editado</span>}
        </label>
        <span className="mono panel-control-slider-valor">{formato(value)}</span>
      </div>
      <input type="range" min={min} max={max} step={step} value={value}
        onChange={onChange} style={{ width: "100%" }} />
      {ayuda && <div className="panel-control-ayuda">{ayuda}</div>}
    </div>
  );
}
