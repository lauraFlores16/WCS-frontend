import { createContext, useContext, useState } from "react";

const EscenarioContext = createContext(null);

export function EscenarioProvider({ children }) {
  const [escenarioId, setEscenarioId] = useState(
    () => sessionStorage.getItem("apolo_escenario_activo") || null
  );

  // Foco de calor elegido en la Capa 3 (por clic o por coordenadas).
  // Se comparte con el Panel de control para precargar fila/columna del foco.
  const [foco, setFoco] = useState(() => {
    const g = sessionStorage.getItem("apolo_foco");
    return g ? JSON.parse(g) : null;
  });

  const seleccionarEscenario = (id) => {
    setEscenarioId(id);
    if (id) sessionStorage.setItem("apolo_escenario_activo", id);
    else sessionStorage.removeItem("apolo_escenario_activo");
  };

  const seleccionarFoco = (celda) => {
    setFoco(celda);
    if (celda) sessionStorage.setItem("apolo_foco", JSON.stringify(celda));
    else sessionStorage.removeItem("apolo_foco");
  };

  return (
    <EscenarioContext.Provider value={{ escenarioId, seleccionarEscenario, foco, seleccionarFoco }}>
      {children}
    </EscenarioContext.Provider>
  );
}

export function useEscenario() {
  const ctx = useContext(EscenarioContext);
  if (!ctx) throw new Error("useEscenario debe usarse dentro de <EscenarioProvider>");
  return ctx;
}
