// my-medical-platform/backend/models/availabilityModel.js
const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/db');
const Doctor = require('./doctorModel'); // Asegúrate de importar el modelo Doctor

const Availability = sequelize.define('Availability', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true,
  },
  doctor_id: { // Tu clave foránea existente. Sequelize la reconocerá si la usas con el modelo Doctor.
    type: DataTypes.INTEGER,
    allowNull: false,
    references: {
      model: Doctor, // Hace referencia al modelo Doctor
      key: 'id',     // La columna 'id' del modelo Doctor
    },
    onDelete: 'CASCADE', // Si se borra el doctor, se borran sus disponibilidades
    onUpdate: 'CASCADE', // Si se actualiza el ID del doctor, se actualiza aquí
  },
  // --- CAMPO PRINCIPAL PARA LA DISPONIBILIDAD: LA FECHA ES ESPECÍFICA ---
  date: {
    type: DataTypes.DATEONLY, // Usar DATEONLY para solo la fecha (YYYY-MM-DD)
    allowNull: false,         // La fecha debe ser OBLIGATORIA
  },
  // --- EL DÍA DE LA SEMANA AHORA ES OPCIONAL O PUEDE DERIVARSE ---
  // Lo dejamos como SMALLINT y allowNull: true. El frontend podría no enviarlo,
  // o el backend podría calcularlo a partir de la fecha si lo necesita.
  day_of_week: { 
    type: DataTypes.SMALLINT, 
    allowNull: true, // Ahora es opcional, ya que la fecha es la clave
  },
  start_time: {
    type: DataTypes.TIME, // Hora de inicio (HH:MM:SS)
    allowNull: false,
  },
  end_time: {
    type: DataTypes.TIME, // Hora de fin (HH:MM:SS)
    allowNull: false,
  },
  is_available: { // Campo para marcar si el slot está disponible (para citas)
    type: DataTypes.BOOLEAN,
    defaultValue: true,
  },
  created_at: { 
    type: DataTypes.DATE,
    defaultValue: DataTypes.NOW,
  },
}, {
  tableName: 'availabilities', 
  timestamps: false, // Puedes cambiar a true si quieres createdAt y updatedAt automáticos
});


module.exports = Availability;