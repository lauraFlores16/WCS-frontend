// ============================================================================
// MONITOREO — pantalla GIS
// ============================================================================
//   ┌──────┬────────────────────────────────────────────┬──────────────┐
//   │ MENÚ │  capas · temporada · región · fondo        │  PANEL       │
//   │ (del │  ┌──────────────────────────────────────┐  │  DERECHO     │
//   │ shell│  │                                      │  │  deslizable  │
//   │  )   │  │              MAPA                    │  │              │
//   │      │  │                                      │  │ Ubicación    │
//   │      │  └──────────────────────────────────────┘  │ Alertas      │
//   │      │  leyenda · reproducción                    │ Simulación   │
//   └──────┴────────────────────────────────────────────┴──────────────┘
//
//   · El MAPA manda: es la única pieza elástica. Todo el espacio que se gana
//     al cerrar el panel derecho se lo queda él.
//   · Los datos NO viven en una fila fija encima del mapa: aparecen en el
//     panel derecho cuando se seleccionan, y se cierra para recuperar espacio.
//   · Al tocar una celda, un foco o una alerta, el panel se abre solo en
//     "Ubicación": es el flujo mapa → seleccionar → consultar → simular.
//
// DATOS: todo pasa por el backend (que resguarda las claves, cachea y hace
// cola). El navegador solo pinta.
import { useEffect, useRef, useState, useCallback } from "react";
import BaseMap, { FONDOS } from "../../nucleo/BaseMap";
import SelectorEscenario from "../../nucleo/SelectorEscenario";
import Icono from "../../nucleo/Icono";
import PanelDeslizable from "../../nucleo/PanelDeslizable";
import ConsolaClima from "../../nucleo/consola/ConsolaClima";
import { usePermisos } from "../../nucleo/PermisosContext";
import { useEscenario } from "../../nucleo/EscenarioContext";
import { cargarGrid } from "../../local/datos";
import { colorTopografia, colorAmbiental, colorProbabilidad, celdaMasCercana } from "../../local/capas";
import { cargarFocosFirmsEnVivo } from "../../local/nasa_firms";
import { verificarProbabilidadIncendio } from "../../local/verificacion_probabilidad";
import { calcularTiempoPropagacion, compararConHistoricoTiempo } from "../../local/tiempo_propagacion";
import { compararConHistoricos } from "../../local/comparacion";
import { derivarParametros } from "../../local/parametros_auto";
import { cargarDem, cargarTerrenoOsm, estadisticasDem } from "../../local/api_terreno";
import { calibrar, leerCalibracion } from "../../local/calibracion";
import { monitoreoApi } from "./api";
import { historicosApi } from "./api-historicos";
import { escenariosLocal, simulacionLocal, informesLocal } from "../../local/api";
import SelectorCapas, { LeyendaCapa } from "./componentes/SelectorCapas";
import CapaColoreada from "./componentes/CapaColoreada";
import CapaPropagacion from "./componentes/CapaPropagacion";
import CapaFocosFirms from "./componentes/CapaFocosFirms";
import EspectroTiempoReal from "./componentes/EspectroTiempoReal";
import LimiteMunicipio from "./componentes/LimiteMunicipio";
import CapturadorClic from "./componentes/CapturadorClic";
import MarcadorFoco from "./componentes/MarcadorFoco";
import MarcadoresHistoricos from "./componentes/MarcadoresHistoricos";
import PanelAlertas from "./componentes/PanelAlertas";
import PanelUbicacion from "./componentes/PanelUbicacion";
import PanelDecisiones from "./componentes/PanelDecisiones";
import { CurvaPropagacion, RadarVigilancia } from "./componentes/PanelSecundarios";
import NotificacionProbabilidad from "./componentes/NotificacionProbabilidad";
import PanelTiempoPropagacion from "./componentes/PanelTiempoPropagacion";
import SelectorRegion from "./componentes/SelectorRegion";
import SelectorTemporada from "./componentes/SelectorTemporada";
import { regionPorId } from "../../local/regiones";
import { generarInformeIncendio } from "../historial/informe_incendio";
import VisorInforme from "../historial/VisorInforme";
import "./estilos/Monitoreo.css";

export default function Monitoreo() {
  const { puede } = usePermisos();
  const { escenarioId, foco, seleccionarFoco, seleccionarEscenario } = useEscenario();

  const [fondo, setFondo] = useState("satelite");
  const [mapa, setMapa] = useState(null);
  const onMapReady = useCallback((m) => setMapa(m), []);

  const [grid, setGrid] = useState([]);
  const [capaActiva, setCapaActiva] = useState(3);
  const [modoClic, setModoClic] = useState(false);
  const [regionId, setRegionId] = useState(null);
  const [incluirTemporada, setIncluirTemporada] = useState(false);
  const [temporada, setTemporada] = useState("auto");
  const [historicos, setHistoricos] = useState([]);
  const [mostrarHistoricos, setMostrarHistoricos] = useState(true);

  // --- Panel derecho: abierto/cerrado y pestaña activa ---
  const [panelAbierto, setPanelAbierto] = useState(true);
  const [pestana, setPestana] = useState("ubicacion");

  const [focosFirms, setFocosFirms] = useState([]);
  const [firmsCargando, setFirmsCargando] = useState(false);
  const [firmsError, setFirmsError] = useState(null);
  const [focoFirmsSel, setFocoFirmsSel] = useState(null);

  const [verificacion, setVerificacion] = useState(null);

  const [auto, setAuto] = useState(null);
  const [estadoAuto, setEstadoAuto] = useState("vacio");
  const [terreno, setTerreno] = useState(null);
  const [dem, setDem] = useState(null);
  const [calibracion, setCalibracion] = useState(null);
  const [progresoCalibracion, setProgresoCalibracion] = useState(null);
  const [metadatosMotor, setMetadatosMotor] = useState(null);

  // --- Consola interactiva -------------------------------------------------
  // El camino que se recorre de verdad en operación: ves un foco activo de
  // FIRMS o salta una alerta, y lanzas la consola AHÍ MISMO, sin cambiar de
  // pantalla ni volver a marcar el punto. `paramsConsola` guarda los
  // parámetros derivados para ese punto concreto; `claveConsola` fuerza a
  // React a montar una consola nueva cuando se cambia de foco, para que no
  // arrastre la sesión del anterior.
  const [paramsConsola, setParamsConsola] = useState(null);
  const [preparandoConsola, setPreparandoConsola] = useState(false);
  const [errorConsola, setErrorConsola] = useState(null);
  const [itsConsola, setItsConsola] = useState([]);
  const [claveConsola, setClaveConsola] = useState(0);

  const [simulacion, setSimulacion] = useState(null);
  const [indice, setIndice] = useState(0);
  const [reproduciendo, setReproduciendo] = useState(false);
  const timer = useRef(null);

  const [tiempoProp, setTiempoProp] = useState(null);
  const [comparacionHist, setComparacionHist] = useState(null);
  const [escenarioCompleto, setEscenarioCompleto] = useState(null);

  const [alertasActivas, setAlertasActivas] = useState([]);
  const [alertasHistorial, setAlertasHistorial] = useState([]);
  const [mostrarHistorialAlertas, setMostrarHistorialAlertas] = useState(false);
  const [puntosGrafica, setPuntosGrafica] = useState([]);
  const [cargando, setCargando] = useState(false);

  const puedeSimular = puede("ejecutar_simulacion");
  const pasoCapa = 1;

  useEffect(() => {
    cargarGrid().then((g) => setGrid(g));
    historicosApi.listar().then(({ data }) => setHistoricos(data)).catch(() => setHistoricos([]));
    leerCalibracion().then(setCalibracion).catch(() => setCalibracion(null));
  }, []);

  useEffect(() => {
    cargarTerrenoOsm()
      .then((t) => setTerreno(t))
      .catch((e) => console.warn("Capa 1 (OSM) no disponible:", e.message));
  }, []);

  const cargarAlertasRiesgo = useCallback(() => {
    monitoreoApi.alertasRiesgo()
      .then(({ data }) => { setAlertasActivas(data || []); setAlertasHistorial(data || []); })
      .catch(() => { /* si el backend no responde, se deja como esté */ });
  }, []);

  const refrescarAuto = useCallback(async () => {
    setEstadoAuto("cargando");
    try {
      const resultado = await derivarParametros({
        foco,
        temporada: { incluir: incluirTemporada, temporada },
      });
      setAuto(resultado);
      try {
        const alturas = await cargarDem({
          fila: resultado.parametros.foco_fila,
          columna: resultado.parametros.foco_columna,
        }, { radio: 20 });
        setDem(alturas);
      } catch (e) { console.warn("DEM no disponible:", e.message); }
      setEstadoAuto("listo");
    } catch (e) {
      console.error(e);
      setAuto({ diagnostico: [], errorMeteo: e.response?.data?.detail || e.message });
      setEstadoAuto("error");
    }
  }, [foco, incluirTemporada, temporada]);

  useEffect(() => { if (!auto) refrescarAuto(); }, [auto, refrescarAuto]);

  useEffect(() => {
    if (foco) refrescarAuto();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [foco?.fila, foco?.columna]);

  useEffect(() => {
    refrescarAuto();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [incluirTemporada, temporada]);

  function ejecutarVerificacion(lat, lon) {
    if (grid.length === 0) return;
    setVerificacion(verificarProbabilidadIncendio(lat, lon, grid, historicos));
  }

  const cargarFirms = useCallback(() => {
    setFirmsCargando(true);
    setFirmsError(null);
    cargarFocosFirmsEnVivo()
      .then((r) => {
        const focos = r.focos ?? [];
        setFocosFirms(focos);
        if (r.respaldo === "historico") {
          setFirmsError(r.mensaje || `Mostrando ${focos.length} focos históricos reales del municipio.`);
        } else if (focos.length) {
          setFirmsError(null);
        }
      })
      .catch(() => setFirmsError("NASA FIRMS no responde ahora. El foco se elige por probabilidad XGBoost."))
      .finally(() => setFirmsCargando(false));
  }, []);

  useEffect(() => {
    if (capaActiva === 3 && focosFirms.length === 0) cargarFirms();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [capaActiva]);

  /** Abre el panel derecho en "Ubicación": es el flujo natural tras seleccionar. */
  function mostrarUbicacion() {
    setPestana("ubicacion");
    setPanelAbierto(true);
  }

  function ponerFoco(lat, lon, zoom = 13, { abrirPanel = true } = {}) {
    const celda = celdaMasCercana(grid, lat, lon);
    if (!celda) return null;
    seleccionarFoco(celda);
    setModoClic(false);
    ejecutarVerificacion(celda.lat, celda.lon);
    if (mapa) mapa.flyTo([celda.lat, celda.lon], zoom, { duration: 1.4 });
    if (abrirPanel) mostrarUbicacion();
    return celda;
  }

  const usarFocoFirms = (f) => { setFocoFirmsSel(f); ponerFoco(f.lat, f.lon); };
  const usarFocoHistorico = (ev) => { setFocoFirmsSel(null); ponerFoco(ev.foco.lat, ev.foco.lon, 12); };

  function irAlertaAlFoco(alerta) {
    if (!Number.isFinite(alerta?.lat) || !Number.isFinite(alerta?.lon)) return;
    setFocoFirmsSel(null);
    ponerFoco(alerta.lat, alerta.lon, 13);
    if (capaActiva !== 3 && capaActiva !== 4) setCapaActiva(3);
  }

  async function ejecutarSimulacion() {
    if (!auto?.parametros) return;
    setCargando(true);
    try {
      const { data } = await simulacionLocal.ejecutar(auto.parametros, { radioDem: 20 });
      setMetadatosMotor(data.metadatos_motor || null);
      seleccionarEscenario(data.escenario_id);
      setCapaActiva(4);
      setPestana("simulacion");
      setPanelAbierto(true);
    } catch (e) {
      console.error(e);
    } finally {
      setCargando(false);
    }
  }

  // "Simular aquí": deriva el escenario de ESTE punto y ejecuta con ese
  // resultado. No sirve reutilizar ejecutarSimulacion(), porque `auto` se
  // recalcula en un efecto y todavía tendría los parámetros del foco anterior.
  async function simularEnPunto(lat, lon) {
    const celda = ponerFoco(lat, lon, 13, { abrirPanel: false });
    if (!celda) return;
    setCargando(true);
    setEstadoAuto("cargando");
    try {
      const resultado = await derivarParametros({
        foco: celda,
        temporada: { incluir: incluirTemporada, temporada },
      });
      setAuto(resultado);
      setEstadoAuto("listo");
      const { data } = await simulacionLocal.ejecutar(resultado.parametros, { radioDem: 20 });
      setMetadatosMotor(data.metadatos_motor || null);
      seleccionarEscenario(data.escenario_id);
      setCapaActiva(4);
      setPestana("simulacion");
      setPanelAbierto(true);
    } catch (e) {
      console.error("No se pudo simular desde ese punto:", e);
      setEstadoAuto("error");
    } finally {
      setCargando(false);
    }
  }

  const simularEnAlerta = (a) => simularEnPunto(a.lat, a.lon);
  const simularEnCelda = (c) => simularEnPunto(c.lat, c.lon);

  // "Abrir la consola aquí": mismo punto de partida que «Simular aquí», pero
  // en vez de resolver las N iteraciones de un tirón deja la corrida viva para
  // poder pararla e inyectarle un suceso del tiempo.
  async function consolaEnPunto(lat, lon) {
    const celda = ponerFoco(lat, lon, 13, { abrirPanel: false });
    if (!celda) return;

    // La pestaña salta PRIMERO, antes de derivar nada. Derivar los parámetros
    // de un punto pide la meteorología del municipio y puede tardar unos
    // segundos; si se esperara a tenerlos para cambiar de pestaña, el botón se
    // quedaría mudo y parecería que no hizo nada. Así se ve al instante dónde
    // ha ido a parar el clic, y la propia consola dice que está preparándose.
    setParamsConsola(null);
    setItsConsola([]);
    setClaveConsola((k) => k + 1);   // consola nueva: no arrastra la sesión anterior
    setPestana("consola");
    setPanelAbierto(true);
    setPreparandoConsola(true);
    setEstadoAuto("cargando");

    try {
      const resultado = await derivarParametros({
        foco: celda,
        temporada: { incluir: incluirTemporada, temporada },
      });
      setAuto(resultado);
      setEstadoAuto("listo");
      setParamsConsola(resultado.parametros);
      setCapaActiva(4);
    } catch (e) {
      console.error("No se pudieron derivar los parámetros de ese punto:", e);
      setEstadoAuto("error");
      setErrorConsola(e?.response?.data?.detail || e.message
        || "No se pudieron derivar los parámetros de este punto.");
    } finally {
      setPreparandoConsola(false);
    }
  }

  const consolaEnAlerta = (a) => consolaEnPunto(a.lat, a.lon);
  const consolaEnCelda = (c) => consolaEnPunto(c.lat, c.lon);

  function irARegion(id) {
    setRegionId(id);
    const region = regionPorId(id);
    if (!region) return;
    if (mapa) mapa.flyTo([region.lat, region.lon], region.zoom || 12, { duration: 1.6 });
    const celda = celdaMasCercana(grid, region.lat, region.lon);
    if (celda) {
      seleccionarFoco(celda);
      ejecutarVerificacion(celda.lat, celda.lon);
    }
  }

  async function ejecutarCalibracion() {
    setProgresoCalibracion(0);
    try {
      const resultado = await calibrar({ onProgreso: (f) => setProgresoCalibracion(f) });
      setCalibracion(resultado);
      await refrescarAuto();
    } catch (e) {
      console.error("Calibración fallida:", e);
    } finally {
      setProgresoCalibracion(null);
    }
  }

  useEffect(() => {
    if (!escenarioId) {
      setSimulacion(null); setPuntosGrafica([]);
      setTiempoProp(null); setComparacionHist(null); setEscenarioCompleto(null);
      cargarAlertasRiesgo();
      return;
    }
    setCargando(true);
    Promise.all([
      monitoreoApi.simulacion(escenarioId),
      monitoreoApi.alertasActivas(escenarioId),
      monitoreoApi.alertasHistorial(escenarioId),
      monitoreoApi.graficaPropagacion(escenarioId),
      escenariosLocal.obtenerCompleto(escenarioId),
    ]).then(([sim, activas, historial, grafica, completo]) => {
      setSimulacion(sim.data);
      setIndice(0);
      if (activas.data?.length) setAlertasActivas(activas.data);
      if (historial.data?.length) setAlertasHistorial(historial.data);
      setPuntosGrafica(grafica.data);

      const esc = completo.data;
      setEscenarioCompleto(esc);
      if (esc.metadatos_motor) setMetadatosMotor(esc.metadatos_motor);
      const tiempo = calcularTiempoPropagacion(esc, new Date());
      setTiempoProp(tiempo);

      if (esc.foco_coordenadas && esc.variables_promedio) {
        compararConHistoricos({ foco: esc.foco_coordenadas, variables: esc.variables_promedio })
          .then((ranking) => {
            if (ranking && ranking[0] && tiempo) {
              setComparacionHist(compararConHistoricoTiempo(tiempo, ranking[0].evento));
            }
          });
      }
    }).catch((e) => console.error("No se pudo cargar el escenario:", e))
      .finally(() => setCargando(false));
  }, [escenarioId, cargarAlertasRiesgo]);

  useEffect(() => {
    if (!reproduciendo || !simulacion) return;
    timer.current = setInterval(() => {
      setIndice((i) => {
        if (i >= simulacion.iteraciones.length - 1) { setReproduciendo(false); return i; }
        return i + 1;
      });
    }, 500);
    return () => clearInterval(timer.current);
  }, [reproduciendo, simulacion]);

  const [informeVisor, setInformeVisor] = useState(null);
  function generarReporte() {
    if (!escenarioCompleto) return;
    const html = generarInformeIncendio(escenarioCompleto);
    setInformeVisor({ html, nombre: escenarioCompleto.nombre });
    informesLocal.guardar({
      escenario_id: escenarioCompleto.escenario_id,
      nombre: escenarioCompleto.nombre, html,
      resumen: { area_final_ha: escenarioCompleto.area_final_ha ?? null },
    }).catch(() => { /* si falla el guardado, el informe igual se muestra */ });
  }

  // Cuando la consola está viva, el mapa enseña SU último paso: es una
  // corrida en curso, no una grabación que se rebobina.
  const iteracion = (pestana === "consola" && itsConsola.length)
    ? itsConsola[itsConsola.length - 1]
    : simulacion?.iteraciones?.[indice];
  const enCapasProbabilidad = capaActiva === 2 || capaActiva === 3;

  const colorCapa1 = (c) => {
    const clase = terreno?.clases?.get(c.id);
    if (clase === "rio" || clase === "agua") return "#2f6fd0";
    if (clase === "quebrada") return "#4a9fd8";
    if (clase === "camino") return "#b9b0a0";
    return colorTopografia(c).color;
  };

  // --- Configuración del panel derecho ---
  const PESTANAS = [
    { id: "ubicacion", label: "Ubicación", icono: "ubicacion" },
    { id: "alertas", label: "Alertas", insignia: alertasActivas.length || null, icono: "aviso" },
    { id: "simulacion", label: "Simulación", icono: "simulacion" },
    { id: "consola", label: "Consola", icono: "grafica" },
  ];

  const TITULO_PESTANA = {
    ubicacion: { t: "Información de la ubicación", s: foco ? `Celda ${foco.fila} · ${foco.columna}` : "Selecciona un punto en el mapa" },
    alertas: { t: "Alertas", s: "Del municipio y de la simulación en curso" },
    simulacion: { t: "Decisiones de la simulación", s: "Parámetros derivados automáticamente" },
    consola: { t: "Consola de simulación", s: "Paso a paso, con el tiempo que lo mueve" },
  }[pestana];

  return (
    <div className="monitoreo">

      {/* ---------- CENTRO: controles + mapa + pie ---------- */}
      <div className="monitoreo-mapa-zona">

        <div className="monitoreo-controles">
          <SelectorCapas capaActiva={capaActiva} setCapaActiva={setCapaActiva} />
          <div className="monitoreo-controles-derecha">
            <SelectorRegion regionId={regionId} onSeleccionar={irARegion} compacto />
            <SelectorTemporada
              incluir={incluirTemporada} setIncluir={setIncluirTemporada}
              temporada={temporada} setTemporada={setTemporada}
              resumen={auto?.parametros?.temporada} />
            <SelectorEscenario compacto />
            <div className="monitoreo-fondo-selector">
              {Object.entries(FONDOS).map(([key, cfg]) => (
                <button key={key} className={`monitoreo-fondo-btn${fondo === key ? " activo" : ""}`}
                  onClick={() => setFondo(key)}>{cfg.label}</button>
              ))}
            </div>
            <button className={`btn btn--mini${modoClic ? " btn--primary" : ""}`}
              onClick={() => setModoClic((v) => !v)} title="Marcar el foco con un clic en el mapa">
              <Icono nombre="ubicacion" tam={13} />
              {modoClic ? "Clic activo" : "Marcar foco"}
            </button>
            <button className={`btn btn--mini${mostrarHistoricos ? " btn--primary" : ""}`}
              onClick={() => setMostrarHistoricos((v) => !v)}>
              <Icono nombre="historial" tam={13} />
              Históricos
            </button>
            {capaActiva === 3 && (
              <button className="btn btn--mini" onClick={cargarFirms} disabled={firmsCargando}>
                <Icono nombre="refrescar" tam={13} />
                {firmsCargando ? "…" : "FIRMS"}
              </button>
            )}
          </div>
        </div>

        <div className="monitoreo-mapa-contenedor">
          {simulacion && (capaActiva === 4 || capaActiva === 5) && (
            <EspectroTiempoReal simulacion={simulacion} indice={indice} foco={foco} />
          )}
          <BaseMap fondo={fondo} onMapReady={onMapReady} style={{ height: "100%" }}>
            <LimiteMunicipio visible={true} />

            {grid.length > 0 && capaActiva === 1 && (
              <CapaColoreada celdas={grid} colorDe={colorCapa1} opacidad={0.55} paso={pasoCapa} />
            )}
            {grid.length > 0 && capaActiva === 2 && (
              <CapaColoreada celdas={grid} colorDe={(c) => colorAmbiental(c).color} opacidad={0.5} paso={pasoCapa} />
            )}
            {capaActiva === 3 && focosFirms.length > 0 && (
              <CapaFocosFirms focos={focosFirms} onSeleccionarFoco={usarFocoFirms} />
            )}
            {grid.length > 0 && (capaActiva === 4 || capaActiva === 5) && (
              <CapaColoreada celdas={grid} colorDe={(c) => colorProbabilidad(c.prob_ignicion)} opacidad={0.3} paso={pasoCapa} />
            )}

            {(capaActiva === 4 || capaActiva === 5) && iteracion && <CapaPropagacion celdas={iteracion.celdas} />}

            {capaActiva !== 5 && <MarcadorFoco foco={foco} />}
            <CapturadorClic activo={modoClic} onClic={(lat, lon) => { setFocoFirmsSel(null); ponerFoco(lat, lon); }} />

            {enCapasProbabilidad && verificacion && <NotificacionProbabilidad verificacion={verificacion} />}

            {mostrarHistoricos && historicos.length > 0 && (
              <MarcadoresHistoricos eventos={historicos} onUsarComoFoco={usarFocoHistorico} />
            )}
          </BaseMap>
        </div>

        <div className="monitoreo-pie">
          <LeyendaCapa capaActiva={capaActiva} />

          {(capaActiva === 4 || capaActiva === 5) && simulacion && iteracion && (
            <div className="monitoreo-transporte">
              <button className="btn btn--primary btn--mini monitoreo-btn-reproducir"
                onClick={() => setReproduciendo((r) => !r)}
                aria-label={reproduciendo ? "Pausar" : "Reproducir"}>
                <Icono nombre={reproduciendo ? "pausa" : "reproducir"} tam={13} />
              </button>
              <input type="range" min={0} max={simulacion.iteraciones.length - 1}
                value={indice} onChange={(e) => { setReproduciendo(false); setIndice(Number(e.target.value)); }}
                className="monitoreo-slider" aria-label="Iteración de la simulación" />
              <span className="mono monitoreo-transporte-info">
                iter {iteracion.iteracion}/{simulacion.iteraciones.length - 1}
                {iteracion.viento && ` · viento ${iteracion.viento.velocidad_ms} m/s`}
              </span>
              <span className="mono monitoreo-metrica-inline" style={{ color: "var(--estado-ardiendo)" }}>
                {iteracion.num_celdas_ardiendo} ardiendo
              </span>
              <span className="mono monitoreo-metrica-inline" style={{ color: "var(--estado-quemada)" }}>
                {(iteracion.num_celdas_quemadas * 25).toLocaleString("es")} ha
              </span>
              {escenarioCompleto && puede("generar_reportes") && (
                <button className="btn btn--mini monitoreo-btn-reporte" onClick={generarReporte}>
                  <Icono nombre="reportes" tam={13} />
                  Reporte
                </button>
              )}
            </div>
          )}

          {capaActiva === 5 && (
            <PanelTiempoPropagacion tiempo={tiempoProp} comparacionHist={comparacionHist}
              onGenerarReporte={escenarioCompleto ? generarReporte : null} />
          )}

          {regionId && regionPorId(regionId) && (
            <div className="monitoreo-aviso" style={{ borderLeftColor: regionPorId(regionId).dentroDelGrid ? "var(--acento-500)" : "var(--alerta-amarilla)" }}>
              <strong>{regionPorId(regionId).nombre}:</strong> {regionPorId(regionId).descripcion}
              {!regionPorId(regionId).dentroDelGrid &&
                " El modelo de probabilidad no cubre esta zona; se ancla al borde del grid más cercano."}
            </div>
          )}
          {capaActiva === 3 && firmsError && <div className="monitoreo-aviso">{firmsError}</div>}
          {cargando && <span className="text-muted" style={{ fontSize: 12 }}>Cargando…</span>}
        </div>
      </div>

      {/* ---------- DERECHA: panel contextual ---------- */}
      <PanelDeslizable
        abierto={panelAbierto}
        onAlternar={() => setPanelAbierto((v) => !v)}
        titulo={TITULO_PESTANA.t}
        subtitulo={TITULO_PESTANA.s}
        iconoPestana="informacion"
        etiquetaPestana="Información"
        pestanas={PESTANAS}
        pestanaActiva={pestana}
        onCambiarPestana={setPestana}
        acciones={pestana !== "consola" && puedeSimular && (
          <button className="btn btn--primary panel-btn-principal"
            onClick={ejecutarSimulacion} disabled={estadoAuto !== "listo" || cargando}>
            <Icono nombre="simulacion" tam={15} />
            {cargando ? "Simulando…" : "Ejecutar simulación"}
          </button>
        )}
      >
        {pestana === "ubicacion" && (
          <PanelUbicacion
            celda={foco}
            meteo={auto?.meteo}
            dem={dem}
            focoFirms={focoFirmsSel}
            onSimularAqui={simularEnCelda}
            onConsolaAqui={consolaEnCelda}
            puedeSimular={puedeSimular}
          />
        )}

        {pestana === "alertas" && (
          <>
            <PanelAlertas
              activas={alertasActivas}
              historial={alertasHistorial}
              mostrarHistorial={mostrarHistorialAlertas}
              setMostrarHistorial={setMostrarHistorialAlertas}
              onIrAlFoco={irAlertaAlFoco}
              onSimularAqui={simularEnAlerta}
              onConsolaAqui={consolaEnAlerta}
              puedeSimular={puedeSimular}
              simulando={cargando}
              focoActual={foco}
            />
            <RadarVigilancia verificacion={verificacion} grid={grid} />
          </>
        )}

        {pestana === "consola" && (
          <ConsolaClima
            key={claveConsola}
            parametros={paramsConsola || (preparandoConsola ? null : auto?.parametros) || null}
            preparando={preparandoConsola}
            errorExterno={errorConsola}
            onIteraciones={setItsConsola}
          />
        )}

        {pestana === "simulacion" && (
          <PanelDecisiones
            estado={estadoAuto}
            diagnostico={auto?.diagnostico}
            parametros={auto?.parametros}
            nivel={auto?.nivel}
            errorMeteo={auto?.errorMeteo}
            terreno={terreno?.resumen}
            dem={estadisticasDem(dem)}
            calibracion={calibracion}
            metadatosMotor={metadatosMotor}
            onRefrescar={refrescarAuto}
            onCalibrar={ejecutarCalibracion}
            progresoCalibracion={progresoCalibracion}
            puntosGrafica={puntosGrafica}
          >
            <CurvaPropagacion puntos={puntosGrafica} />
          </PanelDecisiones>
        )}
      </PanelDeslizable>

      {informeVisor && (
        <VisorInforme html={informeVisor.html} nombre={informeVisor.nombre} onCerrar={() => setInformeVisor(null)} />
      )}
    </div>
  );
}
