// ============================================================================
// REGIONES DE PRUEBA
// ============================================================================
// Zonas del área de Franz Tamayo (y alrededores) para probar la simulación en
// distintos puntos. Al elegir una región se reubica el foco y, con él, las
// consultas a las APIs (meteorología, DEM, focos FIRMS) apuntan a esas
// coordenadas.
//
// Nota sobre el grid: el modelo XGBoost (grid.csv) cubre el municipio de Apolo
// (lat -15.00..-14.00, lon -69.00..-68.00). Cinco de las regiones caen dentro;
// "Pelechuco Norte" queda al oeste, FUERA del grid. Para las de dentro se usa
// la celda del grid más cercana (con su probabilidad real); para las de fuera
// se trabaja solo con las coordenadas y las APIs, sin probabilidad del modelo.
//
// Coordenadas en decimal (obtenidas de los focos iniciales del historial).
export const REGIONES = [
  {
    id: "apolo-centro",
    nombre: "Apolo Centro",
    lat: -14.7167, lon: -68.5167,
    zoom: 12,
    descripcion: "Núcleo urbano de Apolo. Referencia central del municipio.",
    dentroDelGrid: true,
  },
  {
    id: "apolo-norte",
    nombre: "Apolo Norte",
    lat: -14.6667, lon: -68.5167,
    zoom: 12,
    descripcion: "Franja norte del municipio, hacia el Madidi.",
    dentroDelGrid: true,
  },
  {
    id: "area-madidi",
    nombre: "Área Madidi",
    lat: -14.5833, lon: -68.4667,
    zoom: 12,
    descripcion: "Zona de amortiguamiento del Parque Nacional Madidi.",
    dentroDelGrid: true,
  },
  {
    id: "rio-tuichi",
    nombre: "Río Tuichi",
    lat: -14.8000, lon: -68.5833,
    zoom: 12,
    descripcion: "Cuenca del río Tuichi, al sur del municipio.",
    dentroDelGrid: true,
  },
  {
    id: "keara-sur",
    nombre: "Keara Sur",
    lat: -14.8667, lon: -68.6667,
    zoom: 12,
    descripcion: "Sector sur, próximo a la comunidad de Keara.",
    dentroDelGrid: true,
  },
  {
    id: "pelechuco-norte",
    nombre: "Pelechuco Norte",
    lat: -14.5000, lon: -69.0667,
    zoom: 12,
    descripcion: "Al oeste, fuera del grid del modelo: se usan solo las APIs por coordenadas.",
    dentroDelGrid: false,
  },
];

export const regionPorId = (id) => REGIONES.find((r) => r.id === id) || null;
