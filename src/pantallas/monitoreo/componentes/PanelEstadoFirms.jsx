import Icono from "../../../nucleo/Icono";

/**
 * Estado de la consulta a NASA FIRMS y control de la capa histórica.
 *
 * Separa lo que antes se mezclaba: el contador dice cuántas detecciones
 * devolvió NASA, y nada más. Los focos históricos tienen su propio bloque,
 * su propio interruptor y su propio recuento.
 */

const ESTADOS = {
  correcto: { color: "var(--exito)", texto: "Detecciones recibidas" },
  sin_focos: { color: "var(--text-muted)", texto: "Sin focos activos" },
  sin_clave: { color: "var(--alerta-amarilla)", texto: "No configurado" },
  error: { color: "var(--alerta-roja)", texto: "No disponible" },
};

export default function PanelEstadoFirms({
  firms, cargando, onRecargar, capaFirmsActiva, onCapaFirms,
  historico, verHistoricos, onVerHistoricos, histCargando,
  eventos, verEventos, onVerEventos, historicasHabilitadas = true,
}) {
  const e = ESTADOS[firms?.estado] || ESTADOS.sin_focos;
  const dibujando = capaFirmsActiva && firms?.estado === "correcto"
    ? (firms.activos ?? 0) : 0;

  return (
    <div className="ef-panel">
      {/* Los tres interruptores juntos: qué se dibuja y qué no. Los dos
          históricos arrancan apagados. */}
      <section className="ef-capas">
        <span className="ef-capas-titulo">Capas</span>
        <label className="ef-interruptor">
          <input type="checkbox" checked={!!capaFirmsActiva}
            onChange={(ev) => onCapaFirms(ev.target.checked)} />
          <i className="ef-punto ef-punto--firms" />
          NASA FIRMS · focos activos
          <b className="mono">{dibujando}</b>
        </label>
        {historicasHabilitadas ? (
          <>
            <label className="ef-interruptor">
              <input type="checkbox" checked={verHistoricos}
                onChange={(ev) => onVerHistoricos(ev.target.checked)} />
              <i className="ef-punto ef-punto--hist" />
              Focos históricos
              <b className="mono">{verHistoricos ? (historico?.total ?? 0) : 0}</b>
            </label>
            <label className="ef-interruptor">
              <input type="checkbox" checked={verEventos}
                onChange={(ev) => onVerEventos(ev.target.checked)} />
              <i className="ef-punto ef-punto--evento" />
              Eventos históricos
              <b className="mono">{verEventos ? (eventos?.length ?? 0) : 0}</b>
            </label>
          </>
        ) : (
          <span className="ef-desactivadas">
            Capas históricas desactivadas mientras se verifica NASA FIRMS.
          </span>
        )}
      </section>
      {/* ---- NASA FIRMS ---- */}
      <section className="ef-bloque">
        <header className="ef-cabecera">
          <span className="ef-fuente">
            <i className="ef-punto ef-punto--firms" />
            NASA FIRMS
          </span>
          <button type="button" className="ef-recargar" onClick={onRecargar}
            disabled={cargando} title="Volver a consultar NASA FIRMS">
            <Icono nombre="refrescar" tam={12} />
            {cargando ? "Consultando…" : "Actualizar"}
          </button>
        </header>

        <dl className="ef-datos">
          <div>
            <dt>Tipo</dt>
            <dd>detecciones consultadas</dd>
          </div>
          <div>
            <dt>Período</dt>
            <dd>{firms?.periodo || "—"}</dd>
          </div>
          {firms?.sensor && (
            <div>
              <dt>Sensor</dt>
              <dd className="mono">{firms.sensor}</dd>
            </div>
          )}
          <div>
            <dt>Focos encontrados</dt>
            <dd className="mono ef-contador" style={{ color: e.color }}>
              {firms?.estado === "correcto" || firms?.estado === "sin_focos"
                ? (firms.activos ?? 0)
                : "—"}
            </dd>
          </div>
          <div>
            <dt>Estado</dt>
            <dd style={{ color: e.color }}>{e.texto}</dd>
          </div>
          <div>
            <dt>Última consulta</dt>
            <dd className="mono">
              {firms?.consultadoEn
                ? new Date(firms.consultadoEn).toLocaleString("es-BO",
                    { day: "2-digit", month: "2-digit", hour: "2-digit",
                      minute: "2-digit", second: "2-digit" })
                : "—"}
            </dd>
          </div>
          {firms?.recibidos_bbox != null && (
            <div>
              <dt>Recibidos del recuadro</dt>
              <dd className="mono">{firms.recibidos_bbox}</dd>
            </div>
          )}
        </dl>

        {firms?.mensaje && firms.estado !== "correcto" && (
          <p className="ef-mensaje" style={{ borderLeftColor: e.color }}>
            {firms.mensaje}
            {firms.detalle && <span className="ef-detalle">{firms.detalle}</span>}
          </p>
        )}

        {firms?.descartados_fuera > 0 && (
          <p className="ef-nota">
            {firms.descartados_fuera} detección(es) del recuadro quedaron fuera
            del límite municipal y no se muestran.
          </p>
        )}
      </section>

      {/* ---- Focos históricos ---- */}
      {historicasHabilitadas && (
      <section className="ef-bloque ef-bloque--hist">
        <header className="ef-cabecera">
          <span className="ef-fuente">
            <i className="ef-punto ef-punto--hist" />
            Base histórica SIPRO
          </span>

        </header>

        <dl className="ef-datos">
          <div>
            <dt>Tipo</dt>
            <dd>focos históricos</dd>
          </div>
          <div>
            <dt>Período</dt>
            <dd className="mono">{historico?.periodo || "—"}</dd>
          </div>
          <div>
            <dt>Registros</dt>
            <dd className="mono">
              {histCargando ? "cargando…" : (historico?.total ?? "—")}
            </dd>
          </div>
        </dl>

        <p className="ef-nota ef-nota--aviso">
          <Icono nombre="informacion" tam={12} />
          Registros de la base del proyecto. No son detecciones actuales y no
          se cuentan junto a las de NASA FIRMS.
        </p>
      </section>
      )}
    </div>
  );
}
