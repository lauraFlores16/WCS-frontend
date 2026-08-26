// ============================================================================
// ALERTAS — contenido de la pestaña "Alertas" del panel derecho
// ============================================================================
// Cada alerta lleva coordenadas, así que la tarjeta entera es pulsable para
// saltar al punto en el mapa, y trae un botón para simular ahí mismo. Es el
// acceso rápido al foco: sin eso serían líneas de texto que no llevan a
// ninguna parte.
//
// Dos orígenes, mismo formato:
//   · riesgo     — del municipio (probabilidad XGBoost + meteorología). Salen
//                  sin necesidad de simular, por eso nunca está vacío.
//   · simulacion — de la corrida del autómata (celdas comprometidas, crecimiento).
import Icono from "../../../nucleo/Icono";

const ESTILO_NIVEL = {
  amarilla: { badge: "badge--amarilla", label: "Amarilla", orden: 1 },
  naranja: { badge: "badge--naranja", label: "Naranja", orden: 2 },
  roja: { badge: "badge--roja", label: "Roja", orden: 3 },
};

const tieneCoords = (a) => Number.isFinite(a?.lat) && Number.isFinite(a?.lon);

export default function PanelAlertas({
  activas = [],
  historial = [],
  mostrarHistorial,
  setMostrarHistorial,
  onIrAlFoco,
  onSimularAqui,
  onConsolaAqui,
  puedeSimular,
  simulando,
  focoActual,
}) {
  const lista = mostrarHistorial ? historial : activas;

  return (
    <div className="alertas">
      <div className="alertas-conmutador">
        <button className={`alertas-opcion${!mostrarHistorial ? " activa" : ""}`}
          onClick={() => setMostrarHistorial(false)}>
          Activas ({activas.length})
        </button>
        <button className={`alertas-opcion${mostrarHistorial ? " activa" : ""}`}
          onClick={() => setMostrarHistorial(true)}>
          Historial ({historial.length})
        </button>
      </div>

      {lista.length === 0 ? (
        <div className="alertas-vacio">
          <Icono nombre="verificado" tam={22} />
          <span>
            {mostrarHistorial
              ? "Todavía no hay alertas registradas."
              : "Sin alertas activas ahora mismo."}
          </span>
        </div>
      ) : (
        <div className="alertas-lista">
          {lista.map((a, i) => {
            const cfg = ESTILO_NIVEL[a.nivel] || ESTILO_NIVEL.amarilla;
            const navegable = tieneCoords(a);
            const esFocoActual =
              navegable && focoActual &&
              Math.abs(focoActual.lat - a.lat) < 0.005 &&
              Math.abs(focoActual.lon - a.lon) < 0.005;

            return (
              <article
                key={a.id ?? `${a.iteracion}-${i}`}
                className={`alerta-tarjeta${esFocoActual ? " es-foco" : ""}${navegable ? " navegable" : ""}`}
                style={{ borderLeftColor: `var(--alerta-${a.nivel})` }}
                onClick={navegable ? () => onIrAlFoco?.(a) : undefined}
                title={navegable ? "Ir a este punto en el mapa" : undefined}
              >
                <div className="alerta-fila-cabecera">
                  <span className={`badge ${cfg.badge}`}>{cfg.label}</span>
                  {a.iteracion != null && <span className="mono alerta-iter">iter {a.iteracion}</span>}
                  {a.origen === "riesgo" && <span className="alerta-origen">municipio</span>}
                </div>

                <p className="alerta-mensaje">{a.mensaje}</p>

                {navegable && (
                  <div className="alerta-acciones" onClick={(e) => e.stopPropagation()}>
                    <button className="btn btn--mini" onClick={() => onIrAlFoco?.(a)}>
                      <Icono nombre="ubicacion" tam={13} />
                      Ver en el mapa
                    </button>
                    {puedeSimular && (
                      <button className="btn btn--mini btn--primary" disabled={simulando}
                        onClick={() => onSimularAqui?.(a)}
                        title="Poner el foco aquí y ejecutar la simulación completa">
                        <Icono nombre="simulacion" tam={13} />
                        {simulando ? "…" : "Simular"}
                      </button>
                    )}
                    {/* El acceso rápido que pedía la alerta: del aviso a la
                        consola sin pasar por ninguna otra pantalla. */}
                    {puedeSimular && onConsolaAqui && (
                      <button className="btn btn--mini" disabled={simulando}
                        onClick={() => onConsolaAqui(a)}
                        title="Abrir la consola en este punto para seguirlo paso a paso">
                        <Icono nombre="grafica" tam={13} />
                        Consola
                      </button>
                    )}
                  </div>
                )}
              </article>
            );
          })}
        </div>
      )}
    </div>
  );
}
