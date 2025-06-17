import React from 'react';
import 'bootstrap/dist/css/bootstrap.min.css';

export default function Home() {
  return (
    <div className="container mt-5 text-center">
      <h1 className="display-4">¡Bienvenido a Mi Plataforma Médica!</h1>
      <p className="lead">Tu salud es nuestra prioridad.</p>
      <hr className="my-4" />
      <p>
        Inicia sesión para acceder a tu dashboard o regístrate si eres nuevo.
      </p>
      <div className="d-grid gap-2 col-6 mx-auto">
        {/* Aquí puedes añadir enlaces a login y registro si quieres */}
        {/*
        <a className="btn btn-primary btn-lg mt-3" href="/login" role="button">Iniciar Sesión</a>
        <a className="btn btn-outline-secondary btn-lg mt-2" href="/register" role="button">Registrarse como Paciente</a>
        <a className="btn btn-outline-info btn-lg mt-2" href="/register-doctor" role="button">Registrarse como Doctor</a>
        */}
      </div>
      <p className="mt-5 text-muted">
        Para acceder a funcionalidades completas, por favor, inicia sesión.
      </p>
    </div>
  );
}