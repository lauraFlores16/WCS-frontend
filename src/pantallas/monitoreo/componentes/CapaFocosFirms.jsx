// Capa 3 — Focos de calor NASA FIRMS (tiempo casi real).
// Los focos ACTIVOS son la prioridad para iniciar la simulación directa, así que
// se dibujan de forma llamativa: un halo exterior + un núcleo brillante, con el
// tamaño escalado por intensidad (FRP). Al hacer clic en uno se toma como punto
// de inicio de la simulación (celda del grid más cercana).
// Esta capa dibuja SOLO detecciones activas. La rama que pintaba históricos
// en azul se eliminó: mientras existía, cualquier cosa con `historico: true`
// que llegara a este array se renderizaba dentro de la capa de NASA FIRMS y
// se leía como detección actual. Los históricos tienen su propia capa.
import { CircleMarker, Tooltip, Popup } from "react-leaflet";

function colorFoco(frp) {
  if (frp == null) return "#ff7a1a";
  if (frp > 30) return "#ff2b2b";
  if (frp > 10) return "#ff5116";
  return "#ff7a1a";
}
// Radio del núcleo según intensidad, para que los focos fuertes se noten más.
function radioFoco(frp) {
  if (frp == null) return 6;
  if (frp > 30) return 9;
  if (frp > 10) return 7.5;
  return 6;
}

export default function CapaFocosFirms({ focos, onSeleccionarFoco }) {
  return focos.map((f) => {
    // Cinturón de seguridad: si algo marcado como histórico se cuela en este
    // array, no se dibuja. La capa de activos solo pinta activos.
    if (f.historico) return null;

    const color = colorFoco(f.frp);
    const r = radioFoco(f.frp);
    const manejadores = onSeleccionarFoco ? { click: () => onSeleccionarFoco(f) } : undefined;
    return (
      <FocoActivo key={f.id} f={f} color={color} r={r} manejadores={manejadores}
        onSeleccionarFoco={onSeleccionarFoco} />
    );
  });
}

function FocoActivo({ f, color, r, manejadores, onSeleccionarFoco }) {
  return (
    <>
      {/* Halo exterior translúcido (da el efecto de foco encendido) */}
      <CircleMarker
        center={[f.lat, f.lon]}
        radius={r + 8}
        pathOptions={{ color, fillColor: color, fillOpacity: 0.15, weight: 0, className: "foco-halo" }}
        eventHandlers={manejadores}
      />
      {/* Anillo medio */}
      <CircleMarker
        center={[f.lat, f.lon]}
        radius={r + 3}
        pathOptions={{ color, fillColor: color, fillOpacity: 0.28, weight: 0 }}
        eventHandlers={manejadores}
      />
      {/* Núcleo brillante con borde blanco para resaltar sobre el satélite */}
      <CircleMarker
        center={[f.lat, f.lon]}
        radius={r}
        pathOptions={{ color: "#ffffff", fillColor: color, fillOpacity: 1, weight: 1.5 }}
        eventHandlers={manejadores}
      >
        {/* Los focos más intensos muestran su FRP permanentemente */}
        {f.frp != null && f.frp > 20 && (
          <Tooltip permanent direction="top" className="foco-etiqueta" offset={[0, -r]}>
            {Math.round(f.frp)} MW
          </Tooltip>
        )}
        <Popup>
          <strong>Foco de calor NASA FIRMS</strong><br />
          Coordenadas: {f.lat.toFixed(4)}, {f.lon.toFixed(4)}<br />
          Fecha: {f.fecha} {f.hora && `· ${f.hora.slice(0,2)}:${f.hora.slice(2)} UTC`}<br />
          {f.frp != null && <>Intensidad (FRP): <strong>{f.frp}</strong> MW<br /></>}
          {f.confianza && <>Confianza: {f.confianza}<br /></>}
          Satélite: {f.satelite}
          {onSeleccionarFoco && (
            <div style={{ marginTop: 8, padding: "6px 8px", background: "#fff4f0", borderRadius: 4, fontSize: 11.5, color: "#a3311c", fontWeight: 600 }}>
              Clic para iniciar la simulación desde este foco
            </div>
          )}
        </Popup>
      </CircleMarker>
    </>
  );
}
