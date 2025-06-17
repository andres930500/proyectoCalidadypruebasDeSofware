import React, { useState } from 'react';
import axios from 'axios';
import { useNavigate, Link } from 'react-router-dom';
import 'bootstrap/dist/css/bootstrap.min.css';
import 'bootstrap-icons/font/bootstrap-icons.css';

export default function Login() {
  const navigate = useNavigate();

  // Cambiado de estados individuales a un objeto formData
  const [formData, setFormData] = useState({
    email: '',
    password: '',
    role: 'patient', // Valor por defecto
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
      // También limpiar el error general si era por validación de ese campo
      setGeneralError('');
    }
  };

  // Función de validación (similar a RegisterPatient)
  const validate = () => {
    let tempErrors = {};
    let isValid = true;

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    // La misma regex de contraseña que en RegisterPatient para consistencia, aunque para login
    // solo necesitarías que no esté vacía y opcionalmente un formato básico si la app lo exige
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
        // Podrías ajustar este mensaje para login, si la validación es menos estricta aquí
        tempErrors.password = 'Contraseña inválida (debe contener mayúscula, minúscula, número y símbolo especial, máximo 10 caracteres).';
        isValid = false;
    }


    setErrors(tempErrors);
    return isValid;
  };

  const handleLogin = async (e) => {
    e.preventDefault();
    setLoading(true);
    setGeneralError(''); // Limpiar errores anteriores
    setErrors({}); // Limpiar errores de campo anteriores

    if (validate()) {
      try {
        const response = await axios.post(
          `${process.env.REACT_APP_BACKEND_URL}/api/auth/login`, // Usa la variable de entorno
          {
            email: formData.email,
            password: formData.password,
            role: formData.role, // Envía el rol si el backend lo requiere
          }
        );

        const { token, user } = response.data;

        if (!user || !user.id || !user.role) {
          setGeneralError('Respuesta de login incompleta: falta ID de usuario o Rol en la respuesta del servidor.');
          console.error('La respuesta del backend al login NO contiene user.id o user.role:', response.data);
          setLoading(false);
          return;
        }

        localStorage.setItem('token', token);
        localStorage.setItem('userId', user.id);
        localStorage.setItem('userRole', user.role);
        localStorage.setItem('userEmail', user.email || formData.email);

        console.log('Login exitoso. Token:', token, 'userId:', user.id, 'userRole:', user.role);

        // Redirección basada en el rol recibido del backend
        if (user.role === 'doctor') {
          navigate('/doctor-dashboard');
        } else if (user.role === 'patient') {
          navigate('/patient-dashboard');
        } else if (user.role === 'admin') {
          navigate('/admin-dashboard');
        } else {
          navigate('/'); // Redirección por defecto si el rol no coincide
        }
      } catch (err) {
        console.error('Error al iniciar sesión:', err.response?.data?.message || err.message || err);
        setGeneralError(err.response?.data?.message || 'Error de login. Usuario o contraseña incorrectos.');
      } finally {
        setLoading(false);
      }
    } else {
      setLoading(false); // Deshabilitar loading si la validación del lado del cliente falla
      setGeneralError('Por favor, corrige los errores en el formulario.'); // Mensaje general de validación
    }
  };

  return (
    <div className="d-flex justify-content-center align-items-center min-vh-100 bg-light py-5">
      <div className="card shadow-lg border-0 rounded-4" style={{ maxWidth: '450px', width: '100%' }}>
        <div className="card-header text-center bg-primary text-white rounded-top-4 p-4">
          <h3 className="mb-0 fw-bold">Iniciar Sesión</h3>
        </div>

        <div className="card-body p-5">
          {loading && (
            <div className="alert alert-info text-center mb-4" role="alert">
              Iniciando sesión...
            </div>
          )}
          {generalError && (
            <div className="alert alert-danger text-center mb-4" role="alert">
              {generalError}
            </div>
          )}

          <form onSubmit={handleLogin} noValidate>
            {/* Campo de Correo Electrónico (Floating Label) */}
            <div className="form-floating mb-3">
              <input
                type="email"
                className={`form-control ${errors.email ? 'is-invalid' : ''}`} {/* Clase para error */}
                id="email" // Usamos id "email" para consistencia y label
                name="email" // Añadimos name para handleChange
                placeholder="Correo electrónico"
                value={formData.email}
                onChange={handleChange}
                required
              />
              <label htmlFor="email">
                <i className="bi bi-envelope me-2 text-primary"></i>
                Correo electrónico
              </label>
              {errors.email && <div className="invalid-feedback">{errors.email}</div>} {/* Feedback de error */}
            </div>

            {/* Campo de Contraseña (Floating Label) */}
            <div className="form-floating mb-4">
              <input
                type="password"
                className={`form-control ${errors.password ? 'is-invalid' : ''}`} {/* Clase para error */}
                id="password" // Usamos id "password"
                name="password" // Añadimos name para handleChange
                placeholder="Contraseña"
                value={formData.password}
                onChange={handleChange}
                required
              />
              <label htmlFor="password">
                <i className="bi bi-lock me-2 text-primary"></i>
                Contraseña
              </label>
              {errors.password && <div className="invalid-feedback">{errors.password}</div>} {/* Feedback de error */}
            </div>

            {/* Selector de Rol (Floating Label) */}
            <div className="form-floating mb-4">
              <select
                className="form-select"
                id="role" // Usamos id "role"
                name="role" // Añadimos name para handleChange
                value={formData.role}
                onChange={handleChange}
              >
                <option value="patient">Paciente</option>
                <option value="doctor">Médico</option>
                <option value="admin">Administrador</option>
              </select>
              <label htmlFor="role">
                <i className="bi bi-person-circle me-2 text-primary"></i>
                Ingresar como
              </label>
              {/* No se espera un error de validación para el rol, pero se deja el espacio si se necesitara */}
            </div>

            {/* Botón de Ingresar */}
            <button
              type="submit"
              className="btn btn-primary w-100 py-3 mt-3 fw-bold fs-5"
              disabled={loading}
            >
              {loading ? (
                <>
                  <span className="spinner-border spinner-border-sm me-2" role="status" aria-hidden="true"></span>
                  Iniciando sesión...
                </>
              ) : (
                <>
                  <i className="bi bi-box-arrow-in-right me-2"></i>
                  Ingresar
                </>
              )}
            </button>
          </form>

          {/* Enlaces de registro al pie del formulario */}
          <div className="mt-4 text-center text-muted">
            <p className="mb-1">¿No tienes cuenta?</p>
            <Link to="/register-patient" className="text-decoration-none d-block mb-1">
              <i className="bi bi-person-add me-1"></i> Registrarse como Paciente
            </Link>
            <Link to="/register-doctor" className="text-decoration-none d-block">
              <i className="bi bi-person-fill-add me-1"></i> Registrarse como Médico
            </Link>
          </div>
        </div>

        <div className="card-footer text-muted text-center p-3">
          MyMedicalPlatform
        </div>
      </div>
    </div>
  );
}