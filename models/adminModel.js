/**
 * Archivo: models/adminModel.js
 * Propósito: Consultas SQL del Backoffice Administrador (CU02.1, CU02.2, CU02.5, CU02.6, CU02.7).
 */
const { pool } = require('../config/db');

class AdminModel {
  // ==========================================
  // RESUMEN DASHBOARD
  // ==========================================
  static async obtenerResumenDashboard() {
    const [[{ total_productos }]] = await pool.query('SELECT COUNT(*) AS total_productos FROM productos');
    const [[{ total_clientes }]] = await pool.query('SELECT COUNT(*) AS total_clientes FROM usuarios WHERE id_rol = 2');
    const [[{ pedidos_pendientes }]] = await pool.query("SELECT COUNT(*) AS pedidos_pendientes FROM entregas WHERE estado_entrega != 'Entregado'");
    const [[{ ventas_totales }]] = await pool.query("SELECT COALESCE(SUM(total), 0) AS ventas_totales FROM pedidos WHERE estado_pedido = 'Pagado'");
    return { total_productos, total_clientes, pedidos_pendientes, ventas_totales };
  }

  // ==========================================
  // CU02.1 INVENTARIO ESTACIONAL Y CATÁLOGOS
  // ==========================================
  static async obtenerDatosInventario() {
    const [productos] = await pool.query(`
      SELECT p.*, c.nombre_categoria, m.nombre_marca, t.nombre_temporada, pr.nombre_proveedor,
             COALESCE(SUM(i.cantidad_stock), 0) AS stock_total
      FROM productos p
      JOIN categorias c ON p.id_categoria = c.id_categoria
      JOIN marcas m ON p.id_marca = m.id_marca
      JOIN temporadas t ON p.id_temporada = t.id_temporada
      JOIN proveedores pr ON p.id_proveedor = pr.id_proveedor
      LEFT JOIN inventario i ON p.id_producto = i.id_producto
      GROUP BY p.id_producto
      ORDER BY p.prioridad_visual DESC, p.id_producto DESC
    `);

    const [inventarioDetalle] = await pool.query(`
      SELECT i.*, p.nombre_producto, t.nombre_talla, col.nombre_color
      FROM inventario i
      JOIN productos p ON i.id_producto = p.id_producto
      JOIN tallas t ON i.id_talla = t.id_talla
      JOIN colores col ON i.id_color = col.id_color
      ORDER BY p.nombre_producto ASC, t.id_talla ASC
    `);

    const [categorias] = await pool.query('SELECT * FROM categorias ORDER BY nombre_categoria');
    const [marcas] = await pool.query('SELECT * FROM marcas ORDER BY nombre_marca');
    const [temporadas] = await pool.query('SELECT * FROM temporadas ORDER BY id_temporada');
    const [proveedores] = await pool.query('SELECT * FROM proveedores ORDER BY nombre_proveedor');
    const [tallas] = await pool.query('SELECT * FROM tallas ORDER BY id_talla');
    const [colores] = await pool.query('SELECT * FROM colores ORDER BY nombre_color');

    return { productos, inventarioDetalle, categorias, marcas, temporadas, proveedores, tallas, colores };
  }

  static async crearProducto(datos) {
    const { nombre_producto, descripcion, precio, id_categoria, id_marca, id_temporada, id_proveedor, prioridad_visual } = datos;
    await pool.query(
      `INSERT INTO productos (nombre_producto, descripcion, precio, id_categoria, id_marca, id_temporada, id_proveedor, prioridad_visual, estado)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, TRUE)`,
      [nombre_producto, descripcion, precio, id_categoria, id_marca, id_temporada, id_proveedor, prioridad_visual || 0]
    );
  }

  static async actualizarProducto(datos) {
    const { id_producto, nombre_producto, precio, id_temporada, prioridad_visual, estado } = datos;
    await pool.query(
      `UPDATE productos 
       SET nombre_producto = ?, precio = ?, id_temporada = ?, prioridad_visual = ?, estado = ?
       WHERE id_producto = ?`,
      [nombre_producto, precio, id_temporada, prioridad_visual, estado === '1', id_producto]
    );
  }

  static async guardarStock({ id_producto, id_talla, id_color, cantidad_stock }) {
    // Usa la restricción UNIQUE (id_producto, id_talla, id_color) creada en migraciones.sql
    await pool.query(
      `INSERT INTO inventario (id_producto, id_talla, id_color, cantidad_stock)
       VALUES (?, ?, ?, ?)
       ON DUPLICATE KEY UPDATE cantidad_stock = VALUES(cantidad_stock)`,
      [id_producto, id_talla, id_color, cantidad_stock]
    );
  }

  static async crearAtributoCatalogo(tipo, valor) {
    if (tipo === 'categoria') {
      await pool.query('INSERT INTO categorias (nombre_categoria) VALUES (?)', [valor]);
    } else if (tipo === 'temporada') {
      await pool.query('INSERT INTO temporadas (nombre_temporada) VALUES (?)', [valor]);
    } else if (tipo === 'talla') {
      await pool.query('INSERT INTO tallas (nombre_talla) VALUES (?)', [valor]);
    } else if (tipo === 'color') {
      await pool.query('INSERT INTO colores (nombre_color) VALUES (?)', [valor]);
    }
  }

  // ==========================================
  // CU02.5 GESTIÓN DE MARCAS
  // ==========================================
  static async listarMarcas() {
    const [rows] = await pool.query('SELECT * FROM marcas ORDER BY id_marca ASC');
    return rows;
  }

  static async crearMarca(nombre_marca) {
    await pool.query('INSERT INTO marcas (nombre_marca, estado) VALUES (?, TRUE)', [nombre_marca]);
  }

  static async actualizarMarca(id_marca, nombre_marca, estado) {
    await pool.query('UPDATE marcas SET nombre_marca = ?, estado = ? WHERE id_marca = ?', [
      nombre_marca,
      estado === '1',
      id_marca
    ]);
  }

  // ==========================================
  // CU02.7 GESTIÓN DE PROVEEDORES
  // ==========================================
  static async listarProveedoresConProductos() {
    const [proveedores] = await pool.query('SELECT * FROM proveedores ORDER BY id_proveedor ASC');
    const [productos] = await pool.query('SELECT id_producto, nombre_producto, id_proveedor, costo_promedio_ponderado FROM productos');
    return { proveedores, productos };
  }

  static async crearProveedor({ nombre_proveedor, telefono, correo }) {
    await pool.query(
      'INSERT INTO proveedores (nombre_proveedor, telefono, correo) VALUES (?, ?, ?)',
      [nombre_proveedor, telefono, correo]
    );
  }

  static async actualizarProveedor({ id_proveedor, nombre_proveedor, telefono, correo }) {
    await pool.query(
      'UPDATE proveedores SET nombre_proveedor = ?, telefono = ?, correo = ? WHERE id_proveedor = ?',
      [nombre_proveedor, telefono, correo, id_proveedor]
    );
  }

  // ==========================================
  // CU02.6 GESTIÓN DE TRANSPORTADORAS
  // ==========================================
  static async listarTransportadoras() {
    const [rows] = await pool.query('SELECT * FROM transportadoras ORDER BY id_transportadora ASC');
    return rows;
  }

  static async crearTransportadora({ nombre_empresa, telefono, correo }) {
    await pool.query(
      'INSERT INTO transportadoras (nombre_empresa, telefono, correo) VALUES (?, ?, ?)',
      [nombre_empresa, telefono, correo]
    );
  }

  static async actualizarTransportadora({ id_transportadora, nombre_empresa, telefono, correo }) {
    await pool.query(
      'UPDATE transportadoras SET nombre_empresa = ?, telefono = ?, correo = ? WHERE id_transportadora = ?',
      [nombre_empresa, telefono, correo, id_transportadora]
    );
  }

  static async eliminarTransportadora(id_transportadora) {
    await pool.query('DELETE FROM transportadoras WHERE id_transportadora = ?', [id_transportadora]);
  }

  // ==========================================
  // CU02.2 CONFIGURACIÓN DE MÉTODOS DE PAGO
  // ==========================================
  static async listarMetodosPago() {
    const [rows] = await pool.query('SELECT * FROM metodos_pago ORDER BY id_metodo ASC');
    return rows;
  }

  static async crearMetodoPago(nombre_metodo) {
    await pool.query('INSERT INTO metodos_pago (nombre_metodo, estado) VALUES (?, TRUE)', [nombre_metodo]);
  }

  static async cambiarEstadoMetodoPago(id_metodo, nuevoEstado) {
    await pool.query('UPDATE metodos_pago SET estado = ? WHERE id_metodo = ?', [nuevoEstado === '1', id_metodo]);
  }
}

module.exports = AdminModel;