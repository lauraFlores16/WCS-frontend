// Marcador del foco de calor detectado — con anillo pulsante para llamar la atención.
// Se dibuja con un CircleMarker + un divIcon animado por CSS.
import { CircleMarker, Marker, Popup } from "react-leaflet";
import L from "leaflet";

const iconoPulso = L.divIcon({
  className: "",
  html: `<div class="foco-pulso"><div class="foco-pulso-anillo"></div><div class="foco-pulso-centro"></div></div>`,
  iconSize: [28, 28],
  iconAnchor: [14, 14],
});

export default function MarcadorFoco({ foco }) {
  if (!foco) return null;
  return (
    <>
      <CircleMarker
        center={[foco.lat, foco.lon]}
        radius={16}
        pathOptions={{ color: "#e8491c", fillColor: "#e8491c", fillOpacity: 0.15, weight: 1 }}
      />
      <Marker position={[foco.lat, foco.lon]} icon={iconoPulso}>
        <Popup>
          <strong>Foco de calor detectado</strong><br />
          Celda fila {foco.fila}, columna {foco.columna}<br />
          Probabilidad XGBoost: <strong>{foco.prob_ignicion?.toFixed(4)}</strong>
        </Popup>
      </Marker>
    </>
  );
}
