// Visor del informe en un modal (sin salir de la página). Muestra el HTML del
// informe en un iframe y ofrece descargarlo como PDF tamaño carta mediante la
// impresión del navegador (configurada a tamaño carta con @page).
import { useEffect, useRef } from "react";
import "./estilos/VisorInforme.css";

export default function VisorInforme({ html, nombre, onCerrar }) {
  const iframeRef = useRef(null);

  // Cargar el HTML en el iframe, añadiendo el CSS de página tamaño carta.
  useEffect(() => {
    if (!html || !iframeRef.current) return;
    const htmlCarta = html.replace(
      "</head>",
      `<style>
        @page { size: letter; margin: 14mm; }
        @media print { body { margin: 0; } }
      </style></head>`
    );
    const doc = iframeRef.current.contentDocument;
    doc.open();
    doc.write(htmlCarta);
    doc.close();
  }, [html]);

  // Descargar como PDF = imprimir el iframe (el usuario elige "Guardar como PDF").
  function descargarPDF() {
    const win = iframeRef.current?.contentWindow;
    if (win) {
      win.focus();
      win.print();
    }
  }

  useEffect(() => {
    const onEsc = (e) => e.key === "Escape" && onCerrar();
    window.addEventListener("keydown", onEsc);
    return () => window.removeEventListener("keydown", onEsc);
  }, [onCerrar]);

  return (
    <div className="visor-fondo" onClick={onCerrar}>
      <div className="visor-caja" onClick={(e) => e.stopPropagation()}>
        <div className="visor-barra">
          <span className="visor-titulo">Informe del incendio — {nombre || "escenario"}</span>
          <div className="visor-acciones">
            <button className="btn btn--primary" onClick={descargarPDF}>
              Descargar PDF (carta)
            </button>
            <button className="btn visor-cerrar" onClick={onCerrar} aria-label="Cerrar">×</button>
          </div>
        </div>
        <iframe ref={iframeRef} className="visor-iframe" title="Informe del incendio" />
      </div>
    </div>
  );
}
