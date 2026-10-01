/**
 * Detector de «zona muerta temporal» en arrays de dependencias de hooks.
 *
 *     node scripts/comprobar_orden_hooks.mjs
 *
 * QUÉ BUSCA Y POR QUÉ
 *   Este fallo dejó la pantalla de Simulación en blanco y ni `vite build` ni
 *   `oxlint` lo vieron:
 *
 *       const brujula = useMemo(() => { ... }, [auto, foco, iteracion]);
 *       ...
 *       const iteracion = ...;          // declarada 120 líneas MÁS ABAJO
 *
 *   El cuerpo del useMemo es una función y no se ejecuta al definirlo, así que
 *   parece inofensivo. Pero el ARRAY DE DEPENDENCIAS sí se evalúa en ese
 *   momento, y leer una `const` antes de su declaración lanza
 *   `ReferenceError: Cannot access 'iteracion' before initialization`. La
 *   pantalla entera se cae en el primer render.
 *
 *   No es un error de sintaxis, así que la compilación pasa limpia. Y una
 *   prueba de renderizado tampoco sirve aquí: en esta pantalla salta antes el
 *   error de `window` de Leaflet y lo tapa. De ahí que haga falta una
 *   comprobación estática dedicada.
 *
 * CÓMO LO BUSCA
 *   Para cada `useMemo` / `useEffect` / `useCallback`, toma los identificadores
 *   de su array de dependencias y comprueba que ninguno esté declarado con
 *   `const` o `let` MÁS ABAJO en el mismo archivo. Es un análisis por líneas,
 *   no un intérprete: puede dar algún falso positivo con nombres repetidos en
 *   ámbitos distintos, y por eso informa de la línea exacta para poder
 *   revisarlo a mano.
 */
import fs from "fs";
import path from "path";

const RAIZ = path.resolve(process.argv[2] || "src");

const HOOKS = ["useMemo", "useEffect", "useCallback", "useLayoutEffect"];
// Nombres que nunca son declaraciones locales relevantes.
const IGNORAR = new Set([
  "true", "false", "null", "undefined", "window", "document", "console",
  "Math", "Date", "JSON", "Object", "Array", "Number", "String", "Boolean",
]);

function archivos(dir) {
  const fuera = [];
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, e.name);
    if (e.isDirectory()) fuera.push(...archivos(p));
    else if (/\.(jsx?|tsx?)$/.test(e.name) && !e.name.endsWith(".bak"))
      fuera.push(p);
  }
  return fuera;
}

let problemas = 0;
let revisados = 0;

for (const archivo of archivos(RAIZ)) {
  const texto = fs.readFileSync(archivo, "utf8");
  const lineas = texto.split("\n");
  revisados++;

  // Línea en la que se declara cada identificador con const/let.
  const declarado = new Map();
  lineas.forEach((l, i) => {
    // const x = · let x = · const { a, b } = · const [a, b] =
    const simple = l.match(/^\s*(?:const|let)\s+([A-Za-z_$][\w$]*)\s*[=;]/);
    if (simple && !declarado.has(simple[1])) declarado.set(simple[1], i + 1);
    const destruct = l.match(/^\s*(?:const|let)\s*[[{]([^}\]]+)[}\]]\s*=/);
    if (destruct) {
      for (const bruto of destruct[1].split(",")) {
        const n = bruto.split(":").pop().trim().replace(/^\.\.\./, "");
        if (/^[A-Za-z_$][\w$]*$/.test(n) && !declarado.has(n))
          declarado.set(n, i + 1);
      }
    }
  });

  // Arrays de dependencias: `}, [a, b, c]);` o `, [a, b]);`
  const re = new RegExp(`(${HOOKS.join("|")})\\s*\\(`, "g");
  let m;
  while ((m = re.exec(texto)) !== null) {
    const lineaHook = texto.slice(0, m.index).split("\n").length;

    // Se busca el cierre del hook desde su apertura, contando paréntesis.
    let prof = 0, fin = -1;
    for (let i = m.index + m[0].length - 1; i < texto.length; i++) {
      if (texto[i] === "(") prof++;
      else if (texto[i] === ")") { prof--; if (prof === 0) { fin = i; break; } }
    }
    if (fin < 0) continue;

    const dentro = texto.slice(m.index, fin);
    const deps = dentro.match(/,\s*\[([^\]]*)\]\s*$/s);
    if (!deps) continue;

    const lineaDeps = texto.slice(0, fin).split("\n").length;

    for (const bruto of deps[1].split(",")) {
      // Solo el identificador raíz: de `auto?.meteo` interesa `auto`.
      const id = bruto.trim().split(/[.?[\s]/)[0];
      if (!id || IGNORAR.has(id) || !/^[A-Za-z_$][\w$]*$/.test(id)) continue;

      const lineaDecl = declarado.get(id);
      if (lineaDecl && lineaDecl > lineaDeps) {
        problemas++;
        console.log(
          `FALLO  ${path.relative(process.cwd(), archivo)}\n` +
          `       ${m[1]} en la línea ${lineaHook}, dependencias en la ${lineaDeps}\n` +
          `       usa "${id}", declarada con const/let en la línea ${lineaDecl}\n` +
          `       → ReferenceError en el primer render. Mueve el ${m[1]} por\n` +
          `         debajo de la línea ${lineaDecl}.\n`);
      }
    }
  }
}

console.log(`Archivos revisados: ${revisados}`);
if (problemas) {
  console.log(`\n${problemas} dependencia(s) usada(s) antes de su declaración.`);
  console.log("Cada una rompe la pantalla en el primer render.");
  process.exit(1);
}
console.log("Ninguna dependencia de hook se usa antes de declararse.");
