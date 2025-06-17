const { User, Doctor, Patient, Appointment } = require('../models'); // Importa todos los modelos necesarios desde index.js
const bcrypt = require('bcryptjs'); // Para hashear contraseñas
const { Op } = require('sequelize'); // Para operadores de Sequelize como LIKE, OR, etc. si los necesitas

// --- Gestión de Usuarios (Altas/Bajas) ---

// POST /api/admin/doctors
// Crea un nuevo usuario con rol 'doctor' y su entrada en la tabla 'doctors'
exports.createDoctor = async (req, res) => {
    // Asegúrate de que estos nombres de campos coincidan con los del frontend
    const { username, email, password, full_name, phone, specialty, license_number, last_name, identification_number } = req.body;
    try {
        // 1. Validar si el email o username ya existen
        let userExists = await User.findOne({
            where: {
                [Op.or]: [{ email: email }, { username: username }]
            }
        });
        if (userExists) {
            return res.status(400).json({ msg: 'El email o nombre de usuario ya están registrados.' });
        }

        // 2. Hash de la contraseña
        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash(password, salt);

        // 3. Crear el usuario general con rol 'doctor'
        const newUser = await User.create({
            username,
            email,
            password: hashedPassword,
            role: 'doctor'
        });

        // 4. Crear la entrada en la tabla 'doctors' y asociarla al newUser.id
        // El campo is_available se llenará automáticamente con su defaultValue (true)
        const newDoctor = await Doctor.create({
            user_id: newUser.id, // Relacionar con el ID del User
            full_name: full_name, // Ahora toma el full_name del request body
            last_name: last_name, // NUEVO CAMPO
            identification_number: identification_number, // NUEVO CAMPO
            specialty,
            phone,
            license_number
        });

        res.status(201).json({ msg: 'Médico registrado exitosamente', user: newUser, doctor: newDoctor });
    } catch (err) {
        console.error('Error al crear médico:', err);
        res.status(500).json({ msg: 'Error del servidor al crear médico.', error: err.message });
    }
};

// POST /api/admin/patients
// Crea un nuevo usuario con rol 'paciente' y su entrada en la tabla 'patients'
exports.createPatient = async (req, res) => {
    // Asegúrate de que estos nombres de campos coincidan con los del frontend
    const {
        username,
        email,
        password,
        full_name,
        birth_date,
        phone,
        address,
        last_name,         // ¡NUEVO CAMPO!
        document_type,     // ¡NUEVO CAMPO!
        document_number    // ¡NUEVO CAMPO!
    } = req.body; // <-- AGREGADO AL DESTRUCTURING

    try {
        // 1. Validar si el email, username o número de documento ya existen (número de documento es unique)
        let userExists = await User.findOne({
            where: {
                [Op.or]: [{ email: email }, { username: username }]
            }
        });
        if (userExists) {
            return res.status(400).json({ msg: 'El email o nombre de usuario ya están registrados.' });
        }
        // Validar si el número de documento ya existe en la tabla Patient (si es único)
        let patientDocExists = await Patient.findOne({
            where: { document_number: document_number }
        });
        if (patientDocExists) {
            return res.status(400).json({ msg: 'El número de documento ya está registrado para otro paciente.' });
        }


        // 2. Hash de la contraseña
        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash(password, salt);

        // 3. Crear el usuario general con rol 'paciente'
        const newUser = await User.create({
            username,
            email,
            password: hashedPassword,
            role: 'paciente' // Asegúrate que el rol sea 'paciente' (consistente con tu ENUM)
        });

        // 4. Crear la entrada en la tabla 'patients' y asociarla al newUser.id
        const newPatient = await Patient.create({
            user_id: newUser.id,
            full_name: full_name,
            last_name: last_name,           // ¡NUEVO CAMPO ASIGNADO!
            document_type: document_type,   // ¡NUEVO CAMPO ASIGNADO!
            document_number: document_number, // ¡NUEVO CAMPO ASIGNADO!
            birth_date,
            phone,
            address
        });

        res.status(201).json({ msg: 'Paciente registrado exitosamente', user: newUser, patient: newPatient });
    } catch (err) {
        console.error('Error al crear paciente:', err);
        // Mejor manejo de errores para unique constraints
        if (err.name === 'SequelizeUniqueConstraintError') {
            return res.status(409).json({ msg: 'Conflicto de datos: El usuario, email o número de documento ya existen.' });
        }
        res.status(500).json({ msg: 'Error del servidor al crear paciente.', error: err.message });
    }
};

// GET /api/admin/doctors
// Obtiene todos los médicos con su información de usuario asociada
exports.getAllDoctors = async (req, res) => {
    try {
        const doctors = await Doctor.findAll({
            include: [{
                model: User,
                as: 'user', // Usar el alias definido en las asociaciones
                attributes: ['id', 'username', 'email'] // Seleccionar solo los campos necesarios del User
            }],
            attributes: [ // Atributos específicos del Doctor
                'id',
                'full_name',
                'last_name',
                'identification_number',
                'specialty',
                'phone',
                'license_number',
                'is_available' // <<<--- ¡AÑADIDO! Incluye el nuevo campo de disponibilidad
            ]
        });
        res.json(doctors);
    } catch (err) {
        console.error('Error al obtener médicos:', err);
        res.status(500).json({ msg: 'Error del servidor al obtener médicos.', error: err.message });
    }
};

// GET /api/admin/patients
// Obtiene todos los pacientes con su información de usuario asociada
exports.getAllPatients = async (req, res) => {
    try {
        const patients = await Patient.findAll({
            include: [{
                model: User,
                as: 'user', // Usar el alias definido en las asociaciones
                attributes: ['id', 'username', 'email']
            }],
            attributes: [ // Atributos específicos del paciente
                'id',
                'full_name',
                'last_name',
                'document_type',
                'document_number',
                'birth_date',
                'phone',
                'address'
            ]
        });
        res.json(patients);
    } catch (err) {
        console.error('Error al obtener pacientes:', err);
        res.status(500).json({ msg: 'Error del servidor al obtener pacientes.', error: err.message });
    }
};

// DELETE /api/admin/users/:userId
// Elimina un usuario (médico o paciente) y sus entradas asociadas
exports.deleteUser = async (req, res) => {
    const { userId } = req.params;
    try {
        const userToDelete = await User.findByPk(userId);

        if (!userToDelete) {
            return res.status(404).json({ msg: 'Usuario no encontrado.' });
        }

        // Determinar el rol del usuario para eliminar las entradas específicas
        if (userToDelete.role === 'doctor') {
            const doctor = await Doctor.findOne({ where: { user_id: userId } });
            if (doctor) {
                // Al eliminar el Doctor, las citas y el historial médico asociados se eliminarán en cascada.
                await doctor.destroy();
            }
        } else if (userToDelete.role === 'paciente') { // Cambiado de 'patient' a 'paciente' para consistencia
            const patient = await Patient.findOne({ where: { user_id: userId } });
            if (patient) {
                // Al eliminar el Patient, las citas y el historial médico asociados se eliminarán en cascada.
                await patient.destroy();
            }
        } else if (userToDelete.role === 'admin') {
            // Opcional: Prohibir la eliminación de administradores a través de esta ruta
            return res.status(403).json({ msg: 'No se puede eliminar un administrador desde esta interfaz.' });
        }

        // Finalmente, eliminar el registro de la tabla 'users'
        await userToDelete.destroy();

        res.json({ msg: 'Usuario eliminado exitosamente.' });
    } catch (err) {
        console.error('Error al eliminar usuario:', err);
        res.status(500).json({ msg: 'Error del servidor al eliminar usuario.', error: err.message });
    }
};

// --- ¡NUEVO ENDPOINT! Actualiza la disponibilidad de un médico ---
// PATCH /api/admin/doctors/:doctorId/availability
exports.updateDoctorAvailability = async (req, res) => {
    const { doctorId } = req.params;
    const { is_available } = req.body; // Esperamos un booleano (true/false) desde el frontend

    // Validar que is_available sea un booleano
    if (typeof is_available !== 'boolean') {
        return res.status(400).json({ msg: 'El valor de "is_available" debe ser un booleano (true o false).' });
    }

    try {
        const doctor = await Doctor.findByPk(doctorId);

        if (!doctor) {
            return res.status(404).json({ msg: 'Médico no encontrado.' });
        }

        // Actualizar el campo is_available
        doctor.is_available = is_available;
        await doctor.save(); // Guarda los cambios en la base de datos

        res.json({ msg: `Disponibilidad del médico actualizada a ${is_available ? 'disponible' : 'ausente'}.`, doctor });
    } catch (err) {
        console.error('Error al actualizar la disponibilidad del médico:', err);
        res.status(500).json({ msg: 'Error del servidor al actualizar la disponibilidad del médico.', error: err.message });
    }
};


// --- Visualización de Agenda Global ---

// GET /api/admin/appointments/global
// Obtiene todas las citas, incluyendo información del paciente y el médico asociados.
exports.getGlobalAppointments = async (req, res) => {
    try {
        const appointments = await Appointment.findAll({
            include: [
                {
                    model: Patient,
                    // Incluye los nuevos campos del paciente aquí
                    attributes: ['full_name', 'last_name', 'document_type', 'document_number', 'phone'],
                    include: [{
                        model: User,
                        as: 'user', // Alias para el User asociado al Patient
                        attributes: ['email'] // Solo el email del User
                    }]
                },
                {
                    model: Doctor,
                    // Incluye los nuevos campos del doctor aquí y el is_available
                    attributes: ['full_name', 'last_name', 'identification_number', 'specialty', 'phone', 'is_available'], // <<<--- ¡AÑADIDO: is_available!
                    include: [{
                        model: User,
                        as: 'user', // Alias para el User asociado al Doctor
                        attributes: ['email'] // Solo el email del User
                    }]
                }
            ],
            order: [['appointment_date', 'ASC'], ['appointment_time', 'ASC']] // Ordenar por fecha y hora
        });

        // Formatear la respuesta para el frontend si es necesario,
        // por ejemplo, para tener un objeto más plano con los nombres directamente.
        const formattedAppointments = appointments.map(appt => ({
            id: appt.id,
            patientName: appt.Patient ? `${appt.Patient.full_name} ${appt.Patient.last_name || ''}`.trim() : 'N/A', // Concatenar nombre y apellido
            patientDocumentType: appt.Patient ? appt.Patient.document_type : 'N/A', // Incluir tipo de documento
            patientDocumentNumber: appt.Patient ? appt.Patient.document_number : 'N/A', // Incluir número de documento
            patientPhone: appt.Patient ? appt.Patient.phone : 'N/A',
            patientEmail: appt.Patient && appt.Patient.user ? appt.Patient.user.email : 'N/A',

            doctorName: appt.Doctor ? `${appt.Doctor.full_name} ${appt.Doctor.last_name || ''}`.trim() : 'N/A', // Concatenar nombre y apellido
            doctorSpecialty: appt.Doctor ? appt.Doctor.specialty : 'N/A',
            doctorLicenseNumber: appt.Doctor ? appt.Doctor.license_number : 'N/A', // Puedes incluirlo si lo necesitas
            doctorIdentificationNumber: appt.Doctor ? appt.Doctor.identification_number : 'N/A', // Incluir el nuevo campo
            doctorPhone: appt.Doctor ? appt.Doctor.phone : 'N/A',
            doctorEmail: appt.Doctor && appt.Doctor.user ? appt.Doctor.user.email : 'N/A',
            doctorIsAvailable: appt.Doctor ? appt.Doctor.is_available : null, // <<<--- ¡AÑADIDO: is_available!

            date: appt.appointment_date,
            time: appt.appointment_time,
            status: appt.status,
            notes: appt.notes,
            createdAt: appt.created_at
        }));

        res.json(formattedAppointments);
    } catch (err) {
        console.error('Error al obtener la agenda global:', err);
        res.status(500).json({ msg: 'Error del servidor al obtener la agenda global.', error: err.message });
    }
};