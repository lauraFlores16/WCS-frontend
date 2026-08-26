// CRUD de usuarios — en el prototipo usa el almacén local (localStorage).
import { usuariosLocalStore } from "../../local/usuarios_store";
export const usuariosApi = usuariosLocalStore;
