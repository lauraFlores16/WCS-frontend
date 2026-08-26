// Mallado (grid) semitransparente sobre el mapa satelital.
// Muestra la grilla completa de Apolo sin tapar la imagen de fondo.
// Submuestreo: con 36,390 celdas + otras capas encima, dibujar todas pone
// lento el mapa; mostramos 1 de cada `paso` celdas, que igual deja ver la
// forma y densidad de la grilla. El foco detectado siempre se dibuja (aparte).
import { CircleMarker } from "react-leaflet";

export default function CapaMallado({ celdas, focoDetectado, paso = 3 }) {
  return (
    <>
      {celdas.map((c, i) => {
        if (i % paso !== 0) return null;
        return (
          <CircleMarker
            key={`malla-${c.id}`}
            center={[c.lat, c.lon]}
            radius={1.3}
            pathOptions={{
              color: "#2fafa6",
              fillColor: "#2fafa6",
              fillOpacity: 0.22,
              weight: 0,
            }}
          />
        );
      })}
    </>
  );
}

