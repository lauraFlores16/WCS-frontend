// ============================================================================
// GRÁFICOS SECUNDARIOS DEL PANEL DERECHO
// ============================================================================
// El "Análisis automático" (radar) y la "Propagación en el tiempo" son
// contexto, no la tarea: el radar dice que el sistema sigue vigilando y la
// curva resume una corrida que ya terminó. Ninguno de los dos se mira mientras
// se opera el mapa, así que van en versión reducida dentro del panel derecho —
// el radar con las alertas, la curva con las decisiones de la simulación.
//
// Se exportan por separado para que cada pestaña monte solo el suyo.
import { useEffect, useRef, useState } from "react";
import { Area, AreaChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import Icono from "../../../nucleo/Icono";

const UMBRAL_ALERTA = 66; // % — mismo umbral que la verificación de probabilidad
const COLOR_ARDIENDO = "#e8491c";
const COLOR_QUEMADAS = "#5c6268";

function colorDeProb(p) {
  if (p >= UMBRAL_ALERTA) return "var(--alerta-roja)";
  if (p >= 40) return "var(--alerta-naranja)";
  return "var(--riesgo-bajo)";
}

// ---------------------------------------------------------------------------
// Radar de vigilancia: barrido animado + probabilidad más alta detectada
// ---------------------------------------------------------------------------
export function RadarVigilancia({ verificacion, grid }) {
  const [barridos, setBarridos] = useState(0);
  const [prob, setProb] = useState(0);
  const [historial, setHistorial] = useState([]);
  const intervalo = useRef(null);

  useEffect(() => {
    intervalo.current = setInterval(() => {
      setBarridos((b) => b + 1);
      let p = 0;
      if (verificacion) {
        p = verificacion.porcentaje;
      } else if (grid?.length) {
        // Sin foco elegido: muestrea el grid y se queda con lo más alto que ve
        for (let i = 0; i < 40; i++) {
          const c = grid[Math.floor(Math.random() * grid.length)];
          const v = Math.round((c.prob_ignicion ?? 0) * 100);
          if (v > p) p = v;
        }
      }
      setProb(p);
      setHistorial((h) => [...h.slice(-19), p]);
    }, 1400);
    return () => clearInterval(intervalo.current);
  }, [verificacion, grid]);

  useEffect(() => {
    if (verificacion) {
      setProb(verificacion.porcentaje);
      setHistorial((h) => [...h.slice(-19), verificacion.porcentaje]);
    }
  }, [verificacion]);

  const color = colorDeProb(prob);

  return (
    <section className="secundario">
      <header className="secundario-cabecera-fija">
        <span className="secundario-titulo">Análisis automático</span>
        <span className="secundario-live"><span className="radar-live-dot" /> en vivo</span>
      </header>

      <div className="secundario-radar">
        <div className="radar-mini-scope">
          <svg viewBox="0 0 100 100" className="radar-svg">
            <circle cx="50" cy="50" r="46" className="radar-anillo" />
            <circle cx="50" cy="50" r="26" className="radar-anillo" />
            <line x1="50" y1="4" x2="50" y2="96" className="radar-cruz" />
            <line x1="4" y1="50" x2="96" y2="50" className="radar-cruz" />
            <g className="radar-barrido">
              <defs>
                <linearGradient id="radarMiniGrad" x1="0" y1="0" x2="1" y2="0">
                  <stop offset="0%" stopColor={color} stopOpacity="0" />
                  <stop offset="100%" stopColor={color} stopOpacity="0.55" />
                </linearGradient>
              </defs>
              <path d="M50 50 L50 4 A46 46 0 0 1 90 28 Z" fill="url(#radarMiniGrad)" />
              <line x1="50" y1="50" x2="50" y2="4" stroke={color} strokeWidth="1" opacity="0.8" />
            </g>
            <circle cx={prob >= UMBRAL_ALERTA ? 68 : 40} cy={prob >= UMBRAL_ALERTA ? 34 : 62} r="3"
              fill={color} className={prob >= UMBRAL_ALERTA ? "radar-blip alerta" : "radar-blip"} />
          </svg>
        </div>

        <div className="radar-mini-lectura">
          <span className="radar-mini-valor" style={{ color }}>{prob} %</span>
          <span className="radar-mini-label">prob. máxima detectada</span>
          <div className="radar-mini-grafica">
            {historial.map((v, i) => (
              <span key={i} className="radar-barra"
                style={{ height: `${Math.max(v, 4)}%`, background: colorDeProb(v) }} />
            ))}
          </div>
          <span className="radar-mini-pie">{barridos} barridos · umbral {UMBRAL_ALERTA} %</span>
        </div>
      </div>
    </section>
  );
}

// ---------------------------------------------------------------------------
// Curva de propagación de la última corrida
// ---------------------------------------------------------------------------
function TooltipCurva({ active, payload, label }) {
  if (!active || !payload?.length) return null;
  return (
    <div className="grafica-tooltip">
      <div className="grafica-tooltip-titulo">Iteración {label}</div>
      {payload.map((p) => (
        <div key={p.dataKey} className="grafica-tooltip-serie">
          <span className="grafica-tooltip-punto" style={{ background: p.color }} />
          <span>{p.name}</span>
          <span className="mono">{p.value?.toLocaleString("es")}</span>
        </div>
      ))}
    </div>
  );
}

export function CurvaPropagacion({ puntos }) {
  if (!puntos?.length) return null;
  const ultimo = puntos[puntos.length - 1];

  return (
    <section className="secundario">
      <header className="secundario-cabecera-fija">
        <span className="secundario-titulo">Propagación en el tiempo</span>
      </header>

      <div className="grafica-mini-kpis">
        <span><strong style={{ color: COLOR_ARDIENDO }}>{ultimo.celdas_ardiendo}</strong> ardiendo</span>
        <span><strong>{ultimo.area_quemada_ha?.toLocaleString("es")}</strong> ha</span>
      </div>

      <ResponsiveContainer width="100%" height={104}>
        <AreaChart data={puntos} margin={{ top: 4, right: 4, bottom: 0, left: -24 }}>
          <defs>
            <linearGradient id="miniArdiendo" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor={COLOR_ARDIENDO} stopOpacity={0.55} />
              <stop offset="95%" stopColor={COLOR_ARDIENDO} stopOpacity={0} />
            </linearGradient>
            <linearGradient id="miniQuemadas" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor={COLOR_QUEMADAS} stopOpacity={0.45} />
              <stop offset="95%" stopColor={COLOR_QUEMADAS} stopOpacity={0} />
            </linearGradient>
          </defs>
          <XAxis dataKey="iteracion" stroke="var(--text-muted)" fontSize={9}
            tickLine={false} axisLine={false} />
          <YAxis stroke="var(--text-muted)" fontSize={9} width={36}
            tickLine={false} axisLine={false} />
          <Tooltip content={<TooltipCurva />} />
          <Area type="monotone" dataKey="celdas_quemadas" name="Quemadas"
            stroke={COLOR_QUEMADAS} fill="url(#miniQuemadas)" strokeWidth={2} />
          <Area type="monotone" dataKey="celdas_ardiendo" name="Ardiendo"
            stroke={COLOR_ARDIENDO} fill="url(#miniArdiendo)" strokeWidth={2} />
        </AreaChart>
      </ResponsiveContainer>

      {/* Dos series → leyenda siempre presente: la identidad no puede depender
          solo del color. */}
      <div className="grafica-leyenda">
        <span className="leyenda-item">
          <span className="leyenda-punto" style={{ background: COLOR_ARDIENDO }} />
          <span className="leyenda-label">Ardiendo</span>
        </span>
        <span className="leyenda-item">
          <span className="leyenda-punto" style={{ background: COLOR_QUEMADAS }} />
          <span className="leyenda-label">Quemadas</span>
        </span>
      </div>
    </section>
  );
}

// Compatibilidad: alguna pantalla antigua todavía importa el bloque completo.
export default function PanelSecundarios({ verificacion, grid, puntosGrafica }) {
  return (
    <div className="secundarios">
      <RadarVigilancia verificacion={verificacion} grid={grid} />
      {puntosGrafica?.length ? <CurvaPropagacion puntos={puntosGrafica} /> : (
        <p className="secundario-vacio">
          <Icono nombre="grafica" tam={14} />
          Ejecuta una simulación para ver aquí la curva de propagación.
        </p>
      )}
    </div>
  );
}
