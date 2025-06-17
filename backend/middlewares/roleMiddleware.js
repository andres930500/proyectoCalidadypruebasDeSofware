// backend/middlewares/roleMiddleware.js
const roleMiddleware = (allowedRoles) => {
    return (req, res, next) => {
        if (!req.user || !req.user.role) {
            return res.status(403).json({ message: 'Acceso denegado: Rol de usuario no disponible.' });
        }
        // Este console.log es útil para depurar el rol que se está evaluando
        console.log(`DEBUG (authorizeRole): Roles permitidos para esta ruta: ${allowedRoles.join(', ')}`);
        console.log(`DEBUG (authorizeRole): Rol del usuario '${req.user.role}'`);

        if (!allowedRoles.includes(req.user.role)) {
            // Este es el mensaje que vemos en tu depuración
            return res.status(403).json({ message: `Acceso denegado. Rol del usuario '${req.user.role}' NO está en la lista de roles permitidos: ${allowedRoles.join(', ')}.` });
        }
        next();
    };
};

module.exports = roleMiddleware;