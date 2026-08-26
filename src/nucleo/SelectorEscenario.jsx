// Selector de escenario. Compartido por las pantallas 02, 03, 04, 08 y 10
// (todas necesitan que el usuario elija sobre qué simulación están trabajando).
import { useEffect, useState } from "react";
import { escenariosApi } from "./api/escenarios";
import { useEscenario } from "./EscenarioContext";

// `compacto`: versión reducida para la barra de controles del mapa, donde el
// espacio es escaso y no cabe la etiqueta ni el mensaje de ayuda.
export default function SelectorEscenario({ compacto = false }) {
  const { escenarioId, seleccionarEscenario } = useEscenario();
  const [escenarios, setEscenarios] = useState([]);
  const [cargando, setCargando] = useState(true);

  useEffect(() => {
    escenariosApi.listar()
      .then(({ data }) => setEscenarios(data))
      .catch(() => setEscenarios([]))
      .finally(() => setCargando(false));
  }, []);

  return (
    <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: compacto ? 0 : 18 }}>
      {!compacto && <label className="field-label" style={{ margin: 0 }}>Escenario</label>}
      <select
        className="select"
        style={compacto
          ? { maxWidth: 210, padding: "5px 9px", fontSize: 12, borderRadius: "var(--radius-sm)" }
          : { maxWidth: 340 }}
        value={escenarioId || ""}
        onChange={(e) => seleccionarEscenario(e.target.value || null)}
      >
        <option value="">{cargando ? "Cargando…" : (compacto ? "Escenario…" : "Selecciona un escenario")}</option>
        {escenarios.map((e) => (
          <option key={e.escenario_id} value={e.escenario_id}>
            {e.nombre || e.escenario_id.slice(0, 8)} — {new Date(e.creado_en).toLocaleString()}
          </option>
        ))}
      </select>
      {!compacto && !escenarios.length && !cargando && (
        <span className="text-muted" style={{ fontSize: 12 }}>
          Aún no hay escenarios — ejecuta uno en Panel de control.
        </span>
      )}
    </div>
  );
}
