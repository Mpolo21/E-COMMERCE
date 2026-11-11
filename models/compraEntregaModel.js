/**
 * Archivo: models/compraEntregaModel.js
 * Propósito: Gestión de Entregas, Pagos Contraentrega (Ajuste 1), Cancelaciones (Ajuste 4.5) y Compras CPP (Actualización 2.4).
 */
const { pool } = require('../config/db');
const PuntosService = require('../services/puntosService');

class CompraEntregaModel {
  // ==========================================
  // GESTIÓN DE ENTREGAS (CU02.3 + Ajuste 1.7)
  // ==========================================
  static async listarEntregas() {
    const [rows] = await pool.query(`
      SELECT e.*, p.fecha_pedido, p.direccion_entrega, p.subtotal, p.descuento_puntos,
             p.total, p.estado_pedido, mp.nombre_metodo,
             u.nombre AS cliente_nombre, u.correo AS cliente_correo,
             t.nombre_empresa AS transportadora
      FROM entregas e
      JOIN pedidos p ON e.id_pedido = p.id_pedido
      JOIN metodos_pago mp ON p.id_metodo_pago = mp.id_metodo
      JOIN usuarios u ON p.id_cliente = u.id_usuario
      LEFT JOIN transportadoras t ON e.id_transportadora = t.id_transportadora
      WHERE p.estado_pedido != 'Cancelado'
      ORDER BY p.fecha_pedido DESC
    `);
    return rows;
  }

  static async actualizarEntrega({ id_entrega, tipo_entrega, id_transportadora, estado_entrega }) {
    const transp = tipo_entrega === 'Propia' || !id_transportadora ? null : id_transportadora;
    const zona = tipo_entrega === 'Propia' ? 1 : 0;

    await pool.query(
      `UPDATE entregas 
       SET tipo_entrega = ?, id_transportadora = ?, zona_cobertura = ?, estado_entrega = ? 
       WHERE id_entrega = ?`,
      [tipo_entrega, transp, zona, estado_entrega, id_entrega]
    );
  }

  // ==========================================
  // AJUSTE 1: PAGOS CONTRAENTREGA (SOLO ADMIN)
  // ==========================================
  static async listarPedidosContraentrega({ estado = '', busqueda = '' }) {
    let sql = `
      SELECT p.id_pedido, p.id_cliente, p.fecha_pedido, p.subtotal, p.puntos_canjeados,
             p.descuento_puntos, p.total, p.puntos_ganados, p.estado_pedido, p.direccion_entrega,
             u.nombre AS cliente_nombre, u.correo AS cliente_correo,
             mp.nombre_metodo,
             e.estado_entrega, e.tipo_entrega,
             COALESCE(t.nombre_empresa, 'Logística Propia Urabá') AS responsable_entrega
      FROM pedidos p
      JOIN usuarios u ON p.id_cliente = u.id_usuario
      JOIN metodos_pago mp ON p.id_metodo_pago = mp.id_metodo
      LEFT JOIN entregas e ON p.id_pedido = e.id_pedido
      LEFT JOIN transportadoras t ON e.id_transportadora = t.id_transportadora
      WHERE LOWER(mp.nombre_metodo) LIKE '%contraentrega%'
    `;
    const params = [];

    if (estado === 'Debiendo' || estado === 'Pagado') {
      sql += ' AND p.estado_pedido = ?';
      params.push(estado);
    }

    if (busqueda && busqueda.trim()) {
      const termino = `%${busqueda.trim()}%`;
      sql += ' AND (u.nombre LIKE ? OR u.correo LIKE ? OR CAST(p.id_pedido AS CHAR) LIKE ?)';
      params.push(termino, termino, termino);
    }

    sql += ' ORDER BY FIELD(p.estado_pedido, "Debiendo", "Pagado", "Cancelado"), p.fecha_pedido DESC';

    const [rows] = await pool.query(sql, params);
    return rows;
  }

  static async marcarContraentregaComoPagado(id_pedido) {
    const connection = await pool.getConnection();
    try {
      await connection.beginTransaction();

      const [pedRows] = await connection.query(
        `SELECT p.*, mp.nombre_metodo 
         FROM pedidos p
         JOIN metodos_pago mp ON p.id_metodo_pago = mp.id_metodo
         WHERE p.id_pedido = ? FOR UPDATE`,
        [id_pedido]
      );

      if (pedRows.length === 0) {
        throw new Error('El pedido indicado no existe.');
      }

      const pedido = pedRows[0];
      if (!pedido.nombre_metodo.toLowerCase().includes('contraentrega')) {
        throw new Error('Este pedido no corresponde a la modalidad de Pago Contraentrega.');
      }

      if (pedido.estado_pedido === 'Pagado') {
        throw new Error(`El Pedido #${id_pedido} ya había sido marcado como Pagado anteriormente.`);
      }

      if (pedido.estado_pedido !== 'Debiendo' && pedido.estado_pedido !== 'Pendiente') {
        throw new Error(`No se puede marcar como pagado un pedido en estado "${pedido.estado_pedido}".`);
      }

      await connection.query(
        "UPDATE pedidos SET estado_pedido = 'Pagado' WHERE id_pedido = ?",
        [id_pedido]
      );

      const puntosOtorgados = await PuntosService.otorgarPuntos(
        connection,
        pedido.id_cliente,
        pedido.id_pedido,
        pedido.total
      );

      await connection.commit();
      connection.release();

      return { id_pedido, puntosOtorgados, totalCobrado: pedido.total };
    } catch (error) {
      await connection.rollback();
      connection.release();
      throw error;
    }
  }

  // ==========================================
  // AJUSTE 4.5: CANCELACIÓN TRANSACCIONAL DE PEDIDOS
  // ==========================================
  static async cancelarPedidoTransaccional(id_pedido) {
    const connection = await pool.getConnection();
    try {
      await connection.beginTransaction();

      const [pedRows] = await connection.query(
        'SELECT * FROM pedidos WHERE id_pedido = ? FOR UPDATE',
        [id_pedido]
      );
      if (pedRows.length === 0) {
        throw new Error('El pedido no existe.');
      }

      const pedido = pedRows[0];
      if (pedido.estado_pedido === 'Cancelado') {
        throw new Error('Este pedido ya se encuentra cancelado.');
      }

      const [detalles] = await connection.query(
        'SELECT id_producto, id_talla, id_color, cantidad FROM detalles_pedido WHERE id_pedido = ?',
        [id_pedido]
      );
      for (const det of detalles) {
        await connection.query(
          `UPDATE inventario 
           SET cantidad_stock = cantidad_stock + ? 
           WHERE id_producto = ? AND id_talla = ? AND id_color = ?`,
          [det.cantidad, det.id_producto, det.id_talla, det.id_color]
        );
      }

      const puntosDevueltos = await PuntosService.devolverPuntos(connection, id_pedido);
      const puntosRevertidos = await PuntosService.revertirPuntosGanados(connection, id_pedido);

      await connection.query(
        "UPDATE pedidos SET estado_pedido = 'Cancelado' WHERE id_pedido = ?",
        [id_pedido]
      );

      await connection.commit();
      connection.release();

      return { id_pedido, puntosDevueltos, puntosRevertidos };
    } catch (error) {
      await connection.rollback();
      connection.release();
      throw error;
    }
  }

  // ==========================================
  // COMPRAS A PROVEEDORES Y C.P.P. (Actualización 2.4)
  // ==========================================
  static async obtenerCatalogosParaCompra() {
    const [proveedores] = await pool.query('SELECT * FROM proveedores ORDER BY nombre_proveedor');
    // Solo listar productos activos (estado = TRUE) para compras nuevas
    const [productos] = await pool.query(
      'SELECT id_producto, nombre_producto, costo_promedio_ponderado FROM productos WHERE estado = TRUE ORDER BY nombre_producto'
    );
    const [tallas] = await pool.query('SELECT * FROM tallas');
    const [colores] = await pool.query('SELECT * FROM colores');
    return { proveedores, productos, tallas, colores };
  }

  static async registrarCompraTransaccional({ id_proveedor, id_producto, id_talla, id_color, cantidad, precio_compra_unitario }) {
    const connection = await pool.getConnection();
    try {
      await connection.beginTransaction();

      // Validar que el producto exista y esté activo (no dado de baja)
      const [prodResult] = await connection.query(
        'SELECT id_producto, nombre_producto, estado, costo_promedio_ponderado FROM productos WHERE id_producto = ? FOR UPDATE',
        [id_producto]
      );

      if (prodResult.length === 0 || !prodResult[0].estado) {
        throw new Error('No se puede registrar una compra de un producto que no existe o se encuentra dado de baja.');
      }

      const total_compra = parseFloat(cantidad) * parseFloat(precio_compra_unitario);

      const [resCompra] = await connection.query(
        'INSERT INTO compras (id_proveedor, total_compra, estado_compra) VALUES (?, ?, ?)',
        [id_proveedor, total_compra, 'Recibida']
      );
      const id_compra = resCompra.insertId;

      await connection.query(
        `INSERT INTO detalles_compra (id_compra, id_producto, id_talla, id_color, cantidad, precio_compra_unitario) 
         VALUES (?, ?, ?, ?, ?, ?)`,
        [id_compra, id_producto, id_talla, id_color, cantidad, precio_compra_unitario]
      );

      const [stockResult] = await connection.query(
        'SELECT COALESCE(SUM(cantidad_stock), 0) AS stock_total FROM inventario WHERE id_producto = ? FOR UPDATE',
        [id_producto]
      );
      const stock_actual = parseFloat(stockResult[0].stock_total);
      const costo_actual = parseFloat(prodResult[0].costo_promedio_ponderado || 0);

      const cant_compra = parseFloat(cantidad);
      const precio_compra = parseFloat(precio_compra_unitario);
      const nuevo_costo = (stock_actual * costo_actual + cant_compra * precio_compra) / (stock_actual + cant_compra);

      await connection.query(
        'UPDATE productos SET costo_promedio_ponderado = ? WHERE id_producto = ?',
        [nuevo_costo, id_producto]
      );

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