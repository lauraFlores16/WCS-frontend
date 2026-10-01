import Icono from "../../../nucleo/Icono";

/**
 * Indicador de frescura de los datos, para la barra sobre el mapa.
 *
 * POR QUÉ HACE FALTA
 *   Sin esto no hay forma de distinguir «no hay focos activos» de «el dato
 *   tiene seis horas», y para quien está decidiendo son dos situaciones
 *   completamente distintas. Una pantalla que muestra un mapa vacío sin decir
 *   de cuándo es invita a concluir que no pasa nada.
 *
 * LOS TRES TIEMPOS QUE HAY QUE NO CONFUNDIR
 *   1. Cuándo se consultó       → el backend pidió el dato a esta hora
 *   2. De cuándo es el dato     → la hora a la que se midió
 *   3. Cada cuánto se renueva   → el TTL de la caché
 *
 *   Y por encima de todo está el retardo de origen: NASA FIRMS en tiempo casi
 *   real publica unas 3 horas después de que pase el satélite, y cada
 *   plataforma pasa dos veces al día. Así que un dato «recién consultado»
 *   puede describir algo de hace horas. Eso no es un fallo del sistema y el
 *   indicador lo dice, porque si no parece uno.
 */

function haceCuanto(iso) {
  if (!iso) return null;
  const ms = Date.now() - new Date(iso).getTime();
  if (Number.isNaN(ms)) return null;
  const min = Math.round(ms / 60000);
  if (min < 1) return "ahora mismo";
  if (min < 60) return `hace ${min} min`;
  const h = Math.floor(min / 60);
  if (h < 24) return `hace ${h} h ${min % 60} min`;
  return `hace ${Math.floor(h / 24)} d`;
}

const hora = (iso) => {
  if (!iso) return null;
  const d = new Date(iso);
  return Number.isNaN(d.getTime())
    ? null
    : d.toLocaleTimeString("es-BO", { hour: "2-digit", minute: "2-digit" });
};

export default function IndicadorActualizacion({ actualizado, onRefrescar, cargando }) {
  if (!actualizado) return null;

  const m = actualizado.meteo || {};
  const f = actualizado.firms || {};

  // Sin clave de FIRMS o con la caché caducada, el dato no es de fiar y hay
  // que decirlo en vez de mostrar un número tranquilizador.
  const firmsFiable = f.configurada && f.reciente;

  return (
    <div className="sim-frescura">
      <button type="button" className="sim-frescura-btn" onClick={onRefrescar}
        disabled={cargando}
        title="Volver a consultar meteorología y focos activos">
        <Icono nombre="refrescar" tam={13} />
        {cargando ? "Actualizando…" : "Actualizar"}
      </button>

      <div className="sim-frescura-items">
        <span className="sim-frescura-item" title={
          `Consultado ${haceCuanto(m.consultado) || "—"}` +
          (m.fuente ? ` · ${m.fuente}` : "") +
          " · la caché se renueva cada 10 min"}>
          <i className={`sim-frescura-punto ${m.disponible ? "ok" : "mal"}`} />
          Meteorología
          <strong className="mono">
            {m.hora_dato ? hora(m.hora_dato) : "—"}
          </strong>
        </span>

        <span className="sim-frescura-item" title={
          !f.configurada
            ? "No hay clave de NASA FIRMS configurada: se muestran focos históricos"
            : `Ventana de ${f.dias_ventana ?? "?"} días · ${f.fuente || ""} · ` +
              `dato de hace ${f.edad_minutos ?? "?"} min en la caché · ` +
              "NASA publica en tiempo casi real unas 3 h después del paso del satélite"}>
          <i className={`sim-frescura-punto ${firmsFiable ? "ok" : "aviso"}`} />
          Focos FIRMS
          <strong className="mono">
            {!f.configurada
              ? "sin clave"
              : f.activos != null
                ? `${f.activos} activos`
                : "—"}
          </strong>
          {f.edad_minutos != null && (
            <em className="sim-frescura-edad">
              {f.edad_minutos < 1 ? "al momento" : `${f.edad_minutos} min`}
            </em>
          )}
        </span>
      </div>
    </div>
  );
}
