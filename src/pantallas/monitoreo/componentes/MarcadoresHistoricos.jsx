// Marcadores de los focos de ignición reales de los eventos históricos
// (2021, 2023, 2024). Sirven de referencia: el usuario puede ver dónde
// empezaron los incendios reales y poner su foco de simulación cerca.
import { CircleMarker, Popup, Tooltip } from "react-leaflet";

const COLOR_ANIO = {
  2021: "#e8c547",
  2023: "#f0902f",
  2024: "#e13a3a",
};

export default function MarcadoresHistoricos({ eventos, onUsarComoFoco }) {
  return eventos.map((ev) => (
    <CircleMarker
      key={ev.anio}
      center={[ev.foco.lat, ev.foco.lon]}
      radius={9}
      pathOptions={{
        color: COLOR_ANIO[ev.anio] || "#fff",
        fillColor: COLOR_ANIO[ev.anio] || "#fff",
        fillOpacity: 0.55,
        weight: 2,
      }}
    >
      <Tooltip permanent direction="top" offset={[0, -8]}>
        <span style={{ fontSize: 11, fontWeight: 600 }}>{ev.anio}</span>
      </Tooltip>
      <Popup>
        <strong>{ev.nombre}</strong><br />
        Ignición real: fila {ev.foco.fila}, col {ev.foco.columna}<br />
        Coordenadas: {ev.foco.lat.toFixed(4)}, {ev.foco.lon.toFixed(4)}<br />
        Área quemada: <strong>{ev.area_km2} km²</strong> en {ev.duracion_dias} días<br />
        Velocidad: {ev.velocidad_km2_dia} km²/día<br />
        {onUsarComoFoco && (
          <button
            onClick={() => onUsarComoFoco(ev)}
            style={{
              marginTop: 8, padding: "4px 10px", fontSize: 12, cursor: "pointer",
              background: "#2fafa6", color: "#06201c", border: "none", borderRadius: 4, fontWeight: 600,
            }}
          >
            Usar este punto como foco
          </button>
        )}
      </Popup>
    </CircleMarker>
  ));
}
