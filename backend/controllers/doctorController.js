const { Doctor, User } = require('../models');
const { Op } = require('sequelize'); // Importa Op para operadores de Sequelize (como iLike)

// Función para obtener todos los doctores
exports.getAllDoctors = async (req, res) => {
    try {
        const { specialty, name } = req.query; // Para filtros opcionales
        const whereClause = {};

        // Filtro por especialidad
        if (specialty) {
            whereClause.specialty = { [Op.iLike]: `%${specialty}%` }; // Búsqueda insensible a mayúsculas/minúsculas
        }
        // Filtro por nombre completo del doctor
        if (name) {
            whereClause.full_name = { [Op.iLike]: `%${name}%` };
        }

        // --- ¡MODIFICACIÓN YA REALIZADA! ---
        // Filtrar solo doctores que estén disponibles (is_available = true)
        whereClause.is_available = true; 
        // ---------------------------------

        // Incluye los datos del usuario asociado al doctor para obtener el email/username
        const doctors = await Doctor.findAll({
            where: whereClause,
            include: [
                {
                    model: User,
                    as: 'user', 
                    attributes: ['email', 'username'], 
                    required: true 
                }
            ],
            // Selecciona los nuevos campos ADEMÁS de los existentes
            attributes: ['id', 'full_name', 'last_name', 'identification_number', 'specialty', 'phone', 'license_number', 'is_available'] // 'is_available' ya incluido
        });

        res.status(200).json(doctors);
    } catch (error) {
        console.error('Error al obtener doctores:', error);
        res.status(500).json({ message: 'Error interno del servidor al obtener doctores.', error: error.message });
    }
};

// Función para obtener un doctor por ID (también con 'is_available' en atributos)
exports.getDoctorById = async (req, res) => {
    try {
        const { id } = req.params;
        const doctor = await Doctor.findByPk(id, {
            include: [
                {
                    model: User,
                    as: 'user', 
                    attributes: ['email', 'username']
                }
            ],
            attributes: ['id', 'full_name', 'last_name', 'identification_number', 'specialty', 'phone', 'license_number', 'is_available'] 
        });

        if (!doctor) {
            return res.status(404).json({ message: 'Doctor no encontrado.' });
        }
        res.status(200).json(doctor);
    } catch (error) {
        console.error('Error al obtener doctor por ID:', error);
        res.status(500).json({ message: 'Error interno del servidor.', error: error.message }); 
;
    }
};