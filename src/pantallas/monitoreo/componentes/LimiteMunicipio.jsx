// Frontera oficial del municipio de Apolo (Franz Tamayo, La Paz).
// Dibuja el límite administrativo real (del shapefile municipal) sobre el mapa,
// como referencia del área de estudio. Se carga una sola vez.
import { useEffect, useState } from "react";
import { GeoJSON } from "react-leaflet";

export default function LimiteMunicipio({ visible = true }) {
  const [geojson, setGeojson] = useState(null);

  useEffect(() => {
    fetch("/datos/apolo_limite.geojson")
      .then((r) => r.json())
      .then(setGeojson)
      .catch(() => setGeojson(null));
  }, []);

  if (!visible || !geojson) return null;

  return (
    <GeoJSON
      data={geojson}
      style={{
        color: "#2fafa6",        // turquesa de marca
        weight: 2.5,
        opacity: 0.9,
        fillColor: "#2fafa6",
        fillOpacity: 0.04,
        dashArray: "6 4",
      }}
    />
  );
}
