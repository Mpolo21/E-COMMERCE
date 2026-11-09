/**
 * Archivo: models/proveedorModel.js
 * Propósito: Consultas SQL de solo lectura para el rol Proveedor (CU03).
 */
const { pool } = require('../config/db');

class ProveedorModel {
  // 1. Información de la empresa proveedora vinculada al usuario
  static async obtenerInfoProveedor(id_proveedor) {
    const [rows] = await pool.query(
      'SELECT * FROM proveedores WHERE id_proveedor = ?',
      [id_proveedor]
    );
    return rows[0] || null;
  }

  // 2. Productos que suministra el proveedor a la tienda y su stock físico actual
  static async obtenerProductosSuministrados(id_proveedor) {
    const [rows] = await pool.query(
      `SELECT p.id_producto, p.nombre_producto, c.nombre_categoria, m.nombre_marca,
              temp.nombre_temporada, p.precio, p.costo_promedio_ponderado, p.estado,
              COALESCE(SUM(i.cantidad_stock), 0) AS stock_actual_tienda
       FROM productos p
       JOIN categorias c ON p.id_categoria = c.id_categoria
       JOIN marcas m ON p.id_marca = m.id_marca
       JOIN temporadas temp ON p.id_temporada = temp.id_temporada
       LEFT JOIN inventario i ON p.id_producto = i.id_producto
       WHERE p.id_proveedor = ?
       GROUP BY p.id_producto, p.nombre_producto, c.nombre_categoria, m.nombre_marca,
                temp.nombre_temporada, p.precio, p.costo_promedio_ponderado, p.estado
       ORDER BY p.id_producto ASC`,
      [id_proveedor]
    );
    return rows;
  }

  // 3. Órdenes de compra realizadas por la tienda a este proveedor y su estado
  static async obtenerComprasRealizadas(id_proveedor) {
    const [rows] = await pool.query(
      `SELECT c.id_compra, c.fecha_compra, c.total_compra, c.estado_compra,
              COALESCE(SUM(dc.cantidad), 0) AS total_unidades_solicitadas,
              COUNT(dc.id_detalle_compra) AS referencias_incluidas
       FROM compras c
       LEFT JOIN detalles_compra dc ON c.id_compra = dc.id_compra
       WHERE c.id_proveedor = ?
       GROUP BY c.id_compra, c.fecha_compra, c.total_compra, c.estado_compra
       ORDER BY c.fecha_compra DESC`,
      [id_proveedor]
    );
    return rows;
  }

  // 4. Historial detallado de suministros (cantidades solicitadas por prenda, talla y color)
  static async obtenerHistorialSuministros(id_proveedor) {
    const [rows] = await pool.query(
      `SELECT dc.id_detalle_compra, c.id_compra, c.fecha_compra, c.estado_compra,
              p.nombre_producto, t.nombre_talla, col.nombre_color,
              dc.cantidad AS cantidad_solicitada,
              dc.precio_compra_unitario,
              (dc.cantidad * dc.precio_compra_unitario) AS subtotal_suministro
       FROM detalles_compra dc
       JOIN compras c ON dc.id_compra = c.id_compra
       JOIN productos p ON dc.id_producto = p.id_producto
       JOIN tallas t ON dc.id_talla = t.id_talla
       JOIN colores col ON dc.id_color = col.id_color
       WHERE c.id_proveedor = ?
       ORDER BY c.fecha_compra DESC, dc.id_detalle_compra ASC`,
      [id_proveedor]
    );
    return rows;
  }
}

module.exports = ProveedorModel;