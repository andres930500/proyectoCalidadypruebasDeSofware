// frontend/src/App.js

import React, { useState, useEffect, useRef, useCallback } from 'react'; // Agrega useCallback
import { Routes, Route, Navigate, useNavigate, useLocation } from 'react-router-dom';

// Importa tus componentes (ajustando las rutas según tu estructura)
import Navbar from './components/Navbar';

// Componentes de pages/
import DoctorDashboard from './pages/DoctorDashboard';
import Login from './pages/Login'; // Importa tu Login.jsx de la carpeta pages
import Home from './pages/Home';
import PatientDashboard from './pages/PatientDashboard';
import AdminDashboard from './pages/AdminDashboard';
import BookAppointment from './pages/BookAppointment';
import PatientAppointments from './pages/PatientAppointments';
import MedicalRecord from './pages/MedicalRecord'; 

// Importa tus componentes de registro (asumiendo que están en components/ y son solo formularios)
import Register from './components/Register'; 
import RegisterDoctor from './components/RegisterDoctor'; 
import RegisterPatient from './components/RegisterPatient'; 


export default function App() {
    const [authInfo, setAuthInfo] = useState(() => {
        const token = localStorage.getItem('token');
        const userId = localStorage.getItem('userId');
        const userRole = localStorage.getItem('userRole');
        const username = localStorage.getItem('username');
        const userEmail = localStorage.getItem('userEmail');
        const doctorId = localStorage.getItem('doctorId');

        console.log('DEBUG (App.js - useState Init): Cargando authInfo desde localStorage.');
        console.log('DEBUG (App.js - useState Init): token:', token ? 'Presente' : 'Ausente');
        console.log('DEBUG (App.js - useState Init): userId:', userId);
        console.log('DEBUG (App.js - useState Init): userRole:', userRole);

        return {
            isAuthenticated: !!token,
            userId: userId ? parseInt(userId, 10) : null,
            userRole: userRole || null,
            username: username || userEmail || null, // Prioriza username, si no email
            token: token || null,
            doctorId: doctorId || null
        };
    });

    const navigate = useNavigate();
    const location = useLocation();

    // useRef para controlar la navegación y evitar bucles
    const hasLoggedInNavigated = useRef(false);

    // Función para actualizar authInfo y controlar la bandera de navegación
    const updateAuthInfo = useCallback((newAuthInfo) => {
        console.log('DEBUG (App.js - updateAuthInfo): Llamada recibida para actualizar authInfo.');
        console.log('DEBUG (App.js - updateAuthInfo): Old authInfo.isAuthenticated:', authInfo.isAuthenticated);
        console.log('DEBUG (App.js - updateAuthInfo): New authInfo.isAuthenticated:', newAuthInfo.isAuthenticated);

        // Si el estado de autenticación cambia (de no autenticado a autenticado, o viceversa)
        if (authInfo.isAuthenticated !== newAuthInfo.isAuthenticated) {
            hasLoggedInNavigated.current = false; 
            console.log('DEBUG (App.js - updateAuthInfo): Estado de autenticación CAMBIÓ, reseteando hasLoggedInNavigated a false.');
        } else {
            console.log('DEBUG (App.js - updateAuthInfo): Estado de autenticación se MANTIENE. hasLoggedInNavigated NO se resetea por cambio de autenticación.');
        }
        setAuthInfo(newAuthInfo);
        console.log('DEBUG (App.js - updateAuthInfo): authInfo establecido. Nuevo estado:', newAuthInfo);
    }, [authInfo.isAuthenticated]); // Depende de authInfo.isAuthenticated para detectar cambios importantes

    // useEffect principal para la lógica de redirección post-autenticación
    useEffect(() => {
        console.log('--- DEBUG (App.js - useEffect redireccion): useEffect de redirección se ejecuta ---');
        console.log('DEBUG (App.js - useEffect redireccion): AuthInfo actual en useEffect:', authInfo);
        console.log('DEBUG (App.js - useEffect redireccion): Location Pathname actual en useEffect:', location.pathname);
        console.log('DEBUG (App.js - useEffect redireccion): hasLoggedInNavigated.current en useEffect:', hasLoggedInNavigated.current);

        const getTargetPath = (role) => {
            // Asegúrate que los roles aquí coincidan exactamente con lo que el backend envía
            // y lo que guardas en localStorage (ej. 'patient' vs 'paciente')
            if (role === 'doctor') return '/doctor-dashboard';
            if (role === 'paciente') return '/patient-dashboard'; // Asumiendo 'paciente' en minúsculas
            if (role === 'admin') return '/admin-dashboard';
            return ''; // Ruta por defecto si el rol no es reconocido
        };

        const targetPath = getTargetPath(authInfo.userRole);
        console.log('DEBUG (App.js - useEffect redireccion): Ruta objetivo calculada:', targetPath);

        // --- LÓGICA DE REDIRECCIÓN PARA USUARIOS AUTENTICADOS ---
        if (authInfo.isAuthenticated && authInfo.userRole) {
            console.log('DEBUG (App.js - useEffect redireccion): Usuario AUTENTICADO.');
            
            // Caso de "flicker" o si ya se había navegado
            if (location.pathname === '/login' && hasLoggedInNavigated.current) {
                console.log('DEBUG (App.js - useEffect redireccion): Detectado /login con hasLoggedInNavigated=true (flicker post-login). Ignorando esta redirección.');
                return; 
            }

            // Redirección si la ruta actual NO es la deseada Y aún no hemos navegado
            if (location.pathname !== targetPath && targetPath && !hasLoggedInNavigated.current) {
                console.log(`>>> DEBUG (App.js - useEffect redireccion): INICIANDO REDIRECCIÓN: de ${location.pathname} a ${targetPath}`);
                hasLoggedInNavigated.current = true; // Marcar como navegado
                // Usamos setTimeout para dar un respiro a React y evitar warnings de navegación síncrona
                setTimeout(() => {
                    navigate(targetPath, { replace: true });
                }, 0);
            } else if (location.pathname === targetPath && !hasLoggedInNavigated.current) {
                console.log('DEBUG (App.js - useEffect redireccion): Ya en la ruta correcta al inicio de la sesión. Marcando hasLoggedInNavigated como true.');
                hasLoggedInNavigated.current = true;
            } else if (location.pathname === targetPath && hasLoggedInNavigated.current) {
                console.log('DEBUG (App.js - useEffect redireccion): Ya en la ruta correcta. hasLoggedInNavigated se mantiene true para la sesión.');
            } else {
                console.log('DEBUG (App.js - useEffect redireccion): No se cumple ninguna condición de redirección para usuario autenticado.');
            }

        }
        // --- LÓGICA DE REDIRECCIÓN PARA USUARIOS NO AUTENTICADOS ---
        else if (!authInfo.isAuthenticated) {
            console.log('DEBUG (App.js - useEffect redireccion): Usuario NO AUTENTICADO.');
            const publicPaths = ['/', '/login', '/register', '/register-patient', '/register-doctor', '/unauthorized'];
            
            // Si el usuario no está autenticado y NO está en una ruta pública
            if (!publicPaths.includes(location.pathname) && !location.pathname.startsWith('/doctor/medical-record')) {
                console.log('>>> DEBUG (App.js - useEffect redireccion): USUARIO NO AUTENTICADO en ruta protegida. Redirigiendo a /login.');
                hasLoggedInNavigated.current = false; // Resetear la bandera si es desautenticado
                setTimeout(() => {
                    navigate('/login', { replace: true });
                }, 0);
            } else {
                console.log('DEBUG (App.js - useEffect redireccion): Usuario no autenticado y ya en una ruta pública o de registro.');
            }
        }
        console.log('DEBUG (App.js - useEffect redireccion): hasLoggedInNavigated.current DESPUÉS de la lógica del useEffect:', hasLoggedInNavigated.current);
        console.log('--- DEBUG (App.js - useEffect redireccion): Fin del useEffect de redirección ---');

    }, [authInfo.isAuthenticated, authInfo.userRole, navigate, location.pathname]); // Dependencias del useEffect

    // Función para cerrar sesión (si la usas en Navbar)
    const logout = () => {
        console.log('DEBUG (App.js - logout): Cerrando sesión...');
        localStorage.clear(); // Limpia todo el localStorage
        setAuthInfo({
            isAuthenticated: false,
            userId: null,
            userRole: null,
            username: null,
            token: null,
            doctorId: null,
        });
        hasLoggedInNavigated.current = false; // Resetear también al cerrar sesión
        navigate('/login', { replace: true }); // Redirige al login después de cerrar sesión
    };

    // Componente de Ruta Protegida reutilizable
    const ProtectedRoute = ({ children, allowedRoles }) => {
        console.log('DEBUG (App.js - ProtectedRoute): Comprobando acceso para ruta:', location.pathname);
        console.log('DEBUG (App.js - ProtectedRoute): isAuthenticated:', authInfo.isAuthenticated, 'userRole:', authInfo.userRole, 'allowedRoles:', allowedRoles);

        if (!authInfo.isAuthenticated) {
            console.log('DEBUG (App.js - ProtectedRoute): No autenticado (fallback), redirigiendo a /login');
            // Usamos setTimeout para no interferir con el ciclo de renderizado actual
            setTimeout(() => navigate('/login', { replace: true }), 0); 
            return null; // O un spinner/mensaje de carga mientras redirige
        }

        // Asegúrate que el rol en authInfo.userRole sea el esperado (ej. 'paciente' en minúsculas)
        if (allowedRoles && (!authInfo.userRole || !allowedRoles.includes(authInfo.userRole))) {
            console.log(`DEBUG (App.js - ProtectedRoute): Rol '${authInfo.userRole}' no permitido para roles: ${allowedRoles.join(', ')}. Redirigiendo a /unauthorized`);
            setTimeout(() => navigate('/unauthorized', { replace: true }), 0);
            return null; // O un spinner/mensaje de carga
        }

        console.log(`DEBUG (App.js - ProtectedRoute): Acceso permitido para rol '${authInfo.userRole}' a la ruta ${location.pathname}.`);
        return children;
    };

    return (
        <>
            {/* Asegúrate de pasar updateAuthInfo a Navbar y la función logout */}
            <Navbar authInfo={authInfo} setAuthInfo={updateAuthInfo} logout={logout} /> 
            <div className="container mt-4">
                <Routes>
                    <Route path="/" element={<Home />} />
                    {/* Asegúrate de pasar updateAuthInfo a Login */}
                    <Route path="/login" element={<Login updateAuthInfo={updateAuthInfo} />} /> 

                    {/* Rutas de registro */}
                    <Route path="/register-patient" element={<RegisterPatient />} />
                    <Route path="/register-doctor" element={<RegisterDoctor />} />
                    <Route path="/register" element={<Register />} />

                    {/* Rutas protegidas usando el componente ProtectedRoute */}
                    <Route
                        path="/doctor-dashboard"
                        element={
                            <ProtectedRoute allowedRoles={['doctor']}>
                                <DoctorDashboard />
                            </ProtectedRoute>
                        }
                    />
                    <Route
                        path="/patient-dashboard"
                        element={
                            <ProtectedRoute allowedRoles={['paciente']}> {/* <<--- Asegúrate que el rol es 'paciente' */}
                                <PatientDashboard />
                            </ProtectedRoute>
                        }
                    />
                    <Route
                        path="/admin-dashboard"
                        element={
                            <ProtectedRoute allowedRoles={['admin']}>
                                <AdminDashboard />
                            </ProtectedRoute>
                        }
                    />

                    {/* RUTA PARA AGENDAR CITAS */}
                    <Route
                        path="/book-appointment"
                        element={
                            <ProtectedRoute allowedRoles={['paciente']}>
                                <BookAppointment />
                            </ProtectedRoute>
                        }
                    />

                    {/* RUTA PARA VER CITAS DEL PACIENTE */}
                    <Route
                        path="/patient-appointments"
                        element={
                            <ProtectedRoute allowedRoles={['paciente']}>
                                <PatientAppointments />
                            </ProtectedRoute>
                        }
                    />
                    
                    {/* ¡NUEVA RUTA PARA EL HISTORIAL MÉDICO! */}
                    <Route 
                        path="/doctor/medical-record/:patientId/:appointmentId?" 
                        element={
                            <ProtectedRoute allowedRoles={['doctor']}>
                                <MedicalRecord />
                            </ProtectedRoute>
                        } 
                    />

                    {/* Ruta para acceso no autorizado */}
                    <Route path="/unauthorized" element={
                        <div className="container mt-5 alert alert-warning text-center">
                            <h4>Acceso No Autorizado</h4>
                            <p>No tienes los permisos necesarios para ver esta página.</p>
                            <button className="btn btn-primary" onClick={() => navigate('/login')}>Ir a Iniciar Sesión</button>
                        </div>
                    } />

                    {/* Ruta por defecto para cualquier otra URL no definida */}
                    {/* Si un usuario autenticado va a '/', lo redirige a su dashboard.
                        Si un usuario NO autenticado va a '/', lo deja en Home.
                        Si Home no es tu landing page para no autenticados, ajusta esto.
                    */}
                    <Route path="*" element={<Navigate to="/" replace />} />
                </Routes>
            </div>
        </>
    );
}