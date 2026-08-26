// Punto de entrada de "/inicio". El Analista y el Administrador tienen
// tableros distintos porque su trabajo es distinto: uno analiza el territorio
// y el otro administra el sistema. Aquí solo se elige cuál montar.
import { useAuth } from "../../nucleo/AuthContext";
import Dashboard from "./Dashboard";
import DashboardAdmin from "./DashboardAdmin";

export default function Inicio() {
  const { usuario } = useAuth();
  return usuario?.rol === "administrador" ? <DashboardAdmin /> : <Dashboard />;
}
