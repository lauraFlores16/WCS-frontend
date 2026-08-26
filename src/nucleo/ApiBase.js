// Cliente HTTP base. Todas las pantallas usan ESTE archivo para hablar con el backend.
import axios from "axios";

export const API_URL = import.meta.env.VITE_API_URL || "http://localhost:8000";

export const api = axios.create({ baseURL: API_URL });

api.interceptors.request.use((config) => {
  const token = localStorage.getItem("apolo_token");
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

api.interceptors.response.use(
  (res) => res,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem("apolo_token");
      localStorage.removeItem("apolo_usuario");
      window.location.href = "/login";
    }
    return Promise.reject(error);
  }
);

export default api;
