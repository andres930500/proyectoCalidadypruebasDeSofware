const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/db');

const Doctor = sequelize.define('Doctor', {
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
  full_name: {
    type: DataTypes.STRING(150),
    allowNull: false
  },
  last_name: {
    type: DataTypes.STRING(100),
    allowNull: true
  },
  identification_number: {
    type: DataTypes.STRING(50),
    allowNull: true,
    unique: true
  },
  specialty: {
    type: DataTypes.STRING(100)
  },
  phone: {
    type: DataTypes.STRING(20)
  },
  license_number: {
    type: DataTypes.STRING(50),
    unique: true
  },
  // --- ¡Campo nuevo aquí! ---
  is_available: {
    type: DataTypes.BOOLEAN,
    allowNull: false,
    defaultValue: true // Por defecto, el doctor está disponible
  }
  // -------------------------
}, {
  tableName: 'doctors',
  timestamps: false
});

module.exports = Doctor;