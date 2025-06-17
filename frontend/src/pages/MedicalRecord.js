import React, { useState, useEffect, useCallback } from 'react';
import axios from 'axios';
import { useParams, useNavigate } from 'react-router-dom';
import 'bootstrap/dist/css/bootstrap.min.css';
import 'bootstrap-icons/font/bootstrap-icons.css';
import moment from 'moment';

const MedicalRecord = () => {
    const { patientId, appointmentId } = useParams();
    const navigate = useNavigate();

    // --- CONSOLE.LOGS DE DEPURACIÓN ---
    console.log('DEBUG (MedicalRecord): patientId de useParams:', patientId);
    console.log('DEBUG (MedicalRecord): appointmentId de useParams:', appointmentId);
    // ----------------------------------

    const [patient, setPatient] = useState(null);
    const [medicalHistory, setMedicalHistory] = useState([]);
    const [newObservation, setNewObservation] = useState('');
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [message, setMessage] = useState('');
    const [isSaving, setIsSaving] = useState(false);
    const [currentAppointment, setCurrentAppointment] = useState(null);

    const token = localStorage.getItem('token');
    const storedUserRole = localStorage.getItem('userRole');
    const currentDoctorId = localStorage.getItem('doctorId');

    const checkAuth = useCallback(() => {
        if (!token || storedUserRole !== 'doctor') {
            setError('Acceso denegado. Su sesión ha expirado o no está autorizado. Por favor, inicie sesión de nuevo.');
            localStorage.clear();
            navigate('/login');
            return false;
        }
        return true;
    }, [token, storedUserRole, navigate]);

    const fetchPatientAndMedicalHistory = useCallback(async () => {
        if (!checkAuth()) return;

        setLoading(true);
        setError('');
        setMessage('');

        try {
            const patientResponse = await axios.get(`${process.env.REACT_APP_BACKEND_URL}/api/medical-history/patient-profile/${patientId}`, {
                headers: { Authorization: `Bearer ${token}` }
            });
            setPatient(patientResponse.data);

            const historyResponse = await axios.get(`${process.env.REACT_APP_BACKEND_URL}/api/medical-history/patient/${patientId}`, {
                headers: { Authorization: `Bearer ${token}` }
            });

            const sortedHistory = historyResponse.data.sort((a, b) =>
                moment(b.createdAt || b.record_date).diff(moment(a.createdAt || a.record_date))
            );
            setMedicalHistory(sortedHistory);

            if (appointmentId) {
                console.log(`DEBUG (MedicalRecord): Fetching appointment details for ID: ${appointmentId}`);
                const appointmentDetailResponse = await axios.get(`${process.env.REACT_APP_BACKEND_URL}/api/appointments/${appointmentId}`, {
                    headers: { Authorization: `Bearer ${token}` }
                });
                setCurrentAppointment(appointmentDetailResponse.data);
                console.log('DEBUG (MedicalRecord): Detalles de la cita actual:', appointmentDetailResponse.data);
                // **NUEVO CONSOLE.LOG PARA DEPURAR EL ESTADO**
                console.log('DEBUG (MedicalRecord): ESTADO DE LA CITA ACTUAL:', appointmentDetailResponse.data.status);
            } else {
                setCurrentAppointment(null);
            }

        } catch (err) {
            console.error('Error al obtener historial médico o cita:', err);
            if (err.response && err.response.status === 401) {
                setError('Acceso denegado. Su sesión ha expirado o no está autorizado. Por favor, inicie sesión de nuevo.');
                localStorage.clear();
                navigate('/login');
            } else if (err.response && err.response.status === 404) {
                setError('Paciente o historial médico no encontrado.');
            } else {
                setError(`Error al cargar el historial médico: ${err.response?.data?.message || err.message}`);
            }
        } finally {
            setLoading(false);
        }
    }, [patientId, appointmentId, token, checkAuth, navigate]);

    const handleSaveObservation = async () => {
        if (!checkAuth()) return;
        if (!newObservation.trim()) {
            setMessage('La observación no puede estar vacía.');
            return;
        }

        setIsSaving(true);
        setError('');
        setMessage('');

        try {
            if (!currentDoctorId) {
                setError('ID del médico no disponible en la sesión. No se puede guardar la observación.');
                setIsSaving(false);
                return;
            }
            if (!patient || !patient.id) {
                setError('Información del paciente no cargada. No se puede guardar la observación.');
                setIsSaving(false);
                return;
            }

            await axios.post(`${process.env.REACT_APP_BACKEND_URL}/api/medical-history`, {
                patient_id: patient.id,
                doctor_id: parseInt(currentDoctorId, 10),
                appointment_id: appointmentId ? parseInt(appointmentId, 10) : null,
                observations: newObservation.trim(),
            }, {
                headers: { Authorization: `Bearer ${token}` }
            });

            setMessage('Observación guardada exitosamente.');
            setNewObservation('');

            if (appointmentId) {
                await axios.put(`${process.env.REACT_APP_BACKEND_URL}/api/appointments/${appointmentId}/status`,
                    { status: 'completed' },
                    { headers: { Authorization: `Bearer ${token}` } }
                );
                setMessage(prev => prev + ' Cita marcada como completada.');
            }

            fetchPatientAndMedicalHistory();

        } catch (err) {
            console.error('Error al guardar observación:', err);
            setError(`Error al guardar la observación: ${err.response?.data?.message || err.message}`);
        } finally {
            setIsSaving(false);
        }
    };

    useEffect(() => {
        if (patientId) {
            fetchPatientAndMedicalHistory();
        } else {
            setError('ID de paciente no proporcionado en la URL.');
            setLoading(false);
        }
    }, [patientId, fetchPatientAndMedicalHistory]);

    if (loading) {
        return (
            <div className="d-flex justify-content-center align-items-center vh-100">
                <div className="spinner-border text-primary" role="status">
                    <span className="visually-hidden">Cargando...</span>
                </div>
                <p className="ms-2">Cargando historial médico...</p>
            </div>
        );
    }

    if (error) {
        return (
            <div className="container mt-5">
                <div className="alert alert-danger">{error}</div>
                <button className="btn btn-secondary mt-3" onClick={() => navigate('/doctor-dashboard')}>Volver al Dashboard</button>
            </div>
        );
    }

    return (
        <div className="container mt-5">
            <div className="card shadow-lg border-0">
                <div className="card-header bg-success text-white text-center py-3">
                    <h2 className="mb-0">Historial Médico del Paciente</h2>
                </div>
                <div className="card-body p-4">
                    {patient && (
                        <div className="mb-4 p-3 border rounded bg-light">
                            <h4 className="text-primary">Paciente: {patient.full_name}</h4>
                            <p className="mb-1"><strong>Fecha de Nacimiento:</strong> {moment(patient.birth_date).format('DD/MM/YYYY')}</p>
                            <p className="mb-1"><strong>Contacto:</strong> {patient.phone} | {patient.email}</p>
                        </div>
                    )}

                    {/* Sección Condicional: Añadir Observación / Cita Completada */}
                    {!appointmentId || (currentAppointment && currentAppointment.status !== 'completed') ? (
                        <div className="mb-4">
                            <h3 className="mb-3 text-secondary">Añadir Nueva Observación</h3>
                            {message && <div className="alert alert-info">{message}</div>}
                            <textarea
                                className="form-control mb-3"
                                rows="5"
                                placeholder="Escribe aquí las observaciones, diagnóstico, tratamiento..."
                                value={newObservation}
                                onChange={(e) => setNewObservation(e.target.value)}
                                disabled={isSaving}
                            ></textarea>
                            <button
                                className="btn btn-primary"
                                onClick={handleSaveObservation}
                                disabled={isSaving || !newObservation.trim()}
                            >
                                {isSaving ? 'Guardando...' : 'Guardar Observación'}
                            </button>
                            {appointmentId && (
                                <button
                                    className="btn btn-outline-success ms-2"
                                    onClick={async () => {
                                        if (!window.confirm('¿Estás seguro de que quieres marcar esta cita como completada sin añadir una observación?')) {
                                            return;
                                        }
                                        setIsSaving(true);
                                        try {
                                            await axios.put(`${process.env.REACT_APP_BACKEND_URL}/api/appointments/${appointmentId}/status`,
                                                { status: 'completed' },
                                                { headers: { Authorization: `Bearer ${token}` } }
                                            );
                                            alert('Cita marcada como completada.');
                                            fetchPatientAndMedicalHistory(); // Re-fetch para actualizar el estado y ocultar la sección
                                        } catch (err) {
                                            console.error('Error al completar cita:', err);
                                            setError('Error al marcar la cita como completada: ' + (err.response?.data?.message || err.message));
                                        } finally {
                                            setIsSaving(false);
                                        }
                                    }}
                                    disabled={isSaving}
                                >
                                    <i className="bi bi-check-all me-1"></i> Marcar Cita como Completada
                                </button>
                            )}
                        </div>
                    ) : (
                        <div className="alert alert-success text-center mb-4">
                            <h3 className="mb-2">Cita Completada</h3>
                            <p>Esta cita ya ha sido marcada como completada. No se pueden añadir más observaciones o cambiar su estado.</p>
                            {currentAppointment && (
                                <p className="small text-muted">Estado actual: **{currentAppointment.status.toUpperCase()}**</p>
                            )}
                        </div>
                    )}


                    <h3 className="mb-3 text-secondary">Historial de Observaciones</h3>
                    {medicalHistory.length === 0 ? (
                        <div className="alert alert-warning text-center">
                            No hay observaciones previas para este paciente.
                        </div>
                    ) : (
                        <div className="list-group">
                            {medicalHistory.map((record) => (
                                <div key={record.id} className="list-group-item list-group-item-action flex-column align-items-start mb-3 shadow-sm">
                                    <div className="d-flex w-100 justify-content-between">
                                        <h5 className="mb-1 text-info">
                                            Consulta del {moment(record.createdAt || record.record_date).format('DD/MM/YYYY [a las] HH:mm')}
                                        </h5>
                                        <small className="text-muted">
                                            Dr. {record.Doctor?.full_name || 'Desconocido'}
                                        </small>
                                    </div>
                                    <p className="mb-1">{record.observations}</p>
                                    {record.appointment_id && (
                                        <small className="text-muted">
                                            Asociado a la cita ID: {record.appointment_id}
                                        </small>
                                    )}
                                </div>
                            ))}
                        </div>
                    )}
                </div>
                <div className="card-footer text-center py-3">
                    <button className="btn btn-secondary" onClick={() => navigate('/doctor-dashboard')}>Volver al Dashboard</button>
                </div>
            </div>
        </div>
    );
};

export default MedicalRecord;