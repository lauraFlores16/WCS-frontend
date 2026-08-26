import { CeldaMarker } from "../../../nucleo/BaseMap";

export default function CapaPropagacion({ celdas }) {
  return celdas.map((c) => (
    <CeldaMarker key={`prop-${c.celda_id}`} lat={c.lat} lon={c.lon} estado={c.estado}
      popupContent={`Celda ${c.celda_id.slice(0, 8)} · ${c.estado}`} />
  ));
}
