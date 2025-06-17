const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/db');

const Patient = sequelize.define('Patient', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },
  user_id: {
    type: DataTypes.INTEGER,
    allowNull: false,
    unique: true
  },
  full_name: { // Este campo se mantiene igual, como lo indicaste
    type: DataTypes.STRING(150),
    allowNull: false
  },
  last_name: { // Nuevo campo para el apellido
    type: DataTypes.STRING(150),
    allowNull: false
  },
  document_type: { // Nuevo campo para el tipo de documento
    type: DataTypes.ENUM('cedula', 'tarjeta de identidad', 'registro civil'), // Opciones específicas
    allowNull: false
  },
  document_number: { // Nuevo campo para el número de documento
    type: DataTypes.STRING(50), // Un string para flexibilidad (puede contener letras o números)
    allowNull: false,
    unique: true // Generalmente el número de documento debe ser único
  },
  birth_date: {
    type: DataTypes.DATE
  },
  phone: {
    type: DataTypes.STRING(20)
  },
  address: {
    type: DataTypes.TEXT
  }
}, {
  tableName: 'patients',
  timestamps: false
});

module.exports = Patient;