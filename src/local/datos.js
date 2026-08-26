// Carga y cachea los datos reales (grid.csv y focos.csv) desde public/datos/.
// grid.csv trae el NDVI REAL de variables_gee_v2.csv (sin aproximaciones) y la
// probabilidad de ignición real calculada por tu modelo XGBoost V3.
import Papa from "papaparse";

let _grid = null;
let _focos = null;

async function cargarCsv(ruta) {
  const respuesta = await fetch(ruta);
  const texto = await respuesta.text();
  const { data } = Papa.parse(texto, { header: true, dynamicTyping: true, skipEmptyLines: true });
  return data;
}

export async function cargarGrid() {
  if (!_grid) _grid = await cargarCsv("/datos/grid.csv");
  return _grid;
}

export async function cargarFocos() {
  if (!_focos) _focos = await cargarCsv("/datos/focos.csv");
  return _focos;
}
