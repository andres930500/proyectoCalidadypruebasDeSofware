const { User } = require('../models'); // Sigue importando solo User

exports.getPatientProfile = async (req, res) => {
  try {
    const patientId = req.params.id; // ID del paciente de la URL
    const requestingUserId = req.user.userId; // ID del usuario que hace la petición (del token JWT)
    const requestingUserRole = req.user.role; // Rol del usuario que hace la petición

    // Seguridad: Asegurarse de que el usuario solo pueda ver su propio perfil
    // a menos que sea un administrador.
    // La lógica de seguridad se mantiene igual, asumiendo que patientId es el userId.
    if (requestingUserRole === 'paciente' && parseInt(patientId) !== requestingUserId) {
      return res.status(403).json({ message: 'Acceso denegado. Solo puedes ver tu propio perfil.' });
    }
    // Si es un doctor o admin, podrían tener permiso para ver perfiles de otros pacientes,
    // pero por ahora lo limitamos para el paciente.
    // Si es admin, puede ver cualquier perfil.

    const patient = await User.findByPk(patientId, {
      // SOLO ACTUALIZAMOS LOS ATTRIBUTES para incluir los nuevos campos.
      // Esto solo funcionará si estas nuevas columnas existen en tu tabla 'users'.
      attributes: [
        'id',
        'username',
        'email',
        'full_name',
        'last_name',       // <--- Nuevo campo
        'document_type',   // <--- Nuevo campo
        'document_number', // <--- Nuevo campo
        'birth_date',
        'phone',
        'address',
        'role'
      ]
    });

    if (!patient) {
      return res.status(404).json({ message: 'Paciente no encontrado.' });
    }

    res.status(200).json(patient);

  } catch (error) {
    console.error('Error al obtener el perfil del paciente:', error);
    res.status(500).json({ message: 'Error interno del servidor al obtener el perfil del paciente.' });
  }
};