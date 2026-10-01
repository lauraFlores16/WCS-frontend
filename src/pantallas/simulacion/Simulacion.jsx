// ============================================================================
// SIMULACIÓN DE PROPAGACIÓN — pantalla GIS
// ============================================================================
// El mapa manda. Los controles viven en el panel derecho deslizable, que se
// cierra para devolverle el espacio, y la reproducción es una barra compacta
// que FLOTA sobre el mapa (no una consola inferior que le robe altura).
//
// El panel tiene tres pestañas, que son las tres preguntas de un analista:
//
//   CONFIGURACIÓN   ¿qué estoy simulando?   foco · escenario · tiempo
//   RESULTADO       ¿qué ha salido?         métricas · leyenda · reproducir
//   COMPARAR        ¿cuánto cambia?         Base vs escenario actual
//
// Sobre los escenarios: los cinco presets se traducen a los parámetros y al
// guion que el motor YA aceptaba (ver `escenarios_ambientales.js`). Aquí no se
// inventa ningún canal nuevo ni se toca ninguna regla del autómata.
//
// Sobre la persistencia: los resultados de esta sesión viven en memoria
// (`useState`) para poder comparar Base contra el escenario actual sin
// escribir nada. Lo que sí se persiste es lo de siempre —cada corrida queda
// como escenario en el Historial— porque de eso ya se encargaba el backend.
import { useState, useEffect, useRef, useCallback, useMemo } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import BaseMap, { FONDOS } from "../../nucleo/BaseMap";
import Icono from "../../nucleo/Icono";
import PanelDeslizable from "../../nucleo/PanelDeslizable";
import { usePermisos } from "../../nucleo/PermisosContext";
import { useEscenario } from "../../nucleo/EscenarioContext";
import { cargarGrid } from "../../local/datos";
import { celdaMasCercana } from "../../local/capas";
import { simulacionLocal } from "../../local/api";
import { consolaApi } from "../../nucleo/consola/api";
import ConsolaClima from "../../nucleo/consola/ConsolaClima";
import CapaPropagacion from "../monitoreo/componentes/CapaPropagacion";
import CapturadorClic from "../monitoreo/componentes/CapturadorClic";
import MarcadorFoco from "../monitoreo/componentes/MarcadorFoco";
import LimiteMunicipio from "../monitoreo/componentes/LimiteMunicipio";
import CapaComparacion, { CapaPasos } from "./componentes/CapaComparacion";
import PanelValidacion from "./componentes/PanelValidacion";
import IndicadorActualizacion from "./componentes/IndicadorActualizacion";
import { generarInformeValidacion } from "./componentes/informeValidacion";
import {
  ESCENARIOS_AMBIENTALES,
  ESCENARIO_POR_DEFECTO,
  presetPorId,
  ambienteBase,
  aplicarEscenario,
} from "./escenarios_ambientales";
import "./estilos/Simulacion.css";
import "./estilos/Validacion.css";

const AREA_POR_CELDA_HA = 25;

/** Cómo se llama en pantalla el origen que devuelve el backend. */
const ORIGEN_FOCO = {
  firms: { etiqueta: "NASA FIRMS", icono: "foco" },
  xgboost: { etiqueta: "XGBoost", icono: "probabilidad" },
  manual: { etiqueta: "Manual", icono: "ubicacion" },
  historico: { etiqueta: "Evento histórico", icono: "historial" },
};

/** Minutos → «02 h 15 min», que es como se lee un tiempo de propagación. */
function comoDuracion(minutos) {
  if (minutos == null) return "—";
  const h = Math.floor(minutos / 60);
  const m = Math.round(minutos % 60);
  return `${String(h).padStart(2, "0")} h ${String(m).padStart(2, "0")} min`;
}

export default function Simulacion() {
  const navigate = useNavigate();
  const ubicacion = useLocation();
  // El permiso sale de la MATRIZ, no de una lista de roles escrita a mano.
  const { puede } = usePermisos();
  const puedeSimular = puede("ejecutar_simulacion");

  // El foco es compartido: si viene de Monitoreo, ya está aquí.
  const { foco, seleccionarFoco } = useEscenario();

  const [fondo, setFondo] = useState("satelite");
  const [mapa, setMapa] = useState(null);
  const onMapReady = useCallback((m) => setMapa(m), []);

  const [grid, setGrid] = useState([]);
  const [modoClic] = useState(true);

  // --- Contexto del escenario ---------------------------------------------
  // `auto` = lo que devuelve /simulacion/parametros-auto: parámetros reales,
  // meteorología del momento y el origen del foco. Es la BASE de todo.
  const [auto, setAuto] = useState(null);
  const [catalogo, setCatalogo] = useState([]);
  const [referencias, setReferencias] = useState(null);
  const [cargandoBase, setCargandoBase] = useState(false);
  const [escenarioSel, setEscenarioSel] = useState(ESCENARIO_POR_DEFECTO);

  // --- Resultado y reproducción -------------------------------------------
  const [simulacion, setSimulacion] = useState(null);
  const [indice, setIndice] = useState(0);
  const [reproduciendo, setReproduciendo] = useState(false);
  const [ejecutando, setEjecutando] = useState(false);
  const [errorEjec, setErrorEjec] = useState(null);
  const [velocidad, setVelocidad] = useState(600);
  const [panelAbierto, setPanelAbierto] = useState(true);
  // Escenarios entra aquí con la pestaña ya elegida:
  // navigate("/simulacion", { state: { pestana: "validacion" } })
  const [pestana, setPestana] = useState(
    ubicacion.state?.pestana || "config");
  const timer = useRef(null);

  // Resultados de ESTA sesión, por escenario. Solo memoria: es lo que permite
  // la pestaña COMPARAR sin escribir nada en ningún sitio.
  const [corridas, setCorridas] = useState({});

  // --- Pestaña VALIDACIÓN --------------------------------------------------
  // Es una prueba científica congelada, no un dato operativo: se lee de un
  // archivo estático que genera f14_exportar_frontend.py. Sin base de datos ni
  // endpoint nuevo. Si no existe, la pestaña muestra su estado vacío.
  // Validación histórica. Todo viene de validacion/exportar_frontend.py.
  const [valIndice, setValIndice] = useState(null);
  const [valZona, setValZona] = useState("apolo");
  const [valEvento, setValEvento] = useState(null);
  const [validacion, setValidacion] = useState(null);
  const [valPasos, setValPasos] = useState(null);
  const [valModo, setValModo] = useState("comparacion");
  const [valSemillas, setValSemillas] = useState(true);
  const [valPaso, setValPaso] = useState(0);
  const [valPlay, setValPlay] = useState(false);
  const [valCargando, setValCargando] = useState(false);

  // La consola interactiva sigue existiendo: es lo único que puede parar el
  // autómata a mitad y meterle una tormenta. Se conserva como modo dentro de
  // CONFIGURACIÓN en vez de como pestaña, para no duplicar la navegación.
  const [modo, setModo] = useState("completa");
  const [itsConsola, setItsConsola] = useState([]);

  useEffect(() => { cargarGrid().then(setGrid); }, []);

  // Al cambiar de pestaña el mapa se reencuadra: Validación es otro municipio,
  // a 100 km del área de estudio.
  useEffect(() => {
    if (!mapa) return;
    if (pestana === "validacion") {
      const cajas = {
        apolo: [[-15.330862, -69.115863], [-13.950867, -67.386427]],
        rurrenabaque: [[-15.046462, -67.559663], [-14.343298, -67.073719]],
      };
      mapa.flyToBounds(cajas[valZona] || cajas.apolo,
        { duration: 1.1, padding: [24, 24] });
    } else if (foco) {
      mapa.flyTo([foco.lat, foco.lon], 11, { duration: 1.1 });
    }
  }, [pestana, mapa, valZona]);   // `foco` fuera: no reencuadrar al moverlo

  // El índice al entrar en la pestaña; el evento cuando se elige.
  useEffect(() => {
    if (pestana !== "validacion" || valIndice) return;
    fetch("/datos/validacion_indice.json")
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => {
        if (!d) return;
        setValIndice(d);
        const evs = d.zonas?.apolo || [];
        const primero = evs.find((e) => e.ejecutado) || evs[0];
        if (primero) setValEvento(primero.id);
      })
      .catch(() => { /* sin índice: el panel lo dice */ });
  }, [pestana, valIndice]);

  useEffect(() => {
    if (!valEvento) { setValidacion(null); setValPasos(null); return; }
    const ev = (valIndice?.eventos || []).find((e) => e.id === valEvento);
    if (!ev?.ejecutado) { setValidacion(null); setValPasos(null); return; }
    setValCargando(true);
    setValPaso(0);
    setValPlay(false);
    fetch(`/datos/validacion_${valEvento}.json`)
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => {
        setValidacion(d);
        return fetch(`/datos/validacion_${valEvento}_pasos.json`);
      })
      .then((r) => (r?.ok ? r.json() : null))
      .then((d) => setValPasos(d))
      .catch(() => { setValidacion(null); setValPasos(null); })
      .finally(() => setValCargando(false));
  }, [valEvento, valIndice]);

  // Reproductor: un paso por segundo.
  useEffect(() => {
    if (!valPlay || !valPasos?.total) return undefined;
    const t = setInterval(() => {
      setValPaso((p) => {
        if (p >= valPasos.total - 1) { setValPlay(false); return p; }
        return p + 1;
      });
    }, 1000);
    return () => clearInterval(t);
  }, [valPlay, valPasos]);

  // Índice fila,columna → coordenada, para dibujar los pasos.
  const valIndiceCeldas = useMemo(() => {
    const ix = {};
    for (const c of validacion?.celdas || []) ix[`${c.fila},${c.columna}`] = c;
    return ix;
  }, [validacion]);

  // Catálogo de sucesos meteorológicos del backend: de ahí salen las
  // magnitudes de Lluvia y Crítico.
  useEffect(() => {
    consolaApi.catalogo()
      .then((d) => { setCatalogo(d?.escenarios || []); setReferencias(d?.referencias || null); })
      .catch(() => { setCatalogo([]); setReferencias(null); });
  }, []);

  // Parámetros reales para el foco actual. Sin foco, el backend elige uno
  // (FIRMS si hay actividad, si no la celda de mayor probabilidad XGBoost) y
  // lo devuelve con su origen: ese es el «cargar foco» automático.
  const refrescarBase = useCallback(async (celda) => {
    setCargandoBase(true);
    try {
      const { data } = await simulacionLocal.parametrosAuto(
        celda ? { fila: celda.fila, columna: celda.columna } : {}
      );
      setAuto(data);
      return data;
    } catch (e) {
      console.error("[simulacion] no se pudieron derivar los parámetros", e);
      setAuto(null);
      return null;
    } finally {
      setCargandoBase(false);
    }
  }, []);

  useEffect(() => { refrescarBase(foco); }, [foco, refrescarBase]);

  // Si no había foco y el backend eligió uno, se coloca en el mapa para que se
  // vea DÓNDE va a arrancar. No se reproduce nada: solo se sitúa.
  useEffect(() => {
    if (foco || !auto?.parametros || !grid.length) return;
    const { foco_fila, foco_columna } = auto.parametros;
    const celda = grid.find((c) => c.fila === foco_fila && c.columna === foco_columna);
    if (celda) seleccionarFoco(celda);
  }, [auto, foco, grid, seleccionarFoco]);

  function ponerFoco(lat, lon) {
    const celda = celdaMasCercana(grid, lat, lon);
    if (!celda) return;
    seleccionarFoco(celda);
    if (mapa) mapa.flyTo([celda.lat, celda.lon], 13, { duration: 1.2 });
  }

  // --- El escenario activo, ya resuelto -----------------------------------
  const preset = presetPorId(escenarioSel);
  const base = useMemo(
    () => ambienteBase(auto?.meteo, referencias, foco),
    [auto, referencias, foco]
  );
  const resuelto = useMemo(
    () => aplicarEscenario(preset, base, catalogo, auto?.parametros),
    [preset, base, catalogo, auto]
  );


  const pasos = auto?.parametros?.num_iteraciones ?? 24;
  const minutosPaso = auto?.parametros?.minutos_por_iteracion ?? 15;
  const duracionMin = pasos * minutosPaso;
  const origen = ORIGEN_FOCO[auto?.seleccion_foco?.origen] || ORIGEN_FOCO.manual;

  // --- Ejecutar ------------------------------------------------------------
  async function ejecutar() {
    if (!foco || !auto?.parametros || ejecutando) return;
    setEjecutando(true);
    setErrorEjec(null);
    setReproduciendo(false);
    try {
      // Se parte de los parámetros REALES del backend y solo se sobrescribe lo
      // que el escenario cambia. Así la corrida sigue llevando la calibración,
      // la serie de viento y la semilla que le tocaban.
      const parametros = {
        ...auto.parametros,
        foco_fila: foco.fila,
        foco_columna: foco.columna,
        ...resuelto.parametros,
        guion: resuelto.guion,
        nombre_escenario:
          `${preset.nombre} · Apolo · ${new Date().toLocaleString("es-BO")}`,
      };

      const { data } = await simulacionLocal.ejecutar(parametros);
      const sim = await simulacionLocal.obtener(data.escenario_id);

      setSimulacion(sim.data);
      setIndice(0);
      // NO hay autoplay: la corrida queda lista y esperando el botón.
      setReproduciendo(false);
      setPestana("resultado");

      // Se guarda en memoria para poder comparar contra Base más tarde.
      const its = sim.data?.iteraciones || [];
      const ultima = its[its.length - 1];
      setCorridas((prev) => ({
        ...prev,
        [preset.id]: {
          escenarioId: data.escenario_id,
          nombre: preset.nombre,
          quemadas: ultima?.num_celdas_quemadas ?? 0,
          ardiendo: ultima?.num_celdas_ardiendo ?? 0,
          pasos: Math.max(its.length - 1, 0),
          minutos: Math.max(its.length - 1, 0) * minutosPaso,
        },
      }));
    } catch (e) {
      console.error(e);
      setErrorEjec(e?.response?.data?.detail || e?.message || "No se pudo ejecutar la simulación.");
    } finally {
      setEjecutando(false);
    }
  }

  // --- Reproducción --------------------------------------------------------
  const totalPasos = simulacion ? simulacion.iteraciones.length - 1 : 0;

  useEffect(() => {
    if (!reproduciendo || !simulacion) return;
    timer.current = setInterval(() => {
      setIndice((i) => {
        if (i >= simulacion.iteraciones.length - 1) { setReproduciendo(false); return i; }
        return i + 1;
      });
    }, velocidad);
    return () => clearInterval(timer.current);
  }, [reproduciendo, simulacion, velocidad]);

  const irA = (i) => {
    setReproduciendo(false);
    setIndice(Math.min(Math.max(i, 0), totalPasos));
  };

  function nuevaSimulacion() {
    setReproduciendo(false);
    setSimulacion(null);
    setIndice(0);
    setPestana("config");
  }

  const iteracion = modo === "consola"
    ? itsConsola[itsConsola.length - 1]        // la consola siempre enseña el ahora
    : simulacion?.iteraciones?.[indice];
  const ardiendo = iteracion?.num_celdas_ardiendo ?? 0;
  const quemadas = iteracion?.num_celdas_quemadas ?? 0;
  const areaKm2 = (quemadas * AREA_POR_CELDA_HA) / 100;
  const minutosTranscurridos = (iteracion?.iteracion ?? 0) * minutosPaso;

  // --- ¿Hacia dónde va a ir el fuego? ---
  // OJO: este bloque tiene que ir DESPUÉS de `iteracion`. Estuvo
  // antes y rompía la pantalla entera: el array de dependencias
  // `[auto, foco, iteracion]` se evalúa en el momento de definir el
  // useMemo, y leer una `const` antes de su declaración lanza
  // ReferenceError (zona muerta temporal). La compilación no lo
  // detecta porque es un fallo de ejecución, no de sintaxis.----------------------------------
  // Era la pregunta que la pantalla no contestaba: se veía el foco y el
  // escenario, pero no la dirección. Y el viento es el factor que más
  // gobierna el avance del frente, así que conviene verlo ANTES de ejecutar.
  //
  // Se calcula el acimut desde las componentes u (este) y v (norte) del
  // pronóstico, y se compara con la dirección que ha tomado el frente
  // simulado: el desplazamiento del centroide de las celdas quemadas
  // respecto del foco.
  const brujula = useMemo(() => {
    const u = auto?.meteo?.actual?.viento_u;
    const v = auto?.meteo?.actual?.viento_v;
    const vel = auto?.meteo?.actual?.viento_ms;
    let acimutViento = auto?.meteo?.actual?.viento_direccion;
    if (acimutViento == null && u != null && v != null) {
      // Acimut hacia el que SOPLA: 0° norte, 90° este.
      acimutViento = (Math.atan2(u, v) * 180 / Math.PI + 360) % 360;
    }

    let acimutFrente = null;
    let avanceKm = null;
    if (foco && iteracion?.celdas?.length) {
      const qs = iteracion.celdas.filter(
        (c) => c.estado === "quemada" || c.estado === "ardiendo");
      if (qs.length) {
        const lat = qs.reduce((a, c) => a + c.lat, 0) / qs.length;
        const lon = qs.reduce((a, c) => a + c.lon, 0) / qs.length;
        // En metros, no en grados: a esta latitud un grado de longitud mide
        // un 3 % menos que uno de latitud y el ángulo saldría sesgado.
        const dy = (lat - foco.lat) * 110574;
        const dx = (lon - foco.lon) * 111320 * Math.cos(foco.lat * Math.PI / 180);
        if (Math.hypot(dx, dy) > 250) {
          acimutFrente = (Math.atan2(dx, dy) * 180 / Math.PI + 360) % 360;
          avanceKm = Math.hypot(dx, dy) / 1000;
        }
      }
    }
    const rosa = ["N", "NNE", "NE", "ENE", "E", "ESE", "SE", "SSE",
                  "S", "SSO", "SO", "OSO", "O", "ONO", "NO", "NNO"];
    const cardinal = (g) => (g == null ? null : rosa[Math.round(g / 22.5) % 16]);
    return {
      acimutViento, velViento: vel,
      cardinalViento: cardinal(acimutViento),
      acimutFrente, cardinalFrente: cardinal(acimutFrente), avanceKm,
    };
  }, [auto, foco, iteracion]);

  // --- Comparación Base vs escenario actual --------------------------------
  const comparacion = useMemo(() => {
    const b = corridas.base;
    const a = corridas[escenarioSel];
    if (!b || !a || escenarioSel === "base") return null;
    const dCeldas = a.quemadas - b.quemadas;
    return {
      base: b,
      actual: a,
      dCeldas,
      dArea: (dCeldas * AREA_POR_CELDA_HA) / 100,
      dMin: a.minutos - b.minutos,
      pctArea: b.quemadas ? (dCeldas / b.quemadas) * 100 : null,
    };
  }, [corridas, escenarioSel]);

  // =========================================================================
  return (
    <div className="simulacion">

      {/* ---------- CENTRO: el mapa, que es lo que manda ---------- */}
      <div className="sim-mapa-zona">
        <div className="sim-toolbar">
          <div className="monitoreo-fondo-selector">
            {Object.entries(FONDOS).map(([key, cfg]) => (
              <button key={key} className={`monitoreo-fondo-btn${fondo === key ? " activo" : ""}`}
                onClick={() => setFondo(key)}>{cfg.label}</button>
            ))}
          </div>

          {pestana === "validacion" ? (
            <span className="sim-chip-escenario val-chip">
              <Icono nombre="verificado" tam={13} />
              {validacion?.etiqueta || "Validación histórica"}
            </span>
          ) : (
            <span className="sim-chip-escenario">
              <Icono nombre={preset.icono} tam={13} />
              {preset.nombre}
            </span>
          )}

          {pestana !== "validacion" && (
            <IndicadorActualizacion
              actualizado={auto?.actualizado}
              onRefrescar={() => refrescarBase(foco)}
              cargando={cargandoBase} />
          )}

          {pestana !== "validacion" && !simulacion && (
            <span className="sim-hint">
              <Icono nombre="ubicacion" tam={14} />
              {foco
                ? `Foco en fila ${foco.fila}, columna ${foco.columna}`
                : "Haz clic en el mapa para colocar el foco de ignición"}
            </span>
          )}
        </div>

        <div className="sim-mapa-contenedor">
          <BaseMap fondo={fondo} onMapReady={onMapReady} style={{ height: "100%" }}>
            <LimiteMunicipio
              visible={true}
              zona={pestana === "validacion" ? valZona : "apolo"} />

            {pestana === "validacion" ? (
              <>
                {valModo === "pasos"
                  ? <CapaPasos paso={valPasos?.pasos?.[valPaso]}
                      indice={valIndiceCeldas} />
                  : <CapaComparacion celdas={validacion?.celdas}
                      modo={valModo} verSemillas={valSemillas} />}
              </>
            ) : (
              <>
                {iteracion && <CapaPropagacion celdas={iteracion.celdas} />}
                {foco && <MarcadorFoco foco={foco} />}
                {!simulacion && puedeSimular && (
                  <CapturadorClic activo={modoClic} onClic={ponerFoco} />
                )}
              </>
            )}
          </BaseMap>

          {/* Leyenda compacta de los estados del autómata: los cuatro, con sus
              colores semánticos de siempre. */}
          {pestana !== "validacion" && iteracion && (
            <div className="sim-leyenda-mapa">
              {[
                ["Sin quemar", "var(--estado-no-quemada)"],
                ["Ardiendo", "var(--estado-ardiendo)"],
                ["Quemado", "var(--estado-quemada)"],
                ["Inerte", "var(--estado-no-inflamable)"],
              ].map(([label, color]) => (
                <span key={label} className="sim-leyenda-chip">
                  <i style={{ background: color }} />{label}
                </span>
              ))}
            </div>
          )}

          {/* Brújula: la dirección del viento y la del frente, sobre el mapa.
              Contesta «¿hacia dónde va a ir?», que antes no se veía. */}
          {pestana !== "validacion" && brujula.acimutViento != null && (
            <div className="sim-brujula">
              <div className="sim-brujula-rosa" aria-hidden="true">
                <span className="sim-brujula-n">N</span>
                <span className="sim-brujula-flecha sim-brujula-viento"
                  style={{ transform: `rotate(${brujula.acimutViento}deg)` }}>
                  ▲
                </span>
                {brujula.acimutFrente != null && (
                  <span className="sim-brujula-flecha sim-brujula-frente"
                    style={{ transform: `rotate(${brujula.acimutFrente}deg)` }}>
                    ▲
                  </span>
                )}
              </div>
              <div className="sim-brujula-datos">
                <div className="sim-brujula-fila">
                  <i className="sim-brujula-punto viento" />
                  <span>Viento</span>
                  <strong className="mono">
                    {brujula.cardinalViento} {Math.round(brujula.acimutViento)}°
                  </strong>
                </div>
                {brujula.velViento != null && (
                  <div className="sim-brujula-nota mono">
                    {(brujula.velViento * 3.6).toFixed(1)} km/h
                  </div>
                )}
                {brujula.acimutFrente != null ? (
                  <>
                    <div className="sim-brujula-fila">
                      <i className="sim-brujula-punto frente" />
                      <span>Frente</span>
                      <strong className="mono">
                        {brujula.cardinalFrente} {Math.round(brujula.acimutFrente)}°
                      </strong>
                    </div>
                    <div className="sim-brujula-nota mono">
                      avanzó {brujula.avanceKm.toFixed(1)} km
                    </div>
                  </>
                ) : (
                  <div className="sim-brujula-nota">
                    el frente aún no se ha desplazado
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Barra de transporte FLOTANTE sobre el mapa. Compacta a propósito:
              no vuelve a ser una consola inferior. */}
          {pestana !== "validacion" && simulacion && iteracion && (
            <div className="sim-transporte">
              <div className="sim-transporte-botones">
                <button className="sim-tbtn" onClick={() => irA(0)}
                  title="Ir al inicio" aria-label="Ir al inicio" disabled={indice === 0}>
                  <Icono nombre="izquierda" tam={12} /><Icono nombre="izquierda" tam={12} />
                </button>
                <button className="sim-tbtn" onClick={() => irA(indice - 1)}
                  title="Paso anterior" aria-label="Paso anterior" disabled={indice === 0}>
                  <Icono nombre="izquierda" tam={15} />
                </button>
                <button className="btn btn--primary sim-tbtn-play"
                  onClick={() => setReproduciendo((r) => !r)}
                  aria-label={reproduciendo ? "Pausar" : "Reproducir"}>
                  <Icono nombre={reproduciendo ? "pausa" : "reproducir"} tam={14} />
                  {reproduciendo ? "Pausar" : "Reproducir"}
                </button>
                <button className="sim-tbtn" onClick={() => irA(indice + 1)}
                  title="Paso siguiente" aria-label="Paso siguiente" disabled={indice >= totalPasos}>
                  <Icono nombre="derecha" tam={15} />
                </button>
                <button className="sim-tbtn" onClick={() => irA(totalPasos)}
                  title="Ir al final" aria-label="Ir al final" disabled={indice >= totalPasos}>
                  <Icono nombre="derecha" tam={12} /><Icono nombre="derecha" tam={12} />
                </button>
              </div>

              <input type="range" min={0} max={totalPasos}
                value={indice}
                onChange={(e) => irA(Number(e.target.value))}
                className="sim-slider-transporte" aria-label="Paso de la simulación" />

              <div className="sim-transporte-lectura">
                <span className="mono">Paso {iteracion.iteracion} / {totalPasos}</span>
                <span className="mono sim-transporte-tiempo">
                  {comoDuracion(minutosTranscurridos)} / {comoDuracion(duracionMin)}
                </span>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* ---------- DERECHA: configuración · resultado · comparar ---------- */}
      <PanelDeslizable
        abierto={panelAbierto}
        onAlternar={() => setPanelAbierto((v) => !v)}
        titulo="Simulación de propagación"
        subtitulo={
          pestana === "validacion"
            ? "Validación externa · Rurrenabaque 2023"
            : simulacion
            ? `${preset.nombre} · paso ${iteracion?.iteracion ?? 0} de ${totalPasos}`
            : "Autómata celular · vecindad de Moore"
        }
        iconoPestana="simulacion"
        etiquetaPestana="Simulación"
        pestanas={[
          { id: "config", label: "Configuración", icono: "configuracion" },
          { id: "resultado", label: "Resultado", icono: "grafica" },
          { id: "comparar", label: "Comparar", icono: "comparacion" },
          { id: "validacion", label: "Validación", icono: "verificado" },
        ]}
        pestanaActiva={pestana}
        onCambiarPestana={setPestana}
        acciones={
          pestana === "config" && modo !== "consola" ? (
            puedeSimular ? (
              <button className="btn btn--primary panel-btn-principal sim-btn-ejecutar"
                onClick={ejecutar} disabled={!foco || !auto?.parametros || ejecutando || cargandoBase}>
                <Icono nombre={ejecutando ? "refrescar" : "reproducir"} tam={16} />
                {ejecutando ? "Ejecutando simulación…" : "Ejecutar simulación"}
              </button>
            ) : null
          ) : pestana === "validacion" ? null
            : pestana === "resultado" && simulacion ? (
            <>
              <button className="btn panel-btn-principal" onClick={nuevaSimulacion}>
                <Icono nombre="anadir" tam={15} />
                Nueva simulación
              </button>
              <button className="btn panel-btn-principal" onClick={() => navigate("/historial")}>
                <Icono nombre="historial" tam={15} />
                Ver en el historial
              </button>
            </>
          ) : null
        }
      >
        {/* ================= CONFIGURACIÓN ================= */}
        {pestana === "config" && (
          modo === "consola" ? (
            <ConsolaClima
              parametros={foco && auto?.parametros ? {
                ...auto.parametros,
                foco_fila: foco.fila,
                foco_columna: foco.columna,
                ...resuelto.parametros,
                nombre_escenario: `Consola · ${preset.nombre} · ${new Date().toLocaleTimeString("es-BO")}`,
              } : null}
              onIteraciones={setItsConsola}
              onCerrar={() => { setModo("completa"); setItsConsola([]); }}
            />
          ) : (
            <div className="sim-config">
              {!puedeSimular && (
                <p className="sim-aviso">
                  <Icono nombre="aviso" tam={15} />
                  Tu perfil no tiene permiso para ejecutar simulaciones.
                </p>
              )}
              {errorEjec && (
                <p className="sim-aviso sim-aviso--error">
                  <Icono nombre="aviso" tam={15} />
                  {errorEjec}
                </p>
              )}

              {/* ---- FOCO INICIAL ---- */}
              <section className="sim-seccion">
                <h3 className="sim-seccion-titulo">Foco inicial</h3>
                <div className="sim-foco">
                  <div className="sim-foco-origen">
                    <Icono nombre={origen.icono} tam={14} />
                    <span>{origen.etiqueta}</span>
                    {cargandoBase && <span className="sim-foco-cargando">actualizando…</span>}
                  </div>
                  {foco ? (
                    <>
                      <dl className="sim-datos">
                        <div><dt>Latitud</dt><dd className="mono">{foco.lat.toFixed(4)}</dd></div>
                        <div><dt>Longitud</dt><dd className="mono">{foco.lon.toFixed(4)}</dd></div>
                        <div><dt>Celda</dt><dd className="mono">f{foco.fila} · c{foco.columna}</dd></div>
                        {foco.prob_ignicion != null && (
                          <div>
                            <dt>P(incendio) · XGBoost</dt>
                            <dd className="mono">{(foco.prob_ignicion * 100).toFixed(1)} %</dd>
                          </div>
                        )}
                        {foco.ndvi != null && (
                          <div><dt>NDVI</dt><dd className="mono">{Number(foco.ndvi).toFixed(3)}</dd></div>
                        )}
                      </dl>
                      {auto?.seleccion_foco?.detalle && (
                        <p className="sim-nota">{auto.seleccion_foco.detalle}</p>
                      )}
                    </>
                  ) : (
                    <p className="sim-nota">Sin seleccionar — haz clic en el mapa.</p>
                  )}
                </div>
              </section>

              {/* ---- ESCENARIOS ---- */}
              <section className="sim-seccion">
                <h3 className="sim-seccion-titulo">Escenario ambiental</h3>
                <div className="sim-escenarios" role="radiogroup" aria-label="Escenario ambiental">
                  {ESCENARIOS_AMBIENTALES.map((e) => {
                    const activa = e.id === escenarioSel;
                    return (
                      <button key={e.id} type="button" role="radio" aria-checked={activa}
                        className={`sim-tarjeta${activa ? " activa" : ""}`}
                        onClick={() => setEscenarioSel(e.id)}>
                        <span className="sim-tarjeta-cabecera">
                          {/* El check NO es solo color: es un glifo. */}
                          <span className="sim-tarjeta-marca" aria-hidden="true">
                            {activa ? "✓" : ""}
                          </span>
                          <Icono nombre={e.icono} tam={14} />
                          <span className="sim-tarjeta-nombre">{e.nombre}</span>
                        </span>
                        <span className="sim-tarjeta-resumen">{e.resumen}</span>
                        {corridas[e.id] && (
                          <span className="sim-tarjeta-corrida">ejecutado</span>
                        )}
                      </button>
                    );
                  })}
                </div>
              </section>

              {/* ---- ESCENARIO ACTIVO: qué cambia exactamente ---- */}
              <section className="sim-seccion">
                <h3 className="sim-seccion-titulo">Escenario activo</h3>
                <div className="sim-activo">
                  <div className="sim-activo-nombre">
                    <Icono nombre={preset.icono} tam={15} />
                    {preset.nombre}
                    {preset.id === "base" && <span className="sim-badge-sin">Sin modificaciones</span>}
                  </div>
                  <p className="sim-nota">{preset.descripcion}</p>

                  <table className="sim-tabla-vars">
                    <thead>
                      <tr><th>Variable</th><th>Base</th><th>Escenario</th></tr>
                    </thead>
                    <tbody>
                      {resuelto.variables.map((v) => (
                        <tr key={v.clave} className={v.cambiada ? "cambiada" : ""}>
                          <td>{v.etiqueta}</td>
                          <td className="mono">{v.formato(v.base)}</td>
                          <td className="mono">
                            {v.formato(v.escenario)}
                            {v.cambiada && v.variacion != null && (
                              <span className={`sim-delta${v.variacion > 0 ? " sube" : " baja"}`}>
                                {v.variacion > 0 ? "+" : ""}{v.variacion.toFixed(0)} %
                              </span>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>

                  {!resuelto.variables.some((v) => v.cambiada) && (
                    <p className="sim-nota sim-nota--suave">
                      Sin modificación sobre las condiciones base.
                    </p>
                  )}
                  <p className="sim-nota sim-nota--suave">
                    Condiciones base tomadas de {base.fuente}. La modificación es temporal:
                    solo afecta a esta corrida, no a los datos del grid.
                  </p>
                  {resuelto.justificacion && (
                    <details className="sim-justificacion">
                      <summary>De dónde sale la magnitud</summary>
                      <p>{resuelto.justificacion}</p>
                    </details>
                  )}
                </div>
              </section>

              {/* ---- TIEMPO ---- */}
              <section className="sim-seccion">
                <h3 className="sim-seccion-titulo">Configuración temporal</h3>
                <div className="sim-tiempo">
                  <div><span>Duración</span><strong className="mono">{(duracionMin / 60).toFixed(1)} h</strong></div>
                  <div><span>Paso</span><strong className="mono">{minutosPaso} min</strong></div>
                  <div><span>Pasos</span><strong className="mono">{pasos}</strong></div>
                </div>
                <p className="sim-nota sim-nota--suave">
                  Valores derivados por el backend a partir del horizonte de la corrida.
                </p>
              </section>

              {/* ---- MODO DE CORRIDA ---- */}
              <section className="sim-seccion">
                <h3 className="sim-seccion-titulo">Modo de corrida</h3>
                <div className="sim-segmentado">
                  <button type="button" className={modo === "completa" ? "activo" : ""}
                    onClick={() => setModo("completa")}>
                    Corrida completa
                  </button>
                  <button type="button" className={modo === "consola" ? "activo" : ""}
                    onClick={() => setModo("consola")}>
                    Consola paso a paso
                  </button>
                </div>
                <p className="sim-nota sim-nota--suave">
                  La corrida completa resuelve los {pasos} pasos y luego se reproduce.
                  La consola los calcula por tandas y permite inyectar un suceso a mitad.
                </p>
              </section>
            </div>
          )
        )}

        {/* ================= RESULTADO ================= */}
        {pestana === "resultado" && (
          simulacion ? (
            <div className="sim-resultado">
              <div className="sim-resumen">
                <div><span>Escenario</span><strong>{preset.nombre}</strong></div>
                <div><span>Origen del foco</span><strong>{origen.etiqueta}</strong></div>
                <div><span>Duración</span><strong className="mono">{(duracionMin / 60).toFixed(1)} h</strong></div>
              </div>

              <div className="sim-metricas">
                <div className="sim-metrica">
                  <span className="sim-metrica-punto" style={{ background: "var(--estado-ardiendo)" }} />
                  <span className="sim-metrica-label">Celdas ardiendo</span>
                  <span className="sim-metrica-valor mono">{ardiendo}</span>
                </div>
                <div className="sim-metrica">
                  <span className="sim-metrica-punto" style={{ background: "var(--estado-quemada)" }} />
                  <span className="sim-metrica-label">Celdas quemadas</span>
                  <span className="sim-metrica-valor mono">{quemadas}</span>
                </div>
                <div className="sim-metrica sim-metrica--total">
                  <span className="sim-metrica-label">Área simulada</span>
                  <span className="sim-metrica-valor mono">{areaKm2.toFixed(1)} km²</span>
                </div>
                <div className="sim-metrica">
                  <span className="sim-metrica-label">Paso</span>
                  <span className="sim-metrica-valor mono">{iteracion?.iteracion ?? 0} / {totalPasos}</span>
                </div>
                <div className="sim-metrica">
                  <span className="sim-metrica-label">Tiempo simulado</span>
                  <span className="sim-metrica-valor mono">{comoDuracion(minutosTranscurridos)}</span>
                </div>
              </div>

              <div className="sim-bloque">
                <div className="sim-bloque-titulo">Estados del autómata</div>
                {[
                  ["Sin quemar", "var(--estado-no-quemada)"],
                  ["Ardiendo", "var(--estado-ardiendo)"],
                  ["Quemado", "var(--estado-quemada)"],
                  ["Inerte", "var(--estado-no-inflamable)"],
                ].map(([label, color]) => (
                  <div key={label} className="sim-leyenda-item">
                    <span className="sim-leyenda-punto" style={{ background: color }} />
                    <span>{label}</span>
                  </div>
                ))}
              </div>

              <div className="sim-campo">
                <label className="field-label" htmlFor="sim-velocidad">
                  Velocidad de reproducción <span className="mono">{velocidad} ms</span>
                </label>
                <input id="sim-velocidad" type="range" min={200} max={1200} step={100} value={velocidad}
                  onChange={(e) => setVelocidad(Number(e.target.value))} className="sim-slider" />
                <span className="sim-campo-nota">
                  Los controles de reproducción están en la barra sobre el mapa.
                </span>
              </div>
            </div>
          ) : (
            <p className="sim-vacio">
              <Icono nombre="grafica" tam={22} />
              Todavía no hay resultados. Configura el escenario y pulsa
              <strong> Ejecutar simulación</strong>.
            </p>
          )
        )}

        {/* ================= COMPARAR ================= */}
        {pestana === "comparar" && (
          <div className="sim-comparar">
            {escenarioSel === "base" ? (
              <p className="sim-vacio">
                <Icono nombre="comparacion" tam={22} />
                La comparación es Base contra otro escenario. Elige uno distinto
                de Base en Configuración.
              </p>
            ) : !comparacion ? (
              <div className="sim-comparar-pendiente">
                <p className="sim-vacio">
                  <Icono nombre="comparacion" tam={22} />
                  Hacen falta las dos corridas para comparar.
                </p>
                <ul className="sim-checklist">
                  <li className={corridas.base ? "hecho" : ""}>
                    <span aria-hidden="true">{corridas.base ? "✓" : "○"}</span> Escenario Base
                  </li>
                  <li className={corridas[escenarioSel] ? "hecho" : ""}>
                    <span aria-hidden="true">{corridas[escenarioSel] ? "✓" : "○"}</span> {preset.nombre}
                  </li>
                </ul>
              </div>
            ) : (
              <>
                <div className="sim-comp-col">
                  <div className="sim-comp-titulo">Base</div>
                  <dl className="sim-datos">
                    <div><dt>Área</dt><dd className="mono">{((comparacion.base.quemadas * AREA_POR_CELDA_HA) / 100).toFixed(1)} km²</dd></div>
                    <div><dt>Celdas</dt><dd className="mono">{comparacion.base.quemadas}</dd></div>
                    <div><dt>Tiempo</dt><dd className="mono">{comoDuracion(comparacion.base.minutos)}</dd></div>
                  </dl>
                </div>

                <div className="sim-comp-col sim-comp-col--acento">
                  <div className="sim-comp-titulo">{preset.nombre}</div>
                  <dl className="sim-datos">
                    <div><dt>Área</dt><dd className="mono">{((comparacion.actual.quemadas * AREA_POR_CELDA_HA) / 100).toFixed(1)} km²</dd></div>
                    <div><dt>Celdas</dt><dd className="mono">{comparacion.actual.quemadas}</dd></div>
                    <div><dt>Tiempo</dt><dd className="mono">{comoDuracion(comparacion.actual.minutos)}</dd></div>
                  </dl>
                </div>

                <div className="sim-comp-variacion">
                  <div className="sim-comp-titulo">Variación</div>
                  <dl className="sim-datos">
                    <div>
                      <dt>Área</dt>
                      <dd className={`mono ${comparacion.dArea >= 0 ? "sube" : "baja"}`}>
                        {comparacion.dArea >= 0 ? "+" : ""}{comparacion.dArea.toFixed(1)} km²
                        {comparacion.pctArea != null &&
                          ` (${comparacion.pctArea >= 0 ? "+" : ""}${comparacion.pctArea.toFixed(1)} %)`}
                      </dd>
                    </div>
                    <div>
                      <dt>Celdas</dt>
                      <dd className={`mono ${comparacion.dCeldas >= 0 ? "sube" : "baja"}`}>
                        {comparacion.dCeldas >= 0 ? "+" : ""}{comparacion.dCeldas}
                      </dd>
                    </div>
                    <div>
                      <dt>Tiempo</dt>
                      <dd className="mono">
                        {comparacion.dMin >= 0 ? "+" : ""}{(comparacion.dMin / 60).toFixed(1)} h
                      </dd>
                    </div>
                  </dl>
                </div>

                {/* La comparación a fondo (contra perímetros reales, dNBR y
                    métricas) ya vive en su pantalla: no se duplica aquí. */}
                <button type="button" className="btn" onClick={() => navigate("/comparacion")}>
                  <Icono nombre="comparacion" tam={15} />
                  Abrir comparación completa
                </button>
              </>
            )}
          </div>
        )}
        {/* ================= VALIDACIÓN ================= */}
        {pestana === "validacion" && (
          valCargando ? (
            <p className="sim-vacio">
              <Icono nombre="refrescar" tam={22} />
              Cargando los resultados de la validación…
            </p>
          ) : (
            <PanelValidacion
              indice={valIndice}
              zona={valZona}
              onZona={(z) => {
                setValZona(z);
                const evs = valIndice?.zonas?.[z] || [];
                const pri = evs.find((e) => e.ejecutado) || evs[0];
                setValEvento(pri ? pri.id : null);
              }}
              eventoId={valEvento} onEvento={setValEvento}
              datos={validacion} cargando={valCargando}
              modo={valModo} onModo={setValModo}
              verSemillas={valSemillas} onVerSemillas={setValSemillas}
              paso={valPaso} totalPasos={valPasos?.total || 0}
              onPaso={(n) => { setValPaso(n); setValPlay(false); }}
              reproduciendo={valPlay} onReproducir={setValPlay}
              minutos={valPasos?.pasos?.[valPaso]?.minutos}
            />
          )
        )}
      </PanelDeslizable>
    </div>
  );
}
