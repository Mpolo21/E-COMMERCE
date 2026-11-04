/**
 * Archivo: config/db.js
 * Propósito: Configurar y exportar el pool de conexiones a MySQL con soporte de promesas.
 */
require('dotenv').config();
const mysql = require('mysql2/promise');

// Creación del pool de conexiones para manejo eficiente de concurrencia y transacciones
const pool = mysql.createPool({
  host: process.env.DB_HOST || 'localhost',
  port: process.env.DB_PORT || 3306,
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || '',
  database: process.env.DB_NAME || 'ecommerce_ropa',
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0,
   decimalNumbers: true // Convierte DECIMAL de MySQL a Number en JS para facilitar cálculos
});

/**
 * Función para verificar la conexión inicial a la base de datos al arrancar el servidor
 */
async function verificarConexion() {
  try {
    const connection = await pool.getConnection();
    console.log('✅ Conexión exitosa a la base de datos MySQL:', process.env.DB_NAME);
    connection.release();
  } catch (error) {
    console.error('❌ Error al conectar a la base de datos MySQL:', error.message);
  }
}

module.exports = {
  pool,
  verificarConexion
};