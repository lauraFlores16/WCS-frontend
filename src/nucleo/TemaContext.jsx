// Tema claro/oscuro. Guarda la preferencia en localStorage y la aplica
// poniendo data-tema en <html>. El oscuro es el predeterminado.
import { createContext, useContext, useEffect, useState } from "react";

const TemaContext = createContext(null);
const CLAVE = "sisprop_tema";

export function TemaProvider({ children }) {
  const [tema, setTema] = useState(() => {
    try {
      return localStorage.getItem(CLAVE) || "oscuro";
    } catch {
      return "oscuro";
    }
  });

  useEffect(() => {
    document.documentElement.setAttribute("data-tema", tema);
    try {
      localStorage.setItem(CLAVE, tema);
    } catch { /* ignore */ }
  }, [tema]);

  const alternar = () => setTema((t) => (t === "oscuro" ? "claro" : "oscuro"));

  return (
    <TemaContext.Provider value={{ tema, setTema, alternar }}>
      {children}
    </TemaContext.Provider>
  );
}

export function useTema() {
  const ctx = useContext(TemaContext);
  if (!ctx) return { tema: "oscuro", alternar: () => {}, setTema: () => {} };
  return ctx;
}
