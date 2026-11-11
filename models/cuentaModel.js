/**
 * Archivo: models/cuentaModel.js
 * Propósito: Consultas SQL para el perfil del cliente, movimientos de puntos e historial de pedidos (CU01.3 y Ajuste 4.6).
 */
const { pool } = require('../config/db');

class CuentaModel {
  static async obtenerDatosCliente(id_usuario) {
    const [rows] = await pool.query(
      `SELECT id_usuario, nombre, correo, direccion, puntos_fidelizacion, fecha_registro 
       FROM usuarios WHERE id_usuario = ?`,
      [id_usuario]
    );
    return rows[0];
  }

  static async obtenerHistorialPedidos(id_cliente) {
    const [rows] = await pool.query(
      `SELECT 
         p.id_pedido, 
         p.fecha_pedido,
         p.subtotal,
         p.puntos_canjeados,
         p.descuento_puntos,
         p.total,
         p.puntos_ganados,
         p.estado_pedido, 
         p.direccion_entrega,
         mp.nombre_metodo AS metodo_pago,
         e.tipo_entrega,
         e.estado_entrega,
         t_emp.nombre_empresa AS transportadora
       FROM pedidos p
       JOIN metodos_pago mp ON p.id_metodo_pago = mp.id_metodo
       LEFT JOIN entregas e ON p.id_pedido = e.id_pedido
       LEFT JOIN transportadoras t_emp ON e.id_transportadora = t_emp.id_transportadora
       WHERE p.id_cliente = ?
       ORDER BY p.fecha_pedido DESC`,
      [id_cliente]
    );
    return rows;
  }

  static async obtenerMovimientosPuntos(id_usuario) {
    const [rows] = await pool.query(
      `SELECT id_movimiento, id_pedido, tipo, puntos, saldo_resultante, descripcion, fecha
       FROM movimientos_puntos
       WHERE id_usuario = ?
       ORDER BY fecha DESC, id_movimiento DESC`,
      [id_usuario]
    );
    return rows;
  }

  static async obtenerDetallePedidoPorId(id_pedido, id_cliente) {
    const [pedidos] = await pool.query(
      `SELECT p.*, mp.nombre_metodo, e.tipo_entrega, e.estado_entrega, t_emp.nombre_empresa AS transportadora
       FROM pedidos p
       JOIN metodos_pago mp ON p.id_metodo_pago = mp.id_metodo
       LEFT JOIN entregas e ON p.id_pedido = e.id_pedido
       LEFT JOIN transportadoras t_emp ON e.id_transportadora = t_emp.id_transportadora
       WHERE p.id_pedido = ? AND p.id_cliente = ?`,
      [id_pedido, id_cliente]
    );

    if (pedidos.length === 0) return null;
    const pedido = pedidos[0];

    const [detalles] = await pool.query(
      `SELECT dp.*, pr.nombre_producto, t.nombre_talla, col.nombre_color
       FROM detalles_pedido dp
       JOIN productos pr ON dp.id_producto = pr.id_producto
       JOIN tallas t ON dp.id_talla = t.id_talla
       JOIN colores col ON dp.id_color = col.id_color
       WHERE dp.id_pedido = ?`,
      [id_pedido]
    );

    pedido.detalles = detalles;
    return pedido;
  }
}

module.exports = CuentaModel;