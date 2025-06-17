// backend/config/env.js
const dotenv = require('dotenv');
const path = require('path');

// Carga las variables del archivo .env principal primero.
// Esto establece los valores por defecto.
dotenv.config({ path: path.resolve(__dirname, '../.env') });

// Si el entorno es 'test', carga las variables de .env.test.
// El 'override: true' asegura que estas nuevas variables sobrescriban las de .env si hay duplicados.
if (process.env.NODE_ENV === 'test') {
  dotenv.config({ path: path.resolve(__dirname, '../.env.test'), override: true });
}

// Opcional: para depuración, puedes ver qué variables están cargadas
// console.log("NODE_ENV:", process.env.NODE_ENV);
// console.log("DB_NAME:", process.env.DB_NAME);
// console.log("DB_NAME_TEST:", process.env.DB_NAME_TEST);
// console.log("DB_HOST:", process.env.DB_HOST);
// console.log("DB_HOST_TEST:", process.env.DB_HOST_TEST);