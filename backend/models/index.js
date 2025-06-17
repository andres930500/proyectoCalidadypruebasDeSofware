const { sequelize } = require('../config/db');
const User = require('./userModel');
const Patient = require('./patientModel');
const Doctor = require('./doctorModel');
const Appointment = require('./appointmentModel');
const Availability = require('./availabilityModel');
const MedicalHistory = require('./medicalHistoryModel');

// Definir relaciones entre modelos
User.hasOne(Patient, { foreignKey: 'user_id' });
Patient.belongsTo(User, { foreignKey: 'user_id', onDelete: 'CASCADE', as: 'user' });

User.hasOne(Doctor, { foreignKey: 'user_id' });
Doctor.belongsTo(User, { foreignKey: 'user_id', onDelete: 'CASCADE', as: 'user' });

Patient.hasMany(Appointment, { foreignKey: 'patient_id' });
Appointment.belongsTo(Patient, { foreignKey: 'patient_id', onDelete: 'CASCADE' });

Doctor.hasMany(Appointment, { foreignKey: 'doctor_id' });
Appointment.belongsTo(Doctor, { foreignKey: 'doctor_id', onDelete: 'CASCADE' });

Doctor.hasMany(Availability, { foreignKey: 'doctor_id' });
Availability.belongsTo(Doctor, { foreignKey: 'doctor_id', onDelete: 'CASCADE' });

Appointment.hasOne(MedicalHistory, { foreignKey: 'appointment_id' });
MedicalHistory.belongsTo(Appointment, { foreignKey: 'appointment_id', onDelete: 'CASCADE' });

Patient.hasMany(MedicalHistory, { foreignKey: 'patient_id' });
MedicalHistory.belongsTo(Patient, { foreignKey: 'patient_id', onDelete: 'CASCADE' });

Doctor.hasMany(MedicalHistory, { foreignKey: 'doctor_id' });
MedicalHistory.belongsTo(Doctor, { foreignKey: 'doctor_id', onDelete: 'CASCADE' });

module.exports = {
  sequelize,
  User,
  Patient,
  Doctor,
  Appointment,
  Availability,
  MedicalHistory,
};
