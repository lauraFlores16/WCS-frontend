// Límite administrativo real del municipio, del shapefile oficial.
// `zona` elige cuál: "apolo" (caso de estudio) o "rurrenabaque" (validación
// externa). Colores distintos a propósito, para que no se confundan.
import { useEffect, useState } from "react";
import { GeoJSON } from "react-leaflet";

const ZONAS = {
  apolo: { archivo: "/datos/apolo_limite.geojson", color: "#2fafa6" },
  rurrenabaque: { archivo: "/datos/rurrenabaque_limite.geojson", color: "#3B82F6" },
};

export default function LimiteMunicipio({ visible = true, zona = "apolo" }) {
  const [geojson, setGeojson] = useState(null);
  const cfg = ZONAS[zona] || ZONAS.apolo;

  useEffect(() => {
    let vivo = true;
    setGeojson(null);
    fetch(cfg.archivo)
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => { if (vivo) setGeojson(d); })
      .catch(() => { if (vivo) setGeojson(null); });
    return () => { vivo = false; };
  }, [cfg.archivo]);

  if (!visible || !geojson) return null;

  return (
    <GeoJSON
      key={zona}
      data={geojson}
      style={{
        color: cfg.color,
        weight: 2.5,
        opacity: 0.9,
        fillColor: cfg.color,
        fillOpacity: 0.04,
        dashArray: "6 4",
      }}
    />
  );
}
