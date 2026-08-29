import { useNavigate } from "react-router-dom";
import "./estilos/Error404.css";

export default function Error404() {
  const navigate = useNavigate();

  const volverInicio = () => {
    navigate("/inicio");
  };

  return (
    <main className="error404">
      <section className="error404-contenido">

        <div className="error404-titulo">
          ERROR
        </div>

        <div className="error404-numero">
          <span>4</span>

          <div className="error404-cero">
            <div className="error404-cero-interior">
              🔥
            </div>
          </div>

          <span>4</span>
        </div>

        <h1 className="error404-mensaje">
          Esta página no está disponible.
        </h1>

        <p className="error404-descripcion">
          La página a la que intentas acceder no existe o fue movida.
          <br />
          Regresa al inicio para continuar utilizando el sistema.
        </p>

        <button
          type="button"
          className="error404-boton"
          onClick={volverInicio}
        >
          <span className="error404-boton-icono">
            
          </span>

          <span>Volver al inicio</span>

          <span className="error404-boton-flecha">
            →
          </span>
        </button>

        <div className="error404-marca">
          <div className="error404-marca-icono">
          </div>

          <strong>SIPRO </strong>

          <span>
            Sistema de Simulación, Predicción de propagación de Incendios Forestales
          </span>
        </div>

      </section>
    </main>
  );
}