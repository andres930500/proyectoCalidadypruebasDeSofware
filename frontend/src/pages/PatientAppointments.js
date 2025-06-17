// frontend/src/pages/PatientAppointments.js

import React, { useState, useEffect } from 'react';
import axios from 'axios';
import 'bootstrap/dist/css/bootstrap.min.css';
import { useNavigate } from 'react-router-dom';
import moment from 'moment'; // Asegúrate de instalar moment: npm install moment

const PatientAppointments = () => {
    const [appointments, setAppointments] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const navigate = useNavigate();

    // Estados para el modal de reprogramación
    const [isReprogramModalOpen, setIsReprogramModalOpen] = useState(false);
    const [selectedAppointmentToReprogram, setSelectedAppointmentToReprogram] = useState(null);
    const [newReprogramDate, setNewReprogramDate] = useState('');
    const [availableTimes, setAvailableTimes] = useState([]); // Para mostrar horarios disponibles del doctor
    const [newReprogramTime, setNewReprogramTime] = useState('');
    const [reprogramLoading, setReprogramLoading] = useState(false);
    const [reprogramError, setReprogramError] = useState('');

    const fetchAppointments = async () => {
        const token = localStorage.getItem('token');
        const userId = localStorage.getItem('userId'); // userId del paciente logueado

        if (!token || !userId) {
            setError('No se encontró información de autenticación. Por favor, inicie sesión.');
            setLoading(false);
            return;
        }

        try {
            const response = await axios.get(`${process.env.REACT_APP_BACKEND_URL}/api/appointments/patient/${userId}`, {
                headers: {
                    Authorization: `Bearer ${token}`
                }
            });

            // Ordenar citas por fecha y luego por hora (las más próximas primero)
            const sortedAppointments = response.data.sort((a, b) => {
                const dateTimeA = moment(`${a.appointment_date} ${a.appointment_time}`);
                const dateTimeB = moment(`${b.appointment_date} ${b.appointment_time}`);
                return dateTimeA - dateTimeB;
            });
            setAppointments(sortedAppointments);
        } catch (err) {
            console.error('Error fetching appointments:', err);
            setError('Error al cargar tus citas: ' + (err.response?.data?.message || err.message));
        } finally {
            setLoading(false);
        }
    };

    // Función para obtener los horarios disponibles de un doctor para una fecha específica
    const fetchAvailableTimes = async (doctorId, date) => {
        setReprogramLoading(true);
        setReprogramError('');
        const token = localStorage.getItem('token');
        try {
            const response = await axios.get(`${process.env.REACT_APP_BACKEND_URL}/api/availability/doctor/${doctorId}/date/${date}`, {
                headers: {
                    Authorization: `Bearer ${token}`
                }
            });
            
            const slots = response.data.flatMap(slot => {
                const start = moment(slot.start_time, 'HH:mm:ss');
                const end = moment(slot.end_time, 'HH:mm:ss');
                const duration = moment.duration(end.diff(start));
                const minutes = duration.asMinutes();

                const generatedSlots = [];
                for (let i = 0; i < minutes; i += 30) {
                    const currentSlotStart = start.clone().add(i, 'minutes');
                    const currentSlotEnd = currentSlotStart.clone().add(30, 'minutes');
                    
                    if (currentSlotEnd.isSameOrBefore(end)) {
                        generatedSlots.push({
                            startTime: currentSlotStart.format('HH:mm'),
                            endTime: currentSlotEnd.format('HH:mm'),
                            // isBooked: /* lógica para verificar si ya está ocupado */
                        });
                    }
                }
                return generatedSlots;
            });
            setAvailableTimes(slots);
        } catch (err) {
            console.error('Error fetching available times:', err);
            setReprogramError('Error al cargar horarios disponibles: ' + (err.response?.data?.message || err.message));
            setAvailableTimes([]);
        } finally {
            setReprogramLoading(false);
        }
    };

    useEffect(() => {
        fetchAppointments();
    }, []);

    // Se ejecuta cada vez que newReprogramDate o selectedAppointmentToReprogram cambian
    useEffect(() => {
        if (selectedAppointmentToReprogram && newReprogramDate) {
            fetchAvailableTimes(selectedAppointmentToReprogram.doctor_id, newReprogramDate);
        } else {
            setAvailableTimes([]); // Limpiar si no hay fecha o cita seleccionada
        }
    }, [newReprogramDate, selectedAppointmentToReprogram]);

    const handleCancelAppointment = async (appointmentId) => {
        if (!window.confirm('¿Estás seguro de que quieres cancelar esta cita?')) {
            return;
        }

        const token = localStorage.getItem('token');
        try {
            await axios.put(`${process.env.REACT_APP_BACKEND_URL}/api/appointments/${appointmentId}/status`,
                { status: 'cancelled' },
                {
                    headers: {
                        Authorization: `Bearer ${token}`
                    }
                }
            );
            alert('Cita cancelada exitosamente.');
            fetchAppointments(); // Recargar la lista de citas
        } catch (err) {
            console.error('Error canceling appointment:', err);
            setError('Error al cancelar la cita: ' + (err.response?.data?.message || err.message));
        }
    };

    const handleOpenReprogramModal = (appointment) => {
        setSelectedAppointmentToReprogram(appointment);
        setNewReprogramDate(''); // Limpiar la fecha al abrir el modal
        setNewReprogramTime(''); // Limpiar la hora al abrir el modal
        setAvailableTimes([]); // Limpiar horarios previos
        setReprogramError(''); // Limpiar errores previos
        setIsReprogramModalOpen(true);
    };

    const handleCloseReprogramModal = () => {
        setIsReprogramModalOpen(false);
        setSelectedAppointmentToReprogram(null);
        setNewReprogramDate('');
        setNewReprogramTime('');
        setAvailableTimes([]);
        setReprogramError('');
    };

    const handleReprogramAppointment = async () => {
        if (!selectedAppointmentToReprogram || !newReprogramDate || !newReprogramTime) {
            setReprogramError('Por favor, selecciona una nueva fecha y hora.');
            return;
        }

        const token = localStorage.getItem('token');
        setReprogramLoading(true);
        setReprogramError(''); // Limpiar errores antes de la llamada

        try {
            await axios.put(`${process.env.REACT_APP_BACKEND_URL}/api/appointments/${selectedAppointmentToReprogram.id}/reprogram`, 
                { 
                    new_appointment_date: newReprogramDate, 
                    new_appointment_time: newReprogramTime 
                }, 
                {
                    headers: { Authorization: `Bearer ${token}` }
                }
            );
            alert('Cita reprogramada exitosamente.');
            handleCloseReprogramModal(); // Cierra el modal
            fetchAppointments(); // Vuelve a cargar las citas
        } catch (err) {
            console.error('Error reprogramming appointment:', err);
            setReprogramError('Error al reprogramar la cita: ' + (err.response?.data?.message || 'Error desconocido.'));
        } finally {
            setReprogramLoading(false);
        }
    };

    if (loading) {
        return (
            <div className="container mt-5 text-center">
                <div className="spinner-border text-primary" role="status">
                    <span className="visually-hidden">Cargando...</span>
                </div>
                <p className="mt-2">Cargando tus citas...</p>
            </div>
        );
    }

    if (error) {
        return (
            <div className="container mt-5">
                <div className="alert alert-danger" role="alert">
                    {error}
                </div>
                <button className="btn btn-secondary mt-3" onClick={() => navigate('/patient-dashboard')}>Volver al Dashboard</button>
            </div>
        );
    }

    // ELIMINA O COMENTA ESTA LÍNEA SI QUIERES VER TODAS LAS CITAS, INCLUYENDO LAS 'reprogrammed'
    // const displayAppointments = appointments.filter(app => app.status !== 'reprogrammed');


    return (
        <div className="container mt-5">
            <div className="card shadow-lg border-0">
                <div className="card-header bg-primary text-white text-center py-3">
                    <h2>Mis Citas</h2>
                </div>
                <div className="card-body p-4">
                    {/* Usa 'appointments' directamente aquí, ya que ya no hay filtro */}
                    {appointments.length === 0 ? ( 
                        <div className="alert alert-info text-center" role="alert">
                            No tienes citas agendadas. <button className="btn btn-sm btn-info ms-2" onClick={() => navigate('/book-appointment')}>¡Agenda una ahora!</button>
                        </div>
                    ) : (
                        <div className="row row-cols-1 row-cols-md-2 g-4">
                            {/* Usa 'appointments' directamente aquí, ya que ya no hay filtro */}
                            {appointments.map((appointment) => ( 
                                <div key={appointment.id} className="col">
                                    <div className="card h-100 shadow-sm">
                                        <div className="card-body">
                                            <h5 className="card-title text-primary">Cita con Dr. {appointment.Doctor?.full_name || 'N/A'}</h5>
                                            <p className="card-text mb-1"><strong>Especialidad:</strong> {appointment.Doctor?.specialty || 'N/A'}</p>
                                            {/* Uso de optional chaining para mayor seguridad */}
                                            <p className="card-text mb-1"><strong>Fecha:</strong> {moment(appointment.appointment_date).format('DD/MM/YYYY') || 'N/A'}</p>
                                            <p className="card-text mb-1"><strong>Hora:</strong> {appointment.appointment_time || 'N/A'}</p>
                                            <p className="card-text mb-1"><strong>Estado:</strong>
                                                <span className={`badge bg-${
                                                    appointment.status === 'pending' ? 'warning text-dark' :
                                                    appointment.status === 'confirmed' ? 'success' :
                                                    appointment.status === 'reprogrammed' ? 'secondary' : // Color para 'reprogrammed'
                                                    appointment.status === 'canceled' ? 'danger' :
                                                    'info' // Default si no coincide
                                                } ms-2`}>
                                                    {appointment.status ? appointment.status.charAt(0).toUpperCase() + appointment.status.slice(1) : 'N/A'}
                                                </span>
                                            </p>
                                            {appointment.notes && <p className="card-text mb-1"><strong>Notas:</strong> {appointment.notes}</p>}
                                        </div>
                                        <div className="card-footer d-flex justify-content-end gap-2">
                                            {/* Solo permitir cancelar/reprogramar si la cita NO está 'canceled', 'completed' o 'reprogrammed' */}
                                            {appointment.status !== 'canceled' && appointment.status !== 'completed' && appointment.status !== 'reprogrammed' && (
                                                <>
                                                    <button
                                                        className="btn btn-outline-danger btn-sm"
                                                        onClick={() => handleCancelAppointment(appointment.id)}
                                                    >
                                                        Cancelar
                                                    </button>
                                                    <button
                                                        className="btn btn-outline-secondary btn-sm"
                                                        onClick={() => handleOpenReprogramModal(appointment)}
                                                    >
                                                        Reprogramar
                                                    </button>
                                                </>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
                <div className="card-footer text-center py-3">
                    <button className="btn btn-secondary" onClick={() => navigate('/patient-dashboard')}>Volver al Dashboard</button>
                </div>
            </div>

            {/* Modal de Reprogramación */}
            {isReprogramModalOpen && (
                <div className="modal show d-block" style={{ backgroundColor: 'rgba(0,0,0,0.5)' }} tabIndex="-1" role="dialog">
                    <div className="modal-dialog modal-dialog-centered" role="document">
                        <div className="modal-content">
                            <div className="modal-header bg-primary text-white">
                                <h5 className="modal-title">Reprogramar Cita con Dr. {selectedAppointmentToReprogram?.Doctor?.full_name || 'N/A'}</h5>
                                <button type="button" className="btn-close" aria-label="Close" onClick={handleCloseReprogramModal}></button>
                            </div>
                            <div className="modal-body">
                                <p>Cita actual: <strong>{moment(selectedAppointmentToReprogram?.appointment_date).format('DD/MM/YYYY') || 'N/A'}</strong> a las <strong>{selectedAppointmentToReprogram?.appointment_time || 'N/A'}</strong></p>
                                {reprogramError && <div className="alert alert-danger">{reprogramError}</div>}
                                <div className="mb-3">
                                    <label htmlFor="newDate" className="form-label">Nueva Fecha:</label>
                                    <input
                                        type="date"
                                        id="newDate"
                                        className="form-control"
                                        value={newReprogramDate}
                                        onChange={(e) => {
                                            setNewReprogramDate(e.target.value);
                                            setNewReprogramTime(''); // Limpiar la hora seleccionada al cambiar la fecha
                                        }}
                                        min={moment().format('YYYY-MM-DD')} // No permitir fechas pasadas
                                    />
                                </div>
                                <div className="mb-3">
                                    <label className="form-label">Horarios Disponibles para {moment(newReprogramDate).isValid() ? moment(newReprogramDate).format('DD/MM/YYYY') : 'la fecha seleccionada'}:</label>
                                    {reprogramLoading ? (
                                        <div className="text-center">Cargando horarios...</div>
                                    ) : availableTimes.length === 0 && newReprogramDate ? (
                                        <div className="alert alert-info text-center">No hay horarios disponibles para esta fecha.</div>
                                    ) : (
                                        <div className="d-flex flex-wrap gap-2">
                                            {availableTimes.map((slot, index) => (
                                                <button
                                                    key={index}
                                                    className={`btn btn-outline-info ${newReprogramTime === slot.startTime ? 'active' : ''}`}
                                                    onClick={() => setNewReprogramTime(slot.startTime)}
                                                    disabled={false} // Aquí podrías añadir lógica para deshabilitar si el slot está ocupado
                                                >
                                                    {slot.startTime} - {slot.endTime}
                                                </button>
                                            ))}
                                        </div>
                                    )}
                                </div>
                            </div>
                            <div className="modal-footer">
                                <button type="button" className="btn btn-secondary" onClick={handleCloseReprogramModal}>Cancelar</button>
                                <button
                                    type="button"
                                    className="btn btn-primary"
                                    onClick={handleReprogramAppointment}
                                    disabled={!newReprogramDate || !newReprogramTime || reprogramLoading}
                                >
                                    {reprogramLoading ? 'Reprogramando...' : 'Confirmar Reprogramación'}
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default PatientAppointments;