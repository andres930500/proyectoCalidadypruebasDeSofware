// frontend/src/components/Login.jsx
import React, { useState } from 'react';
import axios from 'axios';
import 'bootstrap/dist/css/bootstrap.min.css';
import 'bootstrap-icons/font/bootstrap-icons.css';
// Eliminamos useNavigate y Link de aquí, ya que App.js se encargará de la redirección global
// y el enlace de registro es un <a> simple ahora.
// import { useNavigate, Link } from 'react-router-dom';

const Login = ({ updateAuthInfo }) => { // Recibe updateAuthInfo como prop
    // Estado para los campos del formulario
    const [formData, setFormData] = useState({
        email: '',
        password: '',
        role: 'paciente', // Estado inicial para el rol
    });

    // Estado para los errores de validación individuales (similar a RegisterPatient)
    const [errors, setErrors] = useState({});
    // Estado para el mensaje de error general (puede ser de validación o del servidor)
    const [generalError, setGeneralError] = useState('');
    // Estado para el indicador de carga (loading)
    const [loading, setLoading] = useState(false);

    // Función genérica para manejar cambios en cualquier campo del formulario
    const handleChange = (e) => {
        const { name, value } = e.target;
        setFormData({
            ...formData,
            [name]: value,
        });
        // Limpiar el error específico de ese campo al cambiar su valor
        if (errors[name]) {
            setErrors((prevErrors) => ({
                ...prevErrors,
                [name]: null, // Establecer el error a null para que desaparezca
            }));
        }
        // Limpiar el error general cuando el usuario interactúa con un campo
        if (generalError) {
            setGeneralError('');
        }
    };

    // Función de validación (similar a RegisterPatient)
    const validate = () => {
        let tempErrors = {};
        let isValid = true;

        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        // La misma regex de contraseña que en RegisterPatient para consistencia
        const passwordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]).{1,10}$/;

        // Validación de email
        if (!formData.email) {
            tempErrors.email = 'El correo electrónico es obligatorio.';
            isValid = false;
        } else if (!emailRegex.test(formData.email) || formData.email.length > 30) {
            tempErrors.email = 'Correo inválido (máximo 30 caracteres, formato correcto).';
            isValid = false;
        }

        // Validación de password
        if (!formData.password) {
            tempErrors.password = 'La contraseña es obligatoria.';
            isValid = false;
        } else if (!passwordRegex.test(formData.password)) {
            tempErrors.password = 'Contraseña inválida (debe contener mayúscula, minúscula, número y símbolo especial, máximo 10 caracteres).';
            isValid = false;
        }

        // No se necesita validación para 'role' en el lado del cliente aquí, ya que es un select con opciones fijas.

        setErrors(tempErrors);
        return isValid;
    };

    const handleLogin = async (e) => {
        e.preventDefault();
        setLoading(true);
        setGeneralError(''); // Limpiar errores generales anteriores
        setErrors({}); // Limpiar errores de campo anteriores

        if (validate()) { // Ejecuta la validación del lado del cliente
            try {
                console.log('DEBUG (Login.jsx): Intentando iniciar sesión con:', { email: formData.email, role: formData.role });
                const response = await axios.post(`${process.env.REACT_APP_BACKEND_URL}/api/auth/login`, {
                    email: formData.email,
                    password: formData.password,
                    role: formData.role // Se envía el rol seleccionado al backend
                });

                console.log('DEBUG (Login.jsx): Respuesta COMPLETA del backend:', response.data);

                const { token, user } = response.data; // Desestructura token y user

                if (!token || !user || !user.id || !user.role) {
                    setGeneralError('Credenciales inválidas o datos de usuario incompletos.');
                    console.error('ERROR (Login.jsx): Respuesta del backend incompleta:', response.data);
                    setLoading(false);
                    return;
                }

                const userRoleNormalized = String(user.role).trim().toLowerCase();
                console.log('DEBUG (Login.jsx): Rol del usuario recibido (NORMALIZADO):', userRoleNormalized);

                // Guarda la información de autenticación en localStorage
                localStorage.setItem('token', token);
                localStorage.setItem('userId', user.id);
                localStorage.setItem('userRole', userRoleNormalized); // Guarda el rol normalizado
                localStorage.setItem('userEmail', user.email || formData.email); // Guarda el email del usuario
                if (user.username) localStorage.setItem('username', user.username);

                // Si el rol es 'doctor', guarda doctorId si viene
                if (userRoleNormalized === 'doctor') {
                    user.doctorId ? localStorage.setItem('doctorId', user.doctorId) : localStorage.removeItem('doctorId');
                } else {
                    localStorage.removeItem('doctorId'); // Asegúrate de que no haya un doctorId si no es doctor
                }

                // Llama a la función updateAuthInfo de App.js para actualizar el estado global
                // App.js se encargará de la redirección.
                updateAuthInfo({
                    isAuthenticated: true,
                    userId: user.id,
                    userRole: userRoleNormalized,
                    username: user.username || null,
                    token: token,
                    doctorId: user.doctorId || null,
                });

            } catch (err) {
                console.error('ERROR (Login.jsx): Error en el inicio de sesión:', err.response?.data || err.message);
                setGeneralError(err.response?.data?.message || 'Correo o contraseña incorrectos.');
                setFormData(prev => ({ ...prev, password: '' })); // Limpia solo la contraseña en caso de error
            } finally {
                setLoading(false);
            }
        } else {
            setLoading(false); // Deshabilitar loading si la validación del lado del cliente falla
            setGeneralError('Por favor, corrige los errores en el formulario.'); // Mensaje general de validación
        }
    };

    return (
        <div className="d-flex justify-content-center align-items-center min-vh-100 bg-light">
            <div className="card shadow-lg border-0 rounded-4" style={{ maxWidth: '450px', width: '100%' }}>
                <div className="card-header text-center bg-primary text-white rounded-top-4 p-3">
                    <h3 className="mb-0 fw-bold">Iniciar Sesión</h3>
                </div>

                <div className="card-body p-4">
                    {loading && <div className="alert alert-info mb-3" role="alert">Iniciando sesión...</div>}
                    {generalError && <div className="alert alert-danger mb-3" role="alert">{generalError}</div>}

                    <form onSubmit={handleLogin} noValidate>
                        <div className="form-floating mb-3">
                            <input
                                type="email"
                                className={`form-control ${errors.email ? 'is-invalid' : ''}`}
                                id="email"
                                name="email" // Añadido name para handleChange
                                placeholder="Correo electrónico"
                                value={formData.email} // Vinculado a formData
                                onChange={handleChange} // Usando la función handleChange
                                required
                            />
                            <label htmlFor="email"><i className="bi bi-envelope me-2 text-primary"></i>Correo electrónico</label>
                            {errors.email && <div className="invalid-feedback">{errors.email}</div>} {/* Mostrar error */}
                        </div>

                        <div className="form-floating mb-3">
                            <input
                                type="password"
                                className={`form-control ${errors.password ? 'is-invalid' : ''}`}
                                id="password"
                                name="password" // Añadido name para handleChange
                                placeholder="Contraseña"
                                value={formData.password} // Vinculado a formData
                                onChange={handleChange} // Usando la función handleChange
                                required
                            />
                            <label htmlFor="password"><i className="bi bi-lock me-2 text-primary"></i>Contraseña</label>
                            {errors.password && <div className="invalid-feedback">{errors.password}</div>} {/* Mostrar error */}
                        </div>

                        <div className="form-floating mb-4">
                            <select
                                className="form-select"
                                id="role"
                                name="role" // Añadido name para handleChange
                                value={formData.role} // Vinculado a formData
                                onChange={handleChange} // Usando la función handleChange
                                required // Aunque no tiene validación compleja, es requerido
                            >
                                <option value="paciente">Paciente</option>
                                <option value="doctor">Doctor</option>
                                <option value="admin">Administrador</option>
                            </select>
                            <label htmlFor="role"><i className="bi bi-person-circle me-2 text-primary"></i>Iniciar como</label>
                            {/* Si hubiera validación de rol, aquí iría errors.role */}
                        </div>

                        <button type="submit" className="btn btn-primary w-100 py-3 fw-bold fs-5" disabled={loading}>
                            <i className="bi bi-box-arrow-in-right me-2"></i>
                            {loading ? 'Entrando...' : 'Ingresar'}
                        </button>
                    </form>
                </div>

                <div className="card-footer text-muted text-center p-3">
                    ¿No tienes una cuenta? <a href="/register" className="text-primary fw-bold">Regístrate aquí</a>
                </div>
            </div>
        </div>
    );
};

export default Login;