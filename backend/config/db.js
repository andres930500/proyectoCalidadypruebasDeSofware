// config/db.js
require('./env'); // cargar variables de entorno - ¡Esencial que esto esté aquí y primero!

const { Sequelize } = require('sequelize');

// Determinar el entorno actual
const currentEnv = process.env.NODE_ENV || 'development';
console.log(`[DB] Iniciando conexión a la base de datos en entorno: ${currentEnv}`);

let dbHost, dbUser, dbPass, dbName;
let loggingOption = false; // Por defecto no loguear

// Seleccionar las variables de entorno correctas basándose en el entorno
if (currentEnv === 'test') {
    dbHost = process.env.DB_HOST_TEST;
    dbUser = process.env.DB_USER_TEST;
    dbPass = process.env.DB_PASS_TEST;
    dbName = process.env.DB_NAME_TEST;
    loggingOption = false; // No logs de DB durante las pruebas
    console.log(`[DB] Usando configuración para PRUEBAS: ${dbName} en ${dbHost}`);
} else {
    // Usa las variables de entorno por defecto para desarrollo/producción
    dbHost = process.env.DB_HOST;
    dbUser = process.env.DB_USER;
    dbPass = process.env.DB_PASS;
    dbName = process.env.DB_NAME;
    loggingOption = false; // ¡CAMBIO AQUÍ! Desactivar logs también en desarrollo
    console.log(`[DB] Usando configuración por defecto: ${dbName} en ${dbHost}`);
}

// Crear la instancia de Sequelize con las variables seleccionadas
const sequelize = new Sequelize({
    dialect: 'postgres',
    host: dbHost,
    username: dbUser,
    password: dbPass,
    database: dbName,
    logging: loggingOption, // Usar la opción de logging definida
    port: process.env.DB_PORT || 5432, // Si tienes un puerto específico en .env
});

module.exports = { sequelize }; // Exporta la instancia de Sequelize