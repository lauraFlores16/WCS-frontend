import { api } from "../../nucleo/ApiBase";

export const reportesApi = {
  descargarPdf: (escenarioId) =>
    api.post("/reportes/pdf", { escenario_id: escenarioId }, { responseType: "blob" }),
};
