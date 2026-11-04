/**
 * Archivo: models/carritoModel.js
 * Propósito: Gestionar operaciones de inventario y transacciones de checkout (CU01.2 y CU01.5).
 */
const { pool } = require('../config/db');

class CarritoModel {
  static async obtenerItemInventario(id_inventario) {
    const [rows] = await pool.query(
      `SELECT i.*, p.nombre_producto, p.precio, p.id_proveedor, 
              t.nombre_talla, col.nombre_color 
       FROM inventario i
       JOIN productos p ON i.id_producto = p.id_producto
       JOIN tallas t ON i.id_talla = t.id_talla
       JOIN colores col ON i.id_color = col.id_color
       WHERE i.id_inventario = ?`,
      [id_inventario]
    );
    return rows[0];
  }

  static async obtenerMetodosPagoActivos() {
    const [rows] = await pool.query('SELECT * FROM metodos_pago WHERE estado = TRUE');
    return rows;
  }

  static async procesarCheckoutTransaccional({ id_cliente, direccion_entrega, id_metodo_pago, carritoItems, totalCompra, copPorPunto }) {
    const connection = await pool.getConnection();
    try {
      await connection.beginTransaction();

      // 1. Validar stock en tiempo real y descontar inventario
      for (const item of carritoItems) {
        const [invRows] = await connection.query(
          `SELECT cantidad_stock FROM inventario WHERE id_inventario = ? FOR UPDATE`,
          [item.id_inventario]
        );

        if (invRows.length === 0 || invRows[0].cantidad_stock < item.cantidad) {
          throw new Error(`Stock insuficiente para el producto "${item.nombre_producto}" (Talla: ${item.nombre_talla}, Color: ${item.nombre_color}).`);
        }

        // Descontar inventario
        await connection.query(
          `UPDATE inventario SET cantidad_stock = cantidad_stock - ? WHERE id_inventario = ?`,
          [item.cantidad, item.id_inventario]
        );
      }

      // 2. Crear el pedido
      const [pedidoResult] = await connection.query(
        `INSERT INTO pedidos (id_cliente, id_metodo_pago, total, estado_pedido, direccion_entrega) 
         VALUES (?, ?, ?, 'Pagado', ?)`,
        [id_cliente, id_metodo_pago, totalCompra, direccion_entrega]
      );
      const id_pedido = pedidoResult.insertId;

      // 3. Crear detalles del pedido (guardando precio_unitario vigente)
      for (const item of carritoItems) {
        await connection.query(
          `INSERT INTO detalles_pedido (id_pedido, id_producto, id_talla, id_color, cantidad, precio_unitario) 
           VALUES (?, ?, ?, ?, ?, ?)`,
          [id_pedido, item.id_producto, item.id_talla, item.id_color, item.cantidad, item.precio]
        );
      }

      // 4. Calcular y sumar puntos de fidelización (1 punto por cada COP_POR_PUNTO)
      const puntosGanados = Math.floor(totalCompra / copPorPunto);
      if (puntosGanados > 0) {
        await connection.query(
          `UPDATE usuarios SET puntos_fidelizacion = puntos_fidelizacion + ? WHERE id_usuario = ?`,
          [puntosGanados, id_cliente]
        );
      }

      // 5. Crear la entrega en estado "En preparación" (Logística propia por defecto en zona de cobertura Apartadó)
      await connection.query(
        `INSERT INTO entregas (id_pedido, tipo_entrega, zona_cobertura, id_transportadora, estado_entrega) 
         VALUES (?, 'Propia', TRUE, NULL, 'En preparación')`,
        [id_pedido]
      );

      await connection.commit();
      connection.release();
      return { success: true, id_pedido, puntosGanados };

    } catch (error) {
      await connection.rollback();
      connection.release();
      return { success: false, mensaje: error.message };
    }
  }
}

module.exports = CarritoModel;