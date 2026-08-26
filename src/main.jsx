import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import "./estilos/tokens.css";
import { TemaProvider } from "./nucleo/TemaContext";
import App from "./App.jsx";

createRoot(document.getElementById("root")).render(
  <StrictMode>
    <TemaProvider>
      <App />
    </TemaProvider>
  </StrictMode>
);
