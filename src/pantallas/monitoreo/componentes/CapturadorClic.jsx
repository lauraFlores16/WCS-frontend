// Captura clics sobre el mapa y devuelve las coordenadas (lat, lon).
// Se usa en la Capa 3 para poner el foco de calor haciendo clic.
import { useMapEvents } from "react-leaflet";

export default function CapturadorClic({ activo, onClic }) {
  useMapEvents({
    click(e) {
      if (activo) onClic(e.latlng.lat, e.latlng.lng);
    },
  });
  return null;
}
