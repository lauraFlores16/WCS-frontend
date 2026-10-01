/**
 * Renderiza las pantallas en un navegador simulado (jsdom).
 *
 *     npm install --no-save jsdom
 *     npx vite-node scripts/probar_pantallas.mjs
 *
 * POR QUÉ HACE FALTA
 *   `vite build` y `oxlint` solo miran el código; no lo ejecutan. Un fallo
 *   como este pasa las dos comprobaciones y deja la pantalla en blanco:
 *
 *       const brujula = useMemo(() => {...}, [auto, foco, iteracion]);
 *       ...
 *       const iteracion = ...;        // declarada 120 líneas más abajo
 *
 *   Y una prueba de renderizado en servidor tampoco basta: en la pantalla de
 *   Simulación salta antes el error de `window` de Leaflet y lo tapa. Con
 *   jsdom hay `window`, así que el componente se monta de verdad y los
 *   errores reales salen a la luz.
 *
 * QUÉ SIMULA
 *   El DOM, `fetch` (con respuestas vacías) y los contextos que las pantallas
 *   necesitan: router, permisos, tema y escenario. No comprueba que la
 *   pantalla se vea bien —eso hay que mirarlo— pero sí que se MONTA sin
 *   reventar, que es lo que falló.
 */
import { JSDOM } from "jsdom";

// --- Navegador simulado, antes de importar React ---------------------------
const dom = new JSDOM("<!doctype html><html><body><div id='raiz'></div></body></html>", {
  url: "http://localhost:5173/",
  pretendToBeVisual: true,
});
globalThis.window = dom.window;
globalThis.document = dom.window.document;
// `navigator` es de solo lectura en Node 21+, hay que definirla.
Object.defineProperty(globalThis, "navigator", {
  value: dom.window.navigator, configurable: true, writable: true,
});
globalThis.HTMLElement = dom.window.HTMLElement;
globalThis.Element = dom.window.Element;
globalThis.Node = dom.window.Node;
globalThis.SVGElement = dom.window.SVGElement;
globalThis.getComputedStyle = dom.window.getComputedStyle;
globalThis.requestAnimationFrame = (cb) => setTimeout(cb, 0);
globalThis.cancelAnimationFrame = clearTimeout;
globalThis.ResizeObserver = class { observe() {} unobserve() {} disconnect() {} };
// Almacenamiento del navegador. El contexto del escenario lo usa para
// conservar el foco entre pantallas, y en Node no existe.
globalThis.sessionStorage = dom.window.sessionStorage;
globalThis.localStorage = dom.window.localStorage;
globalThis.IntersectionObserver = class { observe() {} unobserve() {} disconnect() {} };
dom.window.ResizeObserver = globalThis.ResizeObserver;

// `fetch` devuelve 404 a todo: interesa que la pantalla aguante SIN datos,
// que es el caso que más se rompe.
globalThis.fetch = async () => ({
  ok: false, status: 404,
  json: async () => ({}),
  text: async () => "",
});

// Leaflet necesita medir el contenedor; en jsdom mide 0 y protesta.
dom.window.HTMLElement.prototype.getBoundingClientRect = function () {
  return { width: 800, height: 600, top: 0, left: 0, bottom: 600, right: 800, x: 0, y: 0 };
};

const React = (await import("react")).default;
const { createRoot } = await import("react-dom/client");
const { MemoryRouter } = await import("react-router-dom");

// --- Captura de errores ----------------------------------------------------
const errores = [];
const errOriginal = console.error;
console.error = (...a) => {
  const t = a.map(String).join(" ");
  // El aviso de act() y los de propTypes no son fallos de la pantalla.
  if (!/not wrapped in act|validateDOMNesting|useLayoutEffect does nothing/.test(t)) {
    errores.push(t);
  }
};
dom.window.addEventListener("error", (e) => errores.push(String(e.error || e.message)));

const RAIZ = new URL("../src/", import.meta.url).pathname;
const { EscenarioProvider } = await import(RAIZ + "nucleo/EscenarioContext.jsx");
const { PermisosProvider } = await import(RAIZ + "nucleo/PermisosContext.jsx");
// PermisosProvider llama a useAuth(), así que AuthProvider tiene que envolverlo.
// Sin él el árbol entero revienta y las pantallas ni se llegan a montar.
const { AuthProvider } = await import(RAIZ + "nucleo/AuthContext.jsx");

function envolver(Comp) {
  return React.createElement(
    MemoryRouter, null,
    React.createElement(
      AuthProvider, null,
      React.createElement(
        PermisosProvider, null,
        React.createElement(EscenarioProvider, null, React.createElement(Comp)))));
}

const PANTALLAS = [
  ["Simulación", "pantallas/simulacion/Simulacion.jsx"],
  ["Inicio", "pantallas/inicio/Dashboard.jsx"],
  ["Escenarios", "pantallas/panel-control/PanelControl.jsx"],
  ["Monitoreo", "pantallas/monitoreo/Monitoreo.jsx"],
];

let fallos = 0;
for (const [nombre, ruta] of PANTALLAS) {
  errores.length = 0;
  const contenedor = dom.window.document.createElement("div");
  dom.window.document.body.appendChild(contenedor);
  try {
    const mod = await import(RAIZ + ruta);
    const raiz = createRoot(contenedor);
    raiz.render(envolver(mod.default));
    // Un par de vueltas del bucle de eventos para que corran los efectos.
    await new Promise((r) => setTimeout(r, 120));

    const graves = errores.filter((e) =>
      /ReferenceError|TypeError|Cannot access|Cannot read|is not a function|is not defined|undefined is not/.test(e));

    if (graves.length) {
      fallos++;
      console.log(`  FALLO  ${nombre}`);
      for (const g of [...new Set(graves)].slice(0, 3)) {
        console.log(`         ${g.split("\n")[0].slice(0, 170)}`);
      }
    } else {
      const pintado = contenedor.innerHTML.length;
      console.log(`  OK     ${nombre}  (${pintado} caracteres de HTML)` +
                  (pintado < 200 ? "  ← sospechosamente vacío" : ""));
    }
    raiz.unmount();
  } catch (e) {
    fallos++;
    console.log(`  FALLO  ${nombre}\n         ${String(e.message || e).slice(0, 170)}`);
  }
}

console.error = errOriginal;
console.log(fallos
  ? `\n${fallos} pantalla(s) no se montan. Arréglalas antes de seguir.`
  : "\nTodas las pantallas se montan sin errores de ejecución.");
process.exit(fallos ? 1 : 0);
