import React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import 'bootstrap/dist/css/bootstrap.min.css';

export default function Navbar({ authInfo, setAuthInfo }) {
  const navigate = useNavigate();

  const handleLogout = () => {
    console.log("Cerrando sesión...");

    localStorage.removeItem('token');
    localStorage.removeItem('userId');
    localStorage.removeItem('userRole');
    localStorage.removeItem('username');
    localStorage.removeItem('userEmail');
    localStorage.removeItem('doctorId');

    setAuthInfo({
      isAuthenticated: false,
      userId: null,
      userRole: null,
      username: null,
      token: null,
    });
    console.log("Sesión cerrada. La redirección será manejada por App.js.");
  };

  return (
    // Usamos 'bg-primary' para un azul de Bootstrap, 'navbar-dark' para texto claro
    // y 'shadow-lg' para una sombra más prominente que da un toque elegante.
    // 'py-3' aumenta el padding vertical para un aspecto más robusto.
    <nav className="navbar navbar-expand-lg navbar-dark bg-primary shadow-lg py-3">
      <div className="container-fluid">
        {/* 'fw-bold' para negrita, 'fs-4' para un tamaño de fuente mayor */}
        <Link className="navbar-brand fw-bold fs-4" to="/">
          Plataforma Medica UCaldas
        </Link>

        <button className="navbar-toggler" type="button" data-bs-toggle="collapse" data-bs-target="#navbarNav" aria-controls="navbarNav" aria-expanded="false" aria-label="Toggle navigation">
          <span className="navbar-toggler-icon"></span>
        </button>

        <div className="collapse navbar-collapse" id="navbarNav">
          {/* 'ms-auto' para alinear los elementos de la lista a la derecha */}
          <ul className="navbar-nav ms-auto">
            {!authInfo.isAuthenticated ? (
              <>
                <li className="nav-item">
                  {/* 'text-uppercase' para mayúsculas, 'fw-medium' para un grosor de fuente intermedio */}
                  <Link className="nav-link text-uppercase fw-medium px-3" to="/login">
                    Iniciar Sesión
                  </Link>
                </li>
                <li className="nav-item">
                  <Link className="nav-link text-uppercase fw-medium px-3" to="/register-patient">
                    Registrar Paciente
                  </Link>
                </li>
                <li className="nav-item">
                  <Link className="nav-link text-uppercase fw-medium px-3" to="/register-doctor">
                    Registrar Médico
                  </Link>
                </li>
              </>
            ) : (
              <>
                {/* 'text-info' para un azul claro, 'fst-italic' para cursiva, 'me-3' para margen derecho */}
                <li className="nav-item d-flex align-items-center">
                  <span className="nav-link text-info fst-italic me-3">
                    Bienvenido, {authInfo.username || authInfo.userEmail || `Usuario (${authInfo.userRole})`}
                  </span>
                </li>

                {authInfo.userRole === 'doctor' && (
                  <li className="nav-item">
                    <Link className="nav-link text-uppercase fw-medium px-3" to="/doctor-dashboard">
                      Dashboard Médico
                    </Link>
                  </li>
                )}
                {authInfo.userRole === 'patient' && (
                  <li className="nav-item">
                    <Link className="nav-link text-uppercase fw-medium px-3" to="/patient-dashboard">
                      Dashboard Paciente
                    </Link>
                  </li>
                )}
                {authInfo.userRole === 'admin' && (
                  <li className="nav-item">
                    <Link className="nav-link text-uppercase fw-medium px-3" to="/admin-dashboard">
                      Dashboard Admin
                    </Link>
                  </li>
                )}

                <li className="nav-item">
                  {/* 'btn-outline-light' para un botón con borde claro y texto claro,
                      'btn-sm' para un tamaño de botón más pequeño y 'ms-2' para margen izquierdo */}
                  <button
                    className="btn btn-outline-light btn-sm ms-2"
                    onClick={handleLogout}
                  >
                    Cerrar Sesión
                  </button>
                </li>
              </>
            )}
          </ul>
        </div>
      </div>
    </nav>
  );
}