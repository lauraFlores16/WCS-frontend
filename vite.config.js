import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  // Lee el .env de la raíz del proyecto. Solo las variables con prefijo VITE_
  // llegan al navegador; la única que hace falta es VITE_API_URL, la dirección
  // del backend Django (backend_django/).
  envDir: '../',
  // Ya no hay proxy a NASA FIRMS. El navegador no llama a ninguna API externa:
  // quien habla con NASA, Open-Meteo y Overpass es el backend, que además
  // mantiene las claves fuera del bundle que descarga el usuario.
})
