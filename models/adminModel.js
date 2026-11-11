/**
 * Archivo: models/adminModel.js
 * Propósito: Consultas SQL del Backoffice Administrador (CU02.1, CU02.2, CU02.5, CU02.6, CU02.7 y Actualización 2).
 */
const { pool } = require('../config/db');

class AdminModel {
  // ==========================================
  // RESUMEN DASHBOARD
  // ==========================================
  static async obtenerResumenDashboard() {
    const [[{ total_productos }]] = await pool.query('SELECT COUNT(*) AS total_productos FROM productos WHERE estado = TRUE');
    const [[{ productos_baja }]] = await pool.query('SELECT COUNT(*) AS productos_baja FROM productos WHERE estado = FALSE');
    const [[{ total_clientes }]] = await pool.query('SELECT COUNT(*) AS total_clientes FROM usuarios WHERE id_rol = 2');
    const [[{ pedidos_pendientes }]] = await pool.query(
      "SELECT COUNT(*) AS pedidos_pendientes FROM entregas e JOIN pedidos p ON e.id_pedido = p.id_pedido WHERE e.estado_entrega != 'Entregado' AND p.estado_pedido != 'Cancelado'"
    );
    const [[{ ventas_totales }]] = await pool.query(
      "SELECT COALESCE(SUM(total), 0) AS ventas_totales FROM pedidos WHERE estado_pedido = 'Pagado'"
    );
    return { total_productos, productos_baja, total_clientes, pedidos_pendientes, ventas_totales };
  }

  // ==========================================
  // CU02.1 INVENTARIO ESTACIONAL Y BAJA DE PRODUCTOS (Actualización 2)
  // ==========================================
  static async obtenerDatosInventario({ estadoFiltro = 'activos', busqueda = '', pagina = 1, limite = 15 } = {}) {
    const offset = (pagina - 1) * limite;
    const whereClauses = [];
    const params = [];

    if (estadoFiltro === 'activos') {
      whereClauses.push('p.estado = TRUE');
    } else if (estadoFiltro === 'baja') {
      whereClauses.push('p.estado = FALSE');
    }

    if (busqueda && busqueda.trim()) {
      whereClauses.push('(p.nombre_producto LIKE ? OR m.nombre_marca LIKE ? OR c.nombre_categoria LIKE ?)');
      const term = `%${busqueda.trim()}%`;
      params.push(term, term, term);
    }

    const whereSQL = whereClauses.length > 0 ? `WHERE ${whereClauses.join(' AND ')}` : '';

    // Total de productos para la paginación
    const [countRows] = await pool.query(
      `SELECT COUNT(*) AS total
       FROM productos p
       JOIN categorias c ON p.id_categoria = c.id_categoria
       JOIN marcas m ON p.id_marca = m.id_marca
       ${whereSQL}`,
      params
    );
    const totalRegistros = countRows[0].total;
    const totalPaginas = Math.max(1, Math.ceil(totalRegistros / limite));

    // Consulta paginada con conteo de stock, historial (pedidos + compras) y entregas pendientes
    const [productos] = await pool.query(
      `SELECT p.*, c.nombre_categoria, m.nombre_marca, t.nombre_temporada, pr.nombre_proveedor,
              COALESCE(inv.stock_total, 0) AS stock_total,
              COALESCE(hist_ped.cant_pedidos, 0) AS total_pedidos_historicos,
              COALESCE(hist_comp.cant_compras, 0) AS total_compras_historicas,
              (COALESCE(hist_ped.cant_pedidos, 0) + COALESCE(hist_comp.cant_compras, 0)) AS total_movimientos_historicos,
              COALESCE(pend.pedidos_pendientes, 0) AS pedidos_pendientes_entrega
       FROM productos p
       JOIN categorias c ON p.id_categoria = c.id_categoria
       JOIN marcas m ON p.id_marca = m.id_marca
       JOIN temporadas t ON p.id_temporada = t.id_temporada
       JOIN proveedores pr ON p.id_proveedor = pr.id_proveedor
       LEFT JOIN (
         SELECT id_producto, SUM(cantidad_stock) AS stock_total
         FROM inventario
         GROUP BY id_producto
       ) inv ON p.id_producto = inv.id_producto
       LEFT JOIN (
         SELECT id_producto, COUNT(*) AS cant_pedidos
         FROM detalles_pedido
         GROUP BY id_producto
       ) hist_ped ON p.id_producto = hist_ped.id_producto
       LEFT JOIN (
         SELECT id_producto, COUNT(*) AS cant_compras
         FROM detalles_compra
         GROUP BY id_producto
       ) hist_comp ON p.id_producto = hist_comp.id_producto
       LEFT JOIN (
         SELECT dp.id_producto, COUNT(DISTINCT pe.id_pedido) AS pedidos_pendientes
         FROM detalles_pedido dp
         JOIN pedidos pe ON dp.id_pedido = pe.id_pedido
         LEFT JOIN entregas en ON pe.id_pedido = en.id_pedido
         WHERE pe.estado_pedido != 'Cancelado' AND (en.estado_entrega IS NULL OR en.estado_entrega != 'Entregado')
         GROUP BY dp.id_producto
       ) pend ON p.id_producto = pend.id_producto
       ${whereSQL}
       ORDER BY p.prioridad_visual DESC, p.id_producto DESC
       LIMIT ? OFFSET ?`,
      [...params, Number(limite), Number(offset)]
    );

    // Lista ligera de productos activos para el selector de asignación rápida de stock
    const [productosSelectorStock] = await pool.query(
      'SELECT id_producto, nombre_producto, estado FROM productos WHERE estado = TRUE ORDER BY nombre_producto ASC'
    );

    const [categorias] = await pool.query('SELECT * FROM categorias ORDER BY nombre_categoria');
    const [marcas] = await pool.query('SELECT * FROM marcas ORDER BY nombre_marca');
    const [temporadas] = await pool.query('SELECT * FROM temporadas ORDER BY id_temporada');
    const [proveedores] = await pool.query('SELECT * FROM proveedores ORDER BY nombre_proveedor');
    const [tallas] = await pool.query('SELECT * FROM tallas ORDER BY id_talla');
    const [colores] = await pool.query('SELECT * FROM colores ORDER BY nombre_color');

    return {
      productos,
      productosSelectorStock,
      categorias,
      marcas,
      temporadas,
      proveedores,
      tallas,
      colores,
      paginacion: {
        paginaActual: Number(pagina),
        limite: Number(limite),
        totalRegistros,
        totalPaginas
      }
    };
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
    const { id_producto, nombre_producto, precio, id_temporada, prioridad_visual } = datos;
    await pool.query(
      `UPDATE productos 
       SET nombre_producto = ?, precio = ?, id_temporada = ?, prioridad_visual = ?
       WHERE id_producto = ?`,
      [nombre_producto, precio, id_temporada, prioridad_visual, id_producto]
    );
  }

  // Actualización 2.1.1: Dar de baja (baja lógica conservando stock e historial)
  static async darDeBajaProducto(id_producto, motivo_baja) {
    const [rows] = await pool.query('SELECT id_producto, nombre_producto, estado FROM productos WHERE id_producto = ?', [id_producto]);
    if (rows.length === 0) {
      throw new Error('El producto especificado no existe.');
    }
    if (!rows[0].estado) {
      throw new Error(`El producto "${rows[0].nombre_producto}" ya se encuentra dado de baja.`);
    }

    const motivoLimpio = motivo_baja && motivo_baja.trim() ? motivo_baja.trim() : 'Dado de baja por el administrador';
    await pool.query(
      `UPDATE productos 
       SET estado = FALSE, fecha_baja = NOW(), motivo_baja = ?
       WHERE id_producto = ?`,
      [motivoLimpio, id_producto]
    );
    return rows[0].nombre_producto;
  }

  // Actualización 2.3: Reactivar producto dado de baja (limpia fecha_baja y motivo_baja)
  static async reactivarProducto(id_producto) {
    const [rows] = await pool.query('SELECT id_producto, nombre_producto, estado FROM productos WHERE id_producto = ?', [id_producto]);
    if (rows.length === 0) {
      throw new Error('El producto especificado no existe.');
    }

    await pool.query(
      `UPDATE productos 
       SET estado = TRUE, fecha_baja = NULL, motivo_baja = NULL
       WHERE id_producto = ?`,
      [id_producto]
    );
    return rows[0].nombre_producto;
  }

  // Actualización 2.1.2: Eliminar definitivamente (SOLO si no tiene historial en detalles_pedido ni detalles_compra)
  static async eliminarProductoDefinitivamente(id_producto) {
    const connection = await pool.getConnection();
    try {
      await connection.beginTransaction();

      const [prodRows] = await connection.query(
        'SELECT id_producto, nombre_producto FROM productos WHERE id_producto = ? FOR UPDATE',
        [id_producto]
      );
      if (prodRows.length === 0) {
        throw new Error('El producto que intentas eliminar no existe.');
      }
      const nombreProducto = prodRows[0].nombre_producto;

      const [[{ cantPedidos }]] = await connection.query(
        'SELECT COUNT(*) AS cantPedidos FROM detalles_pedido WHERE id_producto = ?',
        [id_producto]
      );
      const [[{ cantCompras }]] = await connection.query(
        'SELECT COUNT(*) AS cantCompras FROM detalles_compra WHERE id_producto = ?',
        [id_producto]
      );

      if (cantPedidos > 0 || cantCompras > 0) {
        throw new Error(
          `No se puede eliminar definitivamente "${nombreProducto}" porque tiene historial (${cantPedidos} venta(s) y ${cantCompras} compra(s) asociadas). Utiliza la opción "Dar de baja".`
        );
      }

      // 1. Borrar sus filas de inventario
      await connection.query('DELETE FROM inventario WHERE id_producto = ?', [id_producto]);

      // 2. Borrar el producto
      await connection.query('DELETE FROM productos WHERE id_producto = ?', [id_producto]);

      await connection.commit();
      connection.release();
      return nombreProducto;
    } catch (error) {
      await connection.rollback();
      connection.release();
      throw error;
    }
  }

  static async guardarStock({ id_producto, id_talla, id_color, cantidad_stock }) {
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
    const [productos] = await pool.query(
      'SELECT id_producto, nombre_producto, id_proveedor, costo_promedio_ponderado, estado FROM productos'
    );
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