import React, { useState } from 'react';
import axios from 'axios';

const Register = () => {
  const [formData, setFormData] = useState({
    username: '',
    email: '',
    password: '',
    role: 'paciente',
  });

  const [mensaje, setMensaje] = useState('');

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
const res = await axios.post('http://localhost:5000/api/auth/register', formData);
      setMensaje(res.data.message);
    } catch (error) {
      setMensaje(error.response?.data?.message || 'Error en el registro');
    }
  };

  return (
    <div className="container mt-5">
      <h2>Registro</h2>
      <form onSubmit={handleSubmit}>
        <input type="text" name="username" placeholder="Nombre de usuario" onChange={handleChange} required />
        <input type="email" name="email" placeholder="Correo" onChange={handleChange} required />
        <input type="password" name="password" placeholder="Contraseña" onChange={handleChange} required />
        <select name="role" onChange={handleChange}>
          <option value="paciente">Paciente</option>
          <option value="doctor">Doctor</option>
          <option value="admin">Administrador</option>
        </select>
        <button type="submit">Registrarse</button>
      </form>
      {mensaje && <p>{mensaje}</p>}
    </div>
  );
};

export default Register;
