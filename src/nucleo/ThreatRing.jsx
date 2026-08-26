import { useEffect, useState } from "react";
import { useEscenario } from "./EscenarioContext";
import { alertasApi } from "./api/alertas";
import "./estilos/AppShell.css";

const NIVELES = {
  ninguna: { color: "var(--border-strong)", label: "Sin actividad" },
  amarilla: { color: "var(--alerta-amarilla)", label: "Alerta amarilla" },
  naranja: { color: "var(--alerta-naranja)", label: "Alerta naranja" },
  roja: { color: "var(--alerta-roja)", label: "Alerta roja" },
};
const PRIORIDAD = { amarilla: 1, naranja: 2, roja: 3 };

export default function ThreatRing() {
  const { escenarioId } = useEscenario();
  const [nivel, setNivel] = useState("ninguna");
  const [conteo, setConteo] = useState(0);

  useEffect(() => {
    if (!escenarioId) { setNivel("ninguna"); return; }
    let cancelado = false;

    async function refrescar() {
      try {
        const { data } = await alertasApi.activas(escenarioId);
        if (cancelado) return;
        if (!data.length) {
          setNivel("ninguna");
        } else {
          const max = data.reduce((a, b) => (PRIORIDAD[b.nivel] > PRIORIDAD[a.nivel] ? b : a));
          setNivel(max.nivel);
        }
        setConteo(data.length);
      } catch {
        /* silencioso */
      }
    }

    refrescar();
    const intervalo = setInterval(refrescar, 15000);
    return () => { cancelado = true; clearInterval(intervalo); };
  }, [escenarioId]);

  const config = NIVELES[nivel];
  const activo = nivel !== "ninguna";

  return (
    <div className="threat-ring">
      <div className="threat-ring-svg-wrap">
        <svg width="30" height="30" viewBox="0 0 30 30">
          <circle cx="15" cy="15" r="12.5" fill="none" stroke="var(--border-subtle)" strokeWidth="2.5" />
          <circle
            cx="15" cy="15" r="12.5" fill="none" stroke={config.color} strokeWidth="2.5"
            strokeDasharray={activo ? "60 20" : "0 100"}
            strokeLinecap="round"
            transform="rotate(-90 15 15)"
            style={{ transition: "stroke-dasharray 0.4s ease" }}
          >
            {activo && (
              <animateTransform attributeName="transform" type="rotate" from="-90 15 15" to="270 15 15"
                dur="3s" repeatCount="indefinite" />
            )}
          </circle>
        </svg>
        <div className="threat-ring-punto" style={{ background: config.color }} />
      </div>
      <div className="threat-ring-texto">
        <div className="threat-ring-nivel" style={{ color: config.color }}>{config.label}</div>
        <div className="threat-ring-conteo mono text-muted">
          {escenarioId ? `${conteo} alerta(s) activa(s)` : "sin escenario activo"}
        </div>
      </div>
    </div>
  );
}
