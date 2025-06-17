const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/db');

const Appointment = sequelize.define('Appointment', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },
  patient_id: {
    type: DataTypes.INTEGER,
    allowNull: false
  },
  doctor_id: {
    type: DataTypes.INTEGER,
    allowNull: false
  },
  appointment_date: {
    type: DataTypes.DATEONLY,
    allowNull: false
  },
  appointment_time: {
    type: DataTypes.TIME,
    allowNull: false
  },
  status: {
    type: DataTypes.ENUM('pending', 'confirmed', 'cancelled', 'completed', 'reprogrammed'), // <-- ¡AÑADIDO 'reprogrammed' y 'completed'!
    allowNull: false,
    defaultValue: 'pending'
  },
  created_at: {
    type: DataTypes.DATE,
    defaultValue: DataTypes.NOW
  },
  notes: {
    type: DataTypes.TEXT
  }
}, {
  tableName: 'appointments',
  timestamps: false
});

module.exports = Appointment;