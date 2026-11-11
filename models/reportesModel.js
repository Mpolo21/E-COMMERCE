/**
 * Archivo: models/reportesModel.js
 * Propósito: Consultas SQL individuales con paginación en servidor, filtros, orden seguro (whitelist) y soporte CSV (Actualización 1).
 */
const { pool } = require('../config/db');

function validarOrden(columnaSolicitada, dirSolicitada, mapaColumnas, colDefecto, dirDefecto = 'DESC') {
  const colSQL = mapaColumnas[columnaSolicitada] || mapaColumnas[colDefecto];
  const dirSQL = String(dirSolicitada || dirDefecto).toUpperCase() === 'ASC' ? 'ASC' : 'DESC';
  return `${colSQL} ${dirSQL}`;
}

function aplicarPaginacionSQL(sinPaginar, limite, pagina) {
  if (sinPaginar) return { clause: '', params: [] };
  const lim = Math.max(1, parseInt(limite, 10) || 20);
  const off = (Math.max(1, parseInt(pagina, 10) || 1) - 1) * lim;
  return { clause: ' LIMIT ? OFFSET ?', params: [lim, off] };
}

class ReportesModel {
  static async obtenerCatalogosFiltros() {
    const [categorias] = await pool.query('SELECT id_categoria, nombre_categoria FROM categorias ORDER BY nombre_categoria');
    const [temporadas] = await pool.query('SELECT id_temporada, nombre_temporada FROM temporadas ORDER BY id_temporada');
    const [clientes] = await pool.query('SELECT id_usuario, nombre, correo FROM usuarios WHERE id_rol = 2 ORDER BY nombre');
    return { categorias, temporadas, clientes };
  }

  // ==========================================================================
  // 1. REPORTE GENERAL: BALANCE POR PRENDA (vista_balance_prendas) - Histórico
  // ==========================================================================
  static async balancePrendas({ id_temporada = '', id_categoria = '', busqueda = '', orden = 'balance', dir = 'DESC', pagina = 1, limite = 20, sinPaginar = false }) {
    const where = [];
    const params = [];

    if (id_temporada) {
      where.push('id_temporada = ?');
      params.push(id_temporada);
    }
    if (id_categoria) {
      where.push('id_categoria = ?');
      params.push(id_categoria);
    }
    if (busqueda && busqueda.trim()) {
      where.push('nombre_producto LIKE ?');
      params.push(`%${busqueda.trim()}%`);
    }

    const whereSQL = where.length ? `WHERE ${where.join(' AND ')}` : '';
    const orderBy = validarOrden(
      orden,
      dir,
      {
        id: 'id_producto',
        producto: 'nombre_producto',
        compradas: 'unidades_compradas',
        invertido: 'dinero_invertido',
        vendidas: 'unidades_vendidas',
        ingresado: 'dinero_ingresado',
        balance: 'balance_ganancia_perdida'
      },
      'balance',
      'DESC'
    );

    const [[{ total }]] = await pool.query(`SELECT COUNT(*) AS total FROM vista_balance_prendas ${whereSQL}`, params);
    const pag = aplicarPaginacionSQL(sinPaginar, limite, pagina);
    const [filas] = await pool.query(
      `SELECT * FROM vista_balance_prendas ${whereSQL} ORDER BY ${orderBy}${pag.clause}`,
      [...params, ...pag.params]
    );

    return { filas, total };
  }

  // ==========================================================================
  // 2. REPORTE GENERAL: VENTAS POR PERÍODO
  // ==========================================================================
  static async ventasPorPeriodo({ fecha_inicio = '2025-01-01', fecha_fin = '2027-12-31', orden = 'fecha', dir = 'DESC', pagina = 1, limite = 20, sinPaginar = false }) {
    const orderBy = validarOrden(
      orden,
      dir,
      {
        fecha: 'fecha',
        pedidos: 'total_pedidos',
        prendas: 'prendas_vendidas',
        subtotal: 'subtotal_bruto',
        ingresos: 'ingresos_netos'
      },
      'fecha',
      'DESC'
    );

    const baseSQL = `
      FROM pedidos p
      JOIN (
        SELECT id_pedido, SUM(cantidad) AS unidades
        FROM detalles_pedido
        GROUP BY id_pedido
      ) items ON p.id_pedido = items.id_pedido
      WHERE p.estado_pedido != 'Cancelado'
        AND DATE(p.fecha_pedido) BETWEEN ? AND ?
      GROUP BY DATE(p.fecha_pedido)
    `;

    const [countRows] = await pool.query(`SELECT COUNT(*) AS total FROM (SELECT DATE(p.fecha_pedido) ${baseSQL}) sub`, [fecha_inicio, fecha_fin]);
    const total = countRows[0] ? countRows[0].total : 0;

    const pag = aplicarPaginacionSQL(sinPaginar, limite, pagina);
    const [filas] = await pool.query(
      `SELECT DATE(p.fecha_pedido) AS fecha,
              COUNT(p.id_pedido) AS total_pedidos,
              COALESCE(SUM(items.unidades), 0) AS prendas_vendidas,
              SUM(p.subtotal) AS subtotal_bruto,
              SUM(p.descuento_puntos) AS descuento_puntos_total,
              SUM(p.total) AS ingresos_netos
       ${baseSQL}
       ORDER BY ${orderBy}${pag.clause}`,
      [fecha_inicio, fecha_fin, ...pag.params]
    );

    return { filas, total };
  }

  // ==========================================================================
  // 3. ESPECÍFICA 1: STOCK BAJO POR TALLA Y COLOR (Operativo -> Solo Activos)
  // ==========================================================================
  static async stockBajo({ umbral = 5, busqueda = '', orden = 'stock', dir = 'ASC', pagina = 1, limite = 20, sinPaginar = false }) {
    const where = ['p.estado = TRUE', 'i.cantidad_stock <= ?'];
    const params = [Number(umbral)];

    if (busqueda && busqueda.trim()) {
      where.push('(p.nombre_producto LIKE ? OR m.nombre_marca LIKE ?)');
      params.push(`%${busqueda.trim()}%`, `%${busqueda.trim()}%`);
    }

    const whereSQL = `WHERE ${where.join(' AND ')}`;
    const orderBy = validarOrden(
      orden,
      dir,
      {
        stock: 'i.cantidad_stock',
        producto: 'p.nombre_producto',
        marca: 'm.nombre_marca',
        talla: 't.nombre_talla'
      },
      'stock',
      'ASC'
    );

    const [[{ total }]] = await pool.query(
      `SELECT COUNT(*) AS total
       FROM inventario i
       JOIN productos p ON i.id_producto = p.id_producto
       JOIN marcas m ON p.id_marca = m.id_marca
       ${whereSQL}`,
      params
    );

    const pag = aplicarPaginacionSQL(sinPaginar, limite, pagina);
    const [filas] = await pool.query(
      `SELECT p.id_producto, p.nombre_producto, m.nombre_marca, 
              t.nombre_talla, col.nombre_color, i.cantidad_stock
       FROM inventario i
       JOIN productos p ON i.id_producto = p.id_producto
       JOIN marcas m ON p.id_marca = m.id_marca
       JOIN tallas t ON i.id_talla = t.id_talla
       JOIN colores col ON i.id_color = col.id_color
       ${whereSQL}
       ORDER BY ${orderBy}${pag.clause}`,
      [...params, ...pag.params]
    );

    return { filas, total };
  }

  // ==========================================================================
  // 4. ESPECÍFICA 2: HISTORIAL DE COMPRAS DE UN CLIENTE (Requiere elegir cliente)
  // ==========================================================================
  static async historialCliente({ id_cliente = '', orden = 'fecha', dir = 'DESC', pagina = 1, limite = 20, sinPaginar = false }) {
    if (!id_cliente) {
      return { filas: [], total: 0, esperandoSeleccion: true };
    }

    const orderBy = validarOrden(
      orden,
      dir,
      {
        pedido: 'ped.id_pedido',
        fecha: 'ped.fecha_pedido',
        subtotal: 'ped.subtotal',
        total: 'ped.total'
      },
      'fecha',
      'DESC'
    );

    const [[{ total }]] = await pool.query('SELECT COUNT(*) AS total FROM pedidos WHERE id_cliente = ?', [id_cliente]);
    const pag = aplicarPaginacionSQL(sinPaginar, limite, pagina);

    const [filas] = await pool.query(
      `SELECT ped.id_pedido, ped.fecha_pedido, ped.subtotal, ped.puntos_canjeados,
              ped.descuento_puntos, ped.total, ped.puntos_ganados, ped.estado_pedido,
              mp.nombre_metodo, e.tipo_entrega, e.estado_entrega,
              GROUP_CONCAT(
                CONCAT(
                  pr.nombre_producto,
                  IF(pr.estado = 0, ' [Dado de baja]', ''),
                  ' (', t.nombre_talla, '/', col.nombre_color, ' x', dp.cantidad, ')'
                ) SEPARATOR ', '
              ) AS prendas
       FROM pedidos ped
       JOIN metodos_pago mp ON ped.id_metodo_pago = mp.id_metodo
       LEFT JOIN entregas e ON ped.id_pedido = e.id_pedido
       JOIN detalles_pedido dp ON ped.id_pedido = dp.id_pedido
       JOIN productos pr ON dp.id_producto = pr.id_producto
       JOIN tallas t ON dp.id_talla = t.id_talla
       JOIN colores col ON dp.id_color = col.id_color
       WHERE ped.id_cliente = ?
       GROUP BY ped.id_pedido, ped.fecha_pedido, ped.subtotal, ped.puntos_canjeados,
                ped.descuento_puntos, ped.total, ped.puntos_ganados, ped.estado_pedido,
                mp.nombre_metodo, e.tipo_entrega, e.estado_entrega
       ORDER BY ${orderBy}${pag.clause}`,
      [id_cliente, ...pag.params]
    );

    return { filas, total, esperandoSeleccion: false };
  }

  // ==========================================================================
  // 5. ESPECÍFICA 3: MÁS VENDIDOS POR TEMPORADA (Histórico -> Incluye dados de baja)
  // ==========================================================================
  static async masVendidosTemporada({ id_temporada = '', busqueda = '', orden = 'unidades', dir = 'DESC', pagina = 1, limite = 20, sinPaginar = false }) {
    const where = ["ped.estado_pedido != 'Cancelado'"];
    const params = [];

    if (id_temporada) {
      where.push('temp.id_temporada = ?');
      params.push(id_temporada);
    }
    if (busqueda && busqueda.trim()) {
      where.push('p.nombre_producto LIKE ?');
      params.push(`%${busqueda.trim()}%`);
    }

    const whereSQL = `WHERE ${where.join(' AND ')}`;
    const orderBy = validarOrden(
      orden,
      dir,
      {
        temporada: 'temp.nombre_temporada',
        producto: 'p.nombre_producto',
        unidades: 'total_unidades_vendidas',
        ingresos: 'ingresos_generados'
      },
      'unidades',
      'DESC'
    );

    const baseGroup = `
      FROM detalles_pedido dp
      JOIN pedidos ped ON dp.id_pedido = ped.id_pedido
      JOIN productos p ON dp.id_producto = p.id_producto
      JOIN temporadas temp ON p.id_temporada = temp.id_temporada
      JOIN marcas m ON p.id_marca = m.id_marca
      ${whereSQL}
      GROUP BY temp.id_temporada, temp.nombre_temporada, p.id_producto, p.nombre_producto, p.estado, m.nombre_marca
    `;

    const [countRows] = await pool.query(`SELECT COUNT(*) AS total FROM (SELECT p.id_producto ${baseGroup}) sub`, params);
    const total = countRows[0] ? countRows[0].total : 0;

    const pag = aplicarPaginacionSQL(sinPaginar, limite, pagina);
    const [filas] = await pool.query(
      `SELECT temp.nombre_temporada, p.id_producto, p.nombre_producto, p.estado, m.nombre_marca,
              SUM(dp.cantidad) AS total_unidades_vendidas,
              SUM(dp.cantidad * dp.precio_unitario) AS ingresos_generados
       ${baseGroup}
       ORDER BY ${orderBy}${pag.clause}`,
      [...params, ...pag.params]
    );

    return { filas, total };
  }

  // ==========================================================================
  // 6. ESPECÍFICA 4: CLIENTES CON MAYOR PUNTAJE DE FIDELIZACIÓN
  // ==========================================================================
  static async clientesFidelizacion({ busqueda = '', orden = 'puntos', dir = 'DESC', pagina = 1, limite = 20, sinPaginar = false }) {
    const where = ['u.id_rol = 2'];
    const params = [];

    if (busqueda && busqueda.trim()) {
      where.push('(u.nombre LIKE ? OR u.correo LIKE ?)');
      params.push(`%${busqueda.trim()}%`, `%${busqueda.trim()}%`);
    }

    const whereSQL = `WHERE ${where.join(' AND ')}`;
    const orderBy = validarOrden(
      orden,
      dir,
      {
        nombre: 'u.nombre',
        puntos: 'u.puntos_fidelizacion',
        pedidos: 'total_pedidos',
        gastado: 'total_gastado'
      },
      'puntos',
      'DESC'
    );

    const [[{ total }]] = await pool.query(`SELECT COUNT(*) AS total FROM usuarios u ${whereSQL}`, params);
    const pag = aplicarPaginacionSQL(sinPaginar, limite, pagina);

    const [filas] = await pool.query(
      `SELECT u.id_usuario, u.nombre, u.correo, u.puntos_fidelizacion,
              COUNT(ped.id_pedido) AS total_pedidos,
              COALESCE(SUM(ped.total), 0) AS total_gastado
       FROM usuarios u
       LEFT JOIN pedidos ped ON u.id_usuario = ped.id_cliente AND ped.estado_pedido = 'Pagado'
       ${whereSQL}
       GROUP BY u.id_usuario, u.nombre, u.correo, u.puntos_fidelizacion
       ORDER BY ${orderBy}${pag.clause}`,
      [...params, ...pag.params]
    );

    return { filas, total };
  }

  // ==========================================================================
  // 7. ESPECÍFICA 5: PEDIDOS PENDIENTES DE ENTREGA
  // ==========================================================================
  static async pedidosPendientes({ estado_entrega = '', busqueda = '', orden = 'fecha', dir = 'ASC', pagina = 1, limite = 20, sinPaginar = false }) {
    const where = ["e.estado_entrega != 'Entregado'", "ped.estado_pedido != 'Cancelado'"];
    const params = [];

    if (estado_entrega) {
      where.push('e.estado_entrega = ?');
      params.push(estado_entrega);
    }
    if (busqueda && busqueda.trim()) {
      where.push('(u.nombre LIKE ? OR CAST(ped.id_pedido AS CHAR) LIKE ?)');
      params.push(`%${busqueda.trim()}%`, `%${busqueda.trim()}%`);
    }

    const whereSQL = `WHERE ${where.join(' AND ')}`;
    const orderBy = validarOrden(
      orden,
      dir,
      {
        pedido: 'ped.id_pedido',
        fecha: 'ped.fecha_pedido',
        cliente: 'u.nombre',
        estado: 'e.estado_entrega'
      },
      'fecha',
      'ASC'
    );

    const [[{ total }]] = await pool.query(
      `SELECT COUNT(*) AS total
       FROM entregas e
       JOIN pedidos ped ON e.id_pedido = ped.id_pedido
       JOIN usuarios u ON ped.id_cliente = u.id_usuario
       ${whereSQL}`,
      params
    );

    const pag = aplicarPaginacionSQL(sinPaginar, limite, pagina);
    const [filas] = await pool.query(
      `SELECT ped.id_pedido, ped.fecha_pedido, u.nombre AS cliente, ped.direccion_entrega,
              ped.estado_pedido, ped.total,
              e.tipo_entrega, COALESCE(tr.nombre_empresa, 'Logística Propia Urabá') AS responsable,
              e.estado_entrega
       FROM entregas e
       JOIN pedidos ped ON e.id_pedido = ped.id_pedido
       JOIN usuarios u ON ped.id_cliente = u.id_usuario
       LEFT JOIN transportadoras tr ON e.id_transportadora = tr.id_transportadora
       ${whereSQL}
       ORDER BY ${orderBy}${pag.clause}`,
      [...params, ...pag.params]
    );

    return { filas, total };
  }

  // ==========================================================================
  // 8. CONJUNTA 1: DISPONIBILIDAD EN TIEMPO REAL (Operativo -> Solo Activos)
  // ==========================================================================
  static async disponibilidadTiempoReal({ busqueda = '', id_categoria = '', orden = 'stock', dir = 'ASC', pagina = 1, limite = 20, sinPaginar = false }) {
    const where = ['p.estado = TRUE'];
    const params = [];

    if (id_categoria) {
      where.push('p.id_categoria = ?');
      params.push(id_categoria);
    }
    if (busqueda && busqueda.trim()) {
      where.push('(p.nombre_producto LIKE ? OR m.nombre_marca LIKE ?)');
      params.push(`%${busqueda.trim()}%`, `%${busqueda.trim()}%`);
    }

    const whereSQL = `WHERE ${where.join(' AND ')}`;
    const orderBy = validarOrden(
      orden,
      dir,
      {
        id: 'p.id_producto',
        producto: 'p.nombre_producto',
        variantes: 'variantes_registradas',
        stock: 'stock_real_fisico'
      },
      'stock',
      'ASC'
    );

    const [[{ total }]] = await pool.query(
      `SELECT COUNT(*) AS total FROM productos p JOIN marcas m ON p.id_marca = m.id_marca ${whereSQL}`,
      params
    );

    const pag = aplicarPaginacionSQL(sinPaginar, limite, pagina);
    const [filas] = await pool.query(
      `SELECT p.id_producto, p.nombre_producto, c.nombre_categoria, m.nombre_marca,
              COUNT(i.id_inventario) AS variantes_registradas,
              COALESCE(SUM(i.cantidad_stock), 0) AS stock_real_fisico,
              CASE 
                WHEN COALESCE(SUM(i.cantidad_stock), 0) > 5 THEN 'Disponible para Venta'
                WHEN COALESCE(SUM(i.cantidad_stock), 0) BETWEEN 1 AND 5 THEN 'Pocas Unidades'
                ELSE 'ALERTA: Visible sin Stock (Riesgo Sobreventa)'
              END AS diagnostico_disponibilidad
       FROM productos p
       JOIN categorias c ON p.id_categoria = c.id_categoria
       JOIN marcas m ON p.id_marca = m.id_marca
       LEFT JOIN inventario i ON p.id_producto = i.id_producto
       ${whereSQL}
       GROUP BY p.id_producto, p.nombre_producto, c.nombre_categoria, m.nombre_marca
       ORDER BY ${orderBy}${pag.clause}`,
      [...params, ...pag.params]
    );

    return { filas, total };
  }

  // ==========================================================================
  // 9. CONJUNTA 2: RELACIÓN MÉTODO DE PAGO VS ZONA DE ENTREGA
  // ==========================================================================
  static async pagoZonaEntrega({ tipo_entrega = '', orden = 'pedidos', dir = 'DESC', pagina = 1, limite = 20, sinPaginar = false }) {
    const where = ["ped.estado_pedido != 'Cancelado'"];
    const params = [];

    if (tipo_entrega) {
      where.push('e.tipo_entrega = ?');
      params.push(tipo_entrega);
    }

    const whereSQL = `WHERE ${where.join(' AND ')}`;
    const orderBy = validarOrden(
      orden,
      dir,
      {
        metodo: 'mp.nombre_metodo',
        pedidos: 'cantidad_pedidos',
        monto: 'monto_total'
      },
      'pedidos',
      'DESC'
    );

    const baseGroup = `
      FROM pedidos ped
      JOIN metodos_pago mp ON ped.id_metodo_pago = mp.id_metodo
      JOIN entregas e ON ped.id_pedido = e.id_pedido
      ${whereSQL}
      GROUP BY mp.id_metodo, mp.nombre_metodo, e.tipo_entrega, e.zona_cobertura
    `;

    const [countRows] = await pool.query(`SELECT COUNT(*) AS total FROM (SELECT mp.id_metodo ${baseGroup}) sub`, params);
    const total = countRows[0] ? countRows[0].total : 0;

    const pag = aplicarPaginacionSQL(sinPaginar, limite, pagina);
    const [filas] = await pool.query(
      `SELECT mp.nombre_metodo, e.tipo_entrega, 
              CASE WHEN e.zona_cobertura = TRUE THEN 'Dentro de Cobertura (Urabá)' ELSE 'Fuera de Cobertura (Nacional)' END AS cobertura,
              COUNT(ped.id_pedido) AS cantidad_pedidos,
              SUM(ped.total) AS monto_total
       ${baseGroup}
       ORDER BY ${orderBy}${pag.clause}`,
      [...params, ...pag.params]
    );

    return { filas, total };
  }

  // ==========================================================================
  // 10. CONJUNTA 3: PRODUCTOS DE UNA TEMPORADA (Requiere elegir temporada)
  // ==========================================================================
  static async desempenoTemporada({ id_temporada = '', busqueda = '', orden = 'ingresos', dir = 'DESC', pagina = 1, limite = 20, sinPaginar = false }) {
    if (!id_temporada) {
      return { filas: [], total: 0, esperandoSeleccion: true };
    }

    const where = ['p.id_temporada = ?'];
    const params = [id_temporada];

    if (busqueda && busqueda.trim()) {
      where.push('p.nombre_producto LIKE ?');
      params.push(`%${busqueda.trim()}%`);
    }

    const whereSQL = `WHERE ${where.join(' AND ')}`;
    const orderBy = validarOrden(
      orden,
      dir,
      {
        producto: 'p.nombre_producto',
        precio: 'p.precio',
        unidades: 'unidades_vendidas',
        ingresos: 'ingreso_generado'
      },
      'ingresos',
      'DESC'
    );

    const [[{ total }]] = await pool.query(`SELECT COUNT(*) AS total FROM productos p ${whereSQL}`, params);
    const pag = aplicarPaginacionSQL(sinPaginar, limite, pagina);

    const [filas] = await pool.query(
      `SELECT temp.nombre_temporada, p.id_producto, p.nombre_producto, p.estado, p.precio AS precio_actual,
              COALESCE(SUM(CASE WHEN ped.id_pedido IS NOT NULL THEN dp.cantidad ELSE 0 END), 0) AS unidades_vendidas,
              COALESCE(SUM(CASE WHEN ped.id_pedido IS NOT NULL THEN dp.cantidad * dp.precio_unitario ELSE 0 END), 0) AS ingreso_generado
       FROM productos p
       JOIN temporadas temp ON p.id_temporada = temp.id_temporada
       LEFT JOIN detalles_pedido dp ON p.id_producto = dp.id_producto
       LEFT JOIN pedidos ped ON dp.id_pedido = ped.id_pedido AND ped.estado_pedido != 'Cancelado'
       ${whereSQL}
       GROUP BY p.id_producto, p.nombre_producto, p.estado, p.precio, temp.nombre_temporada
       ORDER BY ${orderBy}${pag.clause}`,
      [...params, ...pag.params]
    );

    return { filas, total, esperandoSeleccion: false };
  }

  // ==========================================================================
  // 11. CONJUNTA 4: CLIENTES MULTITEMPORADA
  // ==========================================================================
  static async clientesMultitemporada({ busqueda = '', orden = 'temporadas', dir = 'DESC', pagina = 1, limite = 20, sinPaginar = false }) {
    const where = ["ped.estado_pedido != 'Cancelado'"];
    const params = [];

    if (busqueda && busqueda.trim()) {
      where.push('(u.nombre LIKE ? OR u.correo LIKE ?)');
      params.push(`%${busqueda.trim()}%`, `%${busqueda.trim()}%`);
    }

    const whereSQL = `WHERE ${where.join(' AND ')}`;
    const orderBy = validarOrden(
      orden,
      dir,
      {
        cliente: 'u.nombre',
        temporadas: 'cantidad_temporadas_distintas'
      },
      'temporadas',
      'DESC'
    );

    const baseGroup = `
      FROM usuarios u
      JOIN pedidos ped ON u.id_usuario = ped.id_cliente
      JOIN detalles_pedido dp ON ped.id_pedido = dp.id_pedido
      JOIN productos p ON dp.id_producto = p.id_producto
      JOIN temporadas temp ON p.id_temporada = temp.id_temporada
      ${whereSQL}
      GROUP BY u.id_usuario, u.nombre, u.correo
      HAVING COUNT(DISTINCT p.id_temporada) > 1
    `;

    const [countRows] = await pool.query(`SELECT COUNT(*) AS total FROM (SELECT u.id_usuario ${baseGroup}) sub`, params);
    const total = countRows[0] ? countRows[0].total : 0;

    const pag = aplicarPaginacionSQL(sinPaginar, limite, pagina);
    const [filas] = await pool.query(
      `SELECT u.id_usuario, u.nombre, u.correo,
              COUNT(DISTINCT p.id_temporada) AS cantidad_temporadas_distintas,
              GROUP_CONCAT(DISTINCT temp.nombre_temporada SEPARATOR ' | ') AS temporadas_compradas,
              GROUP_CONCAT(DISTINCT p.nombre_producto SEPARATOR ', ') AS productos_adquiridos
       ${baseGroup}
       ORDER BY ${orderBy}${pag.clause}`,
      [...params, ...pag.params]
    );

    return { filas, total };
  }
}

module.exports = ReportesModel;