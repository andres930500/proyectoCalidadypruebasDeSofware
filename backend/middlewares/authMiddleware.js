    // backend/middlewares/authMiddleware.js

    const jwt = require('jsonwebtoken');

    // Middleware para proteger rutas, verifica el token JWT
    exports.authenticateToken = (req, res, next) => { // <--- CAMBIO AQUÍ: Renombrado a authenticateToken
        const authHeader = req.headers.authorization;

        if (!authHeader || !authHeader.startsWith('Bearer ')) {
            console.log('DEBUG (authenticateToken): No se proporcionó token de autenticación o formato inválido.');
            return res.status(401).json({ message: 'No se proporcionó token de autenticación o formato inválido.' });
        }

        const token = authHeader.split(' ')[1];
        console.log('DEBUG (authenticateToken): Token recibido y extraído.');

        try {
            const decoded = jwt.verify(token, process.env.JWT_SECRET);
            req.user = {
                userId: decoded.userId,
                // CRÍTICO! Asegurarse de que el rol esté limpio y en minúsculas
                role: decoded.role ? String(decoded.role).trim().toLowerCase() : null
            };
            console.log('DEBUG (authenticateToken): Token decodificado exitosamente.');
            console.log(`DEBUG (authenticateToken): req.user.userId: ${req.user.userId}, req.user.role: '${req.user.role}'`);
            console.log(`DEBUG (authenticateToken): Longitud de req.user.role: ${req.user.role ? req.user.role.length : 'N/A'}`);

            // ****** IMPORTANTE PARA EL HISTORIAL MÉDICO ******
            // Asegurarse de adjuntar el doctorId si el usuario es un doctor.
            // Asumo que tu token JWT para doctores incluye 'doctorId'.
            if (req.user.role === 'doctor' && decoded.doctorId) {
                req.user.doctorId = decoded.doctorId;
                console.log(`DEBUG (authenticateToken): Doctor ID adjuntado: ${req.user.doctorId}`);
            }
            // También puedes adjuntar patientId si es necesario para el frontend en el futuro
            // if (req.user.role === 'patient' && decoded.patientId) {
            //     req.user.patientId = decoded.patientId;
            //     console.log(`DEBUG (authenticateToken): Patient ID adjuntado: ${req.user.patientId}`);
            // }
            // ************************************************

            next();
        } catch (error) {
            console.error('ERROR (authenticateToken): Error al verificar token:', error);
            if (error.name === 'TokenExpiredError') {
                return res.status(401).json({ message: 'Token expirado. Por favor, inicie sesión de nuevo.' });
            }
            return res.status(401).json({ message: 'Token inválido. Por favor, inicie sesión de nuevo.' });
        }
    };

    // Middleware para autorizar roles específicos
    exports.authorizeRole = (roles) => { // <--- CAMBIO AQUÍ: Renombrado a authorizeRole (singular)
        return (req, res, next) => {
            console.log('DEBUG (authorizeRole): --- INICIO de verificación de roles ---');
            if (!req.user || !req.user.role) {
                console.warn('DEBUG (authorizeRole): No se encontró información de usuario o rol en req.user (después de authenticateToken).');
                return res.status(401).json({ message: 'No hay información de rol en el token.' });
            }

            const userRole = req.user.role;
            // CRÍTICO: Asegurarse de que los roles permitidos también se manejen en minúsculas y sin espacios
            const lowerCasePermittedRoles = roles.map(role => String(role).trim().toLowerCase());

            console.log(`DEBUG (authorizeRole): Rol del usuario (req.user.role): '${userRole}' (Longitud: ${userRole.length})`);
            console.log(`DEBUG (authorizeRole): Roles permitidos para esta ruta: ${lowerCasePermittedRoles.join(', ')}`);

            if (!lowerCasePermittedRoles.includes(userRole)) {
                console.warn(`DEBUG (authorizeRole): Autorización denegada: Rol del usuario '${userRole}' NO está en la lista de roles permitidos: ${lowerCasePermittedRoles.join(', ')}.`);
                return res.status(403).json({ message: 'Acceso denegado. No tienes permisos para esta acción.' });
            }
            console.log(`DEBUG (authorizeRole): Autorización concedida: Rol '${userRole}' está permitido.`);
            next();
            console.log('DEBUG (authorizeRole): --- FIN de verificación de roles ---');
        };
    };