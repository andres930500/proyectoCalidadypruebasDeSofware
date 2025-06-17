// frontend/src/components/AdminGlobalAppointments.js

import React, { useState, useEffect } from 'react';
import api from '../utils/api'; // Tu instancia de Axios configurada
// import 'bootstrap/dist/css/bootstrap.min.css'; // Ya importado en index.js o App.js

export default function AdminGlobalAppointments() {
    const [appointments, setAppointments] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');

    useEffect(() => {
        const fetchAppointments = async () => {
            try {
                setLoading(true);
                setError(''); // Limpiar errores previos
                const response = await api.get('/admin/appointments/global');
                setAppointments(response.data);
                setLoading(false);
            } catch (err) {
                console.error('Error al cargar la agenda global:', err);
                setError('Error al cargar la agenda global.');
                setLoading(false);
            }
        };

        fetchAppointments();
    }, []);

    if (loading) {
        return <div className="text-center mt-4">Cargando agenda global...</div>;
    }

    if (error) {
        return <div className="alert alert-danger mt-4">{error}</div>;
    }

    return (
        <div className="mt-4">
            <h5 className="mb-3">Agenda Global de Citas</h5>
            {appointments.length === 0 ? (
                <p>No hay citas registradas en el sistema.</p>
            ) : (
                <div className="table-responsive">
                    <table className="table table-striped table-hover">
                        <thead>
                            <tr>
                                <th>ID Cita</th>
                                <th>Paciente</th>
                                <th>Email Paciente</th>
                                <th>Médico</th>
                                <th>Especialidad Médico</th>
                                <th>Email Médico</th>
                                <th>Fecha</th>
                                <th>Hora</th>
                                <th>Estado</th>
                                <th>Notas</th>
                                <th>Creada En</th>
                            </tr>
                        </thead>
                        <tbody>
                            {appointments.map(appt => (
                                <tr key={appt.id}>
                                    <td>{appt.id}</td>
                                    <td>{appt.patientName}</td>
                                    <td>{appt.patientEmail}</td>
                                    <td>{appt.doctorName}</td>
                                    <td>{appt.doctorSpecialty}</td>
                                    <td>{appt.doctorEmail}</td>
                                    <td>{new Date(appt.date).toLocaleDateString()}</td>
                                    <td>{appt.time}</td>
                                    <td>{appt.status}</td>
                                    <td>{appt.notes || 'N/A'}</td>
                                    <td>{new Date(appt.createdAt).toLocaleString()}</td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            )}
        </div>
    );
}