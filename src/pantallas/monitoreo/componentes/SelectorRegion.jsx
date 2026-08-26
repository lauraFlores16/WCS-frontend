// Selector de región de prueba. Al elegir una, reubica el mapa y el foco a esas
// coordenadas; con el foco se mueven también las consultas a las APIs
// (meteorología, DEM, focos FIRMS), que pasan a traer datos de esa zona.
import { REGIONES } from "../../../local/regiones";

export default function SelectorRegion({ regionId, onSeleccionar, compacto = false }) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
      {!compacto && <label className="field-label" style={{ margin: 0 }}>Región</label>}
      <select
        className="select"
        style={compacto
          ? { maxWidth: 200, padding: "5px 9px", fontSize: 12, borderRadius: "var(--radius-sm)" }
          : { maxWidth: 260 }}
        value={regionId || ""}
        onChange={(e) => onSeleccionar(e.target.value || null)}
        title="Cambia la zona de simulación. Las APIs traerán datos de la región elegida."
      >
        <option value="">Región…</option>
        {REGIONES.map((r) => (
          <option key={r.id} value={r.id}>
            {r.nombre}{r.dentroDelGrid ? "" : " (fuera del grid)"}
          </option>
        ))}
      </select>
    </div>
  );
}
