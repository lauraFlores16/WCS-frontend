// Notificación en pantalla en la ubicación exacta del mapa (Capas 2 y 3).
// Muestra un marcador destacado con el nivel de probabilidad detectado por la
// verificación automática, justo sobre la celda evaluada.
import { CircleMarker, Popup, Tooltip } from "react-leaflet";

export default function NotificacionProbabilidad({ verificacion }) {
  if (!verificacion) return null;
  const { lat, lon, porcentaje, nivel, colorNivel } = verificacion;

  return (
    <CircleMarker
      center={[lat, lon]}
      radius={14}
      pathOptions={{ color: colorNivel, fillColor: colorNivel, fillOpacity: 0.25, weight: 2 }}
    >
      <Tooltip permanent direction="top" offset={[0, -10]}>
        <span style={{ fontSize: 11, fontWeight: 700, color: colorNivel }}>
          {nivel} · {porcentaje}%
        </span>
      </Tooltip>
      <Popup>
        <strong>Probabilidad de incendio: {nivel}</strong><br />
        {porcentaje}% en esta ubicación<br />
        {lat.toFixed(5)}, {lon.toFixed(5)}
      </Popup>
    </CircleMarker>
  );
}
