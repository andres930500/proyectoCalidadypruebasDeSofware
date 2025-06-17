const Availability = require('../models/availabilityModel');
const Doctor = require('../models/doctorModel');

const { Op } = require('sequelize'); 

// Funciones de ayuda (sin cambios)
const DAY_NAMES = {
    0: 'Domingo', 1: 'Lunes', 2: 'Martes', 3: 'Miércoles',
    4: 'Jueves', 5: 'Viernes', 6: 'Sábado',
};

const timeToMinutes = (time) => {
    const [hours, minutes] = time.split(':').map(Number);
    return hours * 60 + minutes;
};

const checkOverlap = (existingStart, existingEnd, newStart, newEnd) => {
    const existingStartMinutes = timeToMinutes(existingStart);
    const existingEndMinutes = timeToMinutes(existingEnd);
    const newStartMinutes = timeToMinutes(newStart);
    const newEndMinutes = timeToMinutes(newEnd);
    return !(newEndMinutes <= existingStartMinutes || newStartMinutes >= existingEndMinutes);
};


// --- Función para guardar/actualizar la disponibilidad (POST /api/availability) ---
exports.saveAvailability = async (req, res) => {
    const userIdFromToken = req.user.userId; 
    const { availability } = req.body; 

    if (!userIdFromToken) {
        return res.status(401).json({ message: 'No autenticado. ID de usuario no disponible en el token.' });
    }

    if (!Array.isArray(availability)) {
        return res.status(400).json({ message: 'El campo "availability" debe ser un array.' });
    }

    try {
        const doctor = await Doctor.findOne({ where: { user_id: userIdFromToken } });
        if (!doctor) {
            return res.status(404).json({ message: 'El médico especificado no existe o no está asociado a este usuario.' });
        }
        const doctorId = doctor.id;

        if (availability.length === 0) {
            await Availability.destroy({ where: { doctor_id: doctorId } });
            return res.status(200).json({ message: 'Disponibilidad borrada exitosamente.' });
        }

        for (let i = 0; i < availability.length; i++) {
            const slot = availability[i];

            if (!slot.date || typeof slot.day_of_week === 'undefined' || !slot.start_time || !slot.end_time) {
                return res.status(400).json({ message: `Cada slot de disponibilidad debe tener 'date', 'day_of_week', 'start_time' y 'end_time'. Slot problemático: ${JSON.stringify(slot)}` });
            }

            if (typeof slot.day_of_week !== 'number' || slot.day_of_week < 0 || slot.day_of_week > 6) {
                return res.status(400).json({ message: 'El día de la semana debe ser un número entre 0 (Domingo) y 6 (Sábado).' });
            }

            if (isNaN(new Date(slot.date))) {
                return res.status(400).json({ message: `Formato de fecha inválido para el slot: ${slot.date}. Debe ser YYYY-MM-DD.` });
            }

            const [startH, startM] = slot.start_time.split(':').map(Number);
            const [endH, endM] = slot.end_time.split(':').map(Number);
            if (startH * 60 + startM >= endH * 60 + endM) {
                return res.status(400).json({ message: `La hora de fin (${slot.end_time}) debe ser posterior a la hora de inicio (${slot.start_time}) para el día ${DAY_NAMES[slot.day_of_week]} en la fecha ${slot.date}.` });
            }

            for (let j = i + 1; j < availability.length; j++) {
                const otherSlot = availability[j];
                if (slot.date === otherSlot.date && slot.day_of_week === otherSlot.day_of_week) {
                    if (checkOverlap(slot.start_time, slot.end_time, otherSlot.start_time, otherSlot.end_time)) {
                        return res.status(400).json({
                            message: `¡Error! Horarios superpuestos entre sí en la solicitud para el día ${DAY_NAMES[slot.day_of_week]} en la fecha ${slot.date}. Conflicto: ${slot.start_time}-${slot.end_time} y ${otherSlot.start_time}-${otherSlot.end_time}.`
                        });
                    }
                }
            }

            const existingAvailabilitiesForDate = await Availability.findAll({
                where: {
                    doctor_id: doctorId,
                    date: slot.date,
                }
            });

            const newSlotStart = slot.start_time;
            const newSlotEnd = slot.end_time;

            const overlapWithExisting = existingAvailabilitiesForDate.some(existingDbSlot => {
                return checkOverlap(existingDbSlot.start_time, existingDbSlot.end_time, newSlotStart, newSlotEnd);
            });

            if (overlapWithExisting) {
                return res.status(409).json({ 
                    message: `¡Error! El horario que intentas añadir (${newSlotStart}-${newSlotEnd}) se solapa con un horario ya existente en la base de datos para el día ${DAY_NAMES[slot.day_of_week]} en la fecha ${slot.date}.`
                });
            }
        }

        const slotsToCreate = availability.map(slot => ({
            doctor_id: doctorId,
            date: slot.date,
            day_of_week: slot.day_of_week,
            start_time: slot.start_time,
            end_time: slot.end_time,
            is_available: true, 
        }));

        const createdRecords = await Availability.bulkCreate(slotsToCreate);

        return res.status(201).json({ 
            message: 'Disponibilidad(es) añadida(s) correctamente.',
            data: createdRecords
        });
    } catch (error) {
        console.error('Error al guardar disponibilidad:', error);
        return res.status(500).json({
            message: 'Error interno del servidor al guardar la disponibilidad.',
            error: error.parent?.detail || error.message
        });
    }
};

// --- Función para obtener la disponibilidad de un doctor específico (GET /api/availability/:doctorId) ---
// Modificada para seguir la misma lógica de getDoctorAvailabilityByDate si se pasa query param 'date'
exports.getDoctorAvailabilitiesById = async (req, res) => {
    const { doctorId } = req.params;
    const { date } = req.query; // Date como query parameter

    if (!doctorId) {
        return res.status(400).json({ message: 'El ID del médico es requerido en la URL.' });
    }
    const parsedDoctorId = parseInt(doctorId, 10);
    if (isNaN(parsedDoctorId)) {
        return res.status(400).json({ message: 'El ID del médico proporcionado no es un número válido.' });
    }

    try {
        const doctorExists = await Doctor.findByPk(parsedDoctorId);
        if (!doctorExists) {
            return res.status(404).json({ message: 'El médico especificado no existe.' });
        }

        let whereClause = { doctor_id: parsedDoctorId };
        if (date) { // Si se pasa 'date' como query param, la aplicamos aquí
            whereClause.date = date;
        }

        const availabilities = await Availability.findAll({
            where: whereClause,
            order: [
                ['date', 'ASC'],
                ['day_of_week', 'ASC'],
                ['start_time', 'ASC']
            ]
        });

        if (availabilities.length === 0) {
            return res.status(404).json({ message: 'No se encontró disponibilidad para el médico con el ID proporcionado (y fecha si se especificó).' });
        }

        res.status(200).json(availabilities);
    } catch (error) {
        console.error('Error al obtener disponibilidad del doctor por ID:', error);
        res.status(500).json({
            message: 'Error interno del servidor al intentar obtener la disponibilidad del doctor.',
            error: error.message
        });
    }
};


// --- NUEVA FUNCIÓN: Obtener disponibilidad de un doctor por ID y fecha (GET /api/availability/doctor/:doctorId/date/:date) ---
exports.getDoctorAvailabilityByDate = async (req, res) => {
    const { doctorId, date } = req.params; // doctorId y date vienen como parámetros en la URL

    if (!doctorId || !date) {
        return res.status(400).json({ message: 'El ID del médico y la fecha son requeridos en la URL.' });
    }
    const parsedDoctorId = parseInt(doctorId, 10);
    if (isNaN(parsedDoctorId)) {
        return res.status(400).json({ message: 'El ID del médico proporcionado no es un número válido.' });
    }
    if (isNaN(new Date(date))) {
        return res.status(400).json({ message: `Formato de fecha inválido: ${date}. Debe ser YYYY-MM-DD.` });
    }

    try {
        const doctorExists = await Doctor.findByPk(parsedDoctorId);
        if (!doctorExists) {
            return res.status(404).json({ message: 'El médico especificado no existe.' });
        }

        const availabilities = await Availability.findAll({
            where: {
                doctor_id: parsedDoctorId,
                date: date,
                is_available: true // Solo queremos los slots que están disponibles
            },
            order: [
                ['start_time', 'ASC']
            ]
        });

        if (availabilities.length === 0) {
            return res.status(404).json({ message: 'No se encontró disponibilidad para el médico en la fecha proporcionada.' });
        }

        res.status(200).json(availabilities);
    } catch (error) {
        console.error('Error al obtener disponibilidad del doctor por ID y fecha:', error);
        res.status(500).json({
            message: 'Error interno del servidor al intentar obtener la disponibilidad del doctor.',
            error: error.message
        });
    }
};


// --- Función para obtener disponibilidades para pacientes (GET /api/availability?...) ---
// No necesita cambios aquí si ya funciona.
exports.getAvailabilitiesForPatients = async (req, res) => {
    const { specialty, date } = req.query;

    if (!specialty && !date) {
        return res.status(400).json({ message: 'Se requiere al menos una especialidad o una fecha para buscar disponibilidad.' });
    }

    let whereClause = { is_available: true };
    let includeDoctor = {
        model: Doctor,
        as: 'doctor',
        attributes: ['id', 'full_name', 'specialty'],
        required: true,
    };

    if (specialty) {
        includeDoctor.where = { specialty: specialty };
    }
    if (date) {
        whereClause.date = date;
    }

    try {
        const availabilities = await Availability.findAll({
            where: whereClause,
            include: [includeDoctor],
            order: [['date', 'ASC'], ['start_time', 'ASC']],
        });

        if (availabilities.length === 0) {
            return res.status(404).json({ message: 'No se encontraron disponibilidades para los criterios de búsqueda.' });
        }

        res.status(200).json(availabilities);
    } catch (error) {
        console.error('Error al obtener disponibilidades para pacientes:', error);
        res.status(500).json({ message: 'Error interno del servidor al obtener disponibilidades.', error: error.message });
    }
};

// --- Función para actualizar un slot de disponibilidad específico (PUT /api/availability/:availabilityId) ---
exports.updateAvailabilitySlot = async (req, res) => {
    const { availabilityId } = req.params;
    const userIdFromToken = req.user.userId; 
    const { date, day_of_week, start_time, end_time, is_available } = req.body;

    if (!userIdFromToken || !availabilityId) {
        return res.status(401).json({ message: 'No autenticado o ID de disponibilidad faltante.' });
    }

    const parsedAvailabilityId = parseInt(availabilityId, 10);
    if (isNaN(parsedAvailabilityId)) {
        return res.status(400).json({ message: 'El ID de disponibilidad proporcionado no es un número válido.' });
    }

    if (!date || typeof day_of_week === 'undefined' || !start_time || !end_time) {
        return res.status(400).json({ message: 'Fecha, día de la semana, hora de inicio y hora de fin son requeridos para actualizar.' });
    }
    if (isNaN(new Date(date))) {
        return res.status(400).json({ message: `Formato de fecha inválido: ${date}. Debe ser YYYY-MM-DD.` });
    }
    if (typeof day_of_week !== 'number' || day_of_week < 0 || day_of_week > 6) {
        return res.status(400).json({ message: 'El día de la semana debe ser un número entre 0 (Domingo) y 6 (Sábado).' });
    }
    const [startH, startM] = start_time.split(':').map(Number);
    const [endH, endM] = end_time.split(':').map(Number);
    if (startH * 60 + startM >= endH * 60 + endM) {
        return res.status(400).json({ message: `Error: La hora de fin (${end_time}) debe ser posterior a la hora de inicio (${start_time}).` });
    }

    try {
        const doctor = await Doctor.findOne({ where: { user_id: userIdFromToken } });
        if (!doctor) {
            return res.status(404).json({ message: 'El médico especificado no existe o no está asociado a este usuario.' });
        }
        const doctorId = doctor.id;

        const existingSlot = await Availability.findOne({
            where: {
                id: parsedAvailabilityId,
                doctor_id: doctorId
            }
        });

        if (!existingSlot) {
            return res.status(404).json({ message: 'Horario de disponibilidad no encontrado o no autorizado para actualizar.' });
        }

        const otherSlots = await Availability.findAll({
            where: {
                doctor_id: doctorId,
                id: { [Op.ne]: parsedAvailabilityId }, 
                date: date
            }
        });

        const newSlotProposed = { start_time: start_time, end_time: end_time }; 

        const overlapFound = otherSlots.some(slot => {
            if (slot.date === date && slot.day_of_week === day_of_week) {
                return checkOverlap(slot.start_time, slot.end_time, newSlotProposed.start_time, newSlotProposed.end_time);
            }
            return false;
        });

        if (overlapFound) {
            return res.status(400).json({ message: `¡Error! El horario modificado se solapa con otro horario existente para el día ${DAY_NAMES[day_of_week]} en la fecha ${date}.` });
        }

        const [updatedRows] = await Availability.update(
            {
                date: date,
                day_of_week: day_of_week,
                start_time: start_time,
                end_time: end_time,
                is_available: typeof is_available === 'boolean' ? is_available : existingSlot.is_available
            },
            {
                where: { id: parsedAvailabilityId }
            }
        );

        if (updatedRows === 0) {
            return res.status(404).json({ message: 'No se pudo actualizar el horario. Posiblemente no se encontró o no hubo cambios.' });
        }

        res.status(200).json({ message: 'Horario actualizado exitosamente.' });

    } catch (error) {
        console.error(`Error al actualizar horario de disponibilidad con ID ${parsedAvailabilityId}:`, error);
        res.status(500).json({
            message: 'Ocurrió un error interno del servidor al intentar actualizar el horario.',
            error: error.parent?.detail || error.message
        });
    }
};

// --- Función para eliminar un slot de disponibilidad específico (DELETE /api/availability/:availabilityId) ---
exports.deleteAvailabilitySlot = async (req, res) => {
    const { availabilityId } = req.params;
    const userIdFromToken = req.user.userId; 

    if (!userIdFromToken || !availabilityId) {
        return res.status(401).json({ message: 'No autenticado o ID de disponibilidad faltante.' });
    }

    const parsedAvailabilityId = parseInt(availabilityId, 10);
    if (isNaN(parsedAvailabilityId)) {
        return res.status(400).json({ message: 'El ID de disponibilidad proporcionado no es un número válido.' });
    }

    try {
        const doctor = await Doctor.findOne({ where: { user_id: userIdFromToken } });
        if (!doctor) {
            return res.status(404).json({ message: 'El médico especificado no existe o no está asociado a este usuario.' });
        }
        const doctorId = doctor.id;

        const existingSlot = await Availability.findOne({
            where: {
                id: parsedAvailabilityId,
                doctor_id: doctorId
            }
        });

        if (!existingSlot) {
            return res.status(404).json({ message: 'Horario de disponibilidad no encontrado o no autorizado para eliminar.' });
        }

        const deletedRows = await Availability.destroy({
            where: { id: parsedAvailabilityId }
        });

        if (deletedRows === 0) {
            return res.status(404).json({ message: 'Horario de disponibilidad no encontrado para eliminar.' });
        }
        res.status(200).json({ message: 'Horario de disponibilidad eliminado exitosamente.' });
    } catch (error) {
        console.error(`Error al eliminar horario de disponibilidad con ID ${parsedAvailabilityId}:`, error);
        res.status(500).json({
            message: 'Ocurrió un error interno del servidor al intentar eliminar el horario.',
            error: error.message
        });
    }
};