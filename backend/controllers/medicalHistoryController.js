const { MedicalHistory, Patient, Doctor, User } = require('../models');
const { Op } = require('sequelize');

// Función para obtener el historial médico por patient_id (el ID de la tabla Patient)
exports.getMedicalHistoryByPatientId = async (req, res) => {
    try {
        const patientId = req.params.patientId; // Este es el ID de la tabla Patient

        const medicalHistory = await MedicalHistory.findAll({
            where: { patient_id: patientId },
            include: [
                {
                    model: Patient,
                    as: 'Patient', // Asegúrate de que esta asociación 'as' sea correcta en tus modelos
                    include: {
                        model: User,
                        as: 'user', // Asegúrate de que esta asociación 'as' sea correcta en tus modelos
                        attributes: ['username', 'email'],
                        required: false // Añadido para permitir pacientes sin User asociado (evitar INNER JOIN si no existe)
                    },
                    // *** AQUÍ SE AGREGAN LOS NUEVOS ATRIBUTOS DEL PACIENTE ***
                    attributes: ['id', 'full_name', 'last_name', 'document_type', 'document_number', 'birth_date', 'phone', 'address']
                },
                {
                    model: Doctor,
                    as: 'Doctor', // Asegúrate de que esta asociación 'as' sea correcta en tus modelos
                    // También podrías añadir 'last_name' y 'identification_number' si quieres el detalle completo del doctor
                    attributes: ['id', 'full_name', 'specialty']
                }
            ],
            // Cambiado 'createdAt' a 'created_at' para coincidir con la base de datos y evitar el error de columna inexistente
            order: [['created_at', 'DESC']]
        });

        // Se devuelve 200 con array vacío si no hay historial, en lugar de 404
        res.status(200).json(medicalHistory);

    } catch (error) {
        console.error('Error al obtener historial médico por patientId:', error);
        res.status(500).json({ message: 'Error interno del servidor al obtener historial médico.', error: error.message });
    }
};

// Función para crear una nueva entrada de historial médico
exports.createMedicalHistory = async (req, res) => {
    try {
        const { patient_id, doctor_id, appointment_id, observations } = req.body; // 'observations' como nombre de campo

        // Opcional: Validación adicional (ej. si el doctor_id del token coincide con el enviado)
        // Se asume que req.user.doctorId ya está disponible si el usuario es un doctor.
        // Si no, necesitarías obtener el doctor_id del user_id del token:
        // const doctor = await Doctor.findOne({ where: { user_id: req.user.userId } });
        // if (req.user.role !== 'doctor' || !doctor || doctor.id !== doctor_id) {
        //     return res.status(403).json({ message: 'No autorizado para crear registros para este doctor.' });
        // }

        const newRecord = await MedicalHistory.create({
            patient_id,
            doctor_id,
            appointment_id,
            observations, // Campo 'observations' para la nota
        });

        res.status(201).json({ message: 'Registro médico creado exitosamente', record: newRecord });
    } catch (error) {
        console.error('Error al crear registro médico:', error);
        res.status(500).json({ message: 'Error interno del servidor al crear registro médico.', error: error.message });
    }
};

// Función para obtener un paciente por ID (para buscar por USER_ID y devolver datos de PATIENT)
// Esta ruta se usa para obtener los datos del paciente para el encabezado del historial
exports.getPatientById = async (req, res) => {
    try {
        const patientUserId = req.params.id; // Este es el ID del usuario (de la tabla Users)

        // Verificación de autenticación y rol (viene del middleware authenticateToken y authorizeRole)
        const requestingUserId = req.user.userId;
        const requestingUserRole = req.user.role;

        // Primero, busca el User para obtener su rol y asegurarse de que existe
        const user = await User.findByPk(patientUserId);
        if (!user || user.role !== 'paciente') { // Asegúrate que el rol sea 'paciente' si ese es tu ENUM
            return res.status(404).json({ message: 'Usuario no encontrado o no es un paciente.' });
        }

        // Si el usuario que hace la petición es un paciente, solo puede ver su propio perfil
        // Los doctores y administradores pueden ver cualquier perfil de paciente (gracias al authorizeRole)
        if (requestingUserRole === 'paciente' && parseInt(patientUserId) !== requestingUserId) { // 'paciente' en minúsculas
            return res.status(403).json({ message: 'Acceso denegado. Solo puedes ver tu propio perfil.' });
        }

        // Buscar el perfil del paciente usando el user_id asociado
        const patientProfile = await Patient.findOne({
            where: { user_id: patientUserId }, // CLAVE: Buscar en Patient por su user_id
            include: {
                model: User,
                as: 'user', // Asegúrate de que esta asociación 'as' sea correcta
                attributes: ['id', 'username', 'email', 'role']
            },
            // *** AQUÍ SE AGREGAN LOS NUEVOS ATRIBUTOS DEL PACIENTE ***
            attributes: ['id', 'full_name', 'last_name', 'document_type', 'document_number', 'birth_date', 'phone', 'address']
        });

        if (!patientProfile) {
            console.log(`DEBUG: Perfil de paciente con user_id ${patientUserId} no encontrado en la tabla Patients.`);
            return res.status(404).json({ message: 'Perfil de paciente no encontrado.' });
        }

        // Combinar los datos del usuario y del paciente para enviarlos al frontend
        const responseData = {
            id: patientProfile.id, // Este es el ID REAL del paciente (de la tabla Patients)
            full_name: patientProfile.full_name,
            last_name: patientProfile.last_name, // Nuevo campo
            document_type: patientProfile.document_type, // Nuevo campo
            document_number: patientProfile.document_number, // Nuevo campo
            birth_date: patientProfile.birth_date,
            phone: patientProfile.phone,
            address: patientProfile.address,
            username: patientProfile.user.username,
            email: patientProfile.user.email,
            role: patientProfile.user.role,
        };

        res.status(200).json(responseData);

    } catch (error) {
        console.error('Error al obtener paciente por ID (medicalHistoryController):', error);
        res.status(500).json({ message: 'Error interno del servidor al obtener el perfil del paciente.', error: error.message });
    }
};

// Función para obtener un perfil de paciente directamente por su ID de la tabla 'patients'
exports.getPatientProfileById = async (req, res) => {
    try {
        const patientProfileId = req.params.patientProfileId; // Este es el ID de la tabla Patient (PK)

        const patientProfile = await Patient.findByPk(patientProfileId, {
            include: {
                model: User,
                as: 'user', // Asegúrate de que esta asociación 'as' sea correcta (minúscula)
                attributes: ['id', 'username', 'email', 'role'],
                required: false // Permite que el perfil del paciente se encuentre incluso si no tiene un User asociado
            },
            // *** AQUÍ SE AGREGAN LOS NUEVOS ATRIBUTOS DEL PACIENTE ***
            attributes: ['id', 'full_name', 'last_name', 'document_type', 'document_number', 'birth_date', 'phone', 'address']
        });

        if (!patientProfile) {
            console.log(`Perfil de paciente con ID ${patientProfileId} no encontrado.`);
            return res.status(404).json({ message: 'Perfil de paciente no encontrado.' });
        }

        // Devolvemos el objeto Patient junto con los datos de User anidados
        const responseData = {
            id: patientProfile.id, // ID de la tabla Patient
            full_name: patientProfile.full_name,
            last_name: patientProfile.last_name, // Nuevo campo
            document_type: patientProfile.document_type, // Nuevo campo
            document_number: patientProfile.document_number, // Nuevo campo
            birth_date: patientProfile.birth_date,
            phone: patientProfile.phone,
            address: patientProfile.address,
            // Usar encadenamiento opcional en caso de que el User asociado sea nulo
            username: patientProfile.user?.username || null,
            email: patientProfile.user?.email || null,
            role: patientProfile.user?.role || null,
        };

        res.status(200).json(responseData);

    } catch (error) {
        console.error('Error al obtener perfil de paciente:', error);
        res.status(500).json({ message: 'Error interno del servidor al obtener el perfil del paciente.', error: error.message });
    }
};