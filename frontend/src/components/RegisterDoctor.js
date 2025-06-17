  import React, { useState } from 'react';
  import axios from 'axios';
  import { useNavigate } from 'react-router-dom';
  import 'bootstrap/dist/css/bootstrap.min.css';
  import 'bootstrap-icons/font/bootstrap-icons.css';

  const especialidadesMedicas = [
    'Selecciona una especialidad',
    'Medicina General', 'Cardiología', 'Dermatología', 'Gastroenterología', 'Neurología',
    'Oftalmología', 'Pediatría', 'Psiquiatría', 'Urología', 'Anestesiología',
    'Cirugía General', 'Ginecología y Obstetricia', 'Medicina Interna', 'Nefrología',
    'Oncología', 'Otorrinolaringología', 'Radiología', 'Reumatología', 'Traumatología y Ortopedia',
  ];

  export default function RegisterDoctor() {
    const navigate = useNavigate();
    // Estado para cada campo del formulario del médico
    const [formData, setFormData] = useState({
      username: '',
      email: '',
      password: '',
      full_name: '', // Nombre completo del médico
      last_name: '', // Apellidos del médico
      identification_number: '', // Número de cédula/identificación del médico
      specialty: '',
      phone: '',
      license_number: '', // Número de licencia profesional del médico
    });

    // Estado para los errores de validación individuales por campo
    const [errors, setErrors] = useState({});
    // Estado para mensajes generales de éxito o error (ej. del servidor)
    const [message, setMessage] = useState('');
    const [generalError, setGeneralError] = useState('');
    // Estado para el indicador de carga (loading)
    const [loading, setLoading] = useState(false);

    const handleChange = (e) => {
      const { name, value } = e.target;
      setFormData((prev) => ({ ...prev, [name]: value }));
      // Limpiar el error específico de ese campo al cambiar su valor
      if (errors[name]) {
        setErrors((prevErrors) => ({
          ...prevErrors,
          [name]: null, // Establecer el error a null para que desaparezca
        }));
      }
      // Si la especialidad se cambia de "Selecciona una especialidad", limpiar el error general de especialidad
      if (name === 'specialty' && value !== '' && generalError.includes('especialidad')) {
          setGeneralError('');
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
      // Regex para email (formato general y máximo 30 caracteres)
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      // Regex para contraseña (mayúscula, minúscula, número, símbolo especial, 1-10 caracteres)
      const passwordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]).{1,10}$/;
      // Regex para teléfono (solo números, máximo 15 dígitos)
      const phoneRegex = /^\d{1,15}$/;
      // Regex para número de licencia (letras y números, máximo 20 caracteres)
      const licenseNumberRegex = /^[A-Za-z0-9]{1,20}$/;

      // Validación de full_name (Nombre completo)
      if (!formData.full_name) {
        tempErrors.full_name = 'El nombre es obligatorio.';
        isValid = false;
      } else if (!nameRegex.test(formData.full_name) || formData.full_name.trim().split(/\s+/).filter(Boolean).length > 2) {
        tempErrors.full_name = 'Nombre inválido (máximo dos palabras, solo letras).';
        isValid = false;
      }

      // Validación de last_name (Apellidos)
      if (!formData.last_name) {
        tempErrors.last_name = 'El apellido es obligatorio.';
        isValid = false;
      } else if (!nameRegex.test(formData.last_name) || formData.last_name.trim().split(/\s+/).filter(Boolean).length > 2) {
        tempErrors.last_name = 'Apellido inválido (máximo dos apellidos, solo letras).';
        isValid = false;
      }

      // Validación de identification_number (Número de Cédula)
      if (!formData.identification_number) {
        tempErrors.identification_number = 'El número de cédula es obligatorio.';
        isValid = false;
      } else if (!documentNumberRegex.test(formData.identification_number)) {
        tempErrors.identification_number = 'Número de cédula inválido (solo números, máximo 15 dígitos).';
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

      // Validación de specialty
      if (!formData.specialty || formData.specialty === 'Selecciona una especialidad') {
        tempErrors.specialty = 'Seleccione una especialidad.';
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

      // Validación de license_number
      if (!formData.license_number) {
        tempErrors.license_number = 'El número de licencia es obligatorio.';
        isValid = false;
      } else if (!licenseNumberRegex.test(formData.license_number)) {
          tempErrors.license_number = 'Número de licencia inválido (solo letras y números, máximo 20 caracteres).';
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
          const res = await axios.post(`${process.env.REACT_APP_BACKEND_URL}/api/doctor/register`, formData);

          if (res.data.doctor && typeof res.data.doctor.id === 'number') {
            localStorage.setItem('doctorId', res.data.doctor.id.toString());
            setMessage('¡Médico registrado exitosamente! Redirigiendo al dashboard...');
            setTimeout(() => navigate('/doctor-dashboard'), 1500);
          } else {
            // Esto puede ocurrir si el backend no devuelve el ID, pero el registro fue exitoso
            setMessage('¡Médico registrado exitosamente! Pero no se obtuvo el ID del médico. Redirigiendo al login...');
            setTimeout(() => navigate('/login'), 2000);
          }
        } catch (err) {
          console.error('Error al registrar médico:', err);
          const errorMessage = err.response?.data?.message || err.message || 'Error desconocido al registrar el médico.';
          setGeneralError(`Error al registrar el médico: ${errorMessage}`);
        } finally {
          setLoading(false); // Siempre deshabilitar el loading al finalizar la petición
        }
      } else {
        setLoading(false); // Deshabilitar loading si la validación del lado del cliente falla
        console.log('Errores de validación:', errors);
        setGeneralError('Por favor, corrige los errores en el formulario.'); // Mensaje general si hay errores de validación
      }
    };

    return (
      <div className="d-flex justify-content-center align-items-center min-vh-100 py-5">
        <div className="card shadow-lg border-0 rounded-4" style={{ maxWidth: '600px', width: '100%' }}>
          <div className="card-header text-center bg-primary text-white rounded-top-4 p-4">
            <h3 className="mb-0 fw-bold">Registro de Médico</h3>
          </div>

          <div className="card-body p-5">
            {loading && <div className="alert alert-info mb-4" role="alert">Registrando...</div>}
            {message && <div className="alert alert-success mb-4" role="alert">{message}</div>}
            {generalError && <div className="alert alert-danger mb-4" role="alert">{generalError}</div>}

            <form onSubmit={handleSubmit} noValidate>
              {/* Campos de texto y email - agrupados para reducir repetición */}
              {[
                { name: 'username', type: 'text', label: 'Usuario', icon: 'bi-person' },
                { name: 'email', type: 'email', label: 'Correo electrónico', icon: 'bi-envelope' },
                { name: 'password', type: 'password', label: 'Contraseña', icon: 'bi-lock' },
                { name: 'full_name', type: 'text', label: 'Nombre completo', icon: 'bi-person-badge' },
                { name: 'last_name', type: 'text', label: 'Apellidos', icon: 'bi-person-badge-fill' },
                { name: 'identification_number', type: 'text', label: 'Número de Cédula', icon: 'bi-credit-card' },
                { name: 'phone', type: 'tel', label: 'Teléfono', icon: 'bi-phone' },
                { name: 'license_number', type: 'text', label: 'Número de licencia', icon: 'bi-file-earmark-medical' },
              ].map(field => (
                <div className="form-floating mb-3" key={field.name}>
                  <input
                    type={field.type}
                    className={`form-control ${errors[field.name] ? 'is-invalid' : ''}`}
                    id={field.name}
                    name={field.name}
                    placeholder={field.label}
                    value={formData[field.name]}
                    onChange={handleChange}
                    required
                  />
                  <label htmlFor={field.name}>
                    <i className={`bi ${field.icon} me-2 text-primary`}></i>
                    {field.label}
                  </label>
                  {errors[field.name] && <div className="invalid-feedback">{errors[field.name]}</div>}
                </div>
              ))}

              {/* Campo specialty (Dropdown) */}
              <div className="form-floating mb-3">
                <select
                  className={`form-select ${errors.specialty ? 'is-invalid' : ''}`}
                  id="specialty"
                  name="specialty"
                  value={formData.specialty}
                  onChange={handleChange}
                  required
                >
                  {especialidadesMedicas.map((esp, i) => (
                    <option key={i} value={esp === 'Selecciona una especialidad' ? '' : esp}>
                      {esp}
                    </option>
                  ))}
                </select>
                <label htmlFor="specialty">
                  <i className="bi bi-award me-2 text-primary"></i>
                  Especialidad
                </label>
                {errors.specialty && <div className="invalid-feedback">{errors.specialty}</div>}
              </div>

              <button
                type="submit"
                className="btn btn-primary w-100 py-3 mt-4 fw-bold fs-5"
                disabled={loading}
              >
                <i className="bi bi-person-plus-fill me-2"></i>
                {loading ? 'Registrando...' : 'Registrar Médico'}
              </button>
            </form>
          </div>
          <div className="card-footer text-muted text-center p-3">
            Hospital Central – Sistema de Gestión de Médicos
          </div>
        </div>
      </div>
    );
  }