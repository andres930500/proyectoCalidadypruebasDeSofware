// backend/controllers/appointmentController.js

const { Appointment, Availability, Doctor, Patient, User, sequelize } = require('../models');
const { Op } = require('sequelize'); // Ya no necesitamos UniqueConstraintError si la DB no tiene la restricción
const moment = require('moment'); // Para facilitar el manejo de tiempo

// Función para crear una nueva cita
exports.createAppointment = async (req, res) => {
    const { doctor_id, appointment_date, appointment_time, notes } = req.body;
    const patient_user_id = req.user.userId; // ID del usuario logueado (desde el token)

    console.log('DEBUG (createAppointment): --- INICIO de creación de cita ---');
    console.log(`DEBUG (createAppointment): Datos de la petición: Doctor ID: ${doctor_id}, Fecha: ${appointment_date}, Hora: ${appointment_time}, Notas: ${notes || 'N/A'}`);
    console.log(`DEBUG (createAppointment): Patient User ID (desde el token): ${patient_user_id}`);

    if (!doctor_id || !appointment_date || !appointment_time) {
        console.log('DEBUG (createAppointment): Datos de entrada incompletos. Faltan doctor_id, appointment_date o appointment_time.');
        return res.status(400).json({ message: 'Doctor, fecha y hora de la cita son obligatorios.' });
    }

    // --- INICIO DE LA TRANSACCIÓN ---
    const t = await sequelize.transaction();
    console.log('DEBUG (createAppointment): Transacción iniciada.');

    try {
        console.log(`DEBUG (createAppointment): Buscando perfil de paciente para user_id: ${patient_user_id}`);
        const patient = await Patient.findOne({ where: { user_id: patient_user_id }, transaction: t }); // Pasa la transacción
        if (!patient) {
            console.log('DEBUG (createAppointment): Perfil de paciente no encontrado.');
            await t.rollback(); // Rollback si no se encuentra el paciente
            return res.status(404).json({ message: 'Perfil de paciente no encontrado.' });
        }
        const patient_id = patient.id; // Obtenemos el ID de la tabla Patient
        console.log('DEBUG (createAppointment): Perfil de paciente encontrado. patient.id:', patient_id);

        console.log(`DEBUG (createAppointment): Buscando doctor con ID: ${doctor_id}`);
        const doctor = await Doctor.findByPk(doctor_id, { transaction: t }); // Pasa la transacción
        if (!doctor) {
            console.log('DEBUG (createAppointment): Doctor no encontrado.');
            await t.rollback(); // Rollback si no se encuentra el doctor
            return res.status(404).json({ message: 'Doctor no encontrado.' });
        }
        console.log('DEBUG (createAppointment): Doctor encontrado:', doctor.full_name);

        const requestedDateTime = moment(`${appointment_date} ${appointment_time}`);
        console.log('DEBUG (createAppointment): Fecha y hora solicitadas (moment object):', requestedDateTime.format('YYYY-MM-DD HH:mm:ss'));
        if (requestedDateTime.isBefore(moment())) {
            console.log('DEBUG (createAppointment): Error: Intentando agendar cita en el pasado.');
            await t.rollback(); // Rollback si la fecha es inválida
            return res.status(400).json({ message: 'No puedes agendar citas en el pasado.' });
        }
        console.log('DEBUG (createAppointment): Fecha y hora solicitadas son válidas (no en el pasado).');

        const requestedStartTime = moment(appointment_time, 'HH:mm');
        const requestedEndTime = requestedStartTime.clone().add(30, 'minutes'); // Asumiendo citas de 30 minutos
        console.log(`DEBUG (createAppointment): Hora de inicio solicitada: ${requestedStartTime.format('HH:mm:ss')}`);
        console.log(`DEBUG (createAppointment): Hora de fin calculada (30 min después): ${requestedEndTime.format('HH:mm:ss')}`);

        // 1. Verificar disponibilidad en la tabla Availability (dentro de la transacción)
        console.log(`DEBUG (createAppointment): Verificando disponibilidad en la tabla Availability para Doctor ${doctor_id} en ${appointment_date}`);
        const availableSlot = await Availability.findOne({
            where: {
                doctor_id: doctor_id,
                date: appointment_date,
                is_available: true,
                start_time: {
                    [Op.lte]: requestedStartTime.format('HH:mm:ss')
                },
                end_time: {
                    [Op.gte]: requestedEndTime.format('HH:mm:ss')
                }
            },
            transaction: t, // Asegura que esta operación sea parte de la transacción
            // lock: t.LOCK.UPDATE // Esto solo es útil si la DB soporta bloqueo a nivel de fila real.
                               // Para SQLite, el bloqueo es a nivel de tabla, así que no es estrictamente necesario aquí
                               // para prevenir la doble lectura-escritura en el mismo SLOT de Availability.
                               // Sin embargo, mantenerlo es una buena práctica para DBs más robustas.
        });

        if (!availableSlot) {
            console.log('DEBUG (createAppointment): No se encontró slot de disponibilidad para el horario solicitado o el slot no es de 30 minutos.');
            await t.rollback();
            return res.status(409).json({ message: 'El doctor no está disponible en el horario solicitado o el slot no es de 30 minutos.' });
        }
        console.log('DEBUG (createAppointment): Slot de disponibilidad encontrado con ID:', availableSlot.id);

        // --- RE-INTRODUCIR VERIFICACIÓN DE CONFLICTO DE CITAS EXISTENTES ---
        console.log(`DEBUG (createAppointment): Verificando citas conflictivas existentes para Doctor ${doctor_id} en ${appointment_date} a las ${requestedStartTime.format('HH:mm:ss')}`);
        const conflictingAppointment = await Appointment.findOne({
            where: {
                doctor_id: doctor_id,
                appointment_date: appointment_date,
                appointment_time: requestedStartTime.format('HH:mm:ss'),
                status: {
                    [Op.in]: ['pending', 'confirmed'] // Considerar citas pendientes o confirmadas como conflicto
                }
            },
            transaction: t // ¡Importante! Asegura que esta verificación sea parte de la transacción
        });

        if (conflictingAppointment) {
            console.log('DEBUG (createAppointment): Se encontró una cita conflictiva existente con ID:', conflictingAppointment.id);
            await t.rollback(); // Rollback si hay conflicto
            return res.status(409).json({ message: 'Ya existe una cita agendada en este horario para este doctor.' });
        }
        console.log('DEBUG (createAppointment): No se encontraron citas conflictivas. Horario libre.');
        // --- FIN DE LA VERIFICACIÓN DE CONFLICTO DE CITAS EXISTENTES ---


        console.log('DEBUG (createAppointment): Todas las validaciones pasaron. Procediendo a crear la cita.');
        const newAppointment = await Appointment.create({
            patient_id: patient_id,
            doctor_id: doctor_id,
            appointment_date: appointment_date,
            appointment_time: requestedStartTime.format('HH:mm:ss'),
            status: 'pending', // Cita inicialmente pendiente
            notes: notes || 'Cita agendada por el paciente.'
        }, { transaction: t }); // ¡Importante! Pasar la transacción a la creación

        await t.commit(); // --- COMMIT DE LA TRANSACCIÓN si todo fue exitoso ---
        console.log('DEBUG (createAppointment): Transacción completada (commit).');
        console.log('DEBUG (createAppointment): Cita creada exitosamente con ID:', newAppointment.id);

        res.status(201).json({
            message: 'Cita agendada exitosamente y pendiente de confirmación.',
            appointment: newAppointment
        });

    } catch (error) {
        // Rollback automático en caso de error o si el commit no se alcanzó
        await t.rollback();
        console.log('DEBUG (createAppointment): Transacción revertida (rollback) debido a un error inesperado.');

        // Si la base de datos no tiene una restricción UNIQUE, no esperaremos UniqueConstraintError aquí
        // Por lo tanto, cualquier error que llegue aquí es un error interno del servidor.
        console.error('ERROR (createAppointment): Error inesperado al agendar cita:', error);
        res.status(500).json({ message: 'Error interno del servidor al agendar cita.' });
    } finally {
        console.log('DEBUG (createAppointment): --- FIN de creación de cita ---');
    }
};

// Función para obtener las citas de un paciente específico
exports.getPatientAppointments = async (req, res) => {
    const patient_user_id = req.user.userId; // ID del usuario logueado (desde el token)
    console.log(`DEBUG (getPatientAppointments): --- INICIO de obtener citas para paciente user_id: ${patient_user_id} ---`);

    try {
        console.log(`DEBUG (getPatientAppointments): Buscando perfil de paciente para user_id: ${patient_user_id}`);
        const patient = await Patient.findOne({ where: { user_id: patient_user_id } });
        if (!patient) {
            console.log('DEBUG (getPatientAppointments): Perfil de paciente no encontrado.');
            return res.status(404).json({ message: 'Perfil de paciente no encontrado.' });
        }
        console.log('DEBUG (getPatientAppointments): Perfil de paciente encontrado. patient.id:', patient.id);

        console.log(`DEBUG (getPatientAppointments): Buscando citas para patient_id: ${patient.id}`);
        const appointments = await Appointment.findAll({
            where: { patient_id: patient.id },
            include: [{ model: Doctor, attributes: ['full_name', 'specialty'] }] // Incluir datos del doctor
        });
        console.log(`DEBUG (getPatientAppointments): Se encontraron ${appointments.length} citas para el paciente.`);
        res.status(200).json(appointments);
    } catch (error) {
        console.error('ERROR (getPatientAppointments): Error al obtener citas del paciente:', error);
        res.status(500).json({ message: 'Error interno del servidor.' });
    } finally {
        console.log('DEBUG (getPatientAppointments): --- FIN de obtener citas para paciente ---');
    }
};

// Función para obtener las citas de un doctor específico
exports.getDoctorAppointments = async (req, res) => {
    const doctor_user_id = req.user.userId; // ID del usuario logueado (desde el token)
    console.log(`DEBUG (getDoctorAppointments): --- INICIO de obtener citas para doctor user_id: ${doctor_user_id} ---`);

    try {
        console.log(`DEBUG (getDoctorAppointments): Buscando perfil de doctor para user_id: ${doctor_user_id}`);
        const doctor = await Doctor.findOne({ where: { user_id: doctor_user_id } });
        if (!doctor) {
            console.log('DEBUG (getDoctorAppointments): Perfil de doctor no encontrado.');
            return res.status(404).json({ message: 'Perfil de doctor no encontrado.' });
        }
        console.log('DEBUG (getDoctorAppointments): Perfil de doctor encontrado. doctor.id:', doctor.id);

        console.log(`DEBUG (getDoctorAppointments): Buscando citas para doctor_id: ${doctor.id}`);
        const appointments = await Appointment.findAll({
            where: { doctor_id: doctor.id },
            order: [
                ['appointment_date', 'ASC'], // Opcional: Ordenar por fecha
                ['appointment_time', 'ASC'], // Opcional: Luego por hora
            ],
            include: [{
                model: Patient,
                as: 'Patient', // Este 'as' debe coincidir con la asociación en models/index.js (por defecto es 'Patient')
                attributes: ['id', 'full_name', 'user_id'], // Incluir 'id' y 'user_id' del paciente
                include: [{
                    model: User,
                    as: 'user', // ¡IMPORTANTE!: ESTE 'as' DEBE SER 'user' (minúscula)
                    attributes: ['id'],
                    required: false // <--- CLAVE PARA EVITAR EL ERROR 'undefined' al acceder a patient.user_id
                }]
            }]
        });

        console.log(`DEBUG (getDoctorAppointments): Se encontraron ${appointments.length} citas para el doctor.`);
        res.status(200).json(appointments);
    } catch (error) {
        console.error('ERROR (getDoctorAppointments): Error al obtener citas del doctor:', error);
        res.status(500).json({ message: 'Error interno del servidor.', error: error.message });
    } finally {
        console.log('DEBUG (getDoctorAppointments): --- FIN de obtener citas para doctor ---');
    }
};

// --- MODIFICACIÓN CLAVE: REPROGRAMAR CITA (FUNCIÓN PROPIA) ---
exports.reprogramAppointment = async (req, res) => {
    const { appointmentId } = req.params;
    const { new_appointment_date, new_appointment_time } = req.body;
    const userId = req.user.userId;
    const userRole = req.user.role;

    console.log(`DEBUG (reprogramAppointment): --- INICIO de reprogramación de cita ${appointmentId} ---`);
    console.log(`DEBUG (reprogramAppointment): Nueva fecha/hora solicitada: ${new_appointment_date} ${new_appointment_time}`);
    console.log(`DEBUG (reprogramAppointment): Usuario del token - ID: ${userId}, Rol: "${userRole}"`);

    try {
        const appointment = await Appointment.findByPk(appointmentId);

        if (!appointment) {
            console.log(`DEBUG (reprogramAppointment): Cita con ID ${appointmentId} no encontrada.`);
            return res.status(404).json({ msg: 'Cita no encontrada.' });
        }

        console.log(`DEBUG (reprogramAppointment): Cita original encontrada. Detalles:`, appointment.toJSON());

        // --- LÓGICA DE AUTORIZACIÓN PARA REPROGRAMAR ---
        let isAuthorized = false;

        if (userRole === 'admin') {
            isAuthorized = true;
            console.log(`DEBUG (reprogramAppointment): Autorizado como Administrador.`);
        } else if (userRole === 'paciente') {
            const patient = await Patient.findOne({ where: { user_id: userId } });
            if (patient && patient.id === appointment.patient_id) {
                isAuthorized = true;
                console.log(`DEBUG (reprogramAppointment): Autorizado como Paciente (dueño de la cita).`);
            } else {
                console.log(`DEBUG (reprogramAppointment): Paciente ${userId} no es dueño de la cita ${appointmentId}.`);
            }
        } else if (userRole === 'doctor') {
            const doctor = await Doctor.findOne({ where: { user_id: userId } });
            if (doctor && doctor.id === appointment.doctor_id) {
                isAuthorized = true;
                console.log(`DEBUG (reprogramAppointment): Autorizado como Médico (cita asignada).`);
            } else {
                console.log(`DEBUG (reprogramAppointment): Doctor ${userId} no es el médico asignado a la cita ${appointmentId}.`);
            }
        }

        if (!isAuthorized) {
            console.log(`DEBUG (reprogramAppointment): Usuario no autorizado para reprogramar esta cita. (Final)`);
            return res.status(403).json({ msg: 'No estás autorizado para reprogramar esta cita.' });
        }

        // Validación de fecha/hora (opcional, pero recomendado)
        if (!new_appointment_date || !new_appointment_time) {
            return res.status(400).json({ msg: 'Nueva fecha y hora son requeridas.' });
        }

        const newDateTime = moment(`${new_appointment_date} ${new_appointment_time}`);
        if (newDateTime.isBefore(moment())) {
            return res.status(400).json({ msg: 'No se puede reprogramar una cita en el pasado.' });
        }

        // TODO: Aquí deberías añadir una verificación crucial (similar a createAppointment):
        // 1. Que el doctor tenga disponibilidad en la nueva fecha/hora.
        // 2. Que no haya otra cita ya agendada para ese doctor en esa fecha/hora.
        //    Esto es especialmente importante si no tienes una restricción UNIQUE en la DB.

        // Actualizar la cita
        appointment.appointment_date = new_appointment_date;
        appointment.appointment_time = new_appointment_time;
        appointment.status = 'pending'; // O el estado que consideres apropiado al reprogramar

        await appointment.save();

        console.log(`DEBUG (reprogramAppointment): Cita ${appointmentId} reprogramada exitosamente.`);
        res.status(200).json({ msg: 'Cita reprogramada exitosamente.', appointment });

    } catch (error) {
        console.error('Error al reprogramar la cita:', error);
        res.status(500).json({ msg: 'Error interno del servidor al reprogramar la cita.', error: error.message });
    } finally {
        console.log(`DEBUG (reprogramAppointment): --- FIN de reprogramación de cita ---`);
    }
};

// --- FUNCIÓN UNIFICADA PARA ACTUALIZAR EL ESTADO (CANCELAR/CONFIRMAR/COMPLETAR) ---
exports.updateAppointmentStatus = async (req, res) => {
    const { appointmentId } = req.params;
    const { status } = req.body;
    const userId = req.user.userId; // ID del usuario autenticado
    const userRole = req.user.role; // Rol del usuario autenticado

    console.log(`DEBUG (updateAppointmentStatus): --- INICIO de actualización de estado para cita ${appointmentId} ---`);
    console.log(`DEBUG (updateAppointmentStatus): Nuevo estado solicitado: ${status}`);
    console.log(`DEBUG (updateAppointmentStatus): Usuario del token - ID: ${userId}, Rol: "${userRole}"`);

    // Define los estados válidos. ¡Usamos 'cancelled' con doble 'L' para consistencia!
    const validStatuses = ['pending', 'confirmed', 'cancelled', 'completed', 'reprogrammed']; // Añadido 'reprogrammed'
    if (!validStatuses.includes(status)) {
        console.log('DEBUG (updateAppointmentStatus): Estado de cita inválido en el body:', status);
        return res.status(400).json({ message: `Estado de cita inválido: '${status}'. Estados permitidos: ${validStatuses.join(', ')}` });
    }

    try {
        const appointment = await Appointment.findByPk(appointmentId);

        if (!appointment) {
            console.log(`DEBUG (updateAppointmentStatus): Cita con ID ${appointmentId} no encontrada.`);
            return res.status(404).json({ msg: 'Cita no encontrada.' });
        }

        console.log(`DEBUG (updateAppointmentStatus): Cita original encontrada. Detalles:`, appointment.toJSON());

        // --- LÓGICA DE AUTORIZACIÓN PARA ACTUALIZAR ESTADO ---
        let isAuthorized = false;

        if (userRole === 'admin') {
            isAuthorized = true;
            console.log(`DEBUG (updateAppointmentStatus): Autorizado como Administrador.`);
        } else if (userRole === 'paciente') { // ¡Asegúrate de que el rol en tu token sea 'paciente' con 'c'!
            const patient = await Patient.findOne({ where: { user_id: userId } });
            if (patient && patient.id === appointment.patient_id) {
                // Un paciente solo puede CANCELAR SUS PROPIAS citas
                if (status === 'cancelled' || status === 'reprogrammed') { // Paciente puede cancelar o reprogramar sus citas
                    isAuthorized = true;
                    console.log(`DEBUG (updateAppointmentStatus): Autorizado como Paciente (dueño de la cita) para CANCELAR/REPROGRAMAR.`);
                } else {
                    console.log(`DEBUG (updateAppointmentStatus): Paciente ${userId} no está autorizado para cambiar el estado a '${status}'.`);
                }
            } else {
                console.log(`DEBUG (updateAppointmentStatus): Paciente ${userId} no es dueño de la cita ${appointmentId}.`);
            }
        } else if (userRole === 'doctor') {
            const doctor = await Doctor.findOne({ where: { user_id: userId } });
            if (doctor && doctor.id === appointment.doctor_id) {
                isAuthorized = true;
                console.log(`DEBUG (updateAppointmentStatus): Autorizado como Médico (cita asignada).`);
            } else {
                console.log(`DEBUG (updateAppointmentStatus): Doctor ${userId} no es el médico asignado a la cita ${appointmentId}.`);
            }
        }

        if (!isAuthorized) {
            console.log(`DEBUG (updateAppointmentStatus): Usuario no autorizado para actualizar el estado de esta cita. (Final)`);
            return res.status(403).json({ msg: 'No estás autorizado para actualizar el estado de esta cita.' });
        }

        // --- Validaciones de estado de la cita ---
        if (appointment.status === status) {
            console.log(`DEBUG (updateAppointmentStatus): La cita ya está en el estado "${status}". No se requiere actualización.`);
            return res.status(200).json({ message: `La cita ya está en estado ${status}.`, appointment });
        }
        
        if (appointment.status === 'completed') {
             console.log(`DEBUG (updateAppointmentStatus): No se puede cambiar el estado de una cita ya completada a "${status}".`);
             return res.status(400).json({ message: 'No se puede cambiar el estado de una cita que ya ha sido completada.' });
        }
        if (appointment.status === 'cancelled') {
             console.log(`DEBUG (updateAppointmentStatus): No se puede cambiar el estado de una cita ya cancelada a "${status}".`);
             return res.status(400).json({ message: 'No se puede cambiar el estado de una cita que ya ha sido cancelada.' });
        }


        // Actualizar el estado de la cita
        appointment.status = status;
        if (status === 'cancelled') {
             appointment.notes = appointment.notes ? `${appointment.notes}\nCancelada por ${userRole}.` : `Cancelada por ${userRole}.`;
        } else if (status === 'reprogrammed') {
             appointment.notes = appointment.notes ? `${appointment.notes}\nReprogramada por ${userRole}.` : `Reprogramada por ${userRole}.`;
        }


        await appointment.save();

        console.log(`DEBUG (updateAppointmentStatus): Cita ${appointmentId} actualizada a estado '${status}' exitosamente.`);
        res.status(200).json({ msg: `Cita actualizada a estado '${status}' exitosamente.`, appointment });

    } catch (error) {
        console.error('Error al actualizar el estado de la cita:', error);
        res.status(500).json({ msg: 'Error interno del servidor al actualizar el estado de la cita.', error: error.message });
    } finally {
        console.log(`DEBUG (updateAppointmentStatus): --- FIN de actualización de estado de cita ---`);
    }
};

// Nueva función: Obtener una cita específica por su ID
exports.getAppointmentById = async (req, res) => {
    try {
        const { id } = req.params;
        console.log(`DEBUG (getAppointmentById): Intentando obtener cita con ID: ${id}`);

        const appointment = await Appointment.findByPk(id, {
            include: [
                { model: Patient, as: 'Patient', attributes: ['id', 'full_name', 'user_id'] },
                { model: Doctor, as: 'Doctor', attributes: ['id', 'full_name', 'specialty'] }
            ]
        });

        if (!appointment) {
            console.log(`DEBUG (getAppointmentById): Cita con ID ${id} no encontrada.`);
            return res.status(404).json({ message: 'Cita no encontrada.' });
        }

        const user_id_from_token = req.user.userId;
        const user_role_from_token = req.user.role;

        // Permitir acceso si:
        // 1. El usuario es 'admin'
        // O
        // 2. El usuario es el paciente asociado a esta cita
        // O
        // 3. El usuario es el doctor ASIGNADO a esta cita
        if (user_role_from_token === 'admin' ||
            user_role_from_token === 'doctor' ||
            (appointment.Patient && appointment.Patient.user_id === user_id_from_token) ||
            (appointment.Doctor && appointment.Doctor.user_id === user_id_from_token)
        ) {
               console.log(`DEBUG (getAppointmentById): Autorización concedida a cita ${id} para usuario ${user_id_from_token} con rol ${user_role_from_token}.`);
               res.status(200).json(appointment);
        } else {
            console.log(`DEBUG (getAppointmentById): Acceso denegado a cita ${id} para usuario ${user_id_from_token} con rol ${user_role_from_token}.`);
            return res.status(403).json({ message: 'No tienes permiso para ver esta cita.' });
        }
    } catch (error) {
        console.error('ERROR (getAppointmentById): Error al obtener cita por ID:', error);
        res.status(500).json({ message: 'Error interno del servidor al obtener la cita.' });
    }
};