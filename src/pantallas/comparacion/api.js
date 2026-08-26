import { historicosLocal, escenariosLocal } from "../../local/api";
export const comparacionApi = {
  comparar: (escenarioId) => historicosLocal.comparar(escenarioId),
  listarEscenarios: () => escenariosLocal.listar(),
};
