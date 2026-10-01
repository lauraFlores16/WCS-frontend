import { useEffect, useMemo, useState } from "react";
import {
  Area, AreaChart, CartesianGrid, ReferenceLine, ResponsiveContainer,
  Tooltip, XAxis, YAxis,
} from "recharts";
import Icono from "../../../nucleo/Icono";
import { obtenerMeteorologia } from "../../../local/api_meteo";

/**
 * Panel «Peligro de incendio — próximas horas» del Inicio.
 *
 * QUÉ MUESTRA Y QUÉ NO — esto importa para la defensa
 *
 *   Muestra el ÍNDICE DE PELIGRO METEOROLÓGICO proyectado sobre el pronóstico
 *   horario. NO es la probabilidad de ocurrencia de XGBoost. Son dos cosas
 *   distintas y mezclarlas sería un error grave:
 *
 *     · XGBoost da una probabilidad POR CELDA, estática, entrenada con
 *       variables del territorio. No se puede recalcular hora a hora porque
 *       el modelo no vive en el backend: solo llega su salida precalculada en
 *       el grid.
 *
 *     · El índice de peligro es meteorológico y sí evoluciona: temperatura,
 *       humedad, viento y sequedad acumulada, con los umbrales de la regla
 *       operacional 30-30-30. De eso hay pronóstico horario.
 *
 *   La pregunta que contesta es «¿las condiciones van a empeorar en las
 *   próximas horas?», que es operativa y honesta. Llamarlo «probabilidad de
 *   incendio» le atribuiría una precisión que no tiene, y el panel lo dice en
 *   pantalla a propósito.
 *
 *   El cálculo está en el backend (`servicios/meteo.proyeccion_peligro`), con
 *   la misma fórmula y los mismos pesos que el índice actual. Aquí no se
 *   recalcula nada: si la fórmula estuviera duplicada en JavaScript, acabaría
 *   divergiendo de la de Python.
 */

const NIVELES = {
  critico: { texto: "Crítico", color: "var(--alerta-roja)" },
  alto: { texto: "Alto", color: "var(--alerta-naranja)" },
  moderado: { texto: "Moderado", color: "var(--alerta-amarilla)" },
  bajo: { texto: "Bajo", color: "var(--riesgo-bajo, #16A34A)" },
};

const HORIZONTES = [3, 6, 12];

const hhmm = (iso) => (iso ? String(iso).slice(11, 16) : "");

export default function PanelPeligroHorario() {
  const [peligro, setPeligro] = useState(null);
  const [estado, setEstado] = useState("cargando");
  const [horas, setHoras] = useState(6);

  useEffect(() => {
    let vivo = true;
    // `pedir` ya devuelve el `datos` del backend, así que el índice viene en
    // la raíz. Se conserva el acceso a `.data` por si alguna vez se cambia el
    // cliente y pasa a devolver la envoltura completa.
    obtenerMeteorologia()
      .then((r) => {
        if (!vivo) return;
        const p = r?.peligro ?? r?.data?.peligro;
        setPeligro(p || null);
        setEstado(p?.proyeccion?.length ? "listo" : "sin-datos");
      })
      .catch(() => { if (vivo) setEstado("error"); });
    return () => { vivo = false; };
  }, []);

  const serie = useMemo(() => {
    const p = peligro?.proyeccion || [];
    return p.slice(0, horas).map((h) => ({
      hora: hhmm(h.hora),
      indice: Math.round(h.puntaje * 100),
      nivel: h.nivel,
      t: h.temperatura_c,
      hr: h.humedad_relativa_pct,
      v: h.viento_kmh,
      lluvia: h.precipitacion_mm,
      r30: h.regla_303030,
    }));
  }, [peligro, horas]);

  const pico = useMemo(() => {
    if (!serie.length) return null;
    return serie.reduce((a, b) => (b.indice > a.indice ? b : a));
  }, [serie]);

  if (estado === "cargando") {
    return (
      <div className="panel pph">
        <div className="pph-cargando">
          <Icono nombre="refrescar" tam={16} />
          Consultando el pronóstico horario…
        </div>
      </div>
    );
  }

  if (estado !== "listo") {
    return (
      <div className="panel pph">
        <h3 className="pph-titulo">
          <Icono nombre="temperatura" tam={15} />
          Peligro de incendio — próximas horas
        </h3>
        <p className="pph-vacio">
          {estado === "error"
            ? "No se pudo consultar el pronóstico. El panel aparecerá cuando Open-Meteo responda."
            : "El pronóstico horario no está disponible ahora mismo."}
        </p>
      </div>
    );
  }

  const nivelActual = NIVELES[peligro.nivel] || NIVELES.bajo;
  const nivelPico = NIVELES[pico?.nivel] || NIVELES.bajo;

  return (
    <div className="panel pph">
      <header className="pph-cabecera">
        <div>
          <h3 className="pph-titulo">
            <Icono nombre="temperatura" tam={15} />
            Peligro de incendio — próximas horas
          </h3>
          <p className="pph-sub">
            Índice meteorológico proyectado sobre el pronóstico horario
          </p>
        </div>
        <div className="pph-horizontes" role="group" aria-label="Horizonte">
          {HORIZONTES.map((h) => (
            <button key={h} type="button"
              className={horas === h ? "activo" : ""}
              onClick={() => setHoras(h)}>
              {h} h
            </button>
          ))}
        </div>
      </header>

      <div className="pph-resumen">
        <div className="pph-ahora">
          <span>Ahora</span>
          <strong className="mono" style={{ color: nivelActual.color }}>
            {Math.round(peligro.puntaje * 100)}
          </strong>
          <em style={{ color: nivelActual.color }}>{nivelActual.texto}</em>
        </div>
        {pico && (
          <div className="pph-pico">
            <span>Máximo en {horas} h</span>
            <strong className="mono" style={{ color: nivelPico.color }}>
              {pico.indice}
            </strong>
            <em style={{ color: nivelPico.color }}>
              {nivelPico.texto} · {pico.hora}
            </em>
          </div>
        )}
      </div>

      <div className="pph-grafica">
        <ResponsiveContainer width="100%" height={118}>
          <AreaChart data={serie} margin={{ top: 6, right: 8, left: -18, bottom: 0 }}>
            <defs>
              <linearGradient id="pphGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="var(--alerta-roja)" stopOpacity={0.45} />
                <stop offset="100%" stopColor="var(--alerta-roja)" stopOpacity={0.04} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="var(--border-subtle)" />
            <XAxis dataKey="hora" tick={{ fontSize: 10, fill: "var(--text-muted)" }}
              stroke="var(--border-strong)" />
            <YAxis domain={[0, 100]} tick={{ fontSize: 10, fill: "var(--text-muted)" }}
              stroke="var(--border-strong)" />
            {/* Los cortes de nivel, para leer la curva sin adivinar */}
            <ReferenceLine y={70} stroke="var(--alerta-roja)" strokeDasharray="4 4"
              label={{ value: "crítico", position: "right", fontSize: 9,
                       fill: "var(--alerta-roja)" }} />
            <ReferenceLine y={50} stroke="var(--alerta-naranja)" strokeDasharray="4 4"
              label={{ value: "alto", position: "right", fontSize: 9,
                       fill: "var(--alerta-naranja)" }} />
            <Tooltip
              contentStyle={{
                background: "var(--bg-panel)", border: "1px solid var(--border-strong)",
                borderRadius: 8, fontSize: 11.5, color: "var(--text-primary)",
              }}
              formatter={(v) => [`${v} / 100`, "Índice"]}
              labelFormatter={(l) => {
                const d = serie.find((x) => x.hora === l);
                if (!d) return l;
                return `${l} · ${d.t} °C · ${d.hr} % HR · ${d.v} km/h`;
              }} />
            <Area type="monotone" dataKey="indice" stroke="var(--alerta-roja)"
              strokeWidth={2} fill="url(#pphGrad)" />
          </AreaChart>
        </ResponsiveContainer>
      </div>

      {/* La tabla hora a hora va plegada. Con 12 horas ocupaba más que todo
          el resto del panel junto, y el detalle solo se consulta cuando algo
          llama la atención en la gráfica. */}
      <details className="pph-detalle">
        <summary>Ver hora a hora ({serie.length} h)</summary>
      <table className="pph-tabla">
        <thead>
          <tr>
            <th>Hora</th><th>T</th><th>HR</th><th>Viento</th>
            <th>30-30-30</th><th>Índice</th>
          </tr>
        </thead>
        <tbody>
          {serie.map((h) => (
            <tr key={h.hora} className={h.nivel}>
              <td className="mono">{h.hora}</td>
              <td className="mono">{h.t?.toFixed?.(0) ?? h.t} °C</td>
              <td className="mono">{h.hr} %</td>
              <td className="mono">{h.v} km/h</td>
              <td className="mono">{h.r30} / 3</td>
              <td className="mono pph-celda-indice">
                <i style={{ background: (NIVELES[h.nivel] || NIVELES.bajo).color }} />
                {h.indice}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      </details>

      <p className="pph-nota">
        <Icono nombre="informacion" tam={13} />
        Índice <strong>meteorológico</strong> (temperatura, humedad, viento y
        sequedad; umbrales de la regla 30-30-30). No es la probabilidad de
        XGBoost, que es por celda y estática.
      </p>
    </div>
  );
}
