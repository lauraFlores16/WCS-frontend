// ============================================================================
// REPORTES
// ============================================================================
// Esta pantalla estaba oculta del menú porque llamaba a `/reportes/pdf`, una
// ruta que el backend nunca ha tenido. Ahora trabaja sobre lo que sí existe y
// ya se usa desde Monitoreo e Historial: `/api/informes`, donde queda guardado
// el HTML de cada informe entregado.
//
// Lo que se puede hacer aquí:
//   · generar el informe de un escenario (mismo generador que Monitoreo);
//   · consultar los informes ya entregados;
//   · abrirlos e imprimirlos o guardarlos como PDF tamaño carta;
//   · exportar la serie de propagación a CSV, que Excel abre directamente.
import { useCallback, useEffect, useState } from "react";
import SelectorEscenario from "../../nucleo/SelectorEscenario";
import Icono from "../../nucleo/Icono";
import { useEscenario } from "../../nucleo/EscenarioContext";
import { usePermisos } from "../../nucleo/PermisosContext";
import { escenariosLocal, informesLocal } from "../../local/api";
import { monitoreoApi } from "../monitoreo/api";
import { generarInformeIncendio } from "../historial/informe_incendio";
import VisorInforme from "../historial/VisorInforme";
import "./estilos/Reportes.css";

const fecha = (v) => (v ? new Date(v).toLocaleString("es", {
  day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit",
}) : "—");

export default function Reportes() {
  const { escenarioId } = useEscenario();
  const { puede } = usePermisos();
  const [informes, setInformes] = useState([]);
  const [cargando, setCargando] = useState(true);
  const [trabajando, setTrabajando] = useState(false);
  const [visor, setVisor] = useState(null);
  const [aviso, setAviso] = useState(null);

  const puedeGenerar = puede("generar_reportes");

  const recargar = useCallback(() => {
    setCargando(true);
    informesLocal.listar()
      .then(({ data }) => setInformes(data || []))
      .catch(() => setInformes([]))
      .finally(() => setCargando(false));
  }, []);

  useEffect(() => { recargar(); }, [recargar]);

  // --- Generar el informe del escenario seleccionado ---
  async function generar() {
    if (!escenarioId) return;
    setTrabajando(true);
    setAviso(null);
    try {
      const { data: esc } = await escenariosLocal.obtenerCompleto(escenarioId);
      const html = generarInformeIncendio(esc);
      setVisor({ html, nombre: esc.nombre });
      await informesLocal.guardar({
        escenario_id: esc.escenario_id,
        nombre: esc.nombre,
        html,
        resumen: { area_final_ha: esc.area_final_ha ?? null },
      });
      recargar();
    } catch (e) {
      setAviso(e?.response?.data?.detail || "No se pudo generar el informe de este escenario.");
    } finally {
      setTrabajando(false);
    }
  }

  // --- Abrir un informe ya guardado ---
  async function abrir(id, nombre) {
    setTrabajando(true);
    setAviso(null);
    try {
      const { data } = await informesLocal.obtener(id);
      setVisor({ html: data.html, nombre: data.nombre || nombre });
    } catch {
      setAviso("No se pudo recuperar el informe guardado.");
    } finally {
      setTrabajando(false);
    }
  }

  // --- Exportar la serie de propagación a CSV (Excel lo abre directamente) ---
  async function exportarCsv() {
    if (!escenarioId) return;
    setTrabajando(true);
    setAviso(null);
    try {
      const { data: puntos } = await monitoreoApi.graficaPropagacion(escenarioId);
      if (!puntos?.length) {
        setAviso("Este escenario no tiene serie de propagación que exportar.");
        return;
      }
      const cabecera = ["iteracion", "tiempo_minutos", "celdas_ardiendo", "celdas_quemadas", "area_quemada_ha"];
      const filas = puntos.map((p) => cabecera.map((c) => p[c] ?? "").join(";"));
      // Punto y coma + BOM: es lo que hace que Excel en español abra el archivo
      // en columnas sin pasar por el asistente de importación.
      const csv = "﻿" + [cabecera.join(";"), ...filas].join("\r\n");
      const url = URL.createObjectURL(new Blob([csv], { type: "text/csv;charset=utf-8;" }));
      const a = document.createElement("a");
      a.href = url;
      a.download = `propagacion_${escenarioId.slice(0, 8)}.csv`;
      a.click();
      URL.revokeObjectURL(url);
    } catch {
      setAviso("No se pudo exportar la serie de propagación.");
    } finally {
      setTrabajando(false);
    }
  }

  return (
    <div className="reportes">
      <section className="panel reportes-caja">
        <header className="reportes-cabecera">
          <div>
            <h2 className="reportes-titulo">Generar un informe</h2>
            <p className="reportes-sub">
              Elige un escenario simulado. El informe recoge sus parámetros, las variables
              ambientales, el área afectada, el tiempo de propagación y las alertas.
            </p>
          </div>
        </header>

        <SelectorEscenario />

        {!escenarioId ? (
          <p className="reportes-vacio">
            Selecciona un escenario para generar o exportar su informe.
          </p>
        ) : (
          <div className="reportes-acciones">
            {puedeGenerar ? (
              <button className="btn btn--primary" onClick={generar} disabled={trabajando}>
                <Icono nombre="reportes" tam={15} />
                {trabajando ? "Trabajando…" : "Generar informe"}
              </button>
            ) : (
              <p className="reportes-vacio">Tu perfil no tiene permiso para generar informes.</p>
            )}
            <button className="btn" onClick={exportarCsv} disabled={trabajando}>
              <Icono nombre="descargar" tam={15} />
              Exportar propagación (CSV)
            </button>
          </div>
        )}

        {aviso && (
          <div className="reportes-aviso">
            <Icono nombre="aviso" tam={15} />
            <span>{aviso}</span>
          </div>
        )}

        <p className="reportes-nota">
          <Icono nombre="informacion" tam={14} />
          <span>
            El PDF se obtiene desde el visor del informe con «Descargar PDF (carta)», que usa
            la impresión del navegador. El CSV se abre en Excel sin pasos intermedios.
          </span>
        </p>
      </section>

      <section className="panel reportes-caja">
        <header className="reportes-cabecera">
          <div>
            <h2 className="reportes-titulo">Informes entregados</h2>
            <p className="reportes-sub">Historial de lo que se ha generado en el sistema</p>
          </div>
          <button className="btn btn--mini" onClick={recargar} disabled={cargando}>
            <Icono nombre="refrescar" tam={14} />
            Actualizar
          </button>
        </header>

        {cargando ? (
          <p className="reportes-vacio">Cargando informes…</p>
        ) : informes.length ? (
          <div className="reportes-tabla">
            <table>
              <thead>
                <tr><th>Informe</th><th>Generado por</th><th>Fecha</th><th>Área</th><th /></tr>
              </thead>
              <tbody>
                {informes.map((r) => (
                  <tr key={r.id}>
                    <td className="reportes-nombre">{r.nombre}</td>
                    <td>{r.generado_por || "—"}</td>
                    <td className="mono text-muted">{fecha(r.generado_en)}</td>
                    <td className="mono">
                      {r.resumen?.area_final_ha != null
                        ? `${r.resumen.area_final_ha.toLocaleString("es")} ha`
                        : "—"}
                    </td>
                    <td>
                      <button className="btn btn--mini" onClick={() => abrir(r.id, r.nombre)}
                        disabled={trabajando}>
                        <Icono nombre="buscar" tam={13} />
                        Abrir
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <p className="reportes-vacio">
            Todavía no se ha generado ningún informe. Los que crees aquí, en Monitoreo o en
            Historial aparecerán en esta lista.
          </p>
        )}
      </section>

      {visor && (
        <VisorInforme html={visor.html} nombre={visor.nombre} onCerrar={() => setVisor(null)} />
      )}
    </div>
  );
}
