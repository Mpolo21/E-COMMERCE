/**
 * Archivo: models/reporteModel.js
 * Propósito: Consultas SQL específicas, conjuntas (CU02.4) y reportes financieros (CU02.8).
 */
const { pool } = require('../config/db');

class ReporteModel {
  // Catálogos auxiliares para los selectores de filtros en la vista de consultas
  static async obtenerListasFiltro() {
    const [clientes] = await pool.query('SELECT id_usuario, nombre, correo FROM usuarios WHERE id_rol = 2 ORDER BY nombre');
    const [temporadas] = await pool.query('SELECT id_temporada, nombre_temporada FROM temporadas ORDER BY id_temporada');
    return { clientes, temporadas };
  }

  // ==========================================================================
  // CONSULTAS ESPECÍFICAS (CU02.4)
  // ==========================================================================

  // 1. Productos con stock bajo por talla y color
  static async stockBajoPorTallaColor(umbral = 3) {
    const [rows] = await pool.query(
      `SELECT p.id_producto, p.nombre_producto, m.nombre_marca, 
              t.nombre_talla, col.nombre_color, i.cantidad_stock
       FROM inventario i
       JOIN productos p ON i.id_producto = p.id_producto
       JOIN marcas m ON p.id_marca = m.id_marca
       JOIN tallas t ON i.id_talla = t.id_talla
       JOIN colores col ON i.id_color = col.id_color
       WHERE i.cantidad_stock <= ?
       ORDER BY i.cantidad_stock ASC, p.nombre_producto ASC`,
      [umbral]
    );
    return rows;
  }

  // 2. Historial de compras de un cliente específico
  static async historialClienteEspecifico(id_cliente) {
    const [rows] = await pool.query(
      `SELECT ped.id_pedido, ped.fecha_pedido, ped.total, ped.estado_pedido,
              mp.nombre_metodo, e.tipo_entrega, e.estado_entrega,
              GROUP_CONCAT(CONCAT(pr.nombre_producto, ' (', t.nombre_talla, '/', col.nombre_color, ' x', dp.cantidad, ')') SEPARATOR ', ') AS prendas
       FROM pedidos ped
       JOIN metodos_pago mp ON ped.id_metodo_pago = mp.id_metodo
       LEFT JOIN entregas e ON ped.id_pedido = e.id_pedido
       JOIN detalles_pedido dp ON ped.id_pedido = dp.id_pedido
       JOIN productos pr ON dp.id_producto = pr.id_producto
       JOIN tallas t ON dp.id_talla = t.id_talla
       JOIN colores col ON dp.id_color = col.id_color
       WHERE ped.id_cliente = ?
       GROUP BY ped.id_pedido
       ORDER BY ped.fecha_pedido DESC`,
      [id_cliente]
    );
    return rows;
  }

  // 3. Productos más vendidos por temporada
  static async masVendidosPorTemporada() {
    const [rows] = await pool.query(
      `SELECT temp.nombre_temporada, p.id_producto, p.nombre_producto, m.nombre_marca,
              SUM(dp.cantidad) AS total_unidades_vendidas,
              SUM(dp.cantidad * dp.precio_unitario) AS ingresos_generados
       FROM detalles_pedido dp
       JOIN pedidos ped ON dp.id_pedido = ped.id_pedido
       JOIN productos p ON dp.id_producto = p.id_producto
       JOIN temporadas temp ON p.id_temporada = temp.id_temporada
       JOIN marcas m ON p.id_marca = m.id_marca
       WHERE ped.estado_pedido != 'Cancelado'
       GROUP BY temp.id_temporada, p.id_producto
       ORDER BY temp.nombre_temporada ASC, total_unidades_vendidas DESC`
    );
    return rows;
  }

  // 4. Clientes con mayor puntaje de fidelización
  static async clientesMayorFidelizacion() {
    const [rows] = await pool.query(
      `SELECT u.id_usuario, u.nombre, u.correo, u.puntos_fidelizacion,
              COUNT(ped.id_pedido) AS total_pedidos,
              COALESCE(SUM(ped.total), 0) AS total_gastado
       FROM usuarios u
       LEFT JOIN pedidos ped ON u.id_usuario = ped.id_cliente AND ped.estado_pedido = 'Pagado'
       WHERE u.id_rol = 2
       GROUP BY u.id_usuario
       ORDER BY u.puntos_fidelizacion DESC, total_gastado DESC`
    );
    return rows;
  }

  // 5. Pedidos pendientes de entrega
  static async pedidosPendientesEntrega() {
    const [rows] = await pool.query(
      `SELECT ped.id_pedido, ped.fecha_pedido, u.nombre AS cliente, ped.direccion_entrega,
              e.tipo_entrega, COALESCE(tr.nombre_empresa, 'Logística Propia Urabá') AS responsable,
              e.estado_entrega, e.fecha_actualizacion
       FROM entregas e
       JOIN pedidos ped ON e.id_pedido = ped.id_pedido
       JOIN usuarios u ON ped.id_cliente = u.id_usuario
       LEFT JOIN transportadoras tr ON e.id_transportadora = tr.id_transportadora
       WHERE e.estado_entrega != 'Entregado' AND ped.estado_pedido != 'Cancelado'
       ORDER BY ped.fecha_pedido ASC`
    );
    return rows;
  }

  // ==========================================================================
  // CONSULTAS CONJUNTAS (CU02.4)
  // ==========================================================================

  // 1. Disponibilidad en tiempo real de un producto (inventario vs. catálogo web) para evitar sobreventa
  static async disponibilidadTiempoReal() {
    const [rows] = await pool.query(
      `SELECT p.id_producto, p.nombre_producto, c.nombre_categoria, m.nombre_marca,
              p.estado AS activo_en_catalogo,
              COUNT(i.id_inventario) AS variantes_registradas,
              COALESCE(SUM(i.cantidad_stock), 0) AS stock_real_fisico,
              CASE 
                WHEN p.estado = TRUE AND COALESCE(SUM(i.cantidad_stock), 0) > 0 THEN 'Disponible para Venta'
                WHEN p.estado = TRUE AND COALESCE(SUM(i.cantidad_stock), 0) = 0 THEN 'ALERTA: Visible sin Stock (Riesgo Sobreventa)'
                ELSE 'Oculto en Catálogo'
              END AS diagnostico_disponibilidad
       FROM productos p
       JOIN categorias c ON p.id_categoria = c.id_categoria
       JOIN marcas m ON p.id_marca = m.id_marca
       LEFT JOIN inventario i ON p.id_producto = i.id_producto
       GROUP BY p.id_producto
       ORDER BY stock_real_fisico ASC`
    );
    return rows;
  }

  // 2. Relación entre método de pago y zona de entrega (propia vs. transportadora)
  static async relacionMetodoPagoZonaEntrega() {
    const [rows] = await pool.query(
      `SELECT mp.nombre_metodo, e.tipo_entrega, 
              CASE WHEN e.zona_cobertura = TRUE THEN 'Dentro de Cobertura (Urabá)' ELSE 'Fuera de Cobertura (Nacional)' END AS cobertura,
              COUNT(ped.id_pedido) AS cantidad_pedidos,
              SUM(ped.total) AS monto_total
       FROM pedidos ped
       JOIN metodos_pago mp ON ped.id_metodo_pago = mp.id_metodo
       JOIN entregas e ON ped.id_pedido = e.id_pedido
       WHERE ped.estado_pedido != 'Cancelado'
       GROUP BY mp.id_metodo, e.tipo_entrega, e.zona_cobertura
       ORDER BY cantidad_pedidos DESC`
    );
    return rows;
  }

  // 3. Productos de una temporada con total de unidades vendidas e ingreso generado
  static async desempenoPorTemporada(id_temporada) {
    const [rows] = await pool.query(
      `SELECT temp.nombre_temporada, p.id_producto, p.nombre_producto, p.precio AS precio_actual,
              COALESCE(SUM(dp.cantidad), 0) AS unidades_vendidas,
              COALESCE(SUM(dp.cantidad * dp.precio_unitario), 0) AS ingreso_generado
       FROM productos p
       JOIN temporadas temp ON p.id_temporada = temp.id_temporada
       LEFT JOIN detalles_pedido dp ON p.id_producto = dp.id_producto
       LEFT JOIN pedidos ped ON dp.id_pedido = ped.id_pedido AND ped.estado_pedido != 'Cancelado'
       WHERE p.id_temporada = ?
       GROUP BY p.id_producto
       ORDER BY ingreso_generado DESC`,
      [id_temporada]
    );
    return rows;
  }

  // 4. Clientes que compraron en más de una temporada, con los productos adquiridos
  static async clientesMultitemporada() {
    const [rows] = await pool.query(
      `SELECT u.id_usuario, u.nombre, u.correo,
              COUNT(DISTINCT p.id_temporada) AS cantidad_temporadas_distintas,
              GROUP_CONCAT(DISTINCT temp.nombre_temporada SEPARATOR ' | ') AS temporadas_compradas,
              GROUP_CONCAT(DISTINCT p.nombre_producto SEPARATOR ', ') AS productos_adquiridos
       FROM usuarios u
       JOIN pedidos ped ON u.id_usuario = ped.id_cliente
       JOIN detalles_pedido dp ON ped.id_pedido = dp.id_pedido
       JOIN productos p ON dp.id_producto = p.id_producto
       JOIN temporadas temp ON p.id_temporada = temp.id_temporada
       WHERE ped.estado_pedido != 'Cancelado'
       GROUP BY u.id_usuario
       HAVING COUNT(DISTINCT p.id_temporada) > 1
       ORDER BY cantidad_temporadas_distintas DESC`
    );
    return rows;
  }

  // ==========================================================================
  // REPORTES GERENCIALES (CU02.8)
  // ==========================================================================

  // Reporte 1: Balance financiero por prenda usando la vista oficial vista_balance_prendas
  static async obtenerBalancePrendas() {
    const [rows] = await pool.query(
      `SELECT * FROM vista_balance_prendas ORDER BY balance_ganancia_perdida DESC`
    );
    return rows;
  }

  // Reporte 2: Ventas por período de fechas
  static async obtenerVentasPorPeriodo(fechaInicio, fechaFin) {
    const [rows] = await pool.query(
      `SELECT DATE(ped.fecha_pedido) AS fecha,
              COUNT(DISTINCT ped.id_pedido) AS total_pedidos,
              SUM(dp.cantidad) AS prendas_vendidas,
              SUM(dp.cantidad * dp.precio_unitario) AS ingresos_brutos
       FROM pedidos ped
       JOIN detalles_pedido dp ON ped.id_pedido = dp.id_pedido
       WHERE ped.estado_pedido != 'Cancelado'
         AND DATE(ped.fecha_pedido) BETWEEN ? AND ?
       GROUP BY DATE(ped.fecha_pedido)
       ORDER BY fecha DESC`,
      [fechaInicio, fechaFin]
    );
    return rows;
  }
}

module.exports = ReporteModel;