import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import Icono from "../../../nucleo/Icono";

/**
 * Apartado «Validación externa — Rurrenabaque» para la pantalla de Escenarios.
 *
 * POR QUÉ AQUÍ UN RESUMEN Y NO LA PANTALLA ENTERA
 *   Escenarios es un formulario: se configuran condiciones y se lanza una
 *   corrida. La validación, en cambio, es un resultado espacial: sin mapa no
 *   se puede leer, porque lo que hay que ver es DÓNDE acertó y dónde no.
 *
 *   Así que aquí va la puerta de entrada —el estado, las cuatro cifras y el
 *   acceso— y el análisis completo vive donde está el mapa, en Simulación →
 *   Validación. Duplicar el panel en las dos pantallas obligaría a mantener
 *   dos copias que se desincronizarían.
 *
 * Y LA DISTINCIÓN QUE NO HAY QUE PERDER
 *   Un escenario responde «¿qué pasa si cambian las condiciones?».
 *   La validación responde «¿se parece esto a un incendio que ocurrió?».
 *   Son preguntas distintas. La tarjeta lo dice en pantalla a propósito,
 *   porque están una al lado de la otra y es fácil confundirlas.
 */

const pct = (v) => (v == null ? "—" : `${(v * 100).toFixed(1)} %`);

export default function TarjetaValidacion() {
  const navigate = useNavigate();
  const [datos, setDatos] = useState(null);
  const [cargado, setCargado] = useState(false);

  useEffect(() => {
    fetch("/datos/validacion_rbq.json")
      .then((r) => (r.ok ? r.json() : null))
      .then(setDatos)
      .catch(() => setDatos(null))
      .finally(() => setCargado(true));
  }, []);

  const abrir = () =>
    navigate("/simulacion", { state: { pestana: "validacion" } });

  if (!cargado) return null;

  return (
    <section className="pc-validacion">
      <header className="pc-val-cabecera">
        <div>
          <h3>
            <Icono nombre="verificado" tam={15} />
            Validación externa del autómata
          </h3>
          <p className="pc-val-sub">
            Rurrenabaque, Beni · municipio independiente del área de estudio
          </p>
        </div>
        {datos?._demo && (
          <span className="pc-val-demo">datos de demostración</span>
        )}
      </header>

      <p className="pc-val-explica">
        Un <strong>escenario</strong> responde qué pasaría si cambiaran las
        condiciones. La <strong>validación</strong> responde algo distinto: si
        el autómata reproduce un incendio que ya ocurrió. Se ejecuta con los
        parámetros calibrados en Apolo, congelados y sin reajustar.
      </p>

      {datos ? (
        <>
          <div className="pc-val-cifras">
            {[
              ["IoU", pct(datos.metricas?.iou)],
              ["F1", pct(datos.metricas?.f1)],
              ["Recall", pct(datos.metricas?.recall)],
              ["Error de área",
               datos.areas?.error_relativo_pct == null
                 ? "—" : `${datos.areas.error_relativo_pct.toFixed(1)} %`],
            ].map(([k, v]) => (
              <div key={k} className="pc-val-cifra">
                <span>{k}</span>
                <strong className="mono">{v}</strong>
              </div>
            ))}
          </div>

          <dl className="pc-val-datos">
            <div>
              <dt>Evento</dt>
              <dd>{datos.evento?.id || "—"}</dd>
            </div>
            <div>
              <dt>Periodo</dt>
              <dd className="mono">
                {datos.evento?.fecha_inicio || "—"} → {datos.evento?.fecha_fin || "—"}
              </dd>
            </div>
            <div>
              <dt>Corridas del autómata</dt>
              <dd className="mono">{datos.modelo?.corridas ?? "—"}</dd>
            </div>
            <div>
              <dt>Comportamiento</dt>
              <dd>{datos.comportamiento || "—"}</dd>
            </div>
          </dl>

          <button type="button" className="btn btn--primary pc-val-btn" onClick={abrir}>
            <Icono nombre="mapa" tam={15} />
            Ver la comparación en el mapa
          </button>
        </>
      ) : (
        <>
          <p className="pc-val-vacio">
            Todavía no hay resultados. Esta tarjeta no muestra datos de ejemplo:
            aparecerán en cuanto se ejecute la cadena de validación y se lance{" "}
            <code>f14_exportar_frontend.py</code>.
          </p>
          <button type="button" className="btn pc-val-btn" onClick={abrir}>
            <Icono nombre="mapa" tam={15} />
            Abrir la pestaña Validación
          </button>
        </>
      )}
    </section>
  );
}
