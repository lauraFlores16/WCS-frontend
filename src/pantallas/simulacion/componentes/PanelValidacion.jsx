import Icono from "../../../nucleo/Icono";
import { LEYENDAS, LEYENDA_SEMILLA } from "./CapaComparacion";

/**
 * Panel de la validación histórica.
 *
 * Todo sale de los JSON que genera validacion/exportar_frontend.py. Aquí no
 * hay ni un número escrito: si un dato falta sale un guion, nunca un cero. Un
 * cero se leería como «el modelo no acertó nada» cuando significaría «no se
 * ha calculado», y esa confusión en una defensa es cara.
 */

const pct = (v) => (v == null ? "—" : `${(v * 100).toFixed(1)} %`);
const km2 = (v) => (v == null ? "—" : `${Number(v).toFixed(2)} km²`);
const num = (v) => (v == null ? "—" : Number(v).toLocaleString("es-BO"));

const MODOS = [
  ["real", "Área real", "capas"],
  ["simulado", "Simulación", "simulacion"],
  ["comparacion", "Comparación", "comparacion"],
  ["pasos", "Propagación paso a paso", "reloj"],
];

function Matriz({ m, titulo, nota }) {
  return (
    <section className="val-seccion">
      <h3 className="val-titulo">{titulo}</h3>
      {nota && <p className="val-nota">{nota}</p>}
      <div className="val-metricas">
        {[["IoU", m.iou], ["Precision", m.precision],
          ["Recall", m.recall], ["F1-score", m.f1]].map(([k, v]) => (
          <div key={k} className="val-metrica">
            <span className="val-metrica-label">{k}</span>
            <span className="val-metrica-valor mono">{pct(v)}</span>
          </div>
        ))}
      </div>
      <table className="val-matriz">
        <thead>
          <tr><th /><th>Real quemado</th><th>Real no quemado</th></tr>
        </thead>
        <tbody>
          <tr>
            <th>Simulado quemado</th>
            <td className="tp"><span className="mono">{num(m.tp)}</span><em>TP</em></td>
            <td className="fp"><span className="mono">{num(m.fp)}</span><em>FP</em></td>
          </tr>
          <tr>
            <th>Simulado no quemado</th>
            <td className="fn"><span className="mono">{num(m.fn)}</span><em>FN</em></td>
            <td className="tn"><span className="mono">{num(m.tn)}</span><em>TN</em></td>
          </tr>
        </tbody>
      </table>
    </section>
  );
}

export default function PanelValidacion({
  indice, zona, onZona, eventoId, onEvento, datos, cargando,
  modo, onModo, verSemillas, onVerSemillas,
  paso, totalPasos, onPaso, reproduciendo, onReproducir, minutos,
}) {
  const zonas = indice ? Object.keys(indice.zonas) : [];
  const eventos = indice && zona ? (indice.zonas[zona] || []) : [];
  const ev = eventos.find((e) => e.id === eventoId);

  return (
    <div className="val-panel">

      {/* ---- Selectores ---- */}
      <section className="val-seccion">
        <h3 className="val-titulo">Área de validación</h3>
        <div className="val-modos" role="radiogroup" aria-label="Área">
          {zonas.map((z) => (
            <button key={z} type="button" role="radio" aria-checked={zona === z}
              className={`val-modo${zona === z ? " activo" : ""}`}
              onClick={() => onZona(z)}>
              <span className="val-modo-marca" aria-hidden="true">
                {zona === z ? "✓" : ""}
              </span>
              <Icono nombre="ubicacion" tam={14} />
              {z === "apolo" ? "Apolo" : "Rurrenabaque"}
            </button>
          ))}
        </div>

        {eventos.length > 0 && (
          <>
            <span className="field-label">Evento histórico</span>
            <select className="input" value={eventoId || ""}
              onChange={(e) => onEvento(e.target.value)}>
              {eventos.map((e) => (
                <option key={e.id} value={e.id}>
                  {e.etiqueta}{e.ejecutado ? "" : " · pendiente"}
                </option>
              ))}
            </select>
          </>
        )}
      </section>

      {/* ---- Evento sin ejecutar ---- */}
      {ev && !ev.ejecutado && (
        <div className="val-parcial-aviso">
          <Icono nombre="informacion" tam={16} />
          <div>
            <strong>Validación pendiente</strong>
            <p>
              Este evento no se ha ejecutado. No se muestran métricas ni mapa
              porque no existen: faltan datos reales.
            </p>
            {ev.faltan?.length > 0 && (
              <ol>{ev.faltan.map((f, i) => <li key={i}>{f}</li>)}</ol>
            )}
          </div>
        </div>
      )}

      {cargando && (
        <p className="val-nota">
          <Icono nombre="refrescar" tam={14} /> Cargando la validación…
        </p>
      )}

      {ev?.ejecutado && datos && (
        <>
          {/* ---- Ficha del evento ---- */}
          <section className="val-seccion">
            <h3 className="val-titulo">Evento</h3>
            <dl className="val-datos">
              <div><dt>Periodo</dt><dd className="mono">
                {datos.fecha_inicio} → {datos.fecha_fin}</dd></div>
              <div><dt>Cicatriz</dt><dd>{datos.cicatriz?.fuente?.split("·")[0]}</dd></div>
              <div><dt>Resolución</dt><dd className="mono">
                {datos.cicatriz?.resolucion_m} m → 500 m</dd></div>
              <div><dt>Focos FIRMS</dt><dd className="mono">
                {num(datos.focos?.detecciones)} del {datos.focos?.fecha}</dd></div>
              <div><dt>Celdas de arranque</dt><dd className="mono">
                {num(datos.focos?.celdas_iniciales)}</dd></div>
              <div><dt>Ejecutada</dt><dd className="mono">
                {datos.fecha_ejecucion
                  ? new Date(datos.fecha_ejecucion).toLocaleString("es-BO",
                      { day: "2-digit", month: "2-digit", year: "numeric",
                        hour: "2-digit", minute: "2-digit" })
                  : "—"}</dd></div>
            </dl>
            {datos.cicatriz?.limitacion && (
              <p className="val-nota">{datos.cicatriz.limitacion}</p>
            )}
          </section>

          {/* ---- Capa del mapa ---- */}
          <section className="val-seccion">
            <h3 className="val-titulo">Capa del mapa</h3>
            <div className="val-modos" role="radiogroup" aria-label="Capa">
              {MODOS.map(([id, texto, icono]) => (
                <button key={id} type="button" role="radio"
                  aria-checked={modo === id}
                  className={`val-modo${modo === id ? " activo" : ""}`}
                  onClick={() => onModo(id)}>
                  <span className="val-modo-marca" aria-hidden="true">
                    {modo === id ? "✓" : ""}
                  </span>
                  <Icono nombre={icono} tam={14} />
                  {texto}
                </button>
              ))}
            </div>

            <label className="val-check">
              <input type="checkbox" checked={verSemillas}
                onChange={(e) => onVerSemillas(e.target.checked)} />
              Marcar los focos iniciales entregados al autómata
            </label>

            <ul className="val-leyenda">
              {(LEYENDAS[modo] || []).map((l) => (
                <li key={l.t}>
                  <i style={{ background: l.c }} />
                  {l.g && <span className="val-leyenda-glifo">{l.g}</span>}
                  <span className="val-leyenda-texto">{l.t}</span>
                  <span className="val-leyenda-clase">{l.a}</span>
                </li>
              ))}
              {verSemillas && (
                <li>
                  <i style={{ background: "transparent",
                              border: `2px solid ${LEYENDA_SEMILLA.c}` }} />
                  <span className="val-leyenda-texto">{LEYENDA_SEMILLA.t}</span>
                  <span className="val-leyenda-clase">{LEYENDA_SEMILLA.a}</span>
                </li>
              )}
            </ul>
          </section>

          {/* ---- Reproductor ---- */}
          {modo === "pasos" && totalPasos > 0 && (
            <section className="val-seccion">
              <h3 className="val-titulo">Propagación</h3>
              <div className="val-reproductor">
                <button type="button" className="btn btn--mini"
                  onClick={() => onPaso(0)} title="Al inicio">⏮</button>
                <button type="button" className="btn btn--mini"
                  onClick={() => onPaso(Math.max(0, paso - 1))}>◀</button>
                <button type="button" className="btn btn--mini btn--primary"
                  onClick={() => onReproducir(!reproduciendo)}>
                  {reproduciendo ? "⏸" : "▶"}
                </button>
                <button type="button" className="btn btn--mini"
                  onClick={() => onPaso(Math.min(totalPasos - 1, paso + 1))}>▶</button>
                <button type="button" className="btn btn--mini"
                  onClick={() => onPaso(totalPasos - 1)} title="Al final">⏭</button>
              </div>
              <input type="range" min={0} max={totalPasos - 1} value={paso}
                onChange={(e) => onPaso(Number(e.target.value))}
                className="val-slider" />
              <div className="val-reproductor-estado mono">
                paso {paso} / {totalPasos - 1} · minuto {minutos ?? 0}
                {" · "}{((minutos ?? 0) / 60).toFixed(1)} h
              </div>
              <p className="val-nota">
                Estados reales que produjo el autómata en cada iteración. Sin
                interpolar ni animar: lo que se ve es lo que calculó el modelo.
              </p>
            </section>
          )}

          {/* ---- Superficie ---- */}
          <section className="val-seccion">
            <h3 className="val-titulo">Superficie</h3>
            <dl className="val-datos">
              <div><dt>Área real</dt>
                <dd className="mono">{km2(datos.general?.area_real_km2)}</dd></div>
              <div><dt>Área simulada</dt>
                <dd className="mono">{km2(datos.general?.area_simulada_km2)}</dd></div>
              <div><dt>Diferencia</dt>
                <dd className={`mono ${datos.general?.diferencia_km2 >= 0 ? "sube" : "baja"}`}>
                  {datos.general?.diferencia_km2 >= 0 ? "+" : ""}
                  {km2(datos.general?.diferencia_km2)}
                </dd></div>
            </dl>
          </section>

          {/* ---- Las dos evaluaciones ---- */}
          {datos.general && (
            <Matriz m={datos.general} titulo="Evaluación general"
              nota="Incluye las celdas que el autómata recibió encendidas." />
          )}
          {datos.propagacion && (
            <Matriz m={datos.propagacion} titulo="Evaluación de propagación"
              nota={`Excluye las ${num(datos.propagacion.celdas_excluidas)} celdas de arranque: mide solo lo que el autómata descubrió por sí mismo.`} />
          )}

          {/* ---- Sensibilidad ---- */}
          {datos.sensibilidad?.filas?.length > 0 && (
            <section className="val-seccion">
              <h3 className="val-titulo">Sensibilidad de p_base</h3>
              <p className="val-nota">
                Cómo cambia el modelo al variar p_base. <strong>No elige un
                valor óptimo</strong>: tomar el mejor F1 de este mismo evento y
                presentarlo luego como validación independiente sería circular.
              </p>
              <table className="val-sens">
                <thead>
                  <tr><th>p_base</th><th>km²</th><th>IoU</th><th>F1</th></tr>
                </thead>
                <tbody>
                  {datos.sensibilidad.filas.map((f) => (
                    <tr key={f.p_base}
                      className={f.p_base === datos.parametros?.p_base ? "usado" : ""}>
                      <td className="mono">{f.p_base.toFixed(2)}</td>
                      <td className="mono">{f.general.area_simulada_km2.toFixed(1)}</td>
                      <td className="mono">{pct(f.general.iou)}</td>
                      <td className="mono">{pct(f.general.f1)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </section>
          )}

          {/* ---- Configuración ---- */}
          <section className="val-seccion">
            <h3 className="val-titulo">Configuración</h3>
            <dl className="val-datos">
              <div><dt>p_base</dt><dd className="mono">{datos.parametros?.p_base}</dd></div>
              <div><dt>Semilla</dt><dd className="mono">{datos.parametros?.semilla}</dd></div>
              <div><dt>Horizonte</dt><dd className="mono">
                {datos.parametros?.pasos} × {datos.parametros?.minutos_por_paso} min
              </dd></div>
              <div><dt>Vecindad</dt><dd className="mono">
                {datos.parametros?.vecindad} · {datos.parametros?.vecinos} vecinos
              </dd></div>
            </dl>
            <p className="val-nota">
              Motor: <code>{datos.parametros?.motor}</code>. La cicatriz no
              interviene en la simulación: se usa solo para comparar después.
            </p>
          </section>
        </>
      )}
    </div>
  );
}
