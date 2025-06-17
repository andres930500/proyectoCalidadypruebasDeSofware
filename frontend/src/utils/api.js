// frontend/src/utils/api.js

import axios from 'axios';

const api = axios.create({
    baseURL: 'http://localhost:5000/api', // Asegúrate de que esta URL sea la de tu backend
    headers: {
        'Content-Type': 'application/json',
    },
});

// Interceptor para añadir el token de autenticación a cada solicitud saliente
api.interceptors.request.use(
    (config) => {
        const token = localStorage.getItem('token');
        if (token) {
            config.headers.Authorization = `Bearer ${token}`; // Tu backend espera 'Bearer token'
        }
        return config;
    },
    (error) => {
        return Promise.reject(error);
    }
);

// Opcional: Interceptor para manejar errores de respuesta (ej. token expirado)
api.interceptors.response.use(
    (response) => response,
    (error) => {
        // Ejemplo: Si el token es inválido/expirado (401), redirigir al login
        if (error.response && error.response.status === 401) {
            console.error('API Error: Token expirado o inválido. Redirigiendo al login.');
            localStorage.clear(); // Limpiar datos de autenticación
            // Puedes usar window.location.href o useNavigate si este archivo tiene acceso al router.
            // Para simplicidad en un interceptor, a veces se usa window.location
            window.location.href = '/login'; // O una ruta específica de error/login
        }
        return Promise.reject(error);
    }
);

export default api;