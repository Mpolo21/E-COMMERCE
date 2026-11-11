/**
 * Archivo: models/productoModel.js
 * Propósito: Consultas SQL para el catálogo público del cliente (solo prendas activas) y detalle de producto.
 */
const { pool } = require('../config/db');

class ProductoModel {
  static async obtenerFiltrosDisponibles() {
    const [categorias] = await pool.query('SELECT id_categoria, nombre_categoria FROM categorias ORDER BY nombre_categoria');
    const [marcas] = await pool.query('SELECT id_marca, nombre_marca FROM marcas WHERE estado = TRUE ORDER BY nombre_marca');
    const [tallas] = await pool.query('SELECT id_talla, nombre_talla FROM tallas ORDER BY id_talla');
    const [colores] = await pool.query('SELECT id_color, nombre_color FROM colores ORDER BY nombre_color');

    return { categorias, marcas, tallas, colores };
  }

  static async obtenerCatalogo({ categoria, marca, talla, color } = {}) {
    const whereClauses = ['p.estado = TRUE'];
    const params = [];

    if (categoria) {
      whereClauses.push('p.id_categoria = ?');
      params.push(categoria);
    }
    if (marca) {
      whereClauses.push('p.id_marca = ?');
      params.push(marca);
    }
    if (talla) {
      whereClauses.push('i.id_talla = ?');
      params.push(talla);
    }
    if (color) {
      whereClauses.push('i.id_color = ?');
      params.push(color);
    }

    const whereSQL = `WHERE ${whereClauses.join(' AND ')}`;

    // Consulta que consolida el stock sumando todas las tallas/colores de cada prenda
    const sql = `
      SELECT p.id_producto, p.nombre_producto, p.precio, p.prioridad_visual,
             c.nombre_categoria, m.nombre_marca, temp.nombre_temporada,
             COALESCE(SUM(i.cantidad_stock), 0) AS stock_total
      FROM productos p
      JOIN categorias c ON p.id_categoria = c.id_categoria
      JOIN marcas m ON p.id_marca = m.id_marca
      JOIN temporadas temp ON p.id_temporada = temp.id_temporada
      LEFT JOIN inventario i ON p.id_producto = i.id_producto
      ${whereSQL}
      GROUP BY p.id_producto, p.nombre_producto, p.precio, p.prioridad_visual,
               c.nombre_categoria, m.nombre_marca, temp.nombre_temporada
      ORDER BY p.prioridad_visual DESC, p.id_producto DESC
    `;

    const [rows] = await pool.query(sql, params);
    return rows;
  }

  static async obtenerDetalleProducto(id_producto) {
    const [productos] = await pool.query(
      `SELECT p.id_producto, p.nombre_producto, p.descripcion, p.precio, p.estado,
              c.nombre_categoria, m.nombre_marca, temp.nombre_temporada
       FROM productos p
       JOIN categorias c ON p.id_categoria = c.id_categoria
       JOIN marcas m ON p.id_marca = m.id_marca
       JOIN temporadas temp ON p.id_temporada = temp.id_temporada
       WHERE p.id_producto = ?`,
      [id_producto]
    );

    if (productos.length === 0 || !productos[0].estado) {
      return null; // Retorna null si no existe o fue dado de baja (estado = 0)
    }

    const producto = productos[0];

    const [inventario] = await pool.query(
      `SELECT i.id_inventario, i.cantidad_stock, t.nombre_talla, col.nombre_color
       FROM inventario i
       JOIN tallas t ON i.id_talla = t.id_talla
       JOIN colores col ON i.id_color = col.id_color
       WHERE i.id_producto = ? AND i.cantidad_stock > 0
       ORDER BY t.id_talla ASC, col.nombre_color ASC`,
      [id_producto]
    );

    producto.variantes = inventario;
    producto.stock_total = inventario.reduce((acc, curr) => acc + Number(curr.cantidad_stock), 0);

    return producto;
  }
}

module.exports = ProductoModel;