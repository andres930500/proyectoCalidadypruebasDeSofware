import React, { useState, useEffect, useCallback } from 'react';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';
import 'bootstrap/dist/css/bootstrap.min.css';
import 'bootstrap-icons/font/bootstrap-icons.css';
import moment from 'moment';

// --- FUNCIONES DE AYUDA ---
const timeToMinutes = (time) => {
    if (!time) return 0;
    const [hours, minutes] = time.split(':').map(Number);
    return hours * 60 + minutes;
};

const checkOverlap = (existingStart, existingEnd, newStart, newEnd) => {
    const existingStartMinutes = timeToMinutes(existingStart);
    const existingEndMinutes = timeToMinutes(existingEnd);
    const newStartMinutes = timeToMinutes(newStart);
    const newEndMinutes = timeToMinutes(newEnd);

    return !(newEndMinutes <= existingStartMinutes || newStartMinutes >= existingEndMinutes);
};

const DAY_NAMES = {
    0: 'Domingo', 1: 'Lunes', 2: 'Martes', 3: 'Miércoles',
    4: 'Jueves', 5: 'Viernes', 6: 'Sábado',
};
// --- FIN de Funciones de Ayuda ---

// --- COMPONENTE DOCTORDASHBOARD ---
export default function DoctorDashboard() {
    const [doctorId, setDoctorId] = useState(null);
    const [availability, setAvailability] = useState([]);
    const [appointments, setAppointments] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [message, setMessage] = useState('');

    // Estados para el formulario de añadir/editar disponibilidad
    const [newDate, setNewDate] = useState('');
    const [newStartTime, setNewStartTime] = useState('');
    const [newEndTime, setNewEndTime] = useState('');
    const [editingSlotId, setEditingSlotId] = useState(null);

    // Estados para el modal de eliminación de disponibilidad
    const [showDeleteModal, setShowDeleteModal] = useState(false);
    const [slotToDelete, setSlotToDelete] = useState(null);

    // --- ESTADOS PARA LOS FILTROS DE CITAS ---
    const [filterPatientId, setFilterPatientId] = useState('');
    const [filterStatus, setFilterStatus] = useState('');
    const [patientsList, setPatientsList] = useState([]);

    const navigate = useNavigate();

    const token = localStorage.getItem('token');
    const storedUserId = localStorage.getItem('userId');
    const storedUserRole = localStorage.getItem('userRole');
    const storedDoctorId = localStorage.getItem('doctorId');

    // --- FUNCIÓN fetchAvailability (usamos useCallback para optimización) ---
    const fetchAvailability = useCallback(async (id, authToken) => {
        setError('');
        setMessage('');
        try {
            if (!id) {
                setError('ID del médico no disponible para cargar la disponibilidad.');
                return;
            }

            const response = await axios.get(`${process.env.REACT_APP_BACKEND_URL}/api/availability/${id}`, {
                headers: {
                    Authorization: `Bearer ${authToken}`
                }
            });

            const normalizedAvailability = response.data.map(item => ({
                id: item.id,
                date: moment(item.date).format('YYYY-MM-DD'),
                day_of_week: item.day_of_week,
                start_time: item.start_time,
                end_time: item.end_time
            }));

            normalizedAvailability.sort((a, b) => {
                const dateA = moment(a.date + ' ' + a.start_time);
                const dateB = moment(b.date + ' ' + b.start_time);
                return dateA.diff(dateB);
            });

            setAvailability(normalizedAvailability);
            console.log('Disponibilidad obtenida:', normalizedAvailability);

        } catch (err) {
            console.error('Error al obtener disponibilidad:', err);
            if (err.response && err.response.status === 404) {
                setMessage('No se encontró disponibilidad para este médico.');
                setAvailability([]);
            } else if (err.response && err.response.status === 401) {
                setError('Acceso denegado. Su sesión ha expirado o no está autorizado. Por favor, inicie sesión de nuevo.');
                localStorage.clear();
                navigate('/login');
            } else {
                setError(`Error al obtener disponibilidad: ${err.response?.data?.message || 'Error desconocido'}`);
            }
        }
    }, [navigate]);

    // --- FUNCIÓN fetchAppointments para el doctor CON FILTROS (ahora es más "pura") ---
    const fetchAppointments = useCallback(async (id, authToken, patientIdParam = '', statusParam = '') => {
        setError('');
        setMessage('');
        try {
            if (!id) {
                setError('ID del médico no disponible para cargar las citas.');
                return;
            }

            let url = `${process.env.REACT_APP_BACKEND_URL}/api/appointments/doctor/${id}`;
            const params = new URLSearchParams();
            if (patientIdParam) { // Usar patientIdParam
                params.append('patientId', patientIdParam);
            }
            if (statusParam) { // Usar statusParam
                params.append('status', statusParam);
            }
            if (params.toString()) {
                url += `?${params.toString()}`;
            }

            const response = await axios.get(url, {
                headers: {
                    Authorization: `Bearer ${authToken}`
                }
            });

            const sortedAppointments = response.data.sort((a, b) => {
                const dateTimeA = moment(`${a.appointment_date} ${a.appointment_time}`);
                const dateTimeB = moment(`${b.appointment_date} ${b.appointment_time}`);
                return dateTimeA - dateTimeB;
            });

            setAppointments(sortedAppointments);
            console.log('Citas obtenidas con filtros:', sortedAppointments);

            // Extraer una lista única de pacientes de TODAS las citas para el filtro (no solo las filtradas)
            // Esto asegura que el dropdown de pacientes muestre todos los pacientes con citas,
            // no solo los que coinciden con el filtro de estado actual.
            // Para esto, podríamos necesitar una llamada adicional si el endpoint filtrado no devuelve *todos* los pacientes.
            // Una forma más robusta sería tener un endpoint dedicado para obtener todos los pacientes del doctor.
            // Pero, si el endpoint /api/appointments/doctor/:doctorId siempre devuelve las citas de TODOS los pacientes del doctor
            // y los filtros se aplican *después* de la recuperación, entonces esto funcionará.
            // Si el backend filtra los pacientes antes de devolverlos, esta lógica necesitaría un ajuste.
            const allPatients = [...new Map(response.data.map(item => [item.Patient?.id, item.Patient])).values()]
                .filter(patient => patient && patient.id)
                .sort((a, b) => a.full_name.localeCompare(b.full_name));
            setPatientsList(allPatients);

        } catch (err) {
            console.error('Error al obtener citas:', err);
            if (err.response && err.response.status === 404) {
                setMessage('No se encontraron citas para este médico con los filtros aplicados.');
                setAppointments([]);
                setPatientsList([]); // Limpiar la lista de pacientes si no hay citas
            } else if (err.response && err.response.status === 401) {
                setError('Acceso denegado. Su sesión ha expirado o no está autorizado. Por favor, inicie sesión de nuevo.');
                localStorage.clear();
                navigate('/login');
            } else {
                setError(`Error al obtener citas: ${err.response?.data?.message || 'Error desconocido'}`);
            }
        }
    }, [navigate]); // Dependencias: solo navigate, ya que los parámetros se pasan explícitamente


    // --- useEffect principal para la inicialización y carga de datos inicial ---
    useEffect(() => {
        setLoading(true);

        if (!token || !storedUserId || storedUserRole !== 'doctor') {
            setError('No está autenticado como médico o su sesión ha expirado. Redirigiendo a login.');
            localStorage.clear();
            navigate('/login');
            setLoading(false);
            return;
        }

        const doctorIdToUse = parseInt(storedDoctorId, 10);
        if (isNaN(doctorIdToUse) || doctorIdToUse <= 0) {
            setError('ID de médico no válido en localStorage. Redirigiendo a login.');
            localStorage.clear();
            navigate('/login');
            setLoading(false);
            return;
        }

        setDoctorId(doctorIdToUse);

        const loadInitialData = async () => {
            // Carga inicial de disponibilidad
            await fetchAvailability(doctorIdToUse, token);
            // Carga inicial de citas: SIN FILTROS
            await fetchAppointments(doctorIdToUse, token, '', '');
            setLoading(false);
        };
        loadInitialData();

    }, [token, storedUserId, storedUserRole, storedDoctorId, navigate, fetchAvailability, fetchAppointments]);
    // Las dependencias de useEffect ahora solo incluyen las funciones de fetch y variables de autenticación
    // NO incluye filterPatientId o filterStatus aquí, para que la carga inicial sea de todas las citas.


    // --- handlers para los cambios en los filtros ---
    const handleFilterPatientChange = (e) => {
        setFilterPatientId(e.target.value);
    };

    const handleFilterStatusChange = (e) => {
        setFilterStatus(e.target.value);
    };

    // --- FUNCIONES PARA APLICAR Y LIMPIAR FILTROS ---
    const handleApplyFilters = async () => {
        if (doctorId && token) {
            setLoading(true);
            // Llamar a fetchAppointments con los valores actuales de los estados de filtro
            await fetchAppointments(doctorId, token, filterPatientId, filterStatus);
            setLoading(false);
        } else {
            setError('No se pudo aplicar los filtros: ID de médico o token no disponible.');
        }
    };

    const handleClearFilters = async () => {
        setFilterPatientId(''); // Limpiar el estado del filtro de paciente
        setFilterStatus('');   // Limpiar el estado del filtro de estado

        // Inmediatamente llamar a fetchAppointments sin filtros
        if (doctorId && token) {
            setLoading(true);
            await fetchAppointments(doctorId, token, '', ''); // Cargar todas las citas de nuevo
            setLoading(false);
        } else {
            setError('No se pudo limpiar los filtros: ID de médico o token no disponible.');
        }
    };

    // --- FUNCIÓN handleSaveNewOrEditSlot (para disponibilidad) ---
    const handleSaveNewOrEditSlot = async () => {
        if (!token) {
            setError('No autenticado. Por favor, inicie sesión.');
            return;
        }

        if (!newDate || !newStartTime || !newEndTime) {
            setMessage('Por favor, complete todos los campos (Fecha, Inicio, Fin) para guardar el horario.');
            return;
        }

        const dateObj = new Date(newDate + 'T00:00:00');
        const dayNumber = dateObj.getDay();

        const [startH, startM] = newStartTime.split(':').map(Number);
        const [endH, endM] = newEndTime.split(':').map(Number);
        if (startH * 60 + startM >= endH * 60 + endM) {
            setMessage('La hora de fin debe ser posterior a la hora de inicio.');
            return;
        }

        const newOrEditedSlotData = {
            date: newDate,
            day_of_week: dayNumber,
            start_time: newStartTime,
            end_time: newEndTime
        };

        // Validación de superposición
        const overlapFound = availability.some(existingSlot => {
            // Excluir el propio slot si estamos editando
            if (editingSlotId && existingSlot.id === editingSlotId) {
                return false;
            }
            // Chequear superposición solo para la misma fecha
            if (existingSlot.date === newOrEditedSlotData.date) {
                return checkOverlap(existingSlot.start_time, existingSlot.end_time, newOrEditedSlotData.start_time, newOrEditedSlotData.end_time);
            }
            return false;
        });

        if (overlapFound) {
            setError('¡Error! Este horario se solapa con uno ya existente para la misma fecha.');
            setMessage(''); // Limpiar cualquier mensaje de éxito anterior
            return;
        }

        setLoading(true); // Iniciar carga para esta operación
        setError('');
        setMessage('');

        try {
            if (editingSlotId) {
                // Modo Edición: PUT a un slot específico
                await axios.put(`${process.env.REACT_APP_BACKEND_URL}/api/availability/${editingSlotId}`,
                    newOrEditedSlotData,
                    {
                        headers: {
                            Authorization: `Bearer ${token}`
                        }
                    }
                );
                setMessage('Horario actualizado exitosamente.');
            } else {
                // Modo Adición: POST para crear un nuevo slot
                await axios.post(`${process.env.REACT_APP_BACKEND_URL}/api/availability/`, {
                    availability: [newOrEditedSlotData], // Si el backend espera un array
                    doctorId: doctorId // Envía el doctorId explícitamente en el body si tu backend lo necesita para POST
                }, {
                    headers: {
                        Authorization: `Bearer ${token}`
                    }
                });
                setMessage('Nuevo horario añadido exitosamente.');
            }

            // Limpiar formulario y salir del modo edición
            setNewDate('');
            setNewStartTime('');
            setNewEndTime('');
            setEditingSlotId(null);

            // Recargar la disponibilidad después de un cambio exitoso
            if (doctorId && token) {
                fetchAvailability(doctorId, token);
            } else {
                setError('No se pudo recargar la disponibilidad: ID de médico o token no disponible.');
            }

        } catch (err) {
            console.error('Error al guardar/actualizar horario:', err);
            if (err.response && err.response.status === 401) {
                setError('Acceso denegado. Su sesión ha expirado o no está autorizado. Por favor, inicie sesión de nuevo.');
                localStorage.clear();
                navigate('/login');
            } else if (err.response && err.response.data && err.response.data.message) {
                setError(`Error al guardar/actualizar horario: ${err.response.data.message}`);
            } else {
                setError(`Error al guardar/actualizar horario: ${err.message || 'Error desconocido'}`);
            }
        } finally {
            setLoading(false); // Finalizar carga para esta operación
        }
    };

    // --- Función para cargar los datos en el formulario para edición (disponibilidad) ---
    const handleEditClick = (slotId) => {
        const slotToEdit = availability.find(slot => slot.id === slotId);
        if (slotToEdit) {
            setNewDate(slotToEdit.date);
            setNewStartTime(slotToEdit.start_time);
            setNewEndTime(slotToEdit.end_time);
            setEditingSlotId(slotId);
            setError('');
            setMessage('Modificando horario existente. No olvides guardar al finalizar.');
        }
    };

    // Función para cancelar la edición y limpiar el formulario (disponibilidad)
    const handleCancelEdit = () => {
        setNewDate('');
        setNewStartTime('');
        setNewEndTime('');
        setEditingSlotId(null);
        setError('');
        setMessage('');
    };

    // Función para manejar el clic en el botón de eliminar (abre modal) (disponibilidad)
    const handleDeleteClick = (slotId) => {
        setSlotToDelete(slotId);
        setShowDeleteModal(true);
    };

    // Función para confirmar la eliminación (se llama desde el modal) (disponibilidad)
    const confirmDeleteSlot = async () => {
        setShowDeleteModal(false); // Cerrar el modal
        if (!slotToDelete) return;

        if (!token) {
            setError('No autenticado. Por favor, inicie sesión.');
            return;
        }

        setLoading(true); // Iniciar carga para esta operación
        setError('');
        setMessage('');

        try {
            await axios.delete(`${process.env.REACT_APP_BACKEND_URL}/api/availability/${slotToDelete}`, {
                headers: {
                    Authorization: `Bearer ${token}`
                }
            });
            setMessage('Horario eliminado exitosamente de la base de datos.');
            // Recargar la disponibilidad después de la eliminación
            if (doctorId && token) {
                fetchAvailability(doctorId, token);
            } else {
                setError('No se pudo recargar la disponibilidad después de eliminar: ID de médico o token no disponible.');
            }
        } catch (err) {
            console.error('Error al eliminar horario:', err);
            if (err.response && err.response.status === 401) {
                setError('Acceso denegado. Su sesión ha expirado o no está autorizado. Por favor, inicie sesión de nuevo.');
                localStorage.clear();
                navigate('/login');
            } else {
                setError(`Error al eliminar el horario: ${err.response?.data?.message || 'Error desconocido'}`);
            }
        } finally {
            setLoading(false); // Finalizar carga para esta operación
            setSlotToDelete(null); // Limpiar el slot a eliminar
        }
    };


    // --- NUEVAS FUNCIONES PARA GESTIONAR CITAS ---
    const handleConfirmAppointment = async (appointmentId) => {
        if (!window.confirm('¿Estás seguro de que quieres confirmar esta cita?')) {
            return;
        }
        if (!token) {
            setError('No autenticado. Por favor, inicie sesión.');
            return;
        }

        setLoading(true);
        setError('');
        setMessage('');

        try {
            await axios.put(`${process.env.REACT_APP_BACKEND_URL}/api/appointments/${appointmentId}/status`,
                { status: 'confirmed' }, // Cambiar el estado a 'confirmed'
                { headers: { Authorization: `Bearer ${token}` } }
            );
            setMessage('Cita confirmada exitosamente.');
            // Recargar solo las citas del doctor con los filtros actuales
            if (doctorId && token) {
                fetchAppointments(doctorId, token, filterPatientId, filterStatus);
            }
        } catch (err) {
            console.error('Error al confirmar cita:', err);
            setError('Error al confirmar la cita: ' + (err.response?.data?.message || err.message));
        } finally {
            setLoading(false);
        }
    };

    const handleCancelAppointment = async (appointmentId) => {
        if (!window.confirm('¿Estás seguro de que quieres cancelar esta cita?')) {
            return;
        }
        if (!token) {
            setError('No autenticado. Por favor, inicie sesión.');
            return;
        }

        setLoading(true);
        setError('');
        setMessage('');

        try {
            await axios.put(`${process.env.REACT_APP_BACKEND_URL}/api/appointments/${appointmentId}/status`,
                { status: 'cancelled' }, // Cambiar el estado a 'canceled'
                { headers: { Authorization: `Bearer ${token}` } }
            );
            setMessage('Cita cancelada exitosamente.');
            // Recargar solo las citas del doctor con los filtros actuales
            if (doctorId && token) {
                fetchAppointments(doctorId, token, filterPatientId, filterStatus);
            }
        } catch (err) {
            console.error('Error al cancelar cita:', err);
            setError('Error al cancelar la cita: ' + (err.response?.data?.message || err.message));
        } finally {
            setLoading(false);
        }
    };

    // --- Renderizado del componente ---
    if (loading) {
        return (
            <div className="d-flex justify-content-center align-items-center vh-100">
                <div className="spinner-border text-primary" role="status">
                    <span className="visually-hidden">Cargando...</span>
                </div>
                <p className="ms-2">Cargando datos del médico...</p>
            </div>
        );
    }

    return (
        <div className="container mt-5">
            <h1 className="mb-4 text-center">Dashboard del Médico</h1>

            {error && <div className="alert alert-danger">{error}</div>}
            {message && <div className="alert alert-info">{message}</div>}

            {/* Sección de Gestión de Disponibilidad */}
            <div className="card mb-5 shadow-sm">
                <div className="card-header bg-primary text-white py-3">
                    <h2 className="h4 mb-0">Gestión de mi Disponibilidad</h2>
                </div>
                <div className="card-body p-4">
                    <div className="card mb-4 border-secondary">
                        <div className="card-header bg-secondary text-white">
                            {editingSlotId ? 'Modificar Horario Existente' : 'Añadir Nuevo Horario'}
                        </div>
                        <div className="card-body">
                            <div className="row g-3">
                                {/* Campo de Fecha */}
                                <div className="col-md-4">
                                    <label htmlFor="newDate" className="form-label">Fecha</label>
                                    <input
                                        type="date"
                                        id="newDate"
                                        className="form-control"
                                        value={newDate}
                                        onChange={(e) => setNewDate(e.target.value)}
                                        min={moment().format('YYYY-MM-DD')}
                                    />
                                </div>
                                {/* Campo de Hora de Inicio */}
                                <div className="col-md-4">
                                    <label htmlFor="startTime" className="form-label">Hora de Inicio</label>
                                    <input
                                        type="time"
                                        id="startTime"
                                        className="form-control"
                                        value={newStartTime}
                                        onChange={(e) => setNewStartTime(e.target.value)}
                                    />
                                </div>
                                {/* Campo de Hora de Fin */}
                                <div className="col-md-4">
                                    <label htmlFor="endTime" className="form-label">Hora de Fin</label>
                                    <input
                                        type="time"
                                        id="endTime"
                                        className="form-control"
                                        value={newEndTime}
                                        onChange={(e) => setNewEndTime(e.target.value)}
                                    />
                                </div>
                            </div>
                            <div className="mt-4 d-flex justify-content-end">
                                <button className={`btn ${editingSlotId ? 'btn-warning' : 'btn-success'} me-2`} onClick={handleSaveNewOrEditSlot} disabled={loading}>
                                    {editingSlotId ? 'Guardar Cambios' : 'Añadir Horario'}
                                </button>
                                {editingSlotId && (
                                    <button className="btn btn-secondary" onClick={handleCancelEdit} disabled={loading}>
                                        Cancelar Edición
                                    </button>
                                )}
                            </div>
                        </div>
                    </div>

                    <div className="card border-info">
                        <div className="card-header bg-info text-white">
                            Horarios Actuales
                        </div>
                        <div className="card-body">
                            {availability.length === 0 ? (
                                <p>No tienes disponibilidad registrada aún. Añade algunos horarios.</p>
                            ) : (
                                <ul className="list-group">
                                    {availability.map((slot) => (
                                        <li key={slot.id} className="list-group-item d-flex justify-content-between align-items-center">
                                            <span>
                                                <b>{moment(slot.date).format('DD/MM/YYYY')}</b> {slot.day_of_week !== null && `(${DAY_NAMES[slot.day_of_week]})`}: {slot.start_time} - {slot.end_time}
                                            </span>
                                            <div>
                                                <button
                                                    className="btn btn-info btn-sm me-2"
                                                    onClick={() => handleEditClick(slot.id)}
                                                    title="Editar este horario"
                                                    disabled={loading}
                                                >
                                                    <i className="bi bi-pencil"></i>
                                                    <span className="ms-1 d-none d-md-inline">Editar</span>
                                                </button>
                                                <button
                                                    className="btn btn-danger btn-sm"
                                                    onClick={() => handleDeleteClick(slot.id)}
                                                    title="Eliminar este horario"
                                                    disabled={loading}
                                                >
                                                    <i className="bi bi-trash"></i>
                                                    <span className="ms-1 d-none d-md-inline">Eliminar</span>
                                                </button>
                                            </div>
                                        </li>
                                    ))}
                                </ul>
                            )}
                        </div>
                    </div>
                </div>
            </div>

            {/* Sección de Mis Citas */}
            <div className="card shadow-sm">
                <div className="card-header bg-success text-white py-3">
                    <h2 className="h4 mb-0">Mis Citas</h2>
                </div>
                <div className="card-body p-4">
                    {/* --- FILTROS DE CITAS --- */}
                    <div className="row g-3 mb-4">
                        <div className="col-md-5">
                            <label htmlFor="filterPatient" className="form-label">Filtrar por Paciente:</label>
                            <select
                                id="filterPatient"
                                className="form-select"
                                value={filterPatientId}
                                onChange={handleFilterPatientChange}
                                disabled={loading}
                            >
                                <option value="">Todos los Pacientes</option>
                                {patientsList.map(patient => (
                                    <option key={patient.id} value={patient.id}>
                                        {patient.full_name}
                                    </option>
                                ))}
                            </select>
                        </div>
                        <div className="col-md-4">
                            <label htmlFor="filterStatus" className="form-label">Filtrar por Estado:</label>
                            <select
                                id="filterStatus"
                                className="form-select"
                                value={filterStatus}
                                onChange={handleFilterStatusChange}
                                disabled={loading}
                            >
                                <option value="">Todos los Estados</option>
                                <option value="pending">Pendiente</option>
                                <option value="confirmed">Confirmada</option>
                                <option value="canceled">Cancelada</option>
                                <option value="completed">Completada</option>
                            </select>
                        </div>
                        <div className="col-md-3 d-flex align-items-end">
                            <button
                                className="btn btn-primary me-2"
                                onClick={handleApplyFilters}
                                disabled={loading}
                            >
                                <i className="bi bi-funnel me-1"></i> Aplicar Filtros
                            </button>
                            <button
                                className="btn btn-outline-secondary"
                                onClick={handleClearFilters}
                                disabled={loading}
                            >
                                <i className="bi bi-x-circle me-1"></i> Limpiar Filtros
                            </button>
                        </div>
                    </div>
                    {/* --- FIN FILTROS DE CITAS --- */}

                    {appointments.length === 0 ? (
                        <div className="alert alert-info text-center" role="alert">
                            No tienes citas agendadas en este momento con los filtros seleccionados.
                        </div>
                    ) : (
                        <div className="row row-cols-1 g-3">
                            {appointments.map((appointment) => (
                                <div key={appointment.id} className="col">
                                    <div className="card h-100 shadow-sm">
                                        <div className="card-body">
                                            <h5 className="card-title text-success">Cita con {appointment.Patient?.full_name || 'Paciente Desconocido'}</h5>
                                            <p className="card-text mb-1"><strong>Fecha:</strong> {moment(appointment.appointment_date).format('DD/MM/YYYY')}</p>
                                            <p className="card-text mb-1"><strong>Hora:</strong> {appointment.appointment_time}</p>
                                            <p className="card-text mb-1"><strong>Estado:</strong>
                                                <span className={`badge bg-${
                                                    appointment.status === 'pending' ? 'warning text-dark' :
                                                    appointment.status === 'confirmed' ? 'success' :
                                                    appointment.status === 'canceled' ? 'danger' :
                                                    appointment.status === 'completed' ? 'primary' :
                                                    'info'
                                                } ms-2`}>
                                                    {appointment.status ? appointment.status.charAt(0).toUpperCase() + appointment.status.slice(1) : 'N/A'}
                                                </span>
                                            </p>
                                            {appointment.notes && <p className="card-text mb-1"><strong>Notas del paciente:</strong> {appointment.notes}</p>}
                                        </div>
                                        <div className="card-footer d-flex justify-content-end gap-2">
                                            {/* Botones de acción basados en el estado de la cita */}
                                            {appointment.status === 'pending' && (
                                                <>
                                                    <button
                                                        className="btn btn-success btn-sm"
                                                        onClick={() => handleConfirmAppointment(appointment.id)}
                                                        disabled={loading}
                                                    >
                                                        <i className="bi bi-check-circle me-1"></i> Confirmar
                                                    </button>
                                                    <button
                                                        className="btn btn-danger btn-sm"
                                                        onClick={() => handleCancelAppointment(appointment.id)}
                                                        disabled={loading}
                                                    >
                                                        <i className="bi bi-x-circle me-1"></i> Cancelar
                                                    </button>
                                                </>
                                            )}
                                            {/* Opciones para citas confirmadas o completadas, incluyendo el enlace al historial médico */}
                                            {(appointment.status === 'confirmed' || appointment.status === 'completed') && (
                                                <button
                                                    className="btn btn-primary btn-sm"
                                                    onClick={() => navigate(`/doctor/medical-record/${appointment.Patient.id}/${appointment.id}`)}
                                                    disabled={loading}
                                                >
                                                    <i className="bi bi-journal-medical me-1"></i> Ver/Registrar Historial
                                                </button>
                                            )}
                                            {/* Si la cita está cancelada, no hay acciones activas aquí, solo visualización */}
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            </div>

            {/* Modal de confirmación de eliminación (disponibilidad) */}
            {showDeleteModal && (
                <div
                    className="modal fade show"
                    style={{ display: 'block', backgroundColor: 'rgba(0,0,0,0.5)' }}
                    tabIndex="-1"
                    aria-labelledby="deleteModalLabel"
                    aria-hidden="true"
                >
                    <div className="modal-dialog modal-dialog-centered">
                        <div className="modal-content">
                            <div className="modal-header bg-danger text-white">
                                <h5 className="modal-title" id="deleteModalLabel">Confirmar Eliminación</h5>
                                <button
                                    type="button"
                                    className="btn-close btn-close-white"
                                    aria-label="Close"
                                    onClick={() => setShowDeleteModal(false)}
                                ></button>
                            </div>
                            <div className="modal-body">
                                <p>¿Estás seguro de que deseas eliminar este horario permanentemente?</p>
                                <p className="text-muted small">Esta acción no se puede deshacer.</p>
                            </div>
                            <div className="modal-footer">
                                <button
                                    type="button"
                                    className="btn btn-secondary"
                                    onClick={() => setShowDeleteModal(false)}
                                    disabled={loading}
                                >
                                    No
                                </button>
                                <button
                                    type="button"
                                    className="btn btn-danger"
                                    onClick={confirmDeleteSlot}
                                    disabled={loading}
                                >
                                    Sí, Eliminar
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}