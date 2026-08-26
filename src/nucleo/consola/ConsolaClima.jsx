// ============================================================================
// CONSOLA DE SIMULACIÓN
// ============================================================================
// Vive en `nucleo/` porque la usan DOS pantallas y no es de ninguna:
//
//   · Simulación — se marca un foco a mano y se estudia cómo se propaga;
//   · Monitoreo  — se abre sobre un foco de calor real o sobre una alerta, que
//     es el camino que de verdad se recorre en operación: ves el foco activo,
//     lanzas la consola ahí mismo y decides sin cambiar de pantalla.
//
// Estaba en `pantallas/simulacion/componentes/`. Dejarla ahí habría obligado a
// Monitoreo a importar del interior de otra pantalla, que es justo el enredo
// que hace que luego nadie sepa quién depende de qué.
// Aquí se ve avanzar el incendio paso a paso, con el tiempo que lo está
// moviendo al lado, y se puede parar en seco para inyectar un suceso —una
// tormenta, una racha de viento— y seguir desde ahí.
//
// La diferencia con la simulación de siempre no es de interfaz sino de fondo:
// aquella resuelve las 40 iteraciones de un tirón y luego se reproduce como
// una grabación, así que mirarla no cambia nada. Esta lleva una sesión viva en
// el servidor y cada tanda se calcula DESPUÉS de que hayas decidido. Nadie
// sabe en el paso 0 que va a querer intervenir en el 12.
//
// Que eso no rompa la reproducibilidad tiene truco y está explicado en
// `backend_django/api/motor/sesion_simulacion.py`: el generador aleatorio
// guarda todo su estado en un entero de 32 bits, así que la pausa no pierde
// información y una corrida partida en tandas da el mismo resultado, celda a
// celda, que la misma corrida de un tirón.
import { useCallback, useEffect, useRef, useState } from "react";
import Icono from "../Icono";
import Dialogo from "../Dialogo";
import { useTema } from "../TemaContext";
import { consolaApi } from "./api";
import CurvasClima from "./CurvasClima";
import "../estilos/Consola.css";

const VELOCIDADES = [
  { ms: 1400, label: "Lenta" },
  { ms: 700, label: "Normal" },
  { ms: 250, label: "Rápida" },
];

export default function ConsolaClima({
  parametros,
  onIteraciones,
  onCerrar,
  // Monitoreo abre la consola desde una celda o una alerta y deriva sus
  // parámetros después: mientras tanto pasa `preparando` para que aquí no se
  // diga «marca un foco», que sería mentira —ya está marcado, solo falta el
  // escenario—.
  preparando = false,
  errorExterno = null,
}) {
  const { tema } = useTema();

  const [sesion, setSesion] = useState(null);
  const [iteraciones, setIteraciones] = useState([]);
  const [catalogo, setCatalogo] = useState([]);
  const [cargando, setCargando] = useState(false);
  const [error, setError] = useState(null);
  const [auto, setAuto] = useState(false);
  const [velocidad, setVelocidad] = useState(700);
  const [abrirCatalogo, setAbrirCatalogo] = useState(false);
  const [guardando, setGuardando] = useState(false);
  const [nombre, setNombre] = useState("");
  // Abrir una sesión pide el DEM a Open-Meteo y las barreras a OpenStreetMap.
  // Cuando van bien tardan menos de un segundo, pero son servicios ajenos: si
  // uno se cae, la consola se quedaba en «Preparando…» sin decir por qué. Con
  // el terreno apagado la corrida arranca al instante, a cambio de perder la
  // pendiente real entre celdas y los ríos y caminos como cortafuegos.
  const [usarTerreno, setUsarTerreno] = useState(true);

  // `enVuelo` evita que el reproductor automático encadene peticiones antes de
  // que vuelva la anterior: sin esto, un servidor lento acumula tandas y las
  // iteraciones llegan desordenadas.
  const enVuelo = useRef(false);
  const temporizador = useRef(null);

  useEffect(() => {
    consolaApi.catalogo()
      .then((d) => setCatalogo(d.escenarios || []))
      .catch(() => setCatalogo([]));
  }, []);

  // Al desmontar, se cierra la sesión del servidor: si no, se quedaría ocupando
  // memoria hasta que caduque sola a la media hora.
  const sesionRef = useRef(null);
  useEffect(() => { sesionRef.current = sesion?.sesion_id || null; }, [sesion]);
  useEffect(() => () => {
    if (sesionRef.current) consolaApi.cerrar(sesionRef.current).catch(() => {});
    clearTimeout(temporizador.current);
  }, []);

  const aplicar = useCallback((respuesta) => {
    setSesion(respuesta);
    setIteraciones((previas) => {
      // El servidor solo manda las iteraciones NUEVAS de cada tanda.
      const nuevas = respuesta.iteraciones || [];
      if (!nuevas.length) return previas;
      const vistas = new Set(previas.map((it) => it.iteracion));
      const suma = [...previas, ...nuevas.filter((it) => !vistas.has(it.iteracion))];
      suma.sort((a, b) => a.iteracion - b.iteracion);
      return suma;
    });
  }, []);

  // Avisar al padre (que pinta el mapa) va en un efecto, NO dentro del
  // actualizador de arriba. Ahí se ejecutaba durante el render de este
  // componente, y React protestaba: «Cannot update a component (Simulacion)
  // while rendering a different component (ConsolaClima)». Además de ser
  // ilegal, hacía que el mapa se quedara en blanco: la actualización del padre
  // se perdía y `CapaPropagacion` no recibía nunca las celdas.
  useEffect(() => {
    if (iteraciones.length) onIteraciones?.(iteraciones);
  }, [iteraciones, onIteraciones]);

  async function iniciar() {
    setCargando(true);
    setError(null);
    setIteraciones([]);
    try {
      const r = await consolaApi.iniciar(parametros, { usar_terreno: usarTerreno });
      aplicar(r);
    } catch (e) {
      setError(e?.response?.data?.detail || e.message);
    } finally {
      setCargando(false);
    }
  }

  const avanzar = useCallback(async (pasos = 1) => {
    if (!sesionRef.current || enVuelo.current) return;
    enVuelo.current = true;
    try {
      const r = await consolaApi.avanzar(sesionRef.current, pasos);
      aplicar(r);
      if (r.terminada) setAuto(false);
    } catch (e) {
      setError(e?.response?.data?.detail || e.message);
      setAuto(false);
    } finally {
      enVuelo.current = false;
    }
  }, [aplicar]);

  // Reproducción automática: un paso cada `velocidad` ms.
  useEffect(() => {
    if (!auto || !sesion || sesion.terminada) return;
    temporizador.current = setTimeout(() => avanzar(1), velocidad);
    return () => clearTimeout(temporizador.current);
  }, [auto, velocidad, sesion, avanzar]);

  async function completar() {
    setAuto(false);
    setCargando(true);
    try {
      aplicar(await consolaApi.completar(sesion.sesion_id));
    } catch (e) {
      setError(e?.response?.data?.detail || e.message);
    } finally {
      setCargando(false);
    }
  }

  async function inyectar(escenario, intensidad) {
    setAuto(false);
    try {
      const r = await consolaApi.inyectar(sesion.sesion_id, escenario.id, { intensidad });
      setSesion((s) => ({ ...s, guion: r.guion }));
      setAbrirCatalogo(false);
      setError(null);
    } catch (e) {
      setError(e?.response?.data?.detail || e.message);
    }
  }

  const terminada = sesion?.terminada;
  const paso = sesion?.paso_actual ?? 0;
  const total = sesion?.num_iteraciones ?? parametros?.num_iteraciones ?? 0;
  const amb = sesion?.ambiente;
  const activos = amb?.eventos_activos || [];

  // ---- Antes de arrancar --------------------------------------------------
  if (!sesion) {
    return (
      <div className="consola">
        <div className="consola-arranque">
          <Icono nombre="simulacion" tam={26} />
          <h3>Consola de simulación</h3>
          <p>
            Verás avanzar el incendio paso a paso con el tiempo que lo mueve al lado.
            Puedes pararlo en cualquier iteración, meterle una tormenta o una racha de
            viento, y seguir desde ahí.
          </p>
          {(error || errorExterno) && (
            <div className="pantalla-aviso es-error">
              <Icono nombre="aviso" tam={16} />
              <span>{error || errorExterno}</span>
            </div>
          )}
          <label className="consola-opcion">
            <input type="checkbox" checked={usarTerreno}
              onChange={(e) => setUsarTerreno(e.target.checked)} disabled={cargando} />
            <span>
              Usar el terreno real
              <em>
                Pendiente entre celdas (Copernicus DEM) y ríos, quebradas y caminos como
                cortafuegos (OpenStreetMap). Son servicios externos: si tardan, la consola
                espera por ellos.
              </em>
            </span>
          </label>

          <button className="btn btn--primary" onClick={iniciar}
            disabled={cargando || preparando || !parametros}>
            <Icono nombre="reproducir" tam={15} />
            {preparando ? "Derivando el escenario…"
              : cargando ? (usarTerreno ? "Consultando el terreno…" : "Preparando…")
              : "Abrir consola"}
          </button>
          {cargando && usarTerreno && (
            <span className="consola-nota consola-nota--espera">
              Se están pidiendo el DEM y las barreras de OpenStreetMap. Si tarda más de
              la cuenta, vuelve a intentarlo sin el terreno real.
            </span>
          )}
          {preparando && (
            <span className="consola-nota consola-nota--espera">
              Consultando la meteorología del municipio para este punto.
            </span>
          )}
          {!preparando && !parametros && (
            <span className="consola-nota">Marca antes un foco en el mapa.</span>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="consola">

      {/* ---------- Estado del ambiente ahora mismo ---------- */}
      <div className="consola-ambiente">
        <Lectura icono="reloj" etiqueta="Paso" valor={`${paso} / ${total}`} />
        <Lectura icono="viento" etiqueta="Viento"
          valor={amb?.viento_ms != null ? `${amb.viento_ms} m/s` : "—"} />
        <Lectura icono="temperatura" etiqueta="Temp."
          valor={amb?.temperatura_c != null ? `${amb.temperatura_c} °C` : "—"} />
        <Lectura icono="humedad" etiqueta="Humedad"
          valor={amb?.humedad != null ? amb.humedad.toFixed(3) : "—"} />
        <Lectura icono="lluvia" etiqueta="Lluvia"
          valor={amb?.lluvia_mm_h ? `${amb.lluvia_mm_h} mm/h` : "sin lluvia"}
          destacado={amb?.lluvia_mm_h > 0} />
      </div>

      {activos.length > 0 && (
        <div className="consola-activos">
          {activos.map((e) => (
            <span key={e.id} className="consola-activo">
              <Icono nombre={iconoFamilia(e.familia)} tam={13} />
              {e.nombre}
              {e.avance < 1 && <span className="consola-rampa">entrando · {Math.round(e.avance * 100)} %</span>}
            </span>
          ))}
        </div>
      )}

      {/* ---------- Las curvas ---------- */}
      <CurvasClima iteraciones={iteraciones} guion={sesion.guion || []}
        pasoTotal={total} tema={tema} />

      {/* ---------- Resultado ---------- */}
      <div className="consola-resumen">
        <span><b className="mono">{sesion.resumen?.celdas_ardiendo ?? 0}</b> ardiendo</span>
        <span><b className="mono">{sesion.resumen?.celdas_quemadas ?? 0}</b> quemadas</span>
        {sesion.resumen?.apagadas_por_lluvia > 0 && (
          <span><b className="mono">{sesion.resumen.apagadas_por_lluvia}</b> apagadas por lluvia</span>
        )}
        {sesion.resumen?.saltos_pavesas > 0 && (
          <span><b className="mono">{sesion.resumen.saltos_pavesas}</b> saltos de pavesas</span>
        )}
      </div>

      {error && (
        <div className="pantalla-aviso es-error">
          <Icono nombre="aviso" tam={16} />
          <span>{error}</span>
        </div>
      )}

      {terminada && (
        <div className="pantalla-aviso es-ok">
          <Icono nombre="verificado" tam={16} />
          <span>{sesion.motivo_fin}</span>
        </div>
      )}

      {/* ---------- Mandos ---------- */}
      <div className="consola-mandos">
        <button className="btn btn--mini" onClick={() => avanzar(1)}
          disabled={terminada || auto} title="Un paso">
          <Icono nombre="derecha" tam={14} />
          Paso
        </button>
        <button className={`btn btn--mini${auto ? " activo" : ""}`}
          onClick={() => setAuto((v) => !v)} disabled={terminada}>
          <Icono nombre={auto ? "pausa" : "reproducir"} tam={14} />
          {auto ? "Pausar" : "Reproducir"}
        </button>
        <select className="select" value={velocidad}
          onChange={(e) => setVelocidad(Number(e.target.value))}>
          {VELOCIDADES.map((v) => <option key={v.ms} value={v.ms}>{v.label}</option>)}
        </select>
        <button className="btn btn--mini" onClick={completar} disabled={terminada || cargando}>
          <Icono nombre="flecha" tam={14} />
          Hasta el final
        </button>
      </div>

      <button className="btn btn--primary consola-inyectar"
        onClick={() => { setAuto(false); setAbrirCatalogo(true); }}
        disabled={terminada}>
        <Icono nombre="lluvia" tam={15} />
        Inyectar un suceso del tiempo
      </button>

      {/* ---------- Guion ---------- */}
      {sesion.guion?.length > 0 && (
        <div className="consola-guion">
          <h4>Sucesos en esta corrida</h4>
          {sesion.guion.map((ev, i) => (
            <div key={i} className="consola-guion-fila">
              <Icono nombre={iconoFamilia(ev.familia)} tam={13} />
              <span className="consola-guion-nombre">{ev.nombre}</span>
              <span className="consola-guion-paso mono">
                paso {ev.paso_inicio}
                {ev.duracion_pasos ? `–${ev.paso_inicio + ev.duracion_pasos}` : " en adelante"}
              </span>
            </div>
          ))}
        </div>
      )}

      <div className="consola-pie">
        <button className="btn btn--mini" onClick={() => setGuardando(true)}
          disabled={!iteraciones.length}>
          <Icono nombre="descargar" tam={14} />
          Guardar como escenario
        </button>
        {onCerrar && (
          <button className="btn btn--mini" onClick={onCerrar}>
            <Icono nombre="cerrar" tam={14} />
            Cerrar consola
          </button>
        )}
      </div>

      {abrirCatalogo && (
        <CatalogoSucesos catalogo={catalogo} paso={paso}
          onElegir={inyectar} onCerrar={() => setAbrirCatalogo(false)} />
      )}

      {guardando && (
        <Dialogo
          titulo="Guardar como escenario"
          icono="descargar"
          etiquetaConfirmar="Guardar"
          enfocarConfirmar={false}
          onCerrar={() => setGuardando(false)}
          onConfirmar={async () => {
            const r = await consolaApi.guardar(sesion.sesion_id, nombre || undefined);
            setSesion((s) => ({ ...s, guardado: r.escenario_id }));
            sesionRef.current = null;   // el servidor la cierra al guardar
          }}
          mensaje={
            <>Se guardará en el Historial con sus {sesion.guion?.length || 0} suceso(s)
            meteorológico(s) dentro, para poder compararla después.</>
          }
          detalle={
            <>
              <label className="field-label">Nombre</label>
              <input className="input" autoFocus value={nombre}
                placeholder={`Simulación con ${sesion.guion?.length || 0} suceso(s)`}
                onChange={(e) => setNombre(e.target.value)} />
            </>
          }
        />
      )}
    </div>
  );
}

function Lectura({ icono, etiqueta, valor, destacado = false }) {
  return (
    <div className={`consola-lectura${destacado ? " destacada" : ""}`}>
      <Icono nombre={icono} tam={14} />
      <div>
        <span className="consola-lectura-etiqueta">{etiqueta}</span>
        <span className="consola-lectura-valor mono">{valor}</span>
      </div>
    </div>
  );
}

function iconoFamilia(familia) {
  return { viento: "viento", lluvia: "lluvia", secado: "temperatura", frente: "capas" }[familia]
    || "informacion";
}

// ---------------------------------------------------------------------------
// El catálogo, agrupado por familia
// ---------------------------------------------------------------------------
function CatalogoSucesos({ catalogo, paso, onElegir, onCerrar }) {
  const [elegido, setElegido] = useState(null);
  const [intensidad, setIntensidad] = useState(null);

  const familias = [...new Set(catalogo.map((e) => e.familia))];

  return (
    <div className="dialogo-fondo" onMouseDown={(e) => {
      if (e.target === e.currentTarget) onCerrar();
    }}>
      <div className="dialogo catalogo" role="dialog" aria-modal="true">
        <header className="dialogo-cabecera">
          <span className="dialogo-icono"><Icono nombre="lluvia" tam={18} /></span>
          <h2 className="dialogo-titulo">Inyectar un suceso a partir del paso {paso}</h2>
          <button className="dialogo-cerrar" onClick={onCerrar} aria-label="Cerrar">
            <Icono nombre="cerrar" tam={16} />
          </button>
        </header>

        <div className="catalogo-cuerpo">
          {familias.map((f) => (
            <div key={f} className="catalogo-familia">
              <h4>{catalogo.find((e) => e.familia === f)?.familia_nombre || f}</h4>
              <div className="catalogo-lista">
                {catalogo.filter((e) => e.familia === f).map((e) => (
                  <button key={e.id}
                    className={`catalogo-item${elegido?.id === e.id ? " elegido" : ""}`}
                    onClick={() => { setElegido(e); setIntensidad(null); }}>
                    <span className="catalogo-item-nombre">
                      <Icono nombre={iconoFamilia(e.familia)} tam={14} />
                      {e.nombre}
                    </span>
                    <span className="catalogo-item-desc">{e.descripcion}</span>
                  </button>
                ))}
              </div>
            </div>
          ))}
        </div>

        {elegido && (
          <div className="catalogo-detalle">
            {/* La justificación se enseña, no se esconde: es lo que hay que poder
                responder cuando en la defensa pregunten de dónde sale un 8 m/s. */}
            <p className="catalogo-justificacion">
              <Icono nombre="informacion" tam={13} />
              <span>{elegido.justificacion}</span>
            </p>
            {elegido.intensidades && (
              <div className="catalogo-intensidades">
                <span className="field-label">Intensidad</span>
                {Object.entries(elegido.intensidades).map(([k, v]) => (
                  <button key={k}
                    className={`pantalla-ficha${intensidad === k ? " activa" : ""}`}
                    onClick={() => setIntensidad(k)}>
                    {k} <span className="pantalla-ficha-n">{v}</span>
                  </button>
                ))}
              </div>
            )}
          </div>
        )}

        <footer className="dialogo-pie">
          <button className="btn" onClick={onCerrar}>Cancelar</button>
          <button className="btn btn--primary" disabled={!elegido}
            onClick={() => onElegir(elegido, intensidad)}>
            Inyectar en el paso {paso}
          </button>
        </footer>
      </div>
    </div>
  );
}
