// frontend/src/pages/PatientDashboard.js

import React, { useState, useEffect } from 'react';
import axios from 'axios';
import 'bootstrap/dist/css/bootstrap.min.css';
import { useNavigate } from 'react-router-dom';

const PatientDashboard = () => {
    const [patientData, setPatientData] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const navigate = useNavigate();

    useEffect(() => {
        const fetchPatientData = async () => {
            const token = localStorage.getItem('token');
            const userId = localStorage.getItem('userId');

            // DEBUG: Confirma los valores de localStorage
            console.log('DEBUG (PatientDashboard): Token de localStorage:', token ? 'Presente' : 'Faltante');
            console.log('DEBUG (PatientDashboard): userId de localStorage:', userId);

            if (!token || !userId) {
                setError('No se encontró información de autenticación. Por favor, inicie sesión.');
                setLoading(false);
                // Si falta autenticación, redirige al login después de un breve retraso.
                // Esto ayuda a evitar un ciclo infinito de "no autenticado" si la ruta está protegida.
                setTimeout(() => navigate('/login'), 1500); 
                return;
            }

            try {
                // Realiza la petición GET al backend para obtener los datos del paciente
                // El backend debería enviar la información del User y del Patient (mediante una relación)
                const response = await axios.get(`${process.env.REACT_APP_BACKEND_URL}/api/patient/${userId}`, {
                    headers: {
                        Authorization: `Bearer ${token}` // Envía el token JWT
                    }
                });
                setPatientData(response.data);
                // DEBUG: Muestra los datos completos recibidos del backend
                console.log('DEBUG (PatientDashboard): Datos del paciente recibidos:', response.data);
            } catch (err) {
                console.error('ERROR (PatientDashboard): Error al cargar los datos del paciente:', err);
                setError('Error al cargar la información del paciente: ' + (err.response?.data?.message || err.message));
                // Si el error es por autenticación/autorización, limpia el token y redirige
                if (err.response && (err.response.status === 401 || err.response.status === 403)) {
                    localStorage.removeItem('token');
                    localStorage.removeItem('userId');
                    localStorage.removeItem('userRole');
                    setTimeout(() => navigate('/login'), 1500);
                }
            } finally {
                setLoading(false);
            }
        };

        fetchPatientData();
    }, [navigate]); // Agrega 'navigate' a las dependencias del useEffect

    const handleScheduleAppointmentClick = () => {
        navigate('/book-appointment');
    };

    const handleViewMyAppointmentsClick = () => {
        navigate('/patient-appointments'); // Redirige a la nueva ruta para ver citas
    };

    // Renderizado condicional
    if (loading) {
        return (
            <div className="container mt-5 text-center">
                <div className="spinner-border text-primary" role="status">
                    <span className="visually-hidden">Cargando...</span>
                </div>
                <p className="mt-2">Cargando dashboard del paciente...</p>
            </div>
        );
    }

    if (error) {
        return (
            <div className="container mt-5">
                <div className="alert alert-danger" role="alert">
                    {error}
                </div>
            </div>
        );
    }

    return (
        <div className="container mt-5">
            <div className="card shadow-lg border-0">
                <div className="card-header bg-success text-white text-center py-3">
                    <h2>Dashboard del Paciente</h2>
                    {patientData && (
                        // Muestra el nombre completo si está disponible, sino el username, sino 'Paciente'
                        <p className="mb-0 fs-5">
                            Bienvenido, {patientData.full_name && patientData.last_name
                                ? `${patientData.full_name} ${patientData.last_name}`
                                : patientData.username || 'Paciente'}
                        </p>
                    )}
                </div>
                <div className="card-body p-4">
                    <h4 className="card-title text-primary mb-4">Mis Datos:</h4>
                    {patientData ? (
                        <div>
                            {/* Nuevos campos */}
                            <p><strong>Nombre Completo:</strong> {patientData.full_name || 'N/A'}</p>
                            <p><strong>Apellido:</strong> {patientData.last_name || 'N/A'}</p>
                            <p><strong>Tipo de Documento:</strong> {patientData.document_type || 'N/A'}</p>
                            <p><strong>Número de Documento:</strong> {patientData.document_number || 'N/A'}</p>
                            {/* Campos existentes */}
                            <p><strong>Usuario:</strong> {patientData.username}</p>
                            <p><strong>Correo Electrónico:</strong> {patientData.email}</p>
                            <p><strong>Fecha de Nacimiento:</strong> {patientData.birth_date ? new Date(patientData.birth_date).toLocaleDateString() : 'N/A'}</p>
                            <p><strong>Teléfono:</strong> {patientData.phone || 'N/A'}</p>
                            <p><strong>Dirección:</strong> {patientData.address || 'N/A'}</p>
                        </div>
                    ) : (
                        <p>No se pudieron cargar los datos del paciente.</p>
                    )}

                    <hr className="my-4" />

                    <h4 className="card-title text-primary mb-4">Acciones Disponibles:</h4>
                    <div className="row g-3">
                        <div className="col-md-6 col-lg-4">
                            <div className="d-grid">
                                <button
                                    className="btn btn-outline-primary btn-lg"
                                    onClick={handleScheduleAppointmentClick}
                                >
                                    <i className="bi bi-calendar-plus me-2"></i> Agendar Nueva Cita
                                </button>
                            </div>
                        </div>
                        <div className="col-md-6 col-lg-4">
                            <div className="d-grid">
                                <button
                                    className="btn btn-outline-info btn-lg"
                                    onClick={handleViewMyAppointmentsClick}
                                >
                                    <i className="bi bi-card-list me-2"></i> Ver Mis Citas
                                </button>
                            </div>
                        </div>
                        <div className="col-md-6 col-lg-4">
                            <div className="d-grid">
                                <button className="btn btn-outline-secondary btn-lg">
                                    <i className="bi bi-person-fill me-2"></i> Actualizar Perfil
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
                <div className="card-footer text-muted text-center py-3">
                    Gestiona tu salud con MyMedicalPlatform
                </div>
            </div>
        </div>
    );
};

export default PatientDashboard;