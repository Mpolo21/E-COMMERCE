/**
 * Archivo: models/usuarioModel.js
 * Propósito: Modelo de datos para interactuar con la tabla usuarios y roles.
 */
const { pool } = require('../config/db');

class UsuarioModel {
  static async buscarPorCorreo(correo) {
    const [rows] = await pool.query(
      `SELECT u.*, r.nombre_rol 
       FROM usuarios u 
       JOIN roles r ON u.id_rol = r.id_rol 
       WHERE u.correo = ?`,
      [correo]
    );
    return rows[0];
  }

  static async crearCliente({ nombre, correo, contrasenaHash, direccion }) {
    // Rol por defecto: 2 (Cliente)
    const [result] = await pool.query(
      `INSERT INTO usuarios (nombre, correo, contrasena, direccion, puntos_fidelizacion, id_rol) 
       VALUES (?, ?, ?, ?, 0, 2)`,
      [nombre, correo, contrasenaHash, direccion]
    );
    return result.insertId;
  }
}

module.exports = UsuarioModel;