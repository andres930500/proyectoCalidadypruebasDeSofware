// frontend/src/components/AdminUsersManagement.jsx
import React, { useState, useEffect } from 'react';
import api from '../utils/api';
import 'bootstrap-icons/font/bootstrap-icons.css'; // Asegúrate de tener los iconos de Bootstrap instalados

export default function AdminUsersManagement() {
    // Estados para el formulario de nuevo usuario
    const [newUserData, setNewUserData] = useState({
        username: '',
        email: '',
        password: '',
        full_name: '',
        role: 'doctor', // Default role
        phone: '',
        // Campos específicos para Doctor
        specialty: '',
        license_number: '',
        last_name: '', // Apellidos del doctor
        identification_number: '', // Cédula del doctor
        // Campos específicos para Paciente
        birth_date: '',
        address: '',
        patient_last_name: '', // Apellidos del paciente
        document_type: 'cedula',
        document_number: ''
    });

    // Estado para los errores de validación del formulario
    const [formErrors, setFormErrors] = useState({});
    const [generalError, setGeneralError] = useState(''); // Para errores generales del formulario
    const [isFormValid, setIsFormValid] = useState(false); // Para habilitar/deshabilitar el botón de envío

    // Estados para la lista de usuarios
    const [doctors, setDoctors] = useState([]);
    const [patients, setPatients] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(''); // Para errores de API
    const [successMessage, setSuccessMessage] = useState('');

    // --- Expresiones Regulares para Validación ---
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]{2,30}$/; // Max 30 caracteres después del último punto
    // Contraseña: al menos una mayúscula, una minúscula, un número y un símbolo, 6-10 caracteres
    const passwordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[!@#$%^&*()_+={}\[\]:;"'<>,.?/\\|]).{6,10}$/;
    const nameRegex = /^[a-zA-ZáéíóúÁÉÍÓÚñÑ\s'-]{2,50}$/; // Nombres/Apellidos: letras, espacios, guiones, apóstrofes. 2-50 caracteres
    const phoneRegex = /^\d{7,10}$/; // Teléfono: 7 a 10 dígitos numéricos
    const licenseNumberRegex = /^[a-zA-Z0-9]{5,20}$/; // Licencia: alfanumérico, 5-20 caracteres
    const identificationNumberRegex = /^\d{6,15}$/; // Cédula/Identificación: 6-15 dígitos numéricos
    const specialtyRegex = /^[a-zA-ZáéíóúÁÉÍÓÚñÑ\s-]{2,50}$/; // Especialidad: letras, espacios, guiones. 2-50 caracteres
    const usernameRegex = /^[a-zA-Z0-9_]{3,20}$/; // Nombre de usuario: alfanumérico, guiones bajos. 3-20 caracteres

    // --- Funciones de Fetch de Datos ---
    const fetchDoctors = async () => {
        try {
            const response = await api.get('/admin/doctors');
            setDoctors(response.data);
        } catch (err) {
            console.error('Error al cargar médicos:', err);
            setError('Error al cargar médicos.');
        }
    };

    const fetchPatients = async () => {
        try {
            const response = await api.get('/admin/patients');
            setPatients(response.data);
        } catch (err) {
            console.error('Error al cargar pacientes:', err);
            setError('Error al cargar pacientes.');
        }
    };

    // Cargar datos al montar el componente
    useEffect(() => {
        const loadData = async () => {
            setLoading(true);
            setError('');
            setSuccessMessage('');
            await fetchDoctors();
            await fetchPatients();
            setLoading(false);
        };
        loadData();
    }, []);

    // Validar el formulario cada vez que newUserData cambia
    useEffect(() => {
        validateForm(newUserData, true); // Pasar true para no actualizar el estado de errores directamente en este useEffect
    }, [newUserData]);

    // --- Funciones de Validación ---
    const validateField = (name, value, role) => {
        let error = '';
        switch (name) {
            case 'username':
                if (!value) error = 'El nombre de usuario es obligatorio.';
                else if (!usernameRegex.test(value)) error = 'Usuario inválido (3-20 caracteres, solo letras, números, guiones bajos).';
                break;
            case 'email':
                if (!value) error = 'El correo electrónico es obligatorio.';
                else if (!emailRegex.test(value)) error = 'Correo inválido (ejemplo@dominio.com, max 30 caracteres después del último punto).';
                break;
            case 'password':
                if (!value) error = 'La contraseña es obligatoria.';
                else if (!passwordRegex.test(value)) error = 'Contraseña inválida (6-10 caracteres, una mayúscula, una minúscula, un número, un símbolo).';
                break;
            case 'full_name':
                if (!value) error = 'El nombre es obligatorio.';
                else if (!nameRegex.test(value)) error = 'Nombre inválido (2-50 caracteres, solo letras, espacios, guiones, apóstrofes).';
                break;
            case 'phone':
                // Teléfono es opcional, solo validar si no está vacío
                if (value && !phoneRegex.test(value)) error = 'Teléfono inválido (7-10 dígitos numéricos).';
                break;
            // Validaciones específicas para Doctor
            case 'last_name': // Apellido del doctor
                if (role === 'doctor') {
                    if (!value) error = 'El apellido del médico es obligatorio.';
                    else if (!nameRegex.test(value)) error = 'Apellido inválido (2-50 caracteres, solo letras, espacios, guiones, apóstrofes).';
                }
                break;
            case 'identification_number': // Cédula del doctor
                if (role === 'doctor') {
                    if (!value) error = 'El número de cédula del médico es obligatorio.';
                    else if (!identificationNumberRegex.test(value)) error = 'Número de cédula inválido (6-15 dígitos numéricos).';
                }
                break;
            case 'specialty':
                if (role === 'doctor') {
                    if (!value) error = 'La especialidad es obligatoria.';
                    else if (!specialtyRegex.test(value)) error = 'Especialidad inválida (2-50 caracteres, solo letras, espacios, guiones).';
                }
                break;
            case 'license_number':
                if (role === 'doctor') {
                    if (!value) error = 'El número de licencia es obligatorio.';
                    else if (!licenseNumberRegex.test(value)) error = 'Número de licencia inválido (5-20 caracteres alfanuméricos).';
                }
                break;
            // Validaciones específicas para Paciente
            case 'patient_last_name': // Apellido del paciente
                if (role === 'patient') {
                    if (!value) error = 'El apellido del paciente es obligatorio.';
                    else if (!nameRegex.test(value)) error = 'Apellido inválido (2-50 caracteres, solo letras, espacios, guiones, apóstrofes).';
                }
                break;
            case 'document_number':
                if (role === 'patient') {
                    if (!value) error = 'El número de documento es obligatorio.';
                    else if (!identificationNumberRegex.test(value)) error = 'Número de documento inválido (6-15 dígitos numéricos).';
                }
                break;
            case 'birth_date':
                // La fecha de nacimiento es opcional, solo validar si no está vacía
                if (role === 'patient' && value) {
                    const today = new Date();
                    const birthDate = new Date(value);
                    if (birthDate > today) error = 'La fecha de nacimiento no puede ser en el futuro.';
                }
                break;
            case 'address':
                // La dirección es opcional, solo validar si no está vacía o es muy corta/larga
                if (role === 'patient' && value && (value.length < 5 || value.length > 100)) {
                    error = 'La dirección debe tener entre 5 y 100 caracteres.';
                }
                break;
            default:
                break;
        }
        return error;
    };

    const validateForm = (data, silent = false) => {
        let errors = {};
        let generalFormError = '';

        // Campos comunes
        errors.username = validateField('username', data.username, data.role);
        errors.email = validateField('email', data.email, data.role);
        errors.password = validateField('password', data.password, data.role);
        errors.full_name = validateField('full_name', data.full_name, data.role);
        errors.phone = validateField('phone', data.phone, data.role);

        if (data.role === 'doctor') {
            errors.last_name = validateField('last_name', data.last_name, data.role);
            errors.identification_number = validateField('identification_number', data.identification_number, data.role);
            errors.specialty = validateField('specialty', data.specialty, data.role);
            errors.license_number = validateField('license_number', data.license_number, data.role);
        } else if (data.role === 'patient') {
            errors.patient_last_name = validateField('patient_last_name', data.patient_last_name, data.role);
            errors.document_number = validateField('document_number', data.document_number, data.role);
            errors.birth_date = validateField('birth_date', data.birth_date, data.role);
            errors.address = validateField('address', data.address, data.role);
        }

        const hasErrors = Object.values(errors).some(errorMsg => errorMsg !== '');

        if (hasErrors) {
            generalFormError = 'Por favor, corrige los errores en el formulario.';
        }

        if (!silent) {
            setFormErrors(errors);
            setGeneralError(generalFormError);
        }
        setIsFormValid(!hasErrors);
        return !hasErrors; // Retorna true si el formulario es válido, false si hay errores
    };

    const handleChange = (e) => {
        const { name, value } = e.target;
        setNewUserData(prevData => {
            const updatedData = { ...prevData, [name]: value };
            // Si el rol cambia, limpiar campos específicos del rol anterior
            if (name === 'role') {
                if (value === 'doctor') {
                    updatedData.birth_date = '';
                    updatedData.address = '';
                    updatedData.patient_last_name = '';
                    updatedData.document_type = 'cedula';
                    updatedData.document_number = '';
                } else { // patient
                    updatedData.specialty = '';
                    updatedData.license_number = '';
                    updatedData.last_name = '';
                    updatedData.identification_number = '';
                }
                // También limpiar los errores específicos del rol anterior al cambiar el rol
                setFormErrors({});
                setGeneralError('');
            }
            // Validar el campo específico que cambió para mostrar el error inmediatamente
            const fieldError = validateField(name, value, updatedData.role);
            setFormErrors(prevErrors => ({ ...prevErrors, [name]: fieldError }));
            return updatedData;
        });
    };

    const handleCreateUser = async (e) => {
        e.preventDefault();
        setError('');
        setSuccessMessage('');

        const formIsValid = validateForm(newUserData); // Valida el formulario antes de enviar

        if (!formIsValid) {
            setGeneralError('Por favor, corrige los errores en el formulario.');
            return; // Detiene el envío si hay errores
        }

        try {
            let endpoint = '';
            let dataToSend = {
                username: newUserData.username,
                email: newUserData.email,
                password: newUserData.password,
                full_name: newUserData.full_name,
                phone: newUserData.phone
            };

            if (newUserData.role === 'doctor') {
                endpoint = '/admin/doctors';
                dataToSend = {
                    ...dataToSend,
                    specialty: newUserData.specialty,
                    license_number: newUserData.license_number,
                    last_name: newUserData.last_name,
                    identification_number: newUserData.identification_number
                };
            } else if (newUserData.role === 'patient') {
                endpoint = '/admin/patients';
                dataToSend = {
                    ...dataToSend,
                    birth_date: newUserData.birth_date,
                    address: newUserData.address,
                    last_name: newUserData.patient_last_name, // Nota: el backend espera 'last_name'
                    document_type: newUserData.document_type,
                    document_number: newUserData.document_number
                };
            } else {
                setGeneralError('Rol de usuario no válido seleccionado.');
                return;
            }

            await api.post(endpoint, dataToSend);
            setSuccessMessage(`${newUserData.role === 'doctor' ? 'Médico' : 'Paciente'} creado exitosamente.`);

            await fetchDoctors();
            await fetchPatients();

            // Resetear el formulario y errores
            setNewUserData({
                username: '', email: '', password: '', role: 'doctor',
                full_name: '', phone: '',
                specialty: '', license_number: '',
                last_name: '', identification_number: '',
                birth_date: '', address: '',
                patient_last_name: '', document_type: 'cedula', document_number: ''
            });
            setFormErrors({});
            setGeneralError('');

        } catch (err) {
            console.error('Error al crear usuario:', err.response?.data?.msg || err.message);
            setError(err.response?.data?.msg || 'Error al crear usuario.');
        }
    };

    // --- Manejo de Eliminación de Usuario ---
    const handleDeleteUser = async (userId, role) => {
        if (window.confirm(`¿Estás seguro de que quieres eliminar a este ${role}? Esta acción es irreversible y eliminará todos sus datos asociados (citas, historial médico).`)) {
            try {
                await api.delete(`/admin/users/${userId}`);
                setSuccessMessage(`${role} eliminado exitosamente.`);
                await fetchDoctors();
                await fetchPatients();
            } catch (err) {
                console.error('Error al eliminar usuario:', err.response?.data?.msg || err.message);
                setError(err.response?.data?.msg || 'Error al eliminar usuario.');
            }
        }
    };

    // --- NUEVA FUNCIONALIDAD: Manejo de la Disponibilidad del Médico ---
    const handleToggleDoctorAvailability = async (doctorId, currentAvailability) => {
        const newAvailability = !currentAvailability; // Invierte el estado actual
        const action = newAvailability ? 'disponible' : 'ausente'; // Texto para el mensaje de confirmación
        if (window.confirm(`¿Estás seguro de que quieres poner a este médico como ${action}?`)) {
            try {
                // Asumo que el endpoint para actualizar la disponibilidad es PATCH o PUT
                // y que espera un cuerpo { "is_available": true/false }
                await api.patch(`/admin/doctors/${doctorId}/availability`, { is_available: newAvailability });
                setSuccessMessage(`Médico puesto como ${action} exitosamente.`);
                await fetchDoctors(); // Vuelve a cargar la lista de médicos para actualizar la UI
            } catch (err) {
                console.error('Error al cambiar disponibilidad del médico:', err.response?.data?.msg || err.message);
                setError(err.response?.data?.msg || 'Error al cambiar disponibilidad del médico.');
            }
        }
    };


    if (loading) {
        return (
            <div className="d-flex flex-column justify-content-center align-items-center vh-100">
                <div className="spinner-border text-primary" role="status">
                    <span className="visually-hidden">Cargando usuarios...</span>
                </div>
                <p className="mt-2 text-muted">Cargando usuarios...</p>
            </div>
        );
    }

    return (
        <div className="container mt-5 mb-5">
            <h2 className="mb-5 text-center text-primary fw-bold">Gestión de Usuarios - Panel Administrativo</h2>

            {generalError && <div className="alert alert-danger alert-dismissible fade show" role="alert">
                {generalError}
                <button type="button" className="btn-close" data-bs-dismiss="alert" aria-label="Close"></button>
            </div>}
            {error && <div className="alert alert-danger alert-dismissible fade show" role="alert">
                {error}
                <button type="button" className="btn-close" data-bs-dismiss="alert" aria-label="Close"></button>
            </div>}
            {successMessage && <div className="alert alert-success alert-dismissible fade show" role="alert">
                {successMessage}
                <button type="button" className="btn-close" data-bs-dismiss="alert" aria-label="Close"></button>
            </div>}

            {/* Formulario de Creación de Nuevo Usuario */}
            <div className="card mb-5 shadow-lg border-0 rounded-3">
                <div className="card-header bg-dark text-white p-3 rounded-top-3">
                    <h5 className="mb-0 d-flex align-items-center">
                        <i className="bi bi-person-plus-fill me-2"></i> Registrar Nuevo Usuario
                    </h5>
                </div>
                <div className="card-body p-4">
                    <form onSubmit={handleCreateUser} noValidate> {/* Añadir noValidate para evitar validación HTML5 */}
                        <div className="mb-3">
                            <label htmlFor="userRole" className="form-label visually-hidden">Tipo de Usuario:</label>
                            <select
                                id="userRole"
                                name="role"
                                className="form-select form-select-lg"
                                value={newUserData.role}
                                onChange={handleChange}
                                required
                            >
                                <option value="doctor">Médico</option>
                                <option value="patient">Paciente</option>
                            </select>
                        </div>
                        <div className="row g-3 mb-3">
                            <div className="col-md-6">
                                <div className="form-floating">
                                    <input
                                        type="text"
                                        className={`form-control ${formErrors.username ? 'is-invalid' : ''}`}
                                        id="username"
                                        name="username"
                                        placeholder=" "
                                        value={newUserData.username}
                                        onChange={handleChange}
                                        required
                                    />
                                    <label htmlFor="username">Nombre de Usuario</label>
                                    {formErrors.username && <div className="invalid-feedback">{formErrors.username}</div>}
                                </div>
                            </div>
                            <div className="col-md-6">
                                <div className="form-floating">
                                    <input
                                        type="email"
                                        className={`form-control ${formErrors.email ? 'is-invalid' : ''}`}
                                        id="email"
                                        name="email"
                                        placeholder=" "
                                        value={newUserData.email}
                                        onChange={handleChange}
                                        required
                                    />
                                    <label htmlFor="email">Email</label>
                                    {formErrors.email && <div className="invalid-feedback">{formErrors.email}</div>}
                                </div>
                            </div>
                            <div className="col-md-6">
                                <div className="form-floating">
                                    <input
                                        type="password"
                                        className={`form-control ${formErrors.password ? 'is-invalid' : ''}`}
                                        id="password"
                                        name="password"
                                        placeholder=" "
                                        value={newUserData.password}
                                        onChange={handleChange}
                                        required
                                    />
                                    <label htmlFor="password">Contraseña</label>
                                    {formErrors.password && <div className="invalid-feedback">{formErrors.password}</div>}
                                </div>
                            </div>
                            <div className="col-md-6">
                                <div className="form-floating">
                                    <input
                                        type="text"
                                        className={`form-control ${formErrors.full_name ? 'is-invalid' : ''}`}
                                        id="full_name"
                                        name="full_name"
                                        placeholder=" "
                                        value={newUserData.full_name}
                                        onChange={handleChange}
                                        required
                                    />
                                    <label htmlFor="full_name">Nombre(s)</label>
                                    {formErrors.full_name && <div className="invalid-feedback">{formErrors.full_name}</div>}
                                </div>
                            </div>
                            <div className="col-md-6">
                                <div className="form-floating">
                                    <input
                                        type="text"
                                        className={`form-control ${formErrors.phone ? 'is-invalid' : ''}`}
                                        id="phone"
                                        name="phone"
                                        placeholder=" "
                                        value={newUserData.phone}
                                        onChange={handleChange}
                                    />
                                    <label htmlFor="phone">Teléfono (Opcional)</label>
                                    {formErrors.phone && <div className="invalid-feedback">{formErrors.phone}</div>}
                                </div>
                            </div>

                            {/* Campos específicos para Médico */}
                            {newUserData.role === 'doctor' && (
                                <>
                                    <div className="col-md-6">
                                        <div className="form-floating">
                                            <input
                                                type="text"
                                                className={`form-control ${formErrors.last_name ? 'is-invalid' : ''}`}
                                                id="last_name"
                                                name="last_name"
                                                placeholder=" "
                                                value={newUserData.last_name}
                                                onChange={handleChange}
                                                required
                                            />
                                            <label htmlFor="last_name">Apellidos (Médico)</label>
                                            {formErrors.last_name && <div className="invalid-feedback">{formErrors.last_name}</div>}
                                        </div>
                                    </div>
                                    <div className="col-md-6">
                                        <div className="form-floating">
                                            <input
                                                type="text"
                                                className={`form-control ${formErrors.identification_number ? 'is-invalid' : ''}`}
                                                id="identification_number"
                                                name="identification_number"
                                                placeholder=" "
                                                value={newUserData.identification_number}
                                                onChange={handleChange}
                                                required
                                            />
                                            <label htmlFor="identification_number">Número de Cédula (Médico)</label>
                                            {formErrors.identification_number && <div className="invalid-feedback">{formErrors.identification_number}</div>}
                                        </div>
                                    </div>
                                    <div className="col-md-6">
                                        <div className="form-floating">
                                            <input
                                                type="text"
                                                className={`form-control ${formErrors.specialty ? 'is-invalid' : ''}`}
                                                id="specialty"
                                                name="specialty"
                                                placeholder=" "
                                                value={newUserData.specialty}
                                                onChange={handleChange}
                                                required
                                            />
                                            <label htmlFor="specialty">Especialidad</label>
                                            {formErrors.specialty && <div className="invalid-feedback">{formErrors.specialty}</div>}
                                        </div>
                                    </div>
                                    <div className="col-md-6">
                                        <div className="form-floating">
                                            <input
                                                type="text"
                                                className={`form-control ${formErrors.license_number ? 'is-invalid' : ''}`}
                                                id="license_number"
                                                name="license_number"
                                                placeholder=" "
                                                value={newUserData.license_number}
                                                onChange={handleChange}
                                                required
                                            />
                                            <label htmlFor="license_number">Número de Licencia</label>
                                            {formErrors.license_number && <div className="invalid-feedback">{formErrors.license_number}</div>}
                                        </div>
                                    </div>
                                </>
                            )}
                            {/* Campos específicos para Paciente */}
                            {newUserData.role === 'patient' && (
                                <>
                                    <div className="col-md-6">
                                        <div className="form-floating">
                                            <input
                                                type="text"
                                                className={`form-control ${formErrors.patient_last_name ? 'is-invalid' : ''}`}
                                                id="patient_last_name"
                                                name="patient_last_name"
                                                placeholder=" "
                                                value={newUserData.patient_last_name}
                                                onChange={handleChange}
                                                required
                                            />
                                            <label htmlFor="patient_last_name">Apellidos (Paciente)</label>
                                            {formErrors.patient_last_name && <div className="invalid-feedback">{formErrors.patient_last_name}</div>}
                                        </div>
                                    </div>
                                    <div className="col-md-6">
                                        <div className="form-floating">
                                            <select
                                                id="document_type"
                                                name="document_type"
                                                className="form-select"
                                                value={newUserData.document_type}
                                                onChange={handleChange}
                                                required
                                            >
                                                <option value="cedula">Cédula de Ciudadanía</option>
                                                <option value="tarjeta de identidad">Tarjeta de Identidad</option>
                                                <option value="registro civil">Registro Civil</option>
                                            </select>
                                            <label htmlFor="document_type">Tipo de Documento</label>
                                        </div>
                                    </div>
                                    <div className="col-md-6">
                                        <div className="form-floating">
                                            <input
                                                type="text"
                                                className={`form-control ${formErrors.document_number ? 'is-invalid' : ''}`}
                                                id="document_number"
                                                name="document_number"
                                                placeholder=" "
                                                value={newUserData.document_number}
                                                onChange={handleChange}
                                                required
                                            />
                                            <label htmlFor="document_number">Número de Documento</label>
                                            {formErrors.document_number && <div className="invalid-feedback">{formErrors.document_number}</div>}
                                        </div>
                                    </div>
                                    <div className="col-md-6">
                                        <div className="form-floating">
                                            <input
                                                type="date"
                                                className={`form-control ${formErrors.birth_date ? 'is-invalid' : ''}`}
                                                id="birth_date"
                                                name="birth_date"
                                                placeholder=" "
                                                value={newUserData.birth_date}
                                                onChange={handleChange}
                                            />
                                            <label htmlFor="birth_date">Fecha de Nacimiento (Opcional)</label>
                                            {formErrors.birth_date && <div className="invalid-feedback">{formErrors.birth_date}</div>}
                                        </div>
                                    </div>
                                    <div className="col-md-12">
                                        <div className="form-floating">
                                            <textarea
                                                className={`form-control ${formErrors.address ? 'is-invalid' : ''}`}
                                                id="address"
                                                name="address"
                                                placeholder=" "
                                                value={newUserData.address}
                                                onChange={handleChange}
                                                rows="2"
                                            ></textarea>
                                            <label htmlFor="address">Dirección (Opcional)</label>
                                            {formErrors.address && <div className="invalid-feedback">{formErrors.address}</div>}
                                        </div>
                                    </div>
                                </>
                            )}
                        </div>
                        <button type="submit" className="btn btn-primary btn-lg mt-4 w-100 d-flex align-items-center justify-content-center" disabled={!isFormValid}>
                            <i className="bi bi-person-check-fill me-2"></i> Registrar Usuario
                        </button>
                    </form>
                </div>
            </div>

            {/* Listado de Médicos */}
            <div className="card mb-5 shadow-lg border-0 rounded-3">
                <div className="card-header bg-primary text-white p-3 rounded-top-3">
                    <h5 className="mb-0 d-flex align-items-center">
                        <i className="bi bi-person-fill-gear me-2"></i> Lista de Médicos
                    </h5>
                </div>
                <div className="card-body p-4">
                    {doctors.length === 0 ? (
                        <div className="alert alert-info" role="alert">No hay médicos registrados.</div>
                    ) : (
                        <div className="table-responsive">
                            <table className="table table-striped table-hover caption-top align-middle">
                                <caption>Médicos Registrados</caption>
                                <thead className="table-light">
                                    <tr>
                                        <th scope="col">ID Usuario</th>
                                        <th scope="col">Usuario</th>
                                        <th scope="col">Email</th>
                                        <th scope="col">Nombre</th>
                                        <th scope="col">Apellidos</th>
                                        <th scope="col">Cédula</th>
                                        <th scope="col">Especialidad</th>
                                        <th scope="col">Licencia</th>
                                        <th scope="col">Estado</th> {/* AÑADIDO: Nueva columna para el estado */}
                                        <th scope="col">Acciones</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {doctors.map(doctor => (
                                        <tr key={doctor.id}>
                                            <td>{doctor.user.id}</td>
                                            <td>{doctor.user.username}</td>
                                            <td>{doctor.user.email}</td>
                                            <td>{doctor.full_name}</td>
                                            <td>{doctor.last_name || 'N/A'}</td>
                                            <td>{doctor.identification_number || 'N/A'}</td>
                                            <td>{doctor.specialty}</td>
                                            <td>{doctor.license_number}</td>
                                            {/* AÑADIDO: Columna para el estado de disponibilidad */}
                                            <td>
                                                <span className={`badge bg-${doctor.is_available ? 'success' : 'danger'}`}>
                                                    {doctor.is_available ? 'Disponible' : 'Ausente'}
                                                </span>
                                            </td>
                                            <td>
                                                <div className="d-flex gap-2"> {/* Usamos gap-2 para espaciar los botones */}
                                                    <button
                                                        className="btn btn-danger btn-sm d-flex align-items-center"
                                                        onClick={() => handleDeleteUser(doctor.user.id, 'médico')}
                                                    >
                                                        <i className="bi bi-trash-fill me-1"></i> Eliminar
                                                    </button>
                                                    {/* AÑADIDO: Botón para alternar disponibilidad */}
                                                    <button
                                                        className={`btn btn-${doctor.is_available ? 'warning' : 'success'} btn-sm d-flex align-items-center`}
                                                        onClick={() => handleToggleDoctorAvailability(doctor.id, doctor.is_available)}
                                                    >
                                                        <i className={`bi bi-${doctor.is_available ? 'person-slash' : 'person-check-fill'} me-1`}></i>
                                                        {doctor.is_available ? 'Poner Ausente' : 'Poner Disponible'}
                                                    </button>
                                                </div>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    )}
                </div>
            </div>

            {/* Listado de Pacientes */}
            <div className="card mb-4 shadow-lg border-0 rounded-3">
                <div className="card-header bg-success text-white p-3 rounded-top-3">
                    <h5 className="mb-0 d-flex align-items-center">
                        <i className="bi bi-people-fill me-2"></i> Lista de Pacientes
                    </h5>
                </div>
                <div className="card-body p-4">
                    {patients.length === 0 ? (
                        <div className="alert alert-info" role="alert">No hay pacientes registrados.</div>
                    ) : (
                        <div className="table-responsive">
                            <table className="table table-striped table-hover caption-top align-middle">
                                <caption>Pacientes Registrados</caption>
                                <thead className="table-light">
                                    <tr>
                                        <th scope="col">ID Usuario</th>
                                        <th scope="col">Usuario</th>
                                        <th scope="col">Email</th>
                                        <th scope="col">Nombre(s)</th>
                                        <th scope="col">Apellidos</th>
                                        <th scope="col">Tipo Doc.</th>
                                        <th scope="col">No. Doc.</th>
                                        <th scope="col">Fecha Nac.</th>
                                        <th scope="col">Teléfono</th>
                                        <th scope="col">Dirección</th>
                                        <th scope="col">Acciones</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {patients.map(patient => (
                                        <tr key={patient.id}>
                                            <td>{patient.user.id}</td>
                                            <td>{patient.user.username}</td>
                                            <td>{patient.user.email}</td>
                                            <td>{patient.full_name}</td>
                                            <td>{patient.last_name || 'N/A'}</td>
                                            <td>{patient.document_type || 'N/A'}</td>
                                            <td>{patient.document_number || 'N/A'}</td>
                                            <td>{patient.birth_date ? new Date(patient.birth_date).toLocaleDateString() : 'N/A'}</td>
                                            <td>{patient.phone}</td>
                                            <td>{patient.address}</td>
                                            <td>
                                                <button
                                                    className="btn btn-danger btn-sm d-flex align-items-center"
                                                    onClick={() => handleDeleteUser(patient.user.id, 'paciente')}
                                                >
                                                    <i className="bi bi-trash-fill me-1"></i> Eliminar
                                                </button>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
} 