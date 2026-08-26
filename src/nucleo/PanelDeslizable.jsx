// ============================================================================
// PANEL LATERAL DERECHO — deslizable y contextual
// ============================================================================
// La regla de diseño que implementa: los datos NO viven en una fila fija
// encima del mapa. Aparecen aquí, se consultan, y se cierra para devolverle el
// espacio al mapa.
//
// Cerrado deja solo una pestaña estrecha con su icono. Abierto empuja al mapa
// (no lo tapa), porque en un GIS tapar el mapa con un panel flotante esconde
// justo la zona que estás mirando. En pantallas pequeñas sí se superpone, que
// es lo único que cabe.
//
// El pie (`acciones`) queda SIEMPRE visible, esté donde esté el scroll: es
// donde vive el botón de ejecutar la simulación.
import Icono from "./Icono";
import "./estilos/AppShell.css";

export default function PanelDeslizable({
  abierto,
  onAlternar,
  titulo,
  subtitulo,
  iconoPestana = "informacion",
  etiquetaPestana = "Información",
  pestanas,          // [{ id, label, icono }] — opcional
  pestanaActiva,
  onCambiarPestana,
  acciones,          // pie fijo
  children,
}) {
  if (!abierto) {
    return (
      <aside className="panel-deslizable cerrado">
        <button className="panel-pestana" onClick={onAlternar}
          title={`Abrir ${etiquetaPestana.toLowerCase()}`} aria-label={`Abrir ${etiquetaPestana}`}>
          <Icono nombre="izquierda" tam={15} />
          <Icono nombre={iconoPestana} tam={17} />
          <span className="panel-pestana-texto">{etiquetaPestana}</span>
        </button>
      </aside>
    );
  }

  return (
    <aside className="panel-deslizable abierto">
      <header className="panel-cabecera">
        <div className="panel-cabecera-texto">
          <h2 className="panel-titulo">{titulo}</h2>
          {subtitulo && <p className="panel-subtitulo">{subtitulo}</p>}
        </div>
        <button className="panel-cerrar" onClick={onAlternar}
          title="Cerrar el panel" aria-label="Cerrar el panel">
          <Icono nombre="derecha" tam={16} />
        </button>
      </header>

      {pestanas?.length > 1 && (
        <div className={`panel-pestanas${pestanas.length > 3 ? " apretadas" : ""}`} role="tablist">
          {pestanas.map((p) => (
            <button key={p.id} role="tab"
              aria-selected={pestanaActiva === p.id}
              className={`panel-pestana-btn${pestanaActiva === p.id ? " activa" : ""}`}
              onClick={() => onCambiarPestana?.(p.id)}>
              {p.icono && <Icono nombre={p.icono} tam={15} />}
              {/* En <span> para que el CSS pueda recortar SOLO el texto con
                  puntos suspensivos y dejar el icono entero: con cuatro
                  pestañas en 340 px la etiqueta no siempre cabe. */}
              <span title={p.label}>{p.label}</span>
              {p.insignia ? <span className="panel-pestana-insignia">{p.insignia}</span> : null}
            </button>
          ))}
        </div>
      )}

      <div className="panel-cuerpo">{children}</div>

      {acciones && <div className="panel-acciones">{acciones}</div>}
    </aside>
  );
}
