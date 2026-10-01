import { CircleMarker, Popup } from "react-leaflet";

/**
 * Focos históricos del proyecto (focos.csv, 2019-2025).
 *
 * Forma y color distintos de los focos activos de NASA FIRMS: círculo hueco
 * gris azulado frente al relleno naranja de los activos. Tienen que
 * distinguirse de un vistazo, porque confundir un registro de 2019 con una
 * detección de hoy lleva a decidir sobre un incendio que no existe.
 */

const COLOR = "#64748B";

export default function CapaFocosHistoricos({ focos }) {
  if (!focos?.length) return null;

  return focos.map((f) => (
    <CircleMarker
      key={`hist-${f.id}`}
      center={[f.lat, f.lon]}
      radius={2.8}
      pathOptions={{ color: COLOR, fillColor: "transparent",
                     fillOpacity: 0, weight: 1.4 }}
    >
      <Popup>
        <strong>Foco histórico</strong>
        <br />
        {f.fecha || "sin fecha"}
        <br />
        <em style={{ color: COLOR }}>Base histórica SIPRO</em>
        <br />
        <small>No es una detección actual.</small>
      </Popup>
    </CircleMarker>
  ));
}
