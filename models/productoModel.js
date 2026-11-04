/**
 * Archivo: models/productoModel.js
 * Propósito: Consultas SQL para el catálogo de productos, filtros y stock en tiempo real.
 */
const { pool } = require('../config/db');

class ProductoModel {
  static async obtenerFiltrosCatalogo() {
    const [categorias] = await pool.query('SELECT * FROM categorias ORDER BY nombre_categoria');
    const [marcas] = await pool.query('SELECT * FROM marcas WHERE estado = TRUE ORDER BY nombre_marca');
    const [tallas] = await pool.query('SELECT * FROM tallas ORDER BY id_talla');
    const [colores] = await pool.query('SELECT * FROM colores ORDER BY nombre_color');
    return { categorias, marcas, tallas, colores };
  }

  static async obtenerCatalogoFiltrado({ categoria, marca, talla, color }) {
    let query = `
      SELECT DISTINCT 
        p.id_producto, 
        p.nombre_producto, 
        p.descripcion, 
        p.precio, 
        p.prioridad_visual,
        c.nombre_categoria, 
        m.nombre_marca, 
        t_temp.nombre_temporada,
        COALESCE(SUM(i.cantidad_stock), 0) AS stock_total
      FROM productos p
      JOIN categorias c ON p.id_categoria = c.id_categoria
      JOIN marcas m ON p.id_marca = m.id_marca
      JOIN temporadas t_temp ON p.id_temporada = t_temp.id_temporada
      LEFT JOIN inventario i ON p.id_producto = i.id_producto
      WHERE p.estado = TRUE
    `;

    const params = [];

    if (categoria) {
      query += ` AND p.id_categoria = ?`;
      params.push(categoria);
    }
    if (marca) {
      query += ` AND p.id_marca = ?`;
      params.push(marca);
    }
    if (talla) {
      query += ` AND i.id_talla = ?`;
      params.push(talla);
    }
    if (color) {
      query += ` AND i.id_color = ?`;
      params.push(color);
    }

    query += ` GROUP BY p.id_producto ORDER BY p.prioridad_visual DESC, p.nombre_producto ASC`;

    const [productos] = await pool.query(query, params);
    return productos;
  }

  static async obtenerDetalleProducto(id_producto) {
    const [productos] = await pool.query(
      `SELECT p.*, c.nombre_categoria, m.nombre_marca, t_temp.nombre_temporada 
       FROM productos p
       JOIN categorias c ON p.id_categoria = c.id_categoria
       JOIN marcas m ON p.id_marca = m.id_marca
       JOIN temporadas t_temp ON p.id_temporada = t_temp.id_temporada
       WHERE p.id_producto = ? AND p.estado = TRUE`,
      [id_producto]
    );

    if (productos.length === 0) return null;
    const producto = productos[0];

    // Obtener inventario detallado por talla y color para el selector de compra
    const [inventario] = await pool.query(
      `SELECT i.id_inventario, i.id_talla, t.nombre_talla, i.id_color, col.nombre_color, i.cantidad_stock
       FROM inventario i
       JOIN tallas t ON i.id_talla = t.id_talla
       JOIN colores col ON i.id_color = col.id_color
       WHERE i.id_producto = ? AND i.cantidad_stock > 0`,
      [id_producto]
    );

    producto.inventario = inventario;
    return producto;
  }
}

module.exports = ProductoModel;