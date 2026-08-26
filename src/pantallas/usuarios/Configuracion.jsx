// ============================================================================
// CONFIGURACIÓN DEL SISTEMA  (rol Administrador · permiso `configuracion`)
// ============================================================================
// Lo que había antes aquí era una constante `SECCIONES` escrita a mano con
// valores fijos en el propio archivo. No consultaba nada: los «Conectado» eran
// literales. Dos de ellos además eran falsos:
//
//   · «Google Earth Engine · Conectado» — el sistema NO habla con GEE en
//     tiempo de ejecución. Las variables (NDVI, humedad, viento) se calcularon
//     una vez en el cuaderno y viajan dentro de grid.csv. Decir «conectado»
//     en la defensa invita justo a la pregunta que no se puede responder.
//   · «NASA FIRMS · Conectado» — se pintaba igual aunque no hubiera clave, en
//     cuyo caso el sistema cae a los focos históricos.
//
// Ahora todo sale de GET /api/configuracion, que lo mide en el servidor. Lo
// que es un dato documentado del proyecto (el AUC del entrenamiento) se marca
// como tal en pantalla en vez de disfrazarse de lectura en vivo.
import { useEffect, useState } from "react";
import Icono from "../../nucleo/Icono";
import { pedir } from "../../local/cliente";
import "../../nucleo/estilos/Pantalla.css";
import "./estilos/Configuracion.css";

const nf = (n, dec = 0) =>
  n == null ? "no disponible" : Number(n).toLocaleString("es", {
    minimumFractionDigits: dec, maximumFractionDigits: dec,
  });

export default function Configuracion() {
  const [cfg, setCfg] = useState(null);
  const [error, setError] = useState(null);
  const [cargando, setCargando] = useState(true);

  useEffect(() => {
    pedir("/api/configuracion")
      .then(setCfg)
      .catch((e) => setError(e?.response?.data?.detail || e.message))
      .finally(() => setCargando(false));
  }, []);

  if (cargando) {
    return (
      <div className="pantalla">
        <div className="pantalla-vacio">
          <Icono nombre="configuracion" tam={26} />
          <span>Consultando la configuración del servidor…</span>
        </div>
      </div>
    );
  }

  if (error || !cfg) {
    return (
      <div className="pantalla">
        <div className="pantalla-aviso es-error">
          <Icono nombre="aviso" tam={16} />
          <span>No se pudo leer la configuración: {error || "respuesta vacía"}</span>
        </div>
      </div>
    );
  }

  const { servicio, almacen, sesion, malla, focos, modelo, automata, fuentes } = cfg;

  return (
    <div className="pantalla">

      <div className="pantalla-aviso">
        <Icono nombre="informacion" tam={16} />
        <span>
          Vista de solo lectura. Todos estos valores los mide el servidor al
          responder; los ajustes se cambian en <span className="mono">backend_django/.env</span> y
          se aplican al reiniciarlo.
        </span>
      </div>

      <div className="config-rejilla">

        {/* ---------- Servicio ---------- */}
        <section className="panel seccion">
          <header className="seccion-cabecera">
            <div>
              <h2 className="seccion-titulo">
                <Icono nombre="servidor" tam={16} />
                Servicio
              </h2>
              <p className="seccion-sub">Proceso que atiende la aplicación</p>
            </div>
          </header>
          <Fila l="Backend" v={servicio.nombre} />
          <Fila l="Versión" v={servicio.version} mono />
          <Fila l="Modo depuración" v={servicio.depuracion ? "Activado (desarrollo)" : "Desactivado"}
            estado={servicio.depuracion ? "aviso" : "ok"} />
          <Fila l="Orígenes autorizados" v={(servicio.origenes_cors || []).join(", ") || "ninguno"} mono />
        </section>

        {/* ---------- Base de datos ---------- */}
        <section className="panel seccion">
          <header className="seccion-cabecera">
            <div>
              <h2 className="seccion-titulo">
                <Icono nombre="datos" tam={16} />
                Base de datos
              </h2>
              <p className="seccion-sub">Dónde viven usuarios, escenarios y bitácora</p>
            </div>
          </header>
          <Fila l="Almacén" v={almacen.modo === "supabase" ? "Supabase (PostgreSQL)" : almacen.modo}
            estado={almacen.modo === "supabase" ? "ok" : "aviso"} />
          {/* Solo el host: la service_role key no sale nunca del servidor. */}
          <Fila l="Proyecto" v={almacen.proyecto || "no disponible"} mono />
          <Fila l="Esquema" v={almacen.esquema} mono />
          <Fila l="Tablas" v={`${(almacen.tablas || []).length}: ${(almacen.tablas || []).join(", ")}`} />
          <Fila l="Espera máxima" v={`${almacen.timeout_s} s por consulta`} />
        </section>

        {/* ---------- Sesión ---------- */}
        <section className="panel seccion">
          <header className="seccion-cabecera">
            <div>
              <h2 className="seccion-titulo">
                <Icono nombre="candado" tam={16} />
                Sesión y acceso
              </h2>
              <p className="seccion-sub">Cómo se mantiene la sesión iniciada</p>
            </div>
          </header>
          <Fila l="Duración" v={`${nf(sesion.duracion_horas)} horas`} />
          <Fila l="Cookie" v={sesion.cookie} mono />
          <Fila l="HttpOnly" v={sesion.httponly ? "Sí (el JavaScript no la lee)" : "No"}
            estado={sesion.httponly ? "ok" : "aviso"} />
          <Fila l="SameSite" v={sesion.samesite} mono />
          <Fila l="Secure" v={sesion.secure ? "Sí (solo por HTTPS)" : "No (desarrollo local)"}
            estado={sesion.secure ? "ok" : null} />
        </section>

        {/* ---------- Malla espacial ---------- */}
        <section className="panel seccion">
          <header className="seccion-cabecera">
            <div>
              <h2 className="seccion-titulo">
                <Icono nombre="capas" tam={16} />
                Malla espacial
              </h2>
              <p className="seccion-sub">El grid sobre el que corre todo</p>
            </div>
          </header>
          <Fila l="Celdas cargadas" v={nf(malla.celdas)} mono />
          <Fila l="Dimensiones" v={`${nf(malla.filas)} filas × ${nf(malla.columnas)} columnas`} mono />
          <Fila l="Resolución" v={`${nf(malla.resolucion_m)} m por celda`} />
          <Fila l="Superficie por celda" v={`${nf(malla.area_celda_ha, 1)} ha`} mono />
          <Fila l="Superficie total"
            v={`${nf((malla.celdas * malla.area_celda_ha) / 100, 1)} km²`} mono />
          <Fila l="Centro" v={`${malla.centro.lat}, ${malla.centro.lon}`} mono />
        </section>

        {/* ---------- Focos históricos ---------- */}
        <section className="panel seccion">
          <header className="seccion-cabecera">
            <div>
              <h2 className="seccion-titulo">
                <Icono nombre="foco" tam={16} />
                Focos históricos
              </h2>
              <p className="seccion-sub">La verdad de campo contra la que se calibra</p>
            </div>
          </header>
          <Fila l="Focos NASA FIRMS" v={nf(focos.total)} mono />
          <Fila l="Periodo" v={focos.desde ? `${focos.desde} – ${focos.hasta}` : "no disponible"} mono />
          <Fila l="Etiquetados con evento" v={nf(focos.etiquetados)} mono />
          <div className="config-eventos">
            {(focos.eventos || []).map((e) => (
              <div key={e.anio} className="config-evento">
                <span className="config-evento-anio mono">{e.anio}</span>
                <span className="config-evento-nombre">{e.nombre}</span>
                <span className="config-evento-cifra mono">
                  {nf(e.area_km2, 1)} km² · {nf(e.dias)} días
                </span>
              </div>
            ))}
          </div>
        </section>

        {/* ---------- Modelo ---------- */}
        <section className="panel seccion">
          <header className="seccion-cabecera">
            <div>
              <h2 className="seccion-titulo">
                <Icono nombre="probabilidad" tam={16} />
                Modelo de ignición
              </h2>
              <p className="seccion-sub">Probabilidad por celda, precalculada</p>
            </div>
          </header>
          <Fila l="Algoritmo" v={modelo.algoritmo} />
          <Fila l="AUC-ROC" v={`${modelo.auc_roc}`} mono nota="del entrenamiento del cuaderno" />
          <Fila l="Variables de entrada" v={`${modelo.features} features`} />
          <Fila l="Celdas con probabilidad" v={nf(modelo.celdas_con_probabilidad)} mono />
          <Fila l="Rango observado"
            v={`${modelo.probabilidad_min} – ${modelo.probabilidad_max}`} mono />
          <Fila l="Media" v={`${modelo.probabilidad_media}`} mono />
          <p className="config-nota">
            Las variables de Google Earth Engine (NDVI, humedad, viento, pendiente) se
            extrajeron una sola vez y viajan dentro de <span className="mono">grid.csv</span>.
            El sistema <strong>no</strong> consulta GEE en tiempo de ejecución.
          </p>
        </section>

        {/* ---------- Autómata ---------- */}
        <section className="panel seccion">
          <header className="seccion-cabecera">
            <div>
              <h2 className="seccion-titulo">
                <Icono nombre="simulacion" tam={16} />
                Autómata celular
              </h2>
              <p className="seccion-sub">Motor de propagación</p>
            </div>
          </header>
          <Fila l="Vecindad" v={automata.vecindad} />
          <Fila l="Paso de simulación" v={`${automata.paso_min} minutos`} />
          <Fila l="Calibración vigente"
            v={automata.calibracion_vigente
              ? `F1 ${automata.calibracion_vigente.f1 ?? "—"} · P_BASE ${automata.calibracion_vigente.p_base ?? "—"}`
              : "sin calibración guardada (se usan las constantes por defecto)"}
            estado={automata.calibracion_vigente ? "ok" : null} />

          <details className="config-detalles">
            <summary>Constantes por defecto ({Object.keys(automata.constantes_defecto || {}).length})</summary>
            <div className="config-constantes">
              {Object.entries(automata.constantes_defecto || {}).map(([k, v]) => (
                <div key={k} className="config-constante">
                  <span className="mono">{k}</span>
                  <span className="mono">{String(v)}</span>
                </div>
              ))}
            </div>
          </details>
        </section>

        {/* ---------- Fuentes externas ---------- */}
        <section className="panel seccion config-ancha">
          <header className="seccion-cabecera">
            <div>
              <h2 className="seccion-titulo">
                <Icono nombre="enlace" tam={16} />
                Fuentes externas
              </h2>
              <p className="seccion-sub">
                Estado real de las colas de peticiones salientes, medido ahora mismo
              </p>
            </div>
          </header>

          <Fila l="NASA FIRMS · clave"
            v={fuentes.firms.clave_configurada
              ? "Configurada (focos activos en tiempo real)"
              : "Sin configurar (se usan los focos históricos)"}
            estado={fuentes.firms.clave_configurada ? "ok" : "aviso"} />
          <Fila l="NASA FIRMS · sensor" v={fuentes.firms.fuente} mono />
          <Fila l="NASA FIRMS · ventana" v={`últimos ${fuentes.firms.dias} días`} />

          <div className="config-colas">
            {Object.entries(fuentes.colas || {}).map(([host, c]) => (
              <div key={host} className="config-cola">
                <span className={`punto-estado${c.disponible ? " es-ok" : " es-caido"}`} />
                <span className="config-cola-host mono">{host}</span>
                <span className="config-cola-estado">
                  {c.disponible
                    ? `disponible · ${c.peticiones_ultimo_minuto}/${c.limite_por_minuto} peticiones en el último minuto`
                    : `no responde · reintento en ${c.reintenta_en_s} s`}
                </span>
              </div>
            ))}
            {!Object.keys(fuentes.colas || {}).length && (
              <p className="text-muted" style={{ fontSize: 13, margin: 0 }}>
                Todavía no se ha llamado a ninguna fuente externa en este arranque.
              </p>
            )}
          </div>

          {fuentes.cache && (
            <p className="config-nota">
              Caché de respuestas externas:{" "}
              <span className="mono">{nf(fuentes.cache.entradas_en_memoria)}</span> entradas en
              memoria, <span className="mono">{nf(fuentes.cache.peticiones_en_vuelo)}</span> peticiones
              en vuelo. La caché de disco se vacía borrando{" "}
              <span className="mono">backend_django/.cache</span>.
            </p>
          )}
        </section>
      </div>

      {/* Atribución obligatoria de la licencia gratuita de Flaticon. Cuando los
          iconos propios se sustituyan por los del pack, este es el sitio. */}
      <p className="config-creditos">
        SIPRO FIRE · Sistema de predicción y propagación de incendios forestales ·
        Municipio de Apolo (Franz Tamayo, La Paz) · EMI 2026
      </p>
    </div>
  );
}

function Fila({ l, v, mono = false, estado = null, nota = null }) {
  return (
    <div className="config-fila">
      <span className="config-label">{l}</span>
      <span className={`config-valor${mono ? " mono" : ""}${estado ? ` es-${estado}` : ""}`}>
        {/* El estado se marca con un punto Y con el texto: el color por sí solo
            no basta para quien no lo distingue. */}
        {estado && <span className={`punto-estado es-${estado === "ok" ? "ok" : "caido"}`} />}
        {v}
        {nota && <em className="config-nota-inline">{nota}</em>}
      </span>
    </div>
  );
}
