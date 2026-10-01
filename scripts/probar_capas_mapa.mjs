/**
 * Cuenta los marcadores que Monitoreo dibuja de verdad en cada escenario.
 *
 *     npm install --no-save jsdom
 *     npx vite-node scripts/probar_capas_mapa.mjs
 *
 * No comprueba que el código parezca correcto: monta la pantalla en un
 * navegador simulado, intercepta lo que se pasa a react-leaflet y cuenta.
 * Un marcador de más aquí es un marcador de más en pantalla.
 */
import fs from "fs";
import path from "path";

// Leaflet toca `window` al importarse. No hace falta un navegador entero: solo
// lo suficiente para que el módulo cargue. Los componentes de capa se invocan
// directamente y no llegan a montar nada.
const nada = () => {};
globalThis.window = {
  requestAnimationFrame: nada, cancelAnimationFrame: nada,
  addEventListener: nada, removeEventListener: nada,
  navigator: { userAgent: "node", platform: "node", maxTouchPoints: 0 },
  document: {}, screen: {}, devicePixelRatio: 1,
};
globalThis.document = {
  createElement: () => ({ style: {}, setAttribute: nada, appendChild: nada,
                          getContext: () => ({}) }),
  documentElement: { style: {} },
  addEventListener: nada, removeEventListener: nada,
};
globalThis.window.document = globalThis.document;
Object.defineProperty(globalThis, "navigator",
  { value: globalThis.window.navigator, configurable: true, writable: true });

const React = (await import("react")).default;

// --- Contador -------------------------------------------------------------
// Se llama a los componentes de capa DIRECTAMENTE y se recorre el árbol de
// elementos que devuelven. Es determinista y no depende de que Leaflet llegue
// a montarse: cuenta exactamente lo que la capa pretende dibujar.
const RAIZ = new URL("../src/", import.meta.url).pathname;
const RL = await import("react-leaflet");

function contar(nodo, acc = { circulos: 0, marcadores: 0, etiquetasMW: 0 }) {
  if (nodo == null || typeof nodo === "boolean") return acc;
  if (Array.isArray(nodo)) {
    for (const n of nodo) contar(n, acc);
    return acc;
  }
  if (typeof nodo !== "object") return acc;

  const t = nodo.type;
  if (t === RL.CircleMarker) acc.circulos++;
  else if (t === RL.Marker) acc.marcadores++;
  else if (t === RL.Tooltip && nodo.props?.permanent) acc.etiquetasMW++;

  // Componentes propios: se ejecutan para ver qué devuelven.
  if (typeof t === "function" && t !== RL.CircleMarker && t !== RL.Marker
      && t !== RL.Tooltip) {
    try { contar(t(nodo.props || {}), acc); } catch { /* necesita contexto */ }
  }
  if (nodo.props?.children) contar(nodo.props.children, acc);
  return acc;
}

const CapaFocosFirms =
  (await import(RAIZ + "pantallas/monitoreo/componentes/CapaFocosFirms.jsx")).default;
const CapaFocosHistoricos =
  (await import(RAIZ + "pantallas/monitoreo/componentes/CapaFocosHistoricos.jsx")).default;

let fallos = 0;
const ok = (cond, t, e = "") => {
  if (cond) console.log(`  \u2713 ${t}${e ? ` \u2014 ${e}` : ""}`);
  else { fallos++; console.log(`  \u2717 ${t}${e ? ` \u2014 ${e}` : ""}`); }
};

const foco = (i, frp) => ({ id: `firms-${i}`, lat: -14.6 - i * 0.01, lon: -68.5,
  fecha: "2026-09-20", hora: "1730", frp, confianza: "n",
  satelite: "N", historico: false });

console.log("=".repeat(70));
console.log("MARCADORES QUE DIBUJA CADA CAPA");
console.log("=".repeat(70));

// ---------------------------------------------------------------------------
console.log("\nPrueba 12 \u00b7 estado sin_focos, sin_clave y error");
// ---------------------------------------------------------------------------
// Con esos estados el backend devuelve focos: [], y Monitoreo además exige
// estado === "correcto" para montar la capa. Aquí se comprueba el caso
// extremo: aunque la capa se montara, con array vacío no dibuja nada.
for (const estado of ["sin_focos", "sin_clave", "error"]) {
  const c = contar(CapaFocosFirms({ focos: [], onSeleccionarFoco: null }));
  ok(c.circulos === 0 && c.etiquetasMW === 0,
     `estado ${estado} \u2192 0 c\u00edrculos y 0 etiquetas MW`,
     `${c.circulos} / ${c.etiquetasMW}`);
}

// ---------------------------------------------------------------------------
console.log("\nPrueba 13 \u00b7 exactamente 3 focos activos");
// ---------------------------------------------------------------------------
const tres = contar(CapaFocosFirms(
  { focos: [foco(1, 37), foco(2, 8), foco(3, 68)], onSeleccionarFoco: null }));
ok(tres.circulos === 9, "3 focos \u2192 9 c\u00edrculos (halo, anillo y n\u00facleo por foco)",
   `${tres.circulos}`);
ok(tres.etiquetasMW === 2, "2 etiquetas MW: solo los focos con FRP > 20",
   `${tres.etiquetasMW} \u00b7 37 y 68 MW; el de 8 MW no lleva`);
ok(tres.marcadores === 0, "ning\u00fan marcador de evento hist\u00f3rico",
   `${tres.marcadores}`);

// ---------------------------------------------------------------------------
console.log("\nPrueba 13b \u00b7 un hist\u00f3rico colado en el array de activos");
// ---------------------------------------------------------------------------
const colado = contar(CapaFocosFirms({
  focos: [foco(1, 37), { ...foco(9, 50), historico: true }],
  onSeleccionarFoco: null }));
ok(colado.circulos === 3,
   "se descarta: 2 focos en el array, solo se dibuja el activo",
   `${colado.circulos} c\u00edrculos = 1 foco`);

// ---------------------------------------------------------------------------
console.log("\nPrueba 14 \u00b7 la capa hist\u00f3rica es independiente");
// ---------------------------------------------------------------------------
const hist = Array.from({ length: 300 }, (_, i) =>
  ({ id: `hist-${i}`, lat: -14.7, lon: -68.4, fecha: "2021-08-11", historico: true }));
const apagada = contar(CapaFocosHistoricos({ focos: [] }));
ok(apagada.circulos === 0, "apagada dibuja 0", `${apagada.circulos}`);
const encendida = contar(CapaFocosHistoricos({ focos: hist }));
ok(encendida.circulos === 300, "encendida dibuja los 300",
   `${encendida.circulos}`);
ok(encendida.etiquetasMW === 0, "y ninguna etiqueta MW",
   `${encendida.etiquetasMW}`);
ok(tres.circulos === 9,
   "encender la hist\u00f3rica no altera la de activos",
   "las capas usan arrays distintos");

// ---------------------------------------------------------------------------
console.log("\nEstado inicial declarado en el código");
// ---------------------------------------------------------------------------
const src = fs.readFileSync(
  path.resolve("src/pantallas/monitoreo/Monitoreo.jsx"), "utf8");
ok(/const \[mostrarHistoricos, setMostrarHistoricos\] = useState\(false\)/.test(src),
   "los eventos históricos arrancan APAGADOS");
ok(/const \[verHistoricos, setVerHistoricos\] = useState\(false\)/.test(src),
   "los focos históricos arrancan APAGADOS");
ok(/const \[capaActiva, setCapaActiva\] = useState\(3\)/.test(src),
   "la capa NASA FIRMS arranca ACTIVADA");
ok(/firmsEstado\?\.estado === "correcto"/.test(src),
   "la capa FIRMS se condiciona al estado de la consulta");

// Tres arrays, tres nombres.
for (const n of ["focosActivos", "focosHistoricos", "eventosHistoricos"]) {
  ok(new RegExp(`const \\[${n},`).test(src), `existe el array ${n}`);
}
ok(!/focosFirms\b/.test(src), "no queda el nombre ambiguo focosFirms");

const capa = fs.readFileSync(
  path.resolve("src/pantallas/monitoreo/componentes/CapaFocosFirms.jsx"), "utf8");
ok(/if \(f\.historico\) return null/.test(capa),
   "CapaFocosFirms descarta cualquier foco marcado como histórico");
ok(!/8ab4d8/.test(capa),
   "y ya no tiene la rama que los pintaba en azul");

// ---------------------------------------------------------------------------
console.log("\nCapa FIRMS aislada \u00b7 estado del c\u00f3digo");
// ---------------------------------------------------------------------------
const mon = fs.readFileSync(
  path.resolve("src/pantallas/monitoreo/Monitoreo.jsx"), "utf8");

ok(!/DEBUG_MAPA_LIMPIO/.test(mon), "el cartel de depuraci\u00f3n ya no existe");
const css = fs.readFileSync(
  path.resolve("src/pantallas/monitoreo/estilos/Monitoreo.css"), "utf8");
ok(!/debug-mapa-limpio/.test(css), "y tampoco su estilo");

ok(/const CAPAS_HISTORICAS_HABILITADAS = false/.test(mon),
   "las capas hist\u00f3ricas est\u00e1n desactivadas");
for (const capa of ["verHistoricos", "mostrarHistoricos"]) {
  const re = new RegExp(`CAPAS_HISTORICAS_HABILITADAS && ${capa}`);
  ok(re.test(mon), `la capa ${capa} no puede dibujarse`);
}
ok(/CapaFocosFirms/.test(mon) && !/CAPAS_HISTORICAS_HABILITADAS[^\n]*CapaFocosFirms/.test(mon),
   "la capa de NASA FIRMS s\u00ed permanece activa");

for (const l of ["ESTADO FIRMS", "FIRMS RECIBIDOS", "FIRMS RENDERIZADOS"]) {
  ok(mon.includes(`"${l}:"`), `registra en consola ${l}`);
}
ok(/renderizados = r\.estado === "correcto" \? recibidos\.length : 0/.test(mon),
   "renderizados = 0 salvo con estado correcto");
ok(/consultadoEn: new Date\(\)\.toISOString\(\)/.test(mon),
   "guarda la hora de la \u00faltima consulta");

const panel = fs.readFileSync(
  path.resolve("src/pantallas/monitoreo/componentes/PanelEstadoFirms.jsx"), "utf8");
ok(/\u00daltima consulta/.test(panel), "el panel muestra la \u00faltima consulta");
ok(/Focos encontrados/.test(panel), "y los focos encontrados");
ok(/historicasHabilitadas \? \(/.test(panel),
   "y oculta los interruptores hist\u00f3ricos mientras est\u00e9n desactivados");


console.log("\n" + "=".repeat(70));
if (fallos) {
  console.log(`  ${fallos} comprobación(es) fallida(s)`);
  process.exit(1);
}
console.log("  El mapa dibuja exactamente lo que debe en cada escenario.");
console.log("=".repeat(70));
