import { CircleMarker, Popup } from "react-leaflet";

function colorProbabilidad(p) {
  const r = Math.round(76 + (232 - 76) * p);
  const g = Math.round(175 + (73 - 175) * p);
  const b = Math.round(80 + (28 - 80) * p);
  return `rgb(${r},${g},${b})`;
}

export default function CapaProbabilidad({ celdas }) {
  return celdas.map((c) => (
    <CircleMarker key={`prob-${c.celda_id}`} center={[c.lat, c.lon]} radius={2.2}
      pathOptions={{ color: colorProbabilidad(c.probabilidad), fillColor: colorProbabilidad(c.probabilidad), fillOpacity: 0.75, weight: 0 }}>
      <Popup>Prob. ignición: {c.probabilidad.toFixed(3)}</Popup>
    </CircleMarker>
  ));
}
