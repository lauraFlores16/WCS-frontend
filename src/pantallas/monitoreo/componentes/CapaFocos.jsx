import { CeldaMarker } from "../../../nucleo/BaseMap";

export default function CapaFocos({ focos }) {
  return focos.map((f) => (
    <CeldaMarker key={`foco-${f.id}`} lat={f.lat} lon={f.lon} estado="ardiendo" radius={2.5}
      popupContent={`Foco histórico #${f.id} · ${new Date(f.fecha).toLocaleDateString()}${f.confianza ? ` · confianza ${f.confianza}` : ""}`} />
  ));
}
