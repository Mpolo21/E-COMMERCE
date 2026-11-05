/**
 * Archivo: models/compraEntregaModel.js
 * Propósito: Consultas SQL para gestionar Entregas y Compras a Proveedores (Fórmula CPP).
 */
const { pool } = require('../config/db');

class CompraEntregaModel {
  // ==========================================
  // GESTIÓN DE ENTREGAS (CU02.3)
  // ==========================================
  static async listarEntregas() {
    const [rows] = await pool.query(`
      SELECT e.*, p.fecha_pedido, p.direccion_entrega, p.total, p.estado_pedido,
             u.nombre AS cliente_nombre, u.correo AS cliente_correo,
             t.nombre_empresa AS transportadora
      FROM entregas e
      JOIN pedidos p ON e.id_pedido = p.id_pedido
      JOIN usuarios u ON p.id_cliente = u.id_usuario
      LEFT JOIN transportadoras t ON e.id_transportadora = t.id_transportadora
      ORDER BY p.fecha_pedido DESC
    `);
    return rows;
  }

  static async actualizarEntrega({ id_entrega, tipo_entrega, id_transportadora, estado_entrega }) {
    // Reglas: Si es Propia, transportadora es NULL y zona_cobertura = 1. Si Externa, se asigna transportadora.
    const transp = (tipo_entrega === 'Propia' || !id_transportadora) ? null : id_transportadora;
    const zona = (tipo_entrega === 'Propia') ? 1 : 0;

    await pool.query(
      `UPDATE entregas 
       SET tipo_entrega = ?, id_transportadora = ?, zona_cobertura = ?, estado_entrega = ? 
       WHERE id_entrega = ?`,
      [tipo_entrega, transp, zona, estado_entrega, id_entrega]
    );
  }

  // ==========================================
  // COMPRAS A PROVEEDORES Y C.P.P.
  // ==========================================
  static async obtenerCatalogosParaCompra() {
    const [proveedores] = await pool.query('SELECT * FROM proveedores ORDER BY nombre_proveedor');
    const [productos] = await pool.query('SELECT id_producto, nombre_producto, costo_promedio_ponderado FROM productos ORDER BY nombre_producto');
    const [tallas] = await pool.query('SELECT * FROM tallas');
    const [colores] = await pool.query('SELECT * FROM colores');
    return { proveedores, productos, tallas, colores };
  }

  static async registrarCompraTransaccional({ id_proveedor, id_producto, id_talla, id_color, cantidad, precio_compra_unitario }) {
    const connection = await pool.getConnection();
    try {
      await connection.beginTransaction();

      const total_compra = parseFloat(cantidad) * parseFloat(precio_compra_unitario);

      // 1. Crear el registro general de la compra en estado 'Recibida'
      const [resCompra] = await connection.query(
        'INSERT INTO compras (id_proveedor, total_compra, estado_compra) VALUES (?, ?, ?)',
        [id_proveedor, total_compra, 'Recibida']
      );
      const id_compra = resCompra.insertId;

      // 2. Insertar el detalle de compra
      await connection.query(
        `INSERT INTO detalles_compra (id_compra, id_producto, id_talla, id_color, cantidad, precio_compra_unitario) 
         VALUES (?, ?, ?, ?, ?, ?)`,
        [id_compra, id_producto, id_talla, id_color, cantidad, precio_compra_unitario]
      );

      // 3. CALCULAR COSTO PROMEDIO PONDERADO
      // a) Obtener Stock Total actual del producto (sumando todas las tallas y colores)
      const [stockResult] = await connection.query(
        'SELECT COALESCE(SUM(cantidad_stock), 0) AS stock_total FROM inventario WHERE id_producto = ? FOR UPDATE',
        [id_producto]
      );
      const stock_actual = parseFloat(stockResult[0].stock_total);

      // b) Obtener el Costo actual del producto
      const [prodResult] = await connection.query(
        'SELECT costo_promedio_ponderado FROM productos WHERE id_producto = ?',
        [id_producto]
      );
      const costo_actual = parseFloat(prodResult[0].costo_promedio_ponderado || 0);

      // c) Aplicar fórmula: nuevo_costo = (stock_actual * costo_actual + cant_compra * precio_compra) / (stock_actual + cant_compra)
      const cant_compra = parseFloat(cantidad);
      const precio_compra = parseFloat(precio_compra_unitario);
      const nuevo_costo = ((stock_actual * costo_actual) + (cant_compra * precio_compra)) / (stock_actual + cant_compra);

      // d) Actualizar el producto con el nuevo Costo Promedio Ponderado
      await connection.query(
        'UPDATE productos SET costo_promedio_ponderado = ? WHERE id_producto = ?',
        [nuevo_costo, id_producto]
      );

      // 4. AUMENTAR INVENTARIO
      // Si la combinación producto/talla/color existe, suma la cantidad. Si no existe, la crea.
      await connection.query(
        `INSERT INTO inventario (id_producto, id_talla, id_color, cantidad_stock) 
         VALUES (?, ?, ?, ?) 
         ON DUPLICATE KEY UPDATE cantidad_stock = cantidad_stock + VALUES(cantidad_stock)`,
        [id_producto, id_talla, id_color, cantidad]
      );

      await connection.commit();
      connection.release();
      return { success: true, id_compra, nuevo_costo };

    } catch (error) {
      await connection.rollback();
      connection.release();
      throw error;
    }
  }
}

module.exports = CompraEntregaModel;