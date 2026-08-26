// ============================================================================
// MENÚ DESPLEGABLE QUE SE SOBREPONE A TODO
// ============================================================================
// Problema que resuelve: la barra de navegación tiene `overflow-x: auto` para
// que los enlaces puedan desplazarse en pantallas estrechas. Cualquier
// elemento posicionado DENTRO de un contenedor con overflow queda recortado
// por él — por muchísimo z-index que se le ponga. El menú de "Administración"
// vivía ahí dentro, así que al abrirse no tapaba la página: quedaba metido en
// la propia barra y había que deslizar dentro de ella para verlo.
//
// La solución es sacarlo del árbol: el panel se dibuja con `createPortal`
// directamente en <body>, con `position: fixed` y las coordenadas calculadas
// del botón que lo abre. Al no tener ningún ancestro con overflow ni contexto
// de apilamiento por encima, se sobrepone a todo el contenido.
//
// Como está fijo a la ventana, hay que recolocarlo cuando algo se mueve: se
// recalcula en scroll y en resize, y se cierra con Escape o al pulsar fuera.
import { useCallback, useEffect, useLayoutEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";

const MARGEN = 8; // separación mínima con el borde de la ventana

export default function MenuDesplegable({
  abierto,
  onCerrar,
  anclaRef,          // ref del botón que lo abre
  alineacion = "izquierda", // "izquierda" | "derecha" respecto del ancla
  anchoMinimo = 232,
  className = "",
  children,
}) {
  const panelRef = useRef(null);
  const [pos, setPos] = useState(null);

  const recolocar = useCallback(() => {
    const ancla = anclaRef.current;
    if (!ancla) return;
    const r = ancla.getBoundingClientRect();
    const anchoPanel = Math.max(panelRef.current?.offsetWidth || 0, anchoMinimo);

    let izquierda = alineacion === "derecha" ? r.right - anchoPanel : r.left;
    // No dejar que se salga por ningún lado de la ventana
    izquierda = Math.min(izquierda, window.innerWidth - anchoPanel - MARGEN);
    izquierda = Math.max(MARGEN, izquierda);

    setPos({ top: r.bottom + 6, left: izquierda, maxHeight: window.innerHeight - r.bottom - 20 });
  }, [anclaRef, alineacion, anchoMinimo]);

  // useLayoutEffect: se coloca ANTES de pintar, para que no se vea saltar
  useLayoutEffect(() => {
    if (abierto) recolocar();
  }, [abierto, recolocar]);

  useEffect(() => {
    if (!abierto) return;

    const alPulsarFuera = (e) => {
      if (panelRef.current?.contains(e.target)) return;
      if (anclaRef.current?.contains(e.target)) return; // lo gestiona el propio botón
      onCerrar?.();
    };
    const alTeclear = (e) => { if (e.key === "Escape") onCerrar?.(); };

    document.addEventListener("mousedown", alPulsarFuera);
    document.addEventListener("keydown", alTeclear);
    // `true` para capturar también el scroll de contenedores internos
    window.addEventListener("scroll", recolocar, true);
    window.addEventListener("resize", recolocar);

    return () => {
      document.removeEventListener("mousedown", alPulsarFuera);
      document.removeEventListener("keydown", alTeclear);
      window.removeEventListener("scroll", recolocar, true);
      window.removeEventListener("resize", recolocar);
    };
  }, [abierto, onCerrar, recolocar, anclaRef]);

  if (!abierto || !pos) return null;

  return createPortal(
    <div
      ref={panelRef}
      className={`menu-flotante ${className}`}
      role="menu"
      style={{ top: pos.top, left: pos.left, minWidth: anchoMinimo, maxHeight: pos.maxHeight }}
    >
      {children}
    </div>,
    document.body,
  );
}
