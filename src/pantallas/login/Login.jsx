import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../../nucleo/AuthContext";
import Icono from "../../nucleo/Icono";
import "./estilos/Login.css";

export default function Login() {
  const { login, cargando, error } = useAuth();
  const navigate = useNavigate();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [verPassword, setVerPassword] = useState(false);

  async function onSubmit(e) {
    e.preventDefault();

    try {
      await login(email, password);
      navigate("/monitoreo", { replace: true });
    } catch {
      // El error ya queda expuesto por el contexto
    }
  }

  return (
    <div className="login-pagina">
      <div className="login-caja">

        <div className="login-encabezado">
          <img
            src="/sipro_simbolo.png"
            alt="SISPROP"
            className="login-simbolo"
            onError={(e) => {
              e.target.style.display = "none";
            }}
          />

          <h1 className="login-titulo">SIPRO</h1>

          <p
            className="text-muted"
            style={{ fontSize: 12.5, marginTop: 4 }}
          >
            MODELO DE SIMULACIÓN PREDICTIVA DE PROPAGACIÓN DE INCENDIOS FORESTALES MEDIANTE AUTÓMATAS CELULARES Y APRENDIZAJE AUTOMÁTICO 
          </p>

          <p
            className="text-muted"
            style={{ fontSize: 11.5, marginTop: 2 }}
          >
            La Paz — Bolivia
          </p>
        </div>

        <form onSubmit={onSubmit} className="panel login-form">

          {/* CORREO */}
          <div className="login-campo">
            <label className="field-label" htmlFor="email">
              Correo
            </label>

            <input
              id="email"
              type="email"
              className="input"
              required
              autoComplete="username"
              placeholder="tu.correo@dominio.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              autoFocus
            />
          </div>

          {/* CONTRASEÑA */}
          <div className="login-campo login-campo--password">
            <label className="field-label" htmlFor="password">
              Contraseña
            </label>

            <div className="login-password">

              <input
                id="password"
                type={verPassword ? "text" : "password"}
                className="input"
                required
                autoComplete="current-password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />

              {/* BOTÓN MOSTRAR / OCULTAR CONTRASEÑA */}
              <button
                type="button"
                className="login-ojo"
                onClick={() => setVerPassword((v) => !v)}
                aria-pressed={verPassword}
                aria-controls="password"
                aria-label={
                  verPassword
                    ? "Ocultar la contraseña"
                    : "Mostrar la contraseña"
                }
                title={
                  verPassword
                    ? "Ocultar la contraseña"
                    : "Mostrar la contraseña"
                }
              >
                {verPassword ? (

                  /* OJO TACHADO */
                  <svg
                    width="18"
                    height="18"
                    viewBox="0 0 24 24"
                    fill="none"
                    xmlns="http://www.w3.org/2000/svg"
                  >
                    <path
                      d="M3 3L21 21"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeLinecap="round"
                    />

                    <path
                      d="M10.6 10.6C10.2 11 10 11.5 10 12C10 13.1 10.9 14 12 14C12.5 14 13 13.8 13.4 13.4"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeLinecap="round"
                    />

                    <path
                      d="M9.9 4.2C10.6 4.1 11.3 4 12 4C17.5 4 21.5 8.5 22 12C21.8 13.3 21.2 14.6 20.3 15.8"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeLinecap="round"
                    />

                    <path
                      d="M6.1 6.1C3.9 7.7 2.5 10.1 2 12C2.5 15.5 6.5 20 12 20C13.4 20 14.7 19.7 15.9 19.2"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeLinecap="round"
                    />
                  </svg>

                ) : (

                  /* OJO ABIERTO */
                  <svg
                    width="18"
                    height="18"
                    viewBox="0 0 24 24"
                    fill="none"
                    xmlns="http://www.w3.org/2000/svg"
                  >
                    <path
                      d="M2 12C2 12 5.5 5 12 5C18.5 5 22 12 22 12C22 12 18.5 19 12 19C5.5 19 2 12 2 12Z"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />

                    <circle
                      cx="12"
                      cy="12"
                      r="3"
                      stroke="currentColor"
                      strokeWidth="2"
                    />
                  </svg>
                )}
              </button>
            </div>
          </div>

          {/* ERROR */}
          {error && (
            <div className="login-error">
              <Icono nombre="aviso" tam={15} />
              <span>{error}</span>
            </div>
          )}

          {/* BOTÓN INGRESAR */}
          <button
            type="submit"
            className="btn btn--primary"
            style={{ width: "100%" }}
            disabled={cargando || !email || !password}
          >
            {cargando ? "Ingresando…" : "Ingresar"}
          </button>

        </form>

        {/* WCS */}
        <div className="login-wcs">
          <span className="login-wcs-label">
            Un proyecto apoyado por
          </span>

          <img
            src="/wcs_horizontal.png"
            alt="Wildlife Conservation Society"
            className="login-wcs-logo"
            onError={(e) => {
              e.target.style.display = "none";
            }}
          />
        </div>

      </div>
    </div>
  );
}