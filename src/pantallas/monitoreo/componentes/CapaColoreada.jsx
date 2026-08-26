// Pinta el grid COMPLETO coloreado según una función `colorDe(celda)`.
// Se usa para las capas de topografía, ambiental y probabilidad (el "mallado").
//
// POR QUÉ ESTA VERSIÓN
// --------------------
// El mallado antes aparecía "solo en una parte del mapa". La causa eran dos
// cosas que se sumaban:
//   1. Se pintaba 1 de cada 2 celdas (paso=2) para aligerar, lo que dejaba
//      huecos y daba sensación de mapa incompleto.
//   2. Los <Rectangle> de react-leaflet se dibujan en SVG salvo que se les pase
//      explícitamente un renderer de Canvas. Con ~36.000 formas, el SVG se
//      satura y Leaflet deja de pintar parte de ellas.
//
// La solución: un ÚNICO renderer de Canvas compartido por toda la capa y pintar
// TODAS las celdas (paso=1). Canvas dibuja decenas de miles de rectángulos sin
// despeinarse, así que el mallado cubre el municipio entero.
import { useMemo } from "react";
import { Rectangle } from "react-leaflet";
import L from "leaflet";

// Medio lado de cada celda en grados. El grid de Apolo está a 500 m ≈ 0.0045°,
// así que medio lado ≈ 0.00225°: cada celda se pinta como un cuadrado contiguo
// al de al lado, sin huecos.
const MEDIO = 0.00225;

export default function CapaColoreada({ celdas, colorDe, opacidad = 0.55, paso = 1 }) {
  // Un solo lienzo Canvas para toda la capa (con padding para que no recorte al
  // hacer paneo). Es lo que permite pintar el grid completo con fluidez.
  const lienzo = useMemo(() => L.canvas({ padding: 0.5 }), []);

  return (
    <>
      {celdas.map((c, i) => {
        if (paso > 1 && i % paso !== 0) return null;
        if (c.lat == null || c.lon == null) return null;
        const color = typeof colorDe === "function" ? colorDe(c) : colorDe;
        if (!color) return null;
        const bounds = [
          [c.lat - MEDIO, c.lon - MEDIO],
          [c.lat + MEDIO, c.lon + MEDIO],
        ];
        return (
          <Rectangle
            key={c.id}
            bounds={bounds}
            renderer={lienzo}
            pathOptions={{ color, fillColor: color, fillOpacity: opacidad, weight: 0, stroke: false }}
          />
        );
      })}
    </>
  );
}
