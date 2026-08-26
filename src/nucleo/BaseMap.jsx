// Mapa Leaflet base. Compartido por las capas de Monitoreo (propagación, focos, probabilidad).
// preferCanvas: con 36,390 celdas el renderizado SVG por defecto se arrastra;
// canvas dibuja todos los puntos en un solo elemento y va fluido.
// OJO: canvas NO soporta variables CSS, por eso los colores van en hexadecimal
// concreto (mismos valores que los tokens --estado-* de estilos/tokens.css).
import { MapContainer, TileLayer, CircleMarker, Popup, useMap } from "react-leaflet";
import { useEffect } from "react";

export const CENTRO_APOLO = [-14.65, -68.25];

const COLOR_ESTADO = {
  no_quemada: "#4caf50",
  ardiendo: "#e8491c",
  quemada: "#5c6268",
};

// Fondos disponibles. "satelite" = Esri World Imagery (imagen real, sin API key).
export const FONDOS = {
  satelite: {
    label: "Satélite",
    url: "https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}",
    attribution: "Tiles &copy; Esri — Source: Esri, Maxar, Earthstar Geographics",
    maxZoom: 18,
  },
  oscuro: {
    label: "Oscuro",
    url: "https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png",
    attribution: "&copy; OpenStreetMap &copy; CARTO",
    maxZoom: 19,
  },
};

// Componente puente: expone la instancia del mapa Leaflet hacia arriba,
// para poder animar el zoom (flyTo) cuando se detecta el foco de calor.
function PuenteMapa({ onReady }) {
  const map = useMap();
  useEffect(() => {
    if (onReady) onReady(map);
  }, [map, onReady]);
  return null;
}

export default function BaseMap({ children, zoom = 10, center = CENTRO_APOLO, style, fondo = "satelite", onMapReady }) {
  const cfg = FONDOS[fondo] || FONDOS.satelite;
  return (
    <MapContainer
      center={center} zoom={zoom} preferCanvas
      style={{ height: 600, width: "100%", borderRadius: "var(--radius-lg)", ...style }}
    >
      <TileLayer key={fondo} attribution={cfg.attribution} url={cfg.url} maxZoom={cfg.maxZoom} />
      {onMapReady && <PuenteMapa onReady={onMapReady} />}
      {children}
    </MapContainer>
  );
}

export function CeldaMarker({ lat, lon, estado, radius = 3, popupContent }) {
  return (
    <CircleMarker
      center={[lat, lon]}
      radius={radius}
      pathOptions={{
        color: COLOR_ESTADO[estado] || "#888",
        fillColor: COLOR_ESTADO[estado] || "#888",
        fillOpacity: 0.8,
        weight: 0,
      }}
    >
      {popupContent && <Popup>{popupContent}</Popup>}
    </CircleMarker>
  );
}
