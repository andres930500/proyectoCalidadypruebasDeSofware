import React, { useState } from 'react';
import axios from 'axios'; // Necesitamos axios para las peticiones HTTP
import 'bootstrap/dist/css/bootstrap.min.css';
import 'bootstrap-icons/font/bootstrap-icons.css';
import { useNavigate } from 'react-router-dom'; // Necesitamos useNavigate para la redirección

const PatientRegisterForm = () => {
  // Estado para cada campo del formulario
  const [formData, setFormData] = useState({
    full_name: '',
    last_name: '',
    document_type: '',
    document_number: '',
    username: '',
    email: '',
    password: '',
    birth_date: '',
    phone: '',
    address: '',
  });

  // Estado para los errores de validación individuales
  const [errors, setErrors] = useState({});
  // Estado para mensajes generales de éxito o error (ej. del servidor)
  const [message, setMessage] = useState('');
  const [generalError, setGeneralError] = useState('');
  // Estado para el indicador de carga (loading)
  const [loading, setLoading] = useState(false);

  // Hook para la navegación
  const navigate = useNavigate();

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
  };

  const validate = () => {
    let tempErrors = {};
    let isValid = true;

    // Regex para nombres y apellidos (solo letras y espacios, máximo dos palabras)
    const nameRegex = /^[A-Za-zÁÉÍÓÚáéíóúñÑ\s]+$/;
    // Regex para número de documento (solo números, máximo 15 dígitos)
    const documentNumberRegex = /^\d{1,15}$/;
    // Regex para username (máximo 10 caracteres)
    const usernameRegex = /^.{1,10}$/;
    // Regex para email (formato general)
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    // Regex para contraseña (mayúscula, minúscula, número, símbolo especial, 1-10 caracteres)
    const passwordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]).{1,10}$/;
    // Regex para teléfono (solo números, máximo 15 dígitos)
    const phoneRegex = /^\d{1,15}$/;
    // Regex para dirección (letras, números, espacios, sin caracteres especiales como #$%^)
    const addressRegex = /^[A-Za-z0-9\s]+$/;

    // Validación de full_name (Nombre)
    if (!formData.full_name) {
      tempErrors.full_name = 'El nombre es obligatorio.';
      isValid = false;
    } else if (!nameRegex.test(formData.full_name) || formData.full_name.trim().split(/\s+/).filter(Boolean).length > 2) {
      tempErrors.full_name = 'Nombre inválido (máximo dos palabras, solo letras).';
      isValid = false;
    }

    // Validación de last_name (Apellido)
    if (!formData.last_name) {
      tempErrors.last_name = 'El apellido es obligatorio.';
      isValid = false;
    } else if (!nameRegex.test(formData.last_name) || formData.last_name.trim().split(/\s+/).filter(Boolean).length > 2) {
      tempErrors.last_name = 'Apellido inválido (máximo dos apellidos, solo letras).';
      isValid = false;
    }

    // Validación de document_type
    if (!formData.document_type) {
      tempErrors.document_type = 'Seleccione un tipo de documento.';
      isValid = false;
    }

    // Validación de document_number
    if (!formData.document_number) {
      tempErrors.document_number = 'El número de documento es obligatorio.';
      isValid = false;
    } else if (!documentNumberRegex.test(formData.document_number)) {
      tempErrors.document_number = 'Número de documento inválido (solo números, máximo 15 dígitos).';
      isValid = false;
    }

    // Validación de username
    if (!formData.username) {
      tempErrors.username = 'El usuario es obligatorio.';
      isValid = false;
    } else if (!usernameRegex.test(formData.username)) {
      tempErrors.username = 'Usuario inválido (máximo 10 caracteres).';
      isValid = false;
    }

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

    // Validación de birth_date
    if (!formData.birth_date) {
      tempErrors.birth_date = 'Fecha de nacimiento es obligatoria.';
      isValid = false;
    }

    // Validación de phone
    if (!formData.phone) {
      tempErrors.phone = 'El teléfono es obligatorio.';
      isValid = false;
    } else if (!phoneRegex.test(formData.phone)) {
      tempErrors.phone = 'Teléfono inválido (solo números, máximo 15 dígitos).';
      isValid = false;
    }

    // Validación de address
    if (!formData.address) {
      tempErrors.address = 'La dirección es obligatoria.';
      isValid = false;
    } else if (!addressRegex.test(formData.address)) {
      tempErrors.address = 'Dirección inválida (solo letras y números, sin caracteres especiales).';
      isValid = false;
    }

    setErrors(tempErrors);
    return isValid;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setMessage(''); // Limpiar mensajes anteriores
    setGeneralError(''); // Limpiar errores generales anteriores

    if (validate()) {
      try {
        const response = await axios.post(`${process.env.REACT_APP_BACKEND_URL}/api/patient/register`, formData);
        
        // Si la respuesta es exitosa (código 2xx)
        setMessage('Paciente registrado correctamente. ¡Ya puedes iniciar sesión!');
        setFormData({ // Limpiar el formulario
          full_name: '',
          last_name: '',
          document_type: '',
          document_number: '',
          username: '',
          email: '',
          password: '',
          birth_date: '',
          phone: '',
          address: '',
        });
        // Redirigir al login después de un breve retraso
        setTimeout(() => {
          navigate('/login');
        }, 2000); // 2 segundos
      } catch (err) {
        console.error('Error al registrar paciente:', err);
        // Mostrar un mensaje de error más específico del servidor si está disponible
        const errorMessage = err.response?.data?.message || err.message || 'Error desconocido al intentar registrar el paciente.';
        setGeneralError('Error al registrar: ' + errorMessage);
      } finally {
        setLoading(false); // Siempre deshabilitar el loading al finalizar la petición
      }
    } else {
      setLoading(false); // Deshabilitar loading si la validación del lado del cliente falla
      console.log('Errores de validación:', errors);
      // Opcional: Podrías poner un setGeneralError aquí para indicar que hay errores en el formulario
      setGeneralError('Por favor, corrige los errores en el formulario.');
    }
  };

  return (
    <div className="d-flex justify-content-center align-items-center min-vh-100 py-5">
      <div className="card shadow-lg border-0 rounded-4" style={{ maxWidth: '600px', width: '100%' }}>
        <div className="card-header text-center bg-primary text-white rounded-top-4 p-4">
          <h3 className="mb-0 fw-bold">Registro de Paciente</h3>
        </div>

        <div className="card-body p-5">
          {loading && <div className="alert alert-info mb-4">Registrando...</div>}
          {message && <div className="alert alert-success mb-4">{message}</div>}
          {generalError && <div className="alert alert-danger mb-4">{generalError}</div>} {/* Mostrar errores generales */}

          <form onSubmit={handleSubmit} noValidate>
            {/* Campo full_name */}
            <div className="form-floating mb-3">
              <input
                className={`form-control ${errors.full_name ? 'is-invalid' : ''}`}
                id="full_name"
                name="full_name"
                placeholder="Primer Nombre"
                required
                type="text"
                value={formData.full_name}
                onChange={handleChange}
              />
              <label htmlFor="full_name">
                <i className="bi bi-person-badge me-2 text-primary" />
                Primer Nombre
              </label>
              {errors.full_name && <div className="invalid-feedback">{errors.full_name}</div>}
            </div>

            {/* Campo last_name */}
            <div className="form-floating mb-3">
              <input
                className={`form-control ${errors.last_name ? 'is-invalid' : ''}`}
                id="last_name"
                name="last_name"
                placeholder="Apellido"
                required
                type="text"
                value={formData.last_name}
                onChange={handleChange}
              />
              <label htmlFor="last_name">
                <i className="bi bi-person-badge-fill me-2 text-primary" />
                Apellido
              </label>
              {errors.last_name && <div className="invalid-feedback">{errors.last_name}</div>}
            </div>

            {/* Campo document_type */}
            <div className="form-floating mb-3">
              <select
                className={`form-select ${errors.document_type ? 'is-invalid' : ''}`}
                id="document_type"
                name="document_type"
                required
                value={formData.document_type}
                onChange={handleChange}
              >
                <option value="">Seleccione...</option>
                <option value="cedula">Cédula</option>
                <option value="tarjeta de identidad">Tarjeta de Identidad</option>
                <option value="registro civil">Registro Civil</option>
              </select>
              <label htmlFor="document_type">
                <i className="bi bi-card-list me-2 text-primary" />
                Tipo de documento
              </label>
              {errors.document_type && <div className="invalid-feedback">{errors.document_type}</div>}
            </div>

            {/* Campo document_number */}
            <div className="form-floating mb-3">
              <input
                className={`form-control ${errors.document_number ? 'is-invalid' : ''}`}
                id="document_number"
                name="document_number"
                placeholder="Número de documento"
                required
                type="text"
                value={formData.document_number}
                onChange={handleChange}
              />
              <label htmlFor="document_number">
                <i className="bi bi-card-text me-2 text-primary" />
                Número de documento
              </label>
              {errors.document_number && <div className="invalid-feedback">{errors.document_number}</div>}
            </div>

            {/* Campo username */}
            <div className="form-floating mb-3">
              <input
                className={`form-control ${errors.username ? 'is-invalid' : ''}`}
                id="username"
                name="username"
                placeholder="Usuario"
                required
                type="text"
                value={formData.username}
                onChange={handleChange}
              />
              <label htmlFor="username">
                <i className="bi bi-person me-2 text-primary" />
                Usuario
              </label>
              {errors.username && <div className="invalid-feedback">{errors.username}</div>}
            </div>

            {/* Campo email */}
            <div className="form-floating mb-3">
              <input
                className={`form-control ${errors.email ? 'is-invalid' : ''}`}
                id="email"
                name="email"
                placeholder="Correo electrónico"
                required
                type="email"
                value={formData.email}
                onChange={handleChange}
              />
              <label htmlFor="email">
                <i className="bi bi-envelope me-2 text-primary" />
                Correo electrónico
              </label>
              {errors.email && <div className="invalid-feedback">{errors.email}</div>}
            </div>

            {/* Campo password */}
            <div className="form-floating mb-3">
              <input
                className={`form-control ${errors.password ? 'is-invalid' : ''}`}
                id="password"
                name="password"
                placeholder="Contraseña"
                required
                type="password"
                value={formData.password}
                onChange={handleChange}
              />
              <label htmlFor="password">
                <i className="bi bi-lock me-2 text-primary" />
                Contraseña
              </label>
              {errors.password && <div className="invalid-feedback">{errors.password}</div>}
            </div>

            {/* Campo birth_date */}
            <div className="form-floating mb-3">
              <input
                className={`form-control ${errors.birth_date ? 'is-invalid' : ''}`}
                id="birth_date"
                name="birth_date"
                placeholder="Fecha de nacimiento"
                required
                type="date"
                value={formData.birth_date}
                onChange={handleChange}
              />
              <label htmlFor="birth_date">
                <i className="bi bi-calendar-date me-2 text-primary" />
                Fecha de nacimiento
              </label>
              {errors.birth_date && <div className="invalid-feedback">{errors.birth_date}</div>}
            </div>

            {/* Campo phone */}
            <div className="form-floating mb-3">
              <input
                className={`form-control ${errors.phone ? 'is-invalid' : ''}`}
                id="phone"
                name="phone"
                placeholder="Teléfono"
                required
                type="tel"
                value={formData.phone}
                onChange={handleChange}
              />
              <label htmlFor="phone">
                <i className="bi bi-phone me-2 text-primary" />
                Teléfono
              </label>
              {errors.phone && <div className="invalid-feedback">{errors.phone}</div>}
            </div>

            {/* Campo address */}
            <div className="form-floating mb-3">
              <input
                className={`form-control ${errors.address ? 'is-invalid' : ''}`}
                id="address"
                name="address"
                placeholder="Dirección"
                required
                type="text"
                value={formData.address}
                onChange={handleChange}
              />
              <label htmlFor="address">
                <i className="bi bi-geo-alt me-2 text-primary" />
                Dirección
              </label>
              {errors.address && <div className="invalid-feedback">{errors.address}</div>}
            </div>

            <button
              className="btn btn-primary w-100 py-3 mt-4 fw-bold fs-5"
              type="submit"
              disabled={loading} // Deshabilitar el botón mientras se está cargando
            >
              <i className="bi bi-person-plus-fill me-2" />
              {loading ? 'Registrando...' : 'Registrar Paciente'}
            </button>
          </form>
        </div>
        <div className="card-footer text-muted text-center p-3">
          Hospital Central – Sistema de Gestión de Pacientes
        </div>
      </div>
    </div>
  );
};

export default PatientRegisterForm;