// ============================================================================
// CURVAS DEL CLIMA FRENTE AL INCENDIO
// ============================================================================
// La pregunta que responde esta figura es una sola: **¿qué le hizo el tiempo
// al fuego, y cuándo?** Por eso son cinco gráficas apiladas que comparten el
// eje de pasos, y no una sola con varias escalas encima.
//
// Por qué NO es una gráfica con dos ejes
// --------------------------------------
// Sería lo natural —temperatura y celdas ardiendo en el mismo dibujo— y sería
// un error. Con dos escalas verticales el cruce de las curvas lo decides tú al
// elegir los rangos, no los datos: acercando o alejando un eje se «demuestra»
// cualquier correlación. En pequeños múltiplos cada variable tiene su propia
// escala honesta y la comparación se lee en vertical, bajando por el mismo
// paso. Es más difícil mentir sin querer.
//
// Color
// -----
// Dos colores, no cinco. Cada fila lleva su nombre y su unidad escritos, así
// que el color no es lo que identifica la variable: lo que separa es AZUL para
// los factores del tiempo y ROJO para el incendio, que es la distinción que
// importa (causa frente a efecto). Los cinco tonos distintos que pedía el
// instinto no pasaban la comprobación de daltonismo en pequeños múltiplos, y
// además obligaban a descodificar una leyenda para leer algo que la etiqueta
// ya dice.
//
// Los dos valores están validados contra las dos superficies del proyecto
// (#1E293B oscuro y #FFFFFF claro) en separación CVD, banda de luminosidad,
// croma y contraste.
import { useMemo, useState } from "react";
import Icono from "../Icono";

// Paleta documentada: slot 1 (azul) y slot 8 (rojo), en su versión clara y
// oscura. No son valores elegidos a ojo.
const COLOR = {
  clima: { claro: "#2a78d6", oscuro: "#3987e5" },
  fuego: { claro: "#e34948", oscuro: "#e66767" },
};

const FILAS = [
  {
    id: "ardiendo", etiqueta: "Celdas ardiendo", unidad: "celdas",
    familia: "fuego", forma: "area",
    leer: (it) => it.num_celdas_ardiendo,
    ayuda: "El frente activo. Es lo que las cuatro curvas de abajo empujan o frenan.",
  },
  {
    id: "viento", etiqueta: "Viento", unidad: "m/s",
    familia: "clima", forma: "linea",
    leer: (it) => it.ambiente?.viento_ms,
    ayuda: "La palanca más fuerte del motor: a 12 m/s la propagación sube un 165 %.",
  },
  {
    id: "temperatura", etiqueta: "Temperatura", unidad: "°C",
    familia: "clima", forma: "linea",
    leer: (it) => it.ambiente?.temperatura_c,
    ayuda: "No enciende nada por sí sola: seca el combustible, y eso es un efecto suave.",
  },
  {
    id: "humedad", etiqueta: "Humedad del combustible", unidad: "",
    familia: "clima", forma: "linea",
    leer: (it) => it.ambiente?.humedad,
    ayuda: "Fracción 0–1. En el grid de Apolo va de 0,22 a 0,40.",
  },
  {
    id: "lluvia", etiqueta: "Lluvia", unidad: "mm/h",
    familia: "clima", forma: "barras",
    leer: (it) => it.ambiente?.lluvia_mm_h,
    ayuda: "Frena la propagación y puede apagar celdas de poca intensidad.",
  },
];

const ALTO_FILA = 44;
const PAD_IZQ = 4;

function extremos(valores) {
  const v = valores.filter((x) => x != null && Number.isFinite(x));
  if (!v.length) return null;
  let min = Math.min(...v);
  let max = Math.max(...v);
  if (max === min) {
    // Una serie plana con min = max no tiene altura: se le da un margen para
    // que la línea salga en medio y no pegada a un borde.
    const m = Math.abs(max) || 1;
    min -= m * 0.1;
    max += m * 0.1;
  }
  // Las barras y el área se miden desde cero: si no, una lluvia de 4 a 5 mm/h
  // parecería empezar de la nada.
  return { min, max };
}

export default function CurvasClima({ iteraciones, guion = [], pasoTotal, tema = "oscuro" }) {
  const [encima, setEncima] = useState(null);   // paso bajo el cursor

  const datos = useMemo(() => {
    const pasos = iteraciones.map((it) => it.iteracion);
    const ultimo = Math.max(pasoTotal || 0, ...(pasos.length ? pasos : [0]), 1);
    return FILAS.map((fila) => {
      const valores = iteraciones.map((it) => {
        const v = fila.leer(it);
        return v == null || !Number.isFinite(v) ? null : v;
      });
      let rango = extremos(valores);
      if (rango && (fila.forma === "barras" || fila.forma === "area")) {
        rango = { min: 0, max: Math.max(rango.max, 1e-6) };
      }
      return { ...fila, valores, rango, ultimo };
    });
  }, [iteraciones, pasoTotal]);

  if (!iteraciones.length) {
    return (
      <div className="curvas-vacio">
        <Icono nombre="grafica" tam={22} />
        <span>Las curvas aparecen cuando la simulación empieza a avanzar.</span>
      </div>
    );
  }

  const ultimoPaso = Math.max(pasoTotal || 1, 1);
  const anchoVista = 1000;
  const x = (paso) => PAD_IZQ + (paso / ultimoPaso) * (anchoVista - PAD_IZQ * 2);

  const pasoEncima = encima != null ? encima : null;
  const itEncima = pasoEncima != null
    ? iteraciones.find((it) => it.iteracion === pasoEncima)
    : null;

  function alMover(e) {
    const caja = e.currentTarget.getBoundingClientRect();
    const frac = (e.clientX - caja.left) / caja.width;
    const paso = Math.round(frac * ultimoPaso);
    const existe = iteraciones.some((it) => it.iteracion === paso);
    setEncima(existe ? paso : null);
  }

  return (
    <div className="curvas" onMouseLeave={() => setEncima(null)}>
      {datos.map((fila) => {
        const color = COLOR[fila.familia][tema === "claro" ? "claro" : "oscuro"];
        const { rango } = fila;
        const y = (v) => {
          if (!rango || v == null) return null;
          const t = (v - rango.min) / (rango.max - rango.min);
          return ALTO_FILA - 3 - t * (ALTO_FILA - 8);
        };

        const puntos = iteraciones
          .map((it, i) => ({ paso: it.iteracion, v: fila.valores[i] }))
          .filter((p) => p.v != null);

        const linea = puntos.map((p, i) => `${i ? "L" : "M"}${x(p.paso)},${y(p.v)}`).join(" ");
        const areaD = puntos.length
          ? `${linea} L${x(puntos[puntos.length - 1].paso)},${ALTO_FILA - 3} L${x(puntos[0].paso)},${ALTO_FILA - 3} Z`
          : "";

        const valorEncima = itEncima ? fila.leer(itEncima) : null;
        const ultimoValor = puntos.length ? puntos[puntos.length - 1].v : null;
        const mostrado = valorEncima != null ? valorEncima : ultimoValor;

        return (
          <div key={fila.id} className="curva-fila">
            <div className="curva-cabecera">
              <span className="curva-nombre" title={fila.ayuda}>
                <span className="curva-punto" style={{ background: color }} />
                {fila.etiqueta}
              </span>
              {/* El valor va en tinta de texto, no en el color de la serie:
                  el punto de color de al lado ya lleva la identidad. */}
              <span className="curva-valor mono">
                {mostrado == null ? "—" : formatear(fila.id, mostrado)}
                {fila.unidad && <span className="curva-unidad"> {fila.unidad}</span>}
              </span>
            </div>

            <svg className="curva-svg" viewBox={`0 0 ${anchoVista} ${ALTO_FILA}`}
              preserveAspectRatio="none" onMouseMove={alMover} role="img"
              aria-label={`${fila.etiqueta} por paso de simulación`}>
              {/* Marcas de los sucesos inyectados: cruzan TODAS las filas, que
                  es lo que deja ver de un vistazo qué cambió a partir de dónde. */}
              {guion.map((ev, i) => (
                <line key={i} x1={x(ev.paso_inicio)} x2={x(ev.paso_inicio)}
                  y1={0} y2={ALTO_FILA} className="curva-marca-evento" />
              ))}

              {fila.forma === "barras" ? (
                puntos.map((p) => {
                  const alto = ALTO_FILA - 3 - y(p.v);
                  if (alto <= 0.3) return null;
                  return (
                    <rect key={p.paso} x={x(p.paso) - 3} width={6}
                      y={y(p.v)} height={alto} fill={color} rx={1} />
                  );
                })
              ) : (
                <>
                  {fila.forma === "area" && areaD && (
                    <path d={areaD} fill={color} opacity={0.16} />
                  )}
                  <path d={linea} fill="none" stroke={color} strokeWidth={2}
                    vectorEffect="non-scaling-stroke" strokeLinejoin="round"
                    strokeLinecap="round" />
                </>
              )}

              {pasoEncima != null && (
                <line x1={x(pasoEncima)} x2={x(pasoEncima)} y1={0} y2={ALTO_FILA}
                  className="curva-cursor" />
              )}
            </svg>
          </div>
        );
      })}

      <div className="curva-eje">
        <span className="mono">paso 0</span>
        {pasoEncima != null && (
          <span className="curva-eje-cursor mono">
            paso {pasoEncima}
            {itEncima?.ambiente?.eventos_activos?.length > 0 && (
              <> · {itEncima.ambiente.eventos_activos.map((e) => e.nombre).join(", ")}</>
            )}
          </span>
        )}
        <span className="mono">paso {ultimoPaso}</span>
      </div>
    </div>
  );
}

function formatear(id, v) {
  if (id === "humedad") return v.toFixed(3);
  if (id === "ardiendo") return Math.round(v).toLocaleString("es");
  return v.toFixed(1);
}
