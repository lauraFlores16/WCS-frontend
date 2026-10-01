import { useEffect, useRef, useState } from "react";
import Icono from "../../../nucleo/Icono";
import { reportesCampoLocal } from "../../../local/api";

/**
 * Formulario de reporte de incendio del brigadista.
 *
 * SE ABRE SOBRE EL MAPA, NO EN OTRA PANTALLA
 *   Es un panel lateral, no una navegación. El brigadista está en el terreno
 *   mirando el mapa para situarse: si al pulsar «Reportar» se fuera a otra
 *   pantalla, perdería la referencia justo cuando la necesita. Y mientras el
 *   panel está abierto se puede seguir marcando la ubicación en el mapa.
 *
 * LOS CAMPOS Y POR QUÉ ESTÁN ASÍ
 *   Ubicación    obligatoria. Se marca en el mapa o se escribe. Sin ella el
 *                reporte no sirve para nada.
 *   Fecha y hora automáticas, no editables. Un reporte de campo vale por ser
 *                del momento; dejar cambiarlas invitaría a rellenar reportes
 *                a posteriori.
 *   Estado       obligatorio y de tres opciones cerradas. Texto libre aquí
 *                haría imposible agrupar y comparar.
 *   Descripción  breve y opcional.
 *   Fotografía   opcional. Se reduce EN EL NAVEGADOR antes de subirla.
 *
 * LA FOTO SE REDUCE ANTES DE ENVIAR
 *   Una foto de móvil son 4-8 MB. El reporte se guarda en una columna de
 *   texto, así que sin reducir la reventaría. Se pasa por un canvas: lado
 *   mayor a 1024 px y JPEG al 70 %, que deja unos 150-250 KB y mantiene la
 *   foto perfectamente legible como evidencia.
 *
 *   Y se hace aquí, no en el servidor, porque en campo la conexión es mala:
 *   subir 6 MB por una red de datos débil falla, y 200 KB no.
 */

const ESTADOS = [
  { id: "humo_visible", texto: "Humo visible",
    ayuda: "Se ve columna de humo pero no llama" },
  { id: "fuego_activo", texto: "Fuego activo",
    ayuda: "Hay llama visible y el fuego avanza" },
  { id: "area_quemada", texto: "Área quemada",
    ayuda: "El fuego ya pasó; queda superficie afectada" },
];

const LADO_MAX = 1024;
const CALIDAD = 0.7;

async function reducirFoto(archivo) {
  const dataUrl = await new Promise((res, rej) => {
    const r = new FileReader();
    r.onload = () => res(r.result);
    r.onerror = () => rej(new Error("No se pudo leer el archivo"));
    r.readAsDataURL(archivo);
  });

  const img = await new Promise((res, rej) => {
    const i = new Image();
    i.onload = () => res(i);
    i.onerror = () => rej(new Error("El archivo no es una imagen válida"));
    i.src = dataUrl;
  });

  const escala = Math.min(1, LADO_MAX / Math.max(img.width, img.height));
  const lienzo = document.createElement("canvas");
  lienzo.width = Math.round(img.width * escala);
  lienzo.height = Math.round(img.height * escala);
  lienzo.getContext("2d").drawImage(img, 0, 0, lienzo.width, lienzo.height);
  return {
    dataUrl: lienzo.toDataURL("image/jpeg", CALIDAD),
    ancho: lienzo.width,
    alto: lienzo.height,
    originalKB: Math.round(archivo.size / 1024),
  };
}

export default function ModalReporteIncendio({
  abierto, onCerrar, onEnviado, punto, onPedirPunto, esperandoPunto,
}) {
  const [lat, setLat] = useState("");
  const [lon, setLon] = useState("");
  const [estado, setEstado] = useState("");
  const [descripcion, setDescripcion] = useState("");
  const [foto, setFoto] = useState(null);
  const [enviando, setEnviando] = useState(false);
  const [error, setError] = useState(null);
  const [ahora, setAhora] = useState(() => new Date());
  const archivoRef = useRef(null);

  // La hora avanza mientras el panel está abierto: lo que se guarda es el
  // momento del ENVÍO, no el de abrir el formulario.
  useEffect(() => {
    if (!abierto) return;
    const t = setInterval(() => setAhora(new Date()), 1000);
    return () => clearInterval(t);
  }, [abierto]);

  // Cuando el brigadista marca un punto en el mapa, se rellenan las casillas.
  useEffect(() => {
    if (punto) {
      setLat(punto.lat.toFixed(5));
      setLon(punto.lon.toFixed(5));
    }
  }, [punto]);

  useEffect(() => {
    if (!abierto) {
      setError(null);
      setEnviando(false);
    }
  }, [abierto]);

  if (!abierto) return null;

  async function elegirFoto(e) {
    const f = e.target.files?.[0];
    if (!f) return;
    setError(null);
    try {
      const r = await reducirFoto(f);
      setFoto(r);
    } catch (err) {
      setError(err.message || "No se pudo procesar la imagen");
    }
  }

  async function enviar() {
    setError(null);
    const la = Number(lat);
    const lo = Number(lon);

    if (!lat || !lon || Number.isNaN(la) || Number.isNaN(lo)) {
      setError("Marca la ubicación en el mapa o escribe las coordenadas.");
      return;
    }
    if (la < -90 || la > 90 || lo < -180 || lo > 180) {
      setError("Las coordenadas están fuera de rango.");
      return;
    }
    if (!estado) {
      setError("Indica qué estás observando.");
      return;
    }

    setEnviando(true);
    try {
      await reportesCampoLocal.crear({
        lat: la, lon: lo, estado,
        descripcion: descripcion.trim(),
        foto: foto?.dataUrl || null,
      });
      // Se limpia solo tras un envío correcto: si falla, lo escrito se queda.
      setEstado(""); setDescripcion(""); setFoto(null);
      if (archivoRef.current) archivoRef.current.value = "";
      onEnviado?.();
    } catch (e) {
      setError(e?.response?.data?.error || e?.message
               || "No se pudo enviar el reporte. Inténtalo de nuevo.");
    } finally {
      setEnviando(false);
    }
  }

  return (
    <div className="rep-panel" role="dialog" aria-label="Reportar incendio">
      <header className="rep-cabecera">
        <div>
          <h2>
            <Icono nombre="aviso" tam={17} />
            Reportar incendio
          </h2>
          <p>Reporte de campo · se envía para revisión</p>
        </div>
        <button type="button" className="rep-cerrar" onClick={onCerrar}
          aria-label="Cerrar">
          <Icono nombre="cerrar" tam={15} />
        </button>
      </header>

      <div className="rep-cuerpo">

        {/* ---- Ubicación ---- */}
        <section className="rep-seccion">
          <h3>Ubicación <span className="rep-obligatorio">obligatoria</span></h3>
          <button type="button"
            className={`btn rep-btn-mapa${esperandoPunto ? " activo" : ""}`}
            onClick={onPedirPunto}>
            <Icono nombre="ubicacion" tam={15} />
            {esperandoPunto ? "Toca el mapa para marcar el punto…" : "Marcar en el mapa"}
          </button>
          <div className="rep-coords">
            <label>
              <span className="field-label">Latitud</span>
              <input className="input mono" value={lat} inputMode="decimal"
                placeholder="-14.65021"
                onChange={(e) => setLat(e.target.value)} />
            </label>
            <label>
              <span className="field-label">Longitud</span>
              <input className="input mono" value={lon} inputMode="decimal"
                placeholder="-67.30184"
                onChange={(e) => setLon(e.target.value)} />
            </label>
          </div>
        </section>

        {/* ---- Fecha y hora ---- */}
        <section className="rep-seccion">
          <h3>Fecha y hora</h3>
          <div className="rep-fecha">
            <Icono nombre="reloj" tam={14} />
            <strong className="mono">
              {ahora.toLocaleDateString("es-BO")} · {ahora.toLocaleTimeString("es-BO")}
            </strong>
          </div>
          <p className="rep-nota">
            Se registra automáticamente el momento del envío. No se puede
            modificar: un reporte de campo vale por ser del momento.
          </p>
        </section>

        {/* ---- Estado observado ---- */}
        <section className="rep-seccion">
          <h3>Estado observado <span className="rep-obligatorio">obligatorio</span></h3>
          <div className="rep-estados" role="radiogroup"
            aria-label="Estado observado">
            {ESTADOS.map((e) => (
              <button key={e.id} type="button" role="radio"
                aria-checked={estado === e.id}
                title={e.ayuda}
                className={`rep-estado${estado === e.id ? " activo" : ""}`}
                onClick={() => setEstado(e.id)}>
                <span className="rep-estado-marca" aria-hidden="true">
                  {estado === e.id ? "✓" : ""}
                </span>
                <span className="rep-estado-texto">
                  <strong>{e.texto}</strong>
                  <em>{e.ayuda}</em>
                </span>
              </button>
            ))}
          </div>
        </section>

        {/* ---- Descripción ---- */}
        <section className="rep-seccion">
          <h3>Descripción breve</h3>
          <textarea className="input" rows={3} maxLength={1000}
            value={descripcion}
            onChange={(e) => setDescripcion(e.target.value)}
            placeholder="Qué se ve, hacia dónde avanza, si hay viviendas o caminos cerca…" />
          <p className="rep-nota">{descripcion.length} / 1000</p>
        </section>

        {/* ---- Fotografía ---- */}
        <section className="rep-seccion">
          <h3>Fotografía <span className="rep-opcional">opcional</span></h3>
          <input ref={archivoRef} type="file" accept="image/*" capture="environment"
            onChange={elegirFoto} className="rep-archivo" id="rep-foto" />
          <label htmlFor="rep-foto" className="btn rep-btn-foto">
            <Icono nombre="datos" tam={15} />
            {foto ? "Cambiar fotografía" : "Adjuntar fotografía"}
          </label>
          {foto && (
            <div className="rep-foto-previa">
              <img src={foto.dataUrl} alt="Evidencia del reporte" />
              <div>
                <span className="mono">{foto.ancho} × {foto.alto} px</span>
                <button type="button" className="rep-quitar"
                  onClick={() => {
                    setFoto(null);
                    if (archivoRef.current) archivoRef.current.value = "";
                  }}>
                  Quitar
                </button>
              </div>
            </div>
          )}
          <p className="rep-nota">
            Se reduce automáticamente antes de subirla, para que funcione con
            mala conexión.
          </p>
        </section>

        {error && (
          <p className="rep-error">
            <Icono nombre="aviso" tam={15} />
            {error}
          </p>
        )}
      </div>

      <footer className="rep-pie">
        <p className="rep-aviso-revision">
          <Icono nombre="informacion" tam={14} />
          El reporte será enviado para su revisión
        </p>
        <div className="rep-botones">
          <button type="button" className="btn" onClick={onCerrar}
            disabled={enviando}>
            Cancelar
          </button>
          <button type="button" className="btn btn--primary" onClick={enviar}
            disabled={enviando}>
            <Icono nombre={enviando ? "refrescar" : "enlace"} tam={15} />
            {enviando ? "Enviando…" : "Enviar reporte"}
          </button>
        </div>
      </footer>
    </div>
  );
}
