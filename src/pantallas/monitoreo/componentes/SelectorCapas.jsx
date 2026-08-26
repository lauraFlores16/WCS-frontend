// Selector de la capa activa. Por defecto se muestra solo la Capa 3 (focos
// activos NASA FIRMS), que es la vista operativa: los focos de la API son la
// prioridad para lanzar la simulación directa. Las demás capas (topografía,
// ambiental, autómata, tiempo) quedan en un menú "Avanzado" que se despliega.
import { useState } from "react";

export default function SelectorCapas({ capaActiva, setCapaActiva }) {
  const [abierto, setAbierto] = useState(false);
  const capas = [
    { id: 1, corto: "Topografía",  desc: "Relieve real (DEM Copernicus), ríos y quebradas (OSM), zonas áridas" },
    { id: 2, corto: "Ambiental",   desc: "Variables ambientales en vivo (Open-Meteo) + combustible" },
    { id: 3, corto: "Focos",       desc: "Focos activos NASA FIRMS + verificación automática de probabilidad" },
    { id: 4, corto: "Autómata",    desc: "Propagación simulada por el autómata celular" },
    { id: 5, corto: "Tiempo",      desc: "Tiempo de propagación y expansión estimada" },
  ];
  const capa3 = capas.find((c) => c.id === 3);
  const otras = capas.filter((c) => c.id !== 3);

  return (
    <div className="capas-selector">
      {/* Capa 3 siempre visible: es la vista principal del dashboard */}
      <button
        title={capa3.desc}
        className={`capas-selector-btn${capaActiva === 3 ? " activo" : ""}`}
        onClick={() => setCapaActiva(3)}
      >
        <span className="capas-selector-num">3</span>
        <span className="capas-selector-label">Focos (NASA FIRMS)</span>
      </button>

      {/* Botón que despliega el resto de capas */}
      <button
        className={`capas-selector-btn${abierto || capaActiva !== 3 ? " activo" : ""}`}
        onClick={() => setAbierto((v) => !v)}
        title="Ver otras capas (topografía, ambiental, autómata, tiempo)"
      >
        <span className="capas-selector-label">Avanzado {abierto ? "–" : "+"}</span>
      </button>

      {(abierto || capaActiva !== 3) && otras.map((c) => (
        <button
          key={c.id}
          title={c.desc}
          className={`capas-selector-btn${capaActiva === c.id ? " activo" : ""}`}
          onClick={() => setCapaActiva(c.id)}
        >
          <span className="capas-selector-num">{c.id}</span>
          <span className="capas-selector-label">{c.corto}</span>
        </button>
      ))}
    </div>
  );
}

export function LeyendaCapa({ capaActiva }) {
  if (capaActiva === 1) {
    return (
      <div className="capas-leyenda">
        <Item color="#1f4d2e" label="Llano (0–5°)" />
        <Item color="#3c6b34" label="Suave (5–15°)" />
        <Item color="#7d8a2e" label="Moderada (15–25°)" />
        <Item color="#a86a2a" label="Empinada (>25°)" />
        <Item color="#c98a3a" label="Zona árida" />
        <Item color="#2f6fd0" label="Río / quebrada (barrera)" />
      </div>
    );
  }
  if (capaActiva === 2) {
    return (
      <div className="capas-leyenda">
        <span className="capas-leyenda-barra" style={{ background: "linear-gradient(90deg, rgb(60,175,80), rgb(232,73,28))" }} />
        <span className="text-muted" style={{ fontSize: 11 }}>Bajo riesgo → Alto riesgo (combustible + sequedad)</span>
        <Item color="#5c6268" label="Sin combustible" />
      </div>
    );
  }
  if (capaActiva === 3) {
    return (
      <div className="capas-leyenda">
        <Item color="#f0902f" label="FRP baja (<10 MW)" />
        <Item color="#e8491c" label="FRP media (10–30 MW)" />
        <Item color="#e13a3a" label="FRP alta (>30 MW)" />
        <span className="text-muted" style={{ fontSize: 11 }}>· Focos NASA FIRMS. Verificación automática de probabilidad activa.</span>
      </div>
    );
  }
  if (capaActiva === 4) {
    return (
      <div className="capas-leyenda">
        <Item color="#e8491c" label="Ardiendo" />
        <Item color="#5c6268" label="Quemado" />
        <span className="text-muted" style={{ fontSize: 11 }}>· Propagación del autómata celular</span>
      </div>
    );
  }
  return (
    <div className="capas-leyenda">
      <span className="capas-leyenda-barra" style={{ background: "linear-gradient(90deg, rgb(255,200,40), rgb(232,73,28), rgb(92,93,88))" }} />
      <span className="text-muted" style={{ fontSize: 11 }}>Momento de quema: inicio → intermedio → final</span>
    </div>
  );
}

function Item({ color, label }) {
  return (
    <span className="capas-leyenda-item">
      <span className="capas-leyenda-punto" style={{ background: color }} />
      <span className="text-muted" style={{ fontSize: 11 }}>{label}</span>
    </span>
  );
}
