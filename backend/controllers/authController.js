// controllers/authController.js
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { User, Doctor, Patient } = require('../models'); // Asegúrate de que Patient esté importado aquí

// Controlador para el registro de usuarios (incluyendo doctores/pacientes/admins)
exports.register = async (req, res) => {
    try {
        // Desestructura todos los campos posibles que podrías recibir para CUALQUIER rol
        const {
            username,
            email,
            password,
            role,
            full_name,          // Para Doctor Y PACIENTE
            last_name,          // <--- ¡NUEVO! Para Paciente
            specialty,          // Para Doctor
            phone,              // Para Doctor y Paciente (si lo manejas en User o Patient)
            license_number,     // Para Doctor
            document_type,      // Para Paciente
            document_number,    // Para Paciente
            birth_date,         // Para Paciente
            address             // Para Paciente
        } = req.body;

        // Validaciones básicas
        if (!email || !password || !role) {
            return res.status(400).json({ message: 'Email, contraseña y rol son campos obligatorios.' });
        }

        // VALIDACIÓN DE ROL: Ahora acepta 'patient' y 'paciente'
        if (!['admin', 'doctor', 'patient', 'paciente'].includes(role)) {
            return res.status(400).json({ message: 'Rol inválido.' });
        }

        const existingUser = await User.findOne({ where: { email } });
        if (existingUser) {
            return res.status(409).json({ message: 'El email ya está registrado.' });
        }

        if (username) {
            const existingUsername = await User.findOne({ where: { username } });
            if (existingUsername) {
                return res.status(409).json({ message: 'El nombre de usuario ya está en uso.' });
            }
        }

        // Crear el usuario base
        const hashedPassword = await bcrypt.hash(password, 10); // Asegúrate de hashear la contraseña aquí
        const newUser = await User.create({
            username: username || email.split('@')[0], // Si no hay username, usa parte del email
            email,
            password: hashedPassword, // Usa la contraseña hasheada
            role
        });

        let profileId = null;       // Para almacenar el ID del perfil (doctor o paciente)
        let profileType = null;     // Para saber si es 'doctorId' o 'patientId'

        // LÓGICA PARA CREAR PERFIL DE DOCTOR
        if (role === 'doctor') {
            const newDoctorProfile = await Doctor.create({
                user_id: newUser.id, // Enlaza el Doctor al nuevo User
                full_name: full_name,
                specialty: specialty,
                phone: phone,        // Asegúrate que 'phone' esté en el modelo Doctor si lo usas aquí
                license_number: license_number
            });
            profileId = newDoctorProfile.id;
            profileType = 'doctorId';
        }
        // LÓGICA PARA CREAR PERFIL DE PACIENTE
        else if (role === 'paciente' || role === 'patient') { // Acepta ambos términos
            // Asegurarse de que full_name y last_name se pasen al crear el Patient
            const newPatientProfile = await Patient.create({
                user_id: newUser.id, // Enlaza el Paciente al nuevo User
                full_name: full_name, // <--- ¡ASEGÚRATE DE PASAR ESTE!
                last_name: last_name, // <--- ¡ASEGÚRATE DE PASAR ESTE!
                document_type: document_type,
                document_number: document_number,
                birth_date: birth_date,
                address: address,
                phone: phone // Si el número de teléfono del paciente se guarda en el perfil del paciente
            });
            profileId = newPatientProfile.id;
            profileType = 'patientId'; // Usamos 'patientId' para la respuesta JSON
        }

        // Generar JWT
        const token = jwt.sign(
            { userId: newUser.id, role: newUser.role }, // Payload con userId y role
            process.env.JWT_SECRET,
            { expiresIn: process.env.JWT_EXPIRES_IN || '1h' }
        );

        // Construir la respuesta del usuario
        const userResponse = {
            id: newUser.id,
            username: newUser.username,
            email: newUser.email,
            role: newUser.role,
        };

        // Añadir el ID del perfil específico si se creó
        if (profileType === 'doctorId') {
            userResponse.doctorId = profileId;
        } else if (profileType === 'patientId') {
            userResponse.patientId = profileId; // Importante para que tu test lo pueda validar
        }

        res.status(201).json({
            message: 'Usuario registrado exitosamente',
            token,
            user: userResponse
        });

    } catch (error) {
        console.error('Error al registrar usuario:', error);
        // Puedes agregar un manejo de errores más específico para SequelizeValidationErrors aquí
        if (error.name === 'SequelizeValidationError') {
            const errors = error.errors.map(err => err.message);
            return res.status(400).json({ message: 'Error de validación al registrar usuario.', errors });
        }
        res.status(500).json({ message: 'Error interno del servidor al registrar usuario.' });
    }
};

// Controlador para el login de usuarios
exports.login = async (req, res) => {
    try {
        const { email, password, role } = req.body;

        if (!email || !password) {
            return res.status(400).json({ message: 'Correo electrónico y contraseña son requeridos.' });
        }

        const user = await User.findOne({ where: { email } });

        if (!user) {
            return res.status(401).json({ message: 'Credenciales inválidas.' }); // Email no encontrado
        }

        const validPassword = await bcrypt.compare(password, user.password);
        if (!validPassword) {
            return res.status(401).json({ message: 'Credenciales inválidas.' }); // Contraseña incorrecta
        }

        // Si se proporciona un rol en el login, verificar que coincida con el rol del usuario
        if (role && user.role !== role) {
            return res.status(403).json({ message: `No tienes permiso para acceder como ${role}. Tu rol es ${user.role}.` });
        }

        const jwtSecret = process.env.JWT_SECRET;
        if (!jwtSecret) {
            console.error('JWT_SECRET no está definido en las variables de entorno.');
            return res.status(500).json({ message: 'Error de configuración del servidor (secreto JWT no encontrado).' });
        }

        let profileId = null; // Para almacenar el ID del perfil (doctor o paciente)
        let profileType = null; // Para saber si es 'doctorId' o 'patientId'

        if (user.role === 'doctor') {
            const doctor = await Doctor.findOne({ where: { user_id: user.id } });
            if (doctor) {
                profileId = doctor.id;
                profileType = 'doctorId';
            } else {
                console.warn(`[Login] Usuario ${user.id} tiene rol 'doctor' pero no tiene entrada en la tabla doctors.`);
            }
        } else if (user.role === 'paciente' || user.role === 'patient') { // También maneja el login para pacientes
            const patient = await Patient.findOne({ where: { user_id: user.id } });
            if (patient) {
                profileId = patient.id;
                profileType = 'patientId';
            } else {
                console.warn(`[Login] Usuario ${user.id} tiene rol '${user.role}' pero no tiene entrada en la tabla patients.`);
            }
        }


        const token = jwt.sign(
            { userId: user.id, role: user.role }, // Payload con userId y role, crucial para el middleware!
            jwtSecret,
            { expiresIn: process.env.JWT_EXPIRES_IN || '1h' }
        );

        const userResponse = {
            id: user.id,
            username: user.username,
            email: user.email,
            role: user.role,
        };

        if (profileType === 'doctorId') {
            userResponse.doctorId = profileId;
        } else if (profileType === 'patientId') {
            userResponse.patientId = profileId;
        }


        res.status(200).json({
            message: 'Login exitoso',
            token,
            user: userResponse
        });

    } catch (error) {
        console.error('Error en el login:', error);
        res.status(500).json({ message: 'Error interno del servidor.' });
    }
};