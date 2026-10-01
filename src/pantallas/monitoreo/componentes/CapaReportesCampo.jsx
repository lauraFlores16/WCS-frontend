import { Marker, Popup } from "react-leaflet";
import L from "leaflet";

/**
 * Reportes de campo de los brigadistas sobre el mapa.
 *
 * POR QUÉ NO SON CÍRCULOS COMO LOS FOCOS SATELITALES
 *   Los focos de NASA FIRMS se dibujan como círculos: son detecciones
 *   automáticas de un sensor. Un reporte de campo es una observación HUMANA, y
 *   confundir las dos cosas sería grave — no tienen la misma fiabilidad, ni la
 *   misma resolución, ni el mismo significado.
 *
 *   Por eso los reportes usan una forma completamente distinta: un marcador con
 *   pin y contorno blanco. Se distinguen por FORMA, no solo por color, así que
 *   funcionan igual en modo claro y oscuro y para quien no distinga bien los
 *   colores. La leyenda los nombra con texto.
 *
 * EL COLOR DICE QUÉ SE OBSERVÓ, no lo urgente que es
 *   humo visible → ámbar · fuego activo → rojo · área quemada → marrón
 *   Son los tres estados del formulario, en el mismo orden.
 */

export const ESTADO_REPORTE = {
  humo_visible: { color: "#F59E0B", texto: "Humo visible", glifo: "≈" },
  fuego_activo: { color: "#DC2626", texto: "Fuego activo", glifo: "▲" },
  area_quemada: { color: "#78350F", texto: "Área quemada", glifo: "■" },
};

/** Pin SVG propio: forma distinta de los círculos de FIRMS. */
function iconoReporte(estado) {
  const cfg = ESTADO_REPORTE[estado] || ESTADO_REPORTE.humo_visible;
  const svg = `
    <svg xmlns="http://www.w3.org/2000/svg" width="26" height="34" viewBox="0 0 26 34">
      <path d="M13 1C6.9 1 2 5.9 2 12c0 7.7 11 21 11 21s11-13.3 11-21C24 5.9 19.1 1 13 1z"
            fill="${cfg.color}" stroke="#ffffff" stroke-width="2"/>
      <circle cx="13" cy="12" r="4.2" fill="#ffffff"/>
    </svg>`;
  return L.divIcon({
    html: svg,
    className: "rep-marcador",
    iconSize: [26, 34],
    iconAnchor: [13, 33],     // la punta del pin, en la coordenada exacta
    popupAnchor: [0, -30],
  });
}

const fechaLarga = (iso) => {
  if (!iso) return "—";
  const d = new Date(iso);
  return Number.isNaN(d.getTime())
    ? iso
    : `${d.toLocaleDateString("es-BO")} · ${d.toLocaleTimeString("es-BO", {
        hour: "2-digit", minute: "2-digit" })}`;
};

/**
 * @param {Array}  reportes
 * @param {boolean} puedeVerDetalle  Analista y UGR ven la ficha completa con
 *        fotografía. Si algún día hiciera falta un rol con acceso al mapa pero
 *        no al detalle, este interruptor ya está puesto.
 */
export default function CapaReportesCampo({ reportes, puedeVerDetalle = true }) {
  if (!reportes?.length) return null;

  return reportes.map((r) => {
    if (r.lat == null || r.lon == null) return null;
    const cfg = ESTADO_REPORTE[r.estado] || ESTADO_REPORTE.humo_visible;

    return (
      <Marker key={`rep-${r.id}`} position={[r.lat, r.lon]}
        icon={iconoReporte(r.estado)}>
        <Popup maxWidth={280} className="rep-popup">
          <div className="rep-ficha">
            <div className="rep-ficha-cabecera"
              style={{ borderLeftColor: cfg.color }}>
              <strong>{cfg.texto}</strong>
              <span>Reporte de campo</span>
            </div>

            {puedeVerDetalle ? (
              <>
                <dl className="rep-ficha-datos">
                  <div>
                    <dt>Brigadista</dt>
                    <dd>{r.brigadista || "—"}</dd>
                  </div>
                  <div>
                    <dt>Fecha y hora</dt>
                    <dd className="mono">{fechaLarga(r.fecha)}</dd>
                  </div>
                  <div>
                    <dt>Ubicación</dt>
                    <dd className="mono">
                      {Number(r.lat).toFixed(5)}, {Number(r.lon).toFixed(5)}
                    </dd>
                  </div>
                  <div>
                    <dt>Revisión</dt>
                    <dd>{r.revision || "pendiente"}</dd>
                  </div>
                </dl>

                {r.descripcion && (
                  <p className="rep-ficha-desc">{r.descripcion}</p>
                )}

                {r.foto && (
                  <a href={r.foto} target="_blank" rel="noreferrer"
                     className="rep-ficha-foto">
                    <img src={r.foto} alt="Evidencia del reporte" />
                    <span>Abrir la fotografía</span>
                  </a>
                )}
              </>
            ) : (
              <p className="rep-ficha-desc">
                Reporte registrado. El detalle está disponible para el analista
                espacial.
              </p>
            )}
          </div>
        </Popup>
      </Marker>
    );
  });
}
