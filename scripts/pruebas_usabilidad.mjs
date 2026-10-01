/**
 * Tres pruebas de usabilidad, medibles.
 *
 *     npm install --no-save jsdom
 *     npx vite-node scripts/pruebas_usabilidad.mjs
 *
 * U1  Contraste de texto y controles, en los dos temas (WCAG 2.1 AA).
 * U2  Ningún estado seleccionado depende solo del color.
 * U3  Ninguna pantalla de datos se queda en blanco sin explicación.
 */
import fs from "fs";
import path from "path";

const SRC = path.resolve("src");
let fallos = 0;
let total = 0;

function ok(cond, titulo, extra = "") {
  total++;
  if (cond) console.log(`  ✓ ${titulo}${extra ? ` — ${extra}` : ""}`);
  else { fallos++; console.log(`  ✗ ${titulo}${extra ? ` — ${extra}` : ""}`); }
  return !!cond;
}

const lin = (c) => { c /= 255; return c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4; };
function lum(hex) {
  const h = hex.replace("#", "");
  const n = h.length === 3 ? h.split("").map((x) => x + x).join("") : h;
  const [r, g, b] = [0, 2, 4].map((i) => parseInt(n.slice(i, i + 2), 16));
  return 0.2126 * lin(r) + 0.7152 * lin(g) + 0.0722 * lin(b);
}
const contraste = (a, b) => {
  const [l1, l2] = [lum(a), lum(b)].sort((x, y) => y - x);
  return (l1 + 0.05) / (l2 + 0.05);
};

// Tokens leídos del propio CSS: si alguien cambia un color, la prueba lo ve.
function tokens(bloque) {
  const css = fs.readFileSync(path.join(SRC, "estilos", "tokens.css"), "utf8");
  const i = css.indexOf(bloque);
  if (i < 0) return null;
  const cuerpo = css.slice(i, css.indexOf("}", i));
  const t = {};
  for (const m of cuerpo.matchAll(/--([\w-]+):\s*(#[0-9A-Fa-f]{3,8})\s*;/g)) {
    t[m[1]] = m[2].slice(0, 7);
  }
  return t;
}

// ===========================================================================
console.log("=".repeat(70));
console.log("PRUEBAS DE USABILIDAD");
console.log("=".repeat(70));

// ---------------------------------------------------------------------------
console.log("\nU1. Contraste en los dos temas (WCAG 2.1 AA)");
// ---------------------------------------------------------------------------
const TEMAS = {
  oscuro: tokens(':root,\n:root[data-tema="oscuro"] {'),
  claro: tokens(':root[data-tema="claro"] {'),
};

// [texto, fondo, mínimo, para qué]
const PARES = [
  ["text-primary", "bg-panel", 4.5, "texto principal sobre panel"],
  ["text-primary", "bg-panel-raised", 4.5, "texto principal sobre tarjeta"],
  ["text-secondary", "bg-panel", 4.5, "texto secundario sobre panel"],
  ["text-secondary", "bg-panel-raised", 4.5, "texto secundario sobre tarjeta"],
  ["text-muted", "bg-panel", 4.5, "texto auxiliar sobre panel"],
  ["acento-400", "bg-panel", 4.5, "acento como texto"],
  ["acento-500", "bg-panel", 3.0, "acento en iconos y bordes"],
  ["border-strong", "bg-panel", 3.0, "borde de control sobre panel"],
  ["border-strong", "bg-panel-raised", 3.0, "borde de control sobre tarjeta"],
];

for (const [tema, t] of Object.entries(TEMAS)) {
  if (!t) { ok(false, `tokens del tema ${tema} legibles`); continue; }
  console.log(`\n  Tema ${tema}:`);
  for (const [a, b, min, desc] of PARES) {
    if (!t[a] || !t[b]) { ok(false, `${desc}: falta un token`, `${a} / ${b}`); continue; }
    const r = contraste(t[a], t[b]);
    ok(r >= min, `${desc} ≥ ${min}:1`, `${r.toFixed(2)}:1`);
  }
  // Separación entre superficies: si dos coinciden, los controles desaparecen.
  if (t["bg-panel"] && t["bg-panel-raised"]) {
    ok(t["bg-panel"].toLowerCase() !== t["bg-panel-raised"].toLowerCase(),
       "panel y tarjeta no son el mismo color",
       `${t["bg-panel"]} vs ${t["bg-panel-raised"]}`);
  }
}

// ---------------------------------------------------------------------------
console.log("\nU2. La selección no depende solo del color");
// ---------------------------------------------------------------------------
// Cada grupo de opciones tiene que dar al menos DOS señales del estado
// seleccionado: color más glifo, o color más peso o borde.
const GRUPOS = [
  ["Escenario ambiental", "simulacion/Simulacion.jsx", "sim-tarjeta"],
  ["Capa de validación", "simulacion/componentes/PanelValidacion.jsx", "val-modo"],
  ["Estado observado", "monitoreo/componentes/ModalReporteIncendio.jsx", "rep-estado"],
];

for (const [nombre, rel, clase] of GRUPOS) {
  const f = path.join(SRC, "pantallas", rel);
  if (!fs.existsSync(f)) { ok(false, `${nombre}: no existe ${rel}`); continue; }
  const jsx = fs.readFileSync(f, "utf8");

  const tieneGlifo = new RegExp(`${clase}-marca`).test(jsx) || /[✓✔]/.test(jsx);
  ok(tieneGlifo, `${nombre}: marca la selección con un glifo, no solo color`);

  const tieneAria = jsx.includes("aria-checked") || jsx.includes('role="radio"');
  ok(tieneAria, `${nombre}: expone el estado a lectores de pantalla`);
}

// Las leyendas del mapa llevan texto, no solo cuadraditos de color.
const LEYENDAS = [
  ["Comparación observado/simulado", "simulacion/componentes/CapaComparacion.jsx"],
  ["Reportes de campo", "monitoreo/componentes/CapaReportesCampo.jsx"],
];
for (const [nombre, rel] of LEYENDAS) {
  const f = path.join(SRC, "pantallas", rel);
  if (!fs.existsSync(f)) { ok(false, `${nombre}: no existe`); continue; }
  const jsx = fs.readFileSync(f, "utf8");
  ok(/\bt:\s*"|texto:\s*"/.test(jsx),
     `${nombre}: la leyenda nombra cada clase con texto`);
}

// ---------------------------------------------------------------------------
console.log("\nU3. Ninguna pantalla de datos se queda en blanco");
// ---------------------------------------------------------------------------
// Toda vista que dependa de datos externos tiene que decir qué pasa cuando no
// hay: cargando, vacío o error. Un panel en blanco sin explicación deja al
// usuario sin saber si falló algo o si no hay nada.
const VISTAS = [
  ["Validación", "simulacion/componentes/PanelValidacion.jsx"],
  ["Peligro horario", "inicio/componentes/PanelPeligroHorario.jsx"],
  ["Validación en Escenarios", "panel-control/componentes/TarjetaValidacion.jsx"],
  ["Simulación", "simulacion/Simulacion.jsx"],
];

const SENALES = [
  [/cargando|Cargando|cargado/, "estado de carga"],
  [/vacio|vacío|Todavía no|no hay|No hay|sin datos|sin resultados/, "estado vacío"],
];

for (const [nombre, rel] of VISTAS) {
  const f = path.join(SRC, "pantallas", rel);
  if (!fs.existsSync(f)) { ok(false, `${nombre}: no existe ${rel}`); continue; }
  const jsx = fs.readFileSync(f, "utf8");
  const presentes = SENALES.filter(([re]) => re.test(jsx)).map(([, d]) => d);
  ok(presentes.length >= 1, `${nombre}: tiene ${presentes.join(" y ") || "—"}`,
     presentes.length ? "" : "ninguna señal de carga ni de vacío");
}

// Los números que faltan salen como guion, nunca como cero: un 0 se leería
// como «el modelo no acertó nada» en vez de «no se ha calculado».
const pv = fs.readFileSync(
  path.join(SRC, "pantallas/simulacion/componentes/PanelValidacion.jsx"), "utf8");
ok(/==\s*null\s*\?\s*"—"/.test(pv),
   "Validación: los valores ausentes salen como guion, no como cero");

// La procedencia de los datos se declara en pantalla. Sustituye al antiguo
// aviso de «datos de demostración»: el contrato nuevo solo sirve resultados
// reales recalculados por el backend, así que lo que hay que mostrar es de
// dónde salen, no advertir de que son falsos.
ok(/fecha_ejecucion|fechaEjecucion/.test(pv),
   "Validación: muestra cuándo se ejecutó la validación");
ok(/cicatriz/i.test(pv) && /fuente/i.test(pv),
   "Validación: declara la fuente de la cicatriz");

console.log("\n" + "=".repeat(70));
if (fallos) {
  console.log(`  ${fallos} de ${total} comprobaciones fallidas`);
  console.log("=".repeat(70));
  process.exit(1);
}
console.log(`  Usabilidad: ${total} comprobaciones, todas correctas.`);
console.log("=".repeat(70));
