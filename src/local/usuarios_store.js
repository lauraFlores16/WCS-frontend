// ============================================================================
// GESTIÓN DE USUARIOS (Módulo 1) — cliente del backend
// ============================================================================
// Antes esto guardaba los usuarios en localStorage, y eso escondía un problema
// serio: la pantalla de administración y el login trabajaban sobre DOS listas
// distintas. Crear un usuario aquí no servía para entrar al sistema, y
// desactivar una cuenta no impedía que esa persona iniciara sesión.
//
// Ahora es la misma lista, en el servidor:
//   · las contraseñas nunca salen de ahí (la respuesta jamás las incluye);
//   · desactivar una cuenta bloquea de verdad el inicio de sesión;
//   · las reglas del rol administrador se comprueban en el servidor, donde el
//     usuario no puede saltárselas desde las herramientas de desarrollo.
//
// Se mantienen los mismos nombres y la misma forma de respuesta ({ data }) que
// usaba la pantalla, así que GestionUsuarios.jsx no cambió.
// ============================================================================
import { pedir } from "./cliente";

const ok = (data) => ({ data });

export const usuariosLocalStore = {
  listar: async () => ok(await pedir("/api/usuarios")),

  crear: async (usuario) =>
    ok(await pedir("/api/usuarios", { metodo: "POST", cuerpo: usuario })),

  actualizar: async (id, cambios) =>
    ok(await pedir(`/api/usuarios/${id}`, { metodo: "PATCH", cuerpo: cambios })),

  // "Eliminar" = desactivar (borrado lógico). El registro se conserva.
  desactivar: async (id) =>
    ok(await pedir(`/api/usuarios/${id}`, { metodo: "DELETE" })),

  // Restablecer contraseña: asigna una temporal nueva.
  restablecerPassword: async (id, password) =>
    ok(await pedir(`/api/usuarios/${id}/restablecer-password`, { metodo: "POST", cuerpo: { password } })),
};
