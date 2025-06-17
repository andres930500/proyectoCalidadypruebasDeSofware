import React, { useState, useEffect } from 'react';
import axios from 'axios';
import 'bootstrap/dist/css/bootstrap.min.css';
import DatePicker from 'react-datepicker';
import 'react-datepicker/dist/react-datepicker.css';
import { useNavigate } from 'react-router-dom';

const BookAppointment = () => {
    const [doctors, setDoctors] = useState([]);
    const [selectedDoctor, setSelectedDoctor] = useState(null);
    const [specialtyFilter, setSpecialtyFilter] = useState('');
    const [doctorSearchTerm, setDoctorSearchTerm] = useState('');
    const [doctorAvailabilities, setDoctorAvailabilities] = useState([]); // Disponibilidades crudas del backend
    const [selectedDate, setSelectedDate] = useState(null);
    const [selectedTimeSlot, setSelectedTimeSlot] = useState(null); // Objeto {start: "HH:MM", end: "HH:MM", availabilityId: N}
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [message, setMessage] = useState('');

    const navigate = useNavigate();
    
    // Obtenemos el userId del paciente logueado. Este es el `user_id` de la tabla `users`.
    // El backend lo usará para encontrar el `patient_id` de la tabla `patients`.
    // Es CRÍTICO que tu backend use `req.user.userId` (del token) para identificar al paciente
    // y no dependa de un `patient_id` enviado en el body, por seguridad.
    const patientUserId = localStorage.getItem('userId'); 
    const patientUserRole = localStorage.getItem('userRole'); // Para validación frontend

    useEffect(() => {
        // Validación temprana: si no es paciente o no está autenticado, redirigir
        if (!localStorage.getItem('token') || patientUserRole !== 'paciente') {
            setError('Debe iniciar sesión como paciente para agendar una cita.');
            console.warn('DEBUG (BookAppointment - useEffect Init): Usuario no autenticado o no es paciente. Redirigiendo a /login.');
            setTimeout(() => navigate('/login', { replace: true }), 1500);
            return;
        }
        fetchDoctors();
    }, [navigate, patientUserRole]); // Dependencias para que se ejecute si cambian

    const fetchDoctors = async () => {
        setLoading(true);
        setError('');
        setMessage(''); // Limpiar mensajes previos
        console.log('DEBUG (BookAppointment - fetchDoctors): Iniciando carga de doctores...');
        try {
            const token = localStorage.getItem('token');
            if (!token) {
                setError('No autorizado. Token no encontrado.');
                console.error('DEBUG (BookAppointment - fetchDoctors): Token no encontrado en localStorage.');
                navigate('/login');
                return;
            }

            // Endpoint para obtener todos los doctores
            // Asegúrate que tu backend tenga esta ruta protegida y que devuelva los datos del doctor (full_name, specialty, id)
            const response = await axios.get(`${process.env.REACT_APP_BACKEND_URL}/api/doctor`, { 
                headers: { Authorization: `Bearer ${token}` }
            });
            setDoctors(response.data);
            console.log('DEBUG (BookAppointment - fetchDoctors): Doctores cargados:', response.data);
            if (response.data.length === 0) {
                setMessage('No se encontraron doctores para agendar citas.');
            }
        } catch (err) {
            console.error('DEBUG (BookAppointment - fetchDoctors): Error fetching doctors:', err.response?.data || err.message);
            let errorMessage = 'Error al cargar la lista de doctores.';
            if (err.response) {
                if (err.response.status === 401) {
                    errorMessage = 'Sesión expirada o no autorizado. Por favor, inicie sesión de nuevo.';
                    navigate('/login', { replace: true });
                } else if (err.response.status === 403) {
                    errorMessage = 'Acceso denegado. No tiene permisos para ver doctores.';
                } else if (err.response.status === 404) {
                    errorMessage = 'La ruta para obtener doctores no fue encontrada en el servidor. (Verifique el endpoint /api/doctor)';
                } else {
                    errorMessage = `Error del servidor al cargar doctores: ${err.response.data.message || err.response.status}`;
                }
            } else if (err.request) {
                errorMessage = 'No se pudo conectar con el servidor para obtener doctores. Verifique la conexión.';
            }
            setError(errorMessage);
        } finally {
            setLoading(false);
        }
    };

    const handleDoctorSearch = (e) => {
        setDoctorSearchTerm(e.target.value);
    };

    const handleSpecialtyFilter = (e) => {
        setSpecialtyFilter(e.target.value);
    };

    const filteredDoctors = doctors.filter(doctor => {
        const matchesSpecialty = specialtyFilter ? doctor.specialty?.toLowerCase().includes(specialtyFilter.toLowerCase()) : true;
        const matchesSearchTerm = doctorSearchTerm ?
            (doctor.full_name?.toLowerCase().includes(doctorSearchTerm.toLowerCase()) ||
            doctor.specialty?.toLowerCase().includes(doctorSearchTerm.toLowerCase()) ||
            doctor.document_number?.includes(doctorSearchTerm)) // Búsqueda por documento también
            : true;
        return matchesSpecialty && matchesSearchTerm;
    });

    const handleSelectDoctor = async (doctor) => {
        console.log('DEBUG (BookAppointment - handleSelectDoctor): Doctor seleccionado:', doctor);
        setSelectedDoctor(doctor);
        // Cuando se selecciona un doctor, resetear la disponibilidad y la fecha/hora
        setDoctorAvailabilities([]);
        setSelectedDate(null);
        setSelectedTimeSlot(null);
        setMessage('');
        setError('');
        // No cargar disponibilidad hasta que se seleccione una fecha
    };

    // Función para cargar la disponibilidad del doctor para la fecha seleccionada
    const fetchDoctorAvailability = async (date) => {
        if (!selectedDoctor || !date) {
            console.log('DEBUG (BookAppointment - fetchDoctorAvailability): Falta doctor o fecha para cargar disponibilidad.');
            return;
        }

        setLoading(true);
        setError('');
        setMessage('');
        const token = localStorage.getItem('token');
        if (!token) {
            setError('No autorizado. Token no encontrado.');
            console.error('DEBUG (BookAppointment - fetchDoctorAvailability): Token no encontrado para cargar disponibilidad.');
            navigate('/login', { replace: true });
            return;
        }

        try {
            const formattedDate = date.toISOString().split('T')[0]; // Formato YYYY-MM-DD
            console.log(`DEBUG (BookAppointment - fetchDoctorAvailability): Cargando disponibilidad para Dr. ${selectedDoctor.id} en fecha: ${formattedDate}`);
            
            // Endpoint para obtener la disponibilidad del doctor para una fecha específica
            // Asegúrate que tu backend tenga esta ruta protegida y que devuelva objetos con start_time y end_time
            const response = await axios.get(`${process.env.REACT_APP_BACKEND_URL}/api/availability/${selectedDoctor.id}?date=${formattedDate}`, {
                headers: { Authorization: `Bearer ${token}` }
            });
            setDoctorAvailabilities(response.data);
            console.log('DEBUG (BookAppointment - fetchDoctorAvailability): Disponibilidad recibida:', response.data);
            if (response.data.length === 0) {
                setMessage('No hay disponibilidad registrada para el doctor seleccionado en esta fecha.');
            } else {
                setMessage(''); // Limpiar mensaje si hay disponibilidad
            }
        } catch (err) {
            console.error('DEBUG (BookAppointment - fetchDoctorAvailability): Error fetching doctor availability:', err.response?.data || err.message);
            setError('Error al cargar la disponibilidad del doctor: ' + (err.response?.data?.message || err.message));
            setDoctorAvailabilities([]);
        } finally {
            setLoading(false);
        }
    };

    // Manejador de cambio de fecha en el DatePicker
    const handleDateChange = (date) => {
        console.log('DEBUG (BookAppointment - handleDateChange): Fecha seleccionada:', date);
        setSelectedDate(date);
        setSelectedTimeSlot(null); // Resetear el slot de tiempo al cambiar la fecha
        if (date) {
            fetchDoctorAvailability(date);
        } else {
            setDoctorAvailabilities([]);
            setMessage('');
        }
    };

    // Genera slots de 30 minutos a partir de la disponibilidad del doctor
    // Asegúrate de que tu backend NO devuelve citas ya tomadas aquí, solo los rangos disponibles
    const generateTimeSlots = () => {
        const slots = [];
        doctorAvailabilities.forEach(availability => {
            const [startHour, startMinute] = availability.start_time.split(':').map(Number);
            const [endHour, endMinute] = availability.end_time.split(':').map(Number);

            let currentHour = startHour;
            let currentMinute = startMinute;

            while (currentHour * 60 + currentMinute < endHour * 60 + endMinute) {
                const slotStart = `${String(currentHour).padStart(2, '0')}:${String(currentMinute).padStart(2, '0')}`;
                
                let nextHour = currentHour;
                let nextMinute = currentMinute + 30; // Citas de 30 minutos

                if (nextMinute >= 60) {
                    nextMinute -= 60;
                    nextHour += 1;
                }

                const slotEnd = `${String(nextHour).padStart(2, '0')}:${String(nextMinute).padStart(2, '0')}`;
                
                // Solo agregar si el slot propuesto no excede el end_time de la disponibilidad
                if (nextHour * 60 + nextMinute <= endHour * 60 + endMinute) {
                    slots.push({
                        start: slotStart,
                        end: slotEnd,
                        availabilityId: availability.id // Útil si necesitas referenciar la disponibilidad original
                    });
                }
                
                currentHour = nextHour;
                currentMinute = nextMinute;
            }
        });
        // Filtrar aquí si el backend no lo hace: eliminar slots ya ocupados por otras citas
        // Esto requeriría una llamada adicional o que el backend los excluya directamente.
        // Por ahora, asumimos que doctorAvailabilities ya excluye los slots ocupados.

        return slots.sort((a,b) => a.start.localeCompare(b.start));
    };

    const handleTimeSlotSelect = (slot) => {
        console.log('DEBUG (BookAppointment - handleTimeSlotSelect): Slot de tiempo seleccionado:', slot);
        setSelectedTimeSlot(slot);
        setMessage('');
    };

    const handleBookAppointment = async () => {
        console.log('DEBUG (BookAppointment - handleBookAppointment): Intentando agendar cita...');
        console.log('DEBUG (BookAppointment - handleBookAppointment): current patientUserId:', patientUserId);
        console.log('DEBUG (BookAppointment - handleBookAppointment): selectedDoctor:', selectedDoctor);
        console.log('DEBUG (BookAppointment - handleBookAppointment): selectedDate:', selectedDate);
        console.log('DEBUG (BookAppointment - handleBookAppointment): selectedTimeSlot:', selectedTimeSlot);


        if (!selectedDoctor || !selectedDate || !selectedTimeSlot || !patientUserId) {
            setError('Por favor, seleccione un doctor, una fecha y un horario. Asegúrese de estar logueado.');
            console.error('DEBUG (BookAppointment - handleBookAppointment): Faltan datos para agendar la cita.');
            return;
        }

        setLoading(true);
        setError('');
        setMessage('');

        try {
            const token = localStorage.getItem('token');
            if (!token) {
                setError('No autorizado. Token no encontrado.');
                console.error('DEBUG (BookAppointment - handleBookAppointment): Token no encontrado.');
                navigate('/login', { replace: true });
                return;
            }

            const appointmentData = {
                doctor_id: selectedDoctor.id,
                // NO incluyas patient_id aquí si tu backend lo extrae del token por seguridad.
                // Si tu backend SÍ lo espera en el body, asegúrate que 'patientUserId' es el 'patient_id' de la tabla 'patients',
                // y no el 'user_id' de la tabla 'users'. Esto es un punto común de error.
                // Asumiendo que el backend extraerá el patient_id del token y lo usará.
                // patient_id: patientUserId, // <<--- Mantenlo comentado a menos que tu backend lo requiera explícitamente y lo sepa manejar.
                appointment_date: selectedDate.toISOString().split('T')[0], // YYYY-MM-DD
                appointment_time: selectedTimeSlot.start, // HH:MM
                notes: "Cita agendada por el paciente." // Puedes añadir un campo para que el paciente escriba notas
                // Opcional: availability_id: selectedTimeSlot.availabilityId (si tu backend lo necesita para marcar como ocupado)
            };

            console.log('DEBUG (BookAppointment - handleBookAppointment): Datos de la cita a enviar:', appointmentData);

            // Endpoint para agendar la cita
            // Asegúrate que tu backend tenga esta ruta protegida con authenticateToken y authorizeRoles(['paciente'])
            const response = await axios.post(`${process.env.REACT_APP_BACKEND_URL}/api/appointments`, appointmentData, {
                headers: { Authorization: `Bearer ${token}` }
            });
            setMessage(response.data.message || 'Cita agendada exitosamente. Estado: Pendiente de confirmación.');
            console.log('DEBUG (BookAppointment - handleBookAppointment): Cita agendada exitosamente:', response.data);

            // Resetear formulario
            setSelectedDoctor(null);
            setSelectedDate(null);
            setSelectedTimeSlot(null);
            setDoctorAvailabilities([]);
            setSpecialtyFilter('');
            setDoctorSearchTerm('');
            // Opcional: navegar de vuelta al dashboard o a una página de confirmación
            // navigate('/patient-dashboard');

        } catch (err) {
            console.error('DEBUG (BookAppointment - handleBookAppointment): Error booking appointment:', err);
            // Mensaje de error más descriptivo
            let errorMessage = 'Error al agendar la cita: ';
            if (err.response) {
                console.error('DEBUG (BookAppointment - handleBookAppointment): Error response:', err.response.data);
                if (err.response.status === 401) {
                    errorMessage += 'Sesión expirada o no autorizado. Por favor, inicie sesión de nuevo.';
                    localStorage.clear(); // Limpia el token inválido
                    setTimeout(() => navigate('/login', { replace: true }), 1500);
                } else if (err.response.status === 403) {
                    errorMessage += 'Acceso denegado. No tienes permisos para agendar citas.';
                } else if (err.response.status === 400) {
                    errorMessage += `Datos incompletos o inválidos: ${err.response.data.message || 'Verifica la información.'}`;
                } else if (err.response.status === 409) { // Conflicto: ej. hora ya reservada
                    errorMessage += `Conflicto: ${err.response.data.message || 'Esa hora ya está reservada.'}`;
                } else {
                    errorMessage += `Error del servidor: ${err.response.data.message || err.response.status}`;
                }
            } else if (err.request) {
                errorMessage += 'No se pudo conectar con el servidor. Verifique la conexión.';
            } else {
                errorMessage += err.message;
            }
            setError(errorMessage);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="container mt-5">
            <div className="card shadow-lg border-0">
                <div className="card-header bg-info text-white text-center py-3">
                    <h2>Agendar Nueva Cita</h2>
                </div>
                <div className="card-body p-4">
                    {error && <div className="alert alert-danger">{error}</div>}
                    {message && <div className="alert alert-success">{message}</div>}

                    {/* Paso 1: Seleccionar Doctor */}
                    {!selectedDoctor ? (
                        <>
                            <h4 className="card-title text-info mb-3">Paso 1: Selecciona un Médico</h4>
                            <div className="mb-3">
                                <input
                                    type="text"
                                    className="form-control"
                                    placeholder="Buscar médico por nombre, especialidad o documento..."
                                    value={doctorSearchTerm}
                                    onChange={handleDoctorSearch}
                                />
                            </div>
                            <div className="mb-3">
                                <select
                                    className="form-select"
                                    value={specialtyFilter}
                                    onChange={handleSpecialtyFilter}
                                >
                                    <option value="">Filtrar por Especialidad</option>
                                    {/* Estas opciones deberían idealmente cargarse desde una API de especialidades */}
                                    <option value="cardiologia">Cardiología</option>
                                    <option value="dermatologia">Dermatología</option>
                                    <option value="pediatria">Pediatría</option>
                                    <option value="general">Medicina General</option>
                                    {/* ...otras especialidades */}
                                </select>
                            </div>

                            {loading && <p>Cargando doctores...</p>}
                            {!loading && filteredDoctors.length === 0 && !error && <p>No se encontraron doctores con los criterios de búsqueda.</p>}

                            <ul className="list-group">
                                {filteredDoctors.map(doctor => (
                                    <li
                                        key={doctor.id}
                                        className="list-group-item d-flex justify-content-between align-items-center"
                                    >
                                        <div>
                                            <strong>{doctor.full_name}</strong> - {doctor.specialty} <br/>
                                            <small className="text-muted">Documento: {doctor.document_number}</small>
                                        </div>
                                        <button
                                            className="btn btn-sm btn-primary"
                                            onClick={() => handleSelectDoctor(doctor)}
                                        >
                                            Seleccionar
                                        </button>
                                    </li>
                                ))}
                            </ul>
                            <div className="card-footer text-center py-3">
                    <button className="btn btn-secondary" onClick={() => navigate('/patient-dashboard')}>Volver al Dashboard</button>
                </div>
                        </>
                    ) : (
                        <>
                            <h4 className="card-title text-info mb-3">Paso 2: Agendar Cita con Dr. {selectedDoctor.full_name} ({selectedDoctor.specialty})</h4>
                            <button className="btn btn-secondary btn-sm mb-3" onClick={() => setSelectedDoctor(null)}>
                                Cambiar Médico
                            </button>

                            {/* Paso 2a: Seleccionar Fecha */}
                            <div className="mb-3">
                                <label className="form-label">Selecciona la Fecha:</label>
                                <DatePicker
                                    selected={selectedDate}
                                    onChange={handleDateChange}
                                    dateFormat="yyyy/MM/dd"
                                    minDate={new Date()} // No permitir fechas pasadas
                                    className="form-control"
                                    placeholderText="Haz clic para seleccionar una fecha"
                                />
                            </div>

                            {/* Paso 2b: Seleccionar Horario (solo si hay fecha seleccionada y disponibilidad) */}
                            {selectedDate && (
                                <div className="mb-3">
                                    <label className="form-label">Horarios Disponibles ({selectedDate.toLocaleDateString()}):</label>
                                    {loading && <p>Cargando disponibilidad...</p>}
                                    {!loading && doctorAvailabilities.length === 0 && !message && <p>No hay disponibilidad registrada para el doctor en esta fecha.</p>}
                                    {!loading && message && <div className="alert alert-info">{message}</div>}

                                    <div className="d-flex flex-wrap gap-2">
                                        {generateTimeSlots().length > 0 ? (
                                            generateTimeSlots().map((slot, index) => (
                                                <button
                                                    key={index}
                                                    className={`btn ${selectedTimeSlot?.start === slot.start ? 'btn-success' : 'btn-outline-success'}`}
                                                    onClick={() => handleTimeSlotSelect(slot)}
                                                >
                                                    {slot.start} - {slot.end}
                                                </button>
                                            ))
                                        ) : (
                                            !loading && doctorAvailabilities.length > 0 && ( // Si hay availabilities pero no se generan slots
                                                <p className="text-muted">No se pudieron generar slots de 30 minutos desde la disponibilidad del doctor para esta fecha.</p>
                                            )
                                        )}
                                    </div>
                                </div>
                            )}

                            {/* Paso 3: Confirmar Cita */}
                            {selectedDoctor && selectedDate && selectedTimeSlot && (
                                <div className="mt-4 text-center">
                                    <p className="fs-5">
                                        Confirmar cita con <strong>Dr. {selectedDoctor.full_name}</strong>
                                         el <strong>{selectedDate.toLocaleDateString('es-ES', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}</strong> a las <strong>{selectedTimeSlot.start}</strong>.
                                    </p>
                                    <button
                                        className="btn btn-primary btn-lg"
                                        onClick={handleBookAppointment}
                                        disabled={loading}
                                    >
                                        {loading ? 'Agendando...' : 'Confirmar Cita'}
                                    </button>
                                </div>
                            )}

                            <div className="mt-4">
                                <button className="btn btn-outline-secondary" onClick={() => navigate('/patient-dashboard')}>
                                    Volver al Dashboard
                                </button>
                            </div>
                        </>
                    )}
                </div>
            </div>
        </div>
    );
};

export default BookAppointment;