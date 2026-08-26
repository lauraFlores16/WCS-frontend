// ============================================================================
// SIMULACIÓN DE AUTÓMATAS CELULARES — pantalla GIS
// ============================================================================
// Misma distribución que Monitoreo: el mapa manda y los controles viven en el
// panel derecho deslizable, que se cierra para devolverle el espacio. Se elige
// un foco con un clic, se configura el escenario y se reproduce la propagación
// celda a celda sobre el mapa real de Apolo.
import { useState, useEffect, useRef, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import BaseMap, { FONDOS } from "../../nucleo/BaseMap";
import Icono from "../../nucleo/Icono";
import PanelDeslizable from "../../nucleo/PanelDeslizable";
import { usePermisos } from "../../nucleo/PermisosContext";
import { cargarGrid } from "../../local/datos";
import { celdaMasCercana } from "../../local/capas";
import { simulacionLocal } from "../../local/api";
import ConsolaClima from "../../nucleo/consola/ConsolaClima";
import CapaPropagacion from "../monitoreo/componentes/CapaPropagacion";
import CapturadorClic from "../monitoreo/componentes/CapturadorClic";
import MarcadorFoco from "../monitoreo/componentes/MarcadorFoco";
import LimiteMunicipio from "../monitoreo/componentes/LimiteMunicipio";
import "./estilos/Simulacion.css";

export default function Simulacion() {
  const navigate = useNavigate();
  // El permiso sale de la MATRIZ, no de una lista de roles escrita a mano:
  // antes decía `rol === "analista" || rol === "ugr"`, así que cambiar la
  // matriz en Roles y Permisos no tenía ningún efecto aquí.
  const { puede } = usePermisos();
  const puedeSimular = puede("ejecutar_simulacion");

  const [fondo, setFondo] = useState("satelite");
  const [mapa, setMapa] = useState(null);
  const onMapReady = useCallback((m) => setMapa(m), []);

  const [grid, setGrid] = useState([]);
  const [foco, setFoco] = useState(null);
  const [modoClic, setModoClic] = useState(true);

  // Parámetros de la simulación
  const [pBase, setPBase] = useState(0.4);
  const [numIter, setNumIter] = useState(20);
  const [vientoMult, setVientoMult] = useState(1.0);
  const [deltaHumedad, setDeltaHumedad] = useState(0);

  // Resultado y reproducción
  const [simulacion, setSimulacion] = useState(null);
  const [indice, setIndice] = useState(0);
  const [reproduciendo, setReproduciendo] = useState(false);
  const [ejecutando, setEjecutando] = useState(false);
  const [velocidad, setVelocidad] = useState(600);
  const [panelAbierto, setPanelAbierto] = useState(true);
  const timer = useRef(null);

  // Dos formas de simular, y la diferencia no es de interfaz:
  //   · «completa»  resuelve las N iteraciones de un tirón y luego se
  //     reproduce como una grabación — mirarla no cambia nada;
  //   · «consola»   lleva una sesión viva en el servidor y calcula cada tanda
  //     DESPUÉS de que hayas decidido, así que se puede parar en el paso 12 y
  //     meterle una tormenta.
  const [modo, setModo] = useState("completa");
  const [itsConsola, setItsConsola] = useState([]);

  useEffect(() => {
    cargarGrid().then(setGrid);
  }, []);

  // Elegir foco por clic en el mapa
  function ponerFoco(lat, lon) {
    const celda = celdaMasCercana(grid, lat, lon);
    if (!celda) return;
    setFoco(celda);
    if (mapa) mapa.flyTo([celda.lat, celda.lon], 13, { duration: 1.2 });
  }

  // Ejecutar el autómata real sobre el grid
  async function ejecutar() {
    if (!foco) return;
    setEjecutando(true);
    try {
      const { data } = await simulacionLocal.ejecutar({
        foco_fila: foco.fila,
        foco_columna: foco.columna,
        p_base: pBase,
        num_iteraciones: numIter,
        multiplicador_viento: vientoMult,
        delta_humedad: deltaHumedad,
        delta_temperatura_c: 0,
        nombre_escenario: `Simulación ${new Date().toLocaleTimeString("es-BO")}`,
      });
      const sim = await simulacionLocal.obtener(data.escenario_id);
      setSimulacion(sim.data);
      setIndice(0);
      setReproduciendo(true);

    } catch (e) {
      console.error(e);
    } finally {
      setEjecutando(false);
    }
  }

  // Animación de reproducción
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

  function reiniciar() {
    setReproduciendo(false);
    setSimulacion(null);
    setIndice(0);
    setFoco(null);
  }

  const iteracion = modo === "consola"
    ? itsConsola[itsConsola.length - 1]        // la consola siempre enseña el ahora
    : simulacion?.iteraciones?.[indice];
  const ardiendo = iteracion?.num_celdas_ardiendo ?? 0;
  const quemadas = iteracion?.num_celdas_quemadas ?? 0;
  const areaHa = (quemadas * 25).toLocaleString();

  return (
    <div className="simulacion">

      {/* ---------- CENTRO: mapa ---------- */}
      <div className="sim-mapa-zona">
        <div className="sim-toolbar">
          <div className="monitoreo-fondo-selector">
            {Object.entries(FONDOS).map(([key, cfg]) => (
              <button key={key} className={`monitoreo-fondo-btn${fondo === key ? " activo" : ""}`}
                onClick={() => setFondo(key)}>{cfg.label}</button>
            ))}
          </div>
          {!simulacion && (
            <span className="sim-hint">
              <Icono nombre="ubicacion" tam={14} />
              {foco
                ? `Foco de ignición: fila ${foco.fila}, columna ${foco.columna}`
                : "Haz clic en el mapa para colocar el foco de ignición"}
            </span>
          )}
        </div>

        <div className="sim-mapa-contenedor">
          <BaseMap fondo={fondo} onMapReady={onMapReady} style={{ height: "100%" }}>
            <LimiteMunicipio visible={true} />
            {iteracion && <CapaPropagacion celdas={iteracion.celdas} />}
            {foco && <MarcadorFoco foco={foco} />}
            {!simulacion && puedeSimular && (
              <CapturadorClic activo={modoClic} onClic={ponerFoco} />
            )}
          </BaseMap>
        </div>

        {simulacion && iteracion && (
          <div className="sim-transporte">
            <button className="btn btn--primary sim-btn-reproducir"
              onClick={() => setReproduciendo((r) => !r)}
              aria-label={reproduciendo ? "Pausar" : "Reproducir"}>
              <Icono nombre={reproduciendo ? "pausa" : "reproducir"} tam={14} />
              {reproduciendo ? "Pausar" : "Reproducir"}
            </button>
            <input type="range" min={0} max={simulacion.iteraciones.length - 1}
              value={indice} onChange={(e) => { setReproduciendo(false); setIndice(Number(e.target.value)); }}
              className="sim-slider-transporte" aria-label="Iteración de la simulación" />
            <span className="mono sim-transporte-info">
              iteración {iteracion.iteracion}/{simulacion.iteraciones.length - 1}
            </span>
            <span className="mono sim-metrica-inline" style={{ color: "var(--estado-ardiendo)" }}>
              {ardiendo} ardiendo
            </span>
            <span className="mono sim-metrica-inline" style={{ color: "var(--estado-quemada)" }}>
              {areaHa} ha
            </span>
          </div>
        )}
      </div>

      {/* ---------- DERECHA: configuración o resultado ---------- */}
      <PanelDeslizable
        abierto={panelAbierto}
        onAlternar={() => setPanelAbierto((v) => !v)}
        titulo={modo === "consola"
          ? "Consola de simulación"
          : (simulacion ? "Resultado de la simulación" : "Configurar la simulación")}
        subtitulo={modo === "consola"
          ? "Paso a paso, con el tiempo que lo mueve"
          : (simulacion
              ? `Iteración ${iteracion?.iteracion ?? 0} de ${simulacion.iteraciones.length - 1}`
              : "Autómata celular · vecindad de Moore")}
        iconoPestana="simulacion"
        etiquetaPestana="Simulación"
        pestanas={simulacion ? undefined : [
          { id: "completa", label: "Corrida completa", icono: "reproducir" },
          { id: "consola", label: "Consola", icono: "grafica" },
        ]}
        pestanaActiva={modo}
        onCambiarPestana={setModo}
        acciones={modo === "consola" ? null : !simulacion
          ? (puedeSimular && (
              <button className="btn btn--primary panel-btn-principal"
                onClick={ejecutar} disabled={!foco || ejecutando}>
                <Icono nombre="reproducir" tam={15} />
                {ejecutando ? "Ejecutando…" : "Producir propagación"}
              </button>
            ))
          : (
            <>
              <button className="btn panel-btn-principal" onClick={reiniciar}>
                <Icono nombre="anadir" tam={15} />
                Nueva simulación
              </button>
              <button className="btn panel-btn-principal" onClick={() => navigate("/monitoreo")}>
                <Icono nombre="monitoreo" tam={15} />
                Ver en monitoreo completo
              </button>
            </>
          )}
      >
        {modo === "consola" && !simulacion ? (
          <ConsolaClima
            parametros={foco ? {
              foco_fila: foco.fila,
              foco_columna: foco.columna,
              p_base: pBase,
              num_iteraciones: numIter,
              multiplicador_viento: vientoMult,
              delta_humedad: deltaHumedad,
              delta_temperatura_c: 0,
              nombre_escenario: `Consola ${new Date().toLocaleTimeString("es-BO")}`,
            } : null}
            onIteraciones={setItsConsola}
            onCerrar={() => { setModo("completa"); setItsConsola([]); }}
          />
        ) : !simulacion ? (
          <div className="sim-config">
            {!puedeSimular && (
              <p className="sim-aviso">
                <Icono nombre="aviso" tam={15} />
                Tu perfil no tiene permiso para ejecutar simulaciones.
              </p>
            )}

            <div className="sim-campo">
              <span className="field-label">Foco de ignición</span>
              <div className="sim-foco-info">
                {foco ? (
                  <>
                    <Icono nombre="ubicacion" tam={14} />
                    <span>fila {foco.fila}, columna {foco.columna}</span>
                    <span className="mono sim-foco-coord">
                      {foco.lat.toFixed(4)}, {foco.lon.toFixed(4)}
                    </span>
                  </>
                ) : (
                  <span className="text-muted">Sin seleccionar — haz clic en el mapa</span>
                )}
              </div>
            </div>

            <div className="sim-campo">
              <label className="field-label" htmlFor="sim-pbase">
                Probabilidad base <span className="mono">{(pBase * 100).toFixed(0)} %</span>
              </label>
              <input id="sim-pbase" type="range" min={0.1} max={0.9} step={0.02} value={pBase}
                onChange={(e) => setPBase(Number(e.target.value))} className="sim-slider" />
            </div>
            <div className="sim-campo">
              <label className="field-label" htmlFor="sim-iter">
                Iteraciones <span className="mono">{numIter}</span>
              </label>
              <input id="sim-iter" type="range" min={5} max={50} step={1} value={numIter}
                onChange={(e) => setNumIter(Number(e.target.value))} className="sim-slider" />
              <span className="sim-campo-nota">{numIter * 15} minutos de tiempo simulado</span>
            </div>
            <div className="sim-campo">
              <label className="field-label" htmlFor="sim-viento">
                Multiplicador de viento <span className="mono">×{vientoMult.toFixed(1)}</span>
              </label>
              <input id="sim-viento" type="range" min={0.5} max={3} step={0.1} value={vientoMult}
                onChange={(e) => setVientoMult(Number(e.target.value))} className="sim-slider" />
            </div>
            <div className="sim-campo">
              <label className="field-label" htmlFor="sim-humedad">
                Ajuste de humedad{" "}
                <span className="mono">{deltaHumedad > 0 ? "+" : ""}{(deltaHumedad * 100).toFixed(0)} %</span>
              </label>
              <input id="sim-humedad" type="range" min={-0.3} max={0.3} step={0.05} value={deltaHumedad}
                onChange={(e) => setDeltaHumedad(Number(e.target.value))} className="sim-slider" />
            </div>
          </div>
        ) : (
          <div className="sim-resultado">
            <div className="sim-metricas">
              <div className="sim-metrica">
                <span className="sim-metrica-punto" style={{ background: "var(--estado-ardiendo)" }} />
                <span className="sim-metrica-label">Ardiendo</span>
                <span className="sim-metrica-valor mono">{ardiendo}</span>
              </div>
              <div className="sim-metrica">
                <span className="sim-metrica-punto" style={{ background: "var(--estado-quemada)" }} />
                <span className="sim-metrica-label">Quemadas</span>
                <span className="sim-metrica-valor mono">{quemadas}</span>
              </div>
              <div className="sim-metrica sim-metrica--total">
                <span className="sim-metrica-label">Área afectada</span>
                <span className="sim-metrica-valor mono">{areaHa} ha</span>
              </div>
              <div className="sim-metrica">
                <span className="sim-metrica-label">Tiempo simulado</span>
                <span className="sim-metrica-valor mono">
                  {((iteracion?.iteracion ?? 0) * 15 / 60).toFixed(1)} h
                </span>
              </div>
            </div>

            <div className="sim-bloque">
              <div className="sim-bloque-titulo">Estados del autómata</div>
              {[
                ["Sin quemar", "var(--estado-no-quemada)"],
                ["Ardiendo", "var(--estado-ardiendo)"],
                ["Quemado", "var(--estado-quemada)"],
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
            </div>
          </div>
        )}
      </PanelDeslizable>
    </div>
  );
}
