import { CircleMarker, Popup } from "react-leaflet";

/**
 * Capas de la validación histórica.
 *
 * Cuatro lecturas distintas del mismo evento, cada una con su paleta. No se
 * reutilizan los colores del autómata (SIN_QUEMAR/ARDIENDO/QUEMADO): aquellos
 * describen en qué situación está una celda durante el incendio; estos, si el
 * modelo acertó. Pintarlos igual invitaría a leer el marrón de "quemado" como
 * "correcto".
 */

export const COLOR = {
  real: "#B91C1C",
  sim: "#F59E0B",
  TP: "#16A34A",
  FP: "#F59E0B",
  FN: "#2563EB",
  semilla: "#0F766E",
  ardiendo: "#F97316",
  quemada: "#7F1D1D",
};

export const LEYENDAS = {
  real: [{ c: COLOR.real, t: "Área quemada real", a: "cicatriz de referencia" }],
  simulado: [{ c: COLOR.sim, t: "Área simulada", a: "resultado del autómata" }],
  comparacion: [
    { c: COLOR.TP, t: "Coincidencia", a: "real y simulado", g: "✓" },
    { c: COLOR.FP, t: "Sobreestimación", a: "simulado y no real", g: "↑" },
    { c: COLOR.FN, t: "Omisión", a: "real y no simulado", g: "↓" },
  ],
  pasos: [
    { c: COLOR.ardiendo, t: "Ardiendo", a: "frente activo" },
    { c: COLOR.quemada, t: "Quemada", a: "ya consumida" },
  ],
};

export const LEYENDA_SEMILLA = {
  c: COLOR.semilla, t: "Foco inicial FIRMS", a: "entregado al autómata",
};

/** Cicatriz, simulación y comparación. */
export default function CapaComparacion({ celdas, modo, verSemillas }) {
  if (!celdas?.length) return null;

  return celdas.map((c, i) => {
    let color = null;
    let etiqueta = "";

    if (modo === "real") {
      if (!c.real) return null;
      color = COLOR.real;
      etiqueta = "Área quemada real";
    } else if (modo === "simulado") {
      if (!c.sim) return null;
      color = COLOR.sim;
      etiqueta = "Área simulada";
    } else {
      if (c.clase === "TN") return null;
      color = COLOR[c.clase];
      const l = LEYENDAS.comparacion.find((x) => x.t && COLOR[c.clase] === x.c);
      etiqueta = `${c.clase} · ${l ? l.t : ""}`;
    }

    return (
      <CircleMarker key={`v-${c.fila}-${c.columna}-${i}`}
        center={[c.lat, c.lon]} radius={4}
        pathOptions={{ color, fillColor: color, fillOpacity: 0.8, weight: 0 }}>
        <Popup>
          <strong>{etiqueta}</strong>
          <br />
          celda f{c.fila} · c{c.columna}
          <br />
          real {c.real ? "sí" : "no"} · simulado {c.sim ? "sí" : "no"}
          {c.semilla ? <><br />foco inicial FIRMS</> : null}
        </Popup>
      </CircleMarker>
    );
  }).concat(
    verSemillas
      ? celdas.filter((c) => c.semilla).map((c, i) => (
          <CircleMarker key={`s-${c.fila}-${c.columna}-${i}`}
            center={[c.lat, c.lon]} radius={6}
            pathOptions={{ color: COLOR.semilla, fillColor: "transparent",
                           fillOpacity: 0, weight: 1.8 }}>
            <Popup>
              <strong>Foco inicial FIRMS</strong>
              <br />
              celda f{c.fila} · c{c.columna}
              <br />
              <small>Entregado al autómata como punto de arranque.</small>
            </Popup>
          </CircleMarker>
        ))
      : []);
}

/** Estado del autómata en un paso concreto. */
export function CapaPasos({ paso, indice }) {
  if (!paso || !indice) return null;
  const pinta = (lista, estado) =>
    (lista || []).map(([f, c], i) => {
      const p = indice[`${f},${c}`];
      if (!p) return null;
      return (
        <CircleMarker key={`p-${estado}-${f}-${c}-${i}`}
          center={[p.lat, p.lon]} radius={4}
          pathOptions={{ color: COLOR[estado], fillColor: COLOR[estado],
                         fillOpacity: 0.85, weight: 0 }}>
          <Popup>
            <strong>{estado === "ardiendo" ? "Ardiendo" : "Quemada"}</strong>
            <br />
            celda f{f} · c{c}
            <br />
            minuto {paso.minutos}
          </Popup>
        </CircleMarker>
      );
    });
  return [...pinta(paso.quemada, "quemada"), ...pinta(paso.ardiendo, "ardiendo")];
}
