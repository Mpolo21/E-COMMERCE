/**
 * Archivo: config/reportes.js
 * Propósito: Catálogo centralizado de reportes generales, consultas específicas y conjuntas (Actualización 1.4).
 */
const CATALOGO_REPORTES = [
  // ==========================================
  // 1. REPORTES GENERALES (CU02.8)
  // ==========================================
  {
    slug: 'balance-prendas',
    titulo: 'Balance Financiero por Prenda',
    descripcion: 'Compara unidades compradas vs. vendidas, inversión, ingresos y ganancia/pérdida (vista_balance_prendas).',
    tipo: 'General',
    seccion: 'Reportes Generales (CU02.8)',
    ruta: '/admin/reportes/balance-prendas',
    requiereSeleccionPrevia: false
  },
  {
    slug: 'ventas-periodo',
    titulo: 'Ventas e Ingresos por Período',
    descripcion: 'Resumen diario de pedidos procesados, prendas vendidas, descuentos por puntos e ingresos netos en un rango de fechas.',
    tipo: 'General',
    seccion: 'Reportes Generales (CU02.8)',
    ruta: '/admin/reportes/ventas-periodo',
    requiereSeleccionPrevia: false
  },

  // ==========================================
  // 2. CONSULTAS ESPECÍFICAS (CU02.4)
  // ==========================================
  {
    slug: 'stock-bajo',
    titulo: 'Productos con Stock Bajo por Talla y Color',
    descripcion: 'Lista operativa de variantes de productos activos cuyo stock físico es menor o igual al umbral definido.',
    tipo: 'Específica',
    seccion: 'Consultas Específicas (CU02.4)',
    ruta: '/admin/reportes/stock-bajo',
    requiereSeleccionPrevia: false
  },
  {
    slug: 'historial-cliente',
    titulo: 'Historial de Compras de un Cliente',
    descripcion: 'Consulta detallada de todos los pedidos, prendas, puntos canjeados y estado de entrega de un cliente específico.',
    tipo: 'Específica',
    seccion: 'Consultas Específicas (CU02.4)',
    ruta: '/admin/reportes/historial-cliente',
    requiereSeleccionPrevia: true
  },
  {
    slug: 'mas-vendidos-temporada',
    titulo: 'Productos Más Vendidos por Temporada',
    descripcion: 'Ranking histórico de prendas con mayor volumen de unidades vendidas e ingresos por colección/temporada.',
    tipo: 'Específica',
    seccion: 'Consultas Específicas (CU02.4)',
    ruta: '/admin/reportes/mas-vendidos-temporada',
    requiereSeleccionPrevia: false
  },
  {
    slug: 'clientes-fidelizacion',
    titulo: 'Clientes con Mayor Puntaje de Fidelización',
    descripcion: 'Listado de clientes ordenados por su saldo actual de puntos, equivalencia en COP y acceso al ajuste manual.',
    tipo: 'Específica',
    seccion: 'Consultas Específicas (CU02.4)',
    ruta: '/admin/reportes/clientes-fidelizacion',
    requiereSeleccionPrevia: false
  },
  {
    slug: 'pedidos-pendientes',
    titulo: 'Pedidos Pendientes de Entrega',
    descripcion: 'Órdenes activas que aún se encuentran en preparación o tránsito pendientes de entrega final.',
    tipo: 'Específica',
    seccion: 'Consultas Específicas (CU02.4)',
    ruta: '/admin/reportes/pedidos-pendientes',
    requiereSeleccionPrevia: false
  },

  // ==========================================
  // 3. CONSULTAS CONJUNTAS (CU02.4)
  // ==========================================
  {
    slug: 'disponibilidad-tiempo-real',
    titulo: 'Disponibilidad en Tiempo Real (Inventario vs. Catálogo)',
    descripcion: 'Auditoría operativa de prendas activas en tienda frente a su stock físico total para prevenir sobreventa.',
    tipo: 'Conjunta',
    seccion: 'Consultas Conjuntas (CU02.4)',
    ruta: '/admin/reportes/disponibilidad-tiempo-real',
    requiereSeleccionPrevia: false
  },
  {
    slug: 'pago-zona-entrega',
    titulo: 'Relación Método de Pago vs. Zona de Entrega',
    descripcion: 'Cruza los medios de pago utilizados con la logística empleada (Propia en Urabá vs. Transportadora Externa).',
    tipo: 'Conjunta',
    seccion: 'Consultas Conjuntas (CU02.4)',
    ruta: '/admin/reportes/pago-zona-entrega',
    requiereSeleccionPrevia: false
  },
  {
    slug: 'desempeno-temporada',
    titulo: 'Desempeño de Productos de una Temporada',
    descripcion: 'Muestra todas las prendas de una temporada seleccionada con sus unidades vendidas e ingreso generado.',
    tipo: 'Conjunta',
    seccion: 'Consultas Conjuntas (CU02.4)',
    ruta: '/admin/reportes/desempeno-temporada',
    requiereSeleccionPrevia: true
  },
  {
    slug: 'clientes-multitemporada',
    titulo: 'Clientes Compradores en Más de una Temporada',
    descripcion: 'Identifica clientes recurrentes que han adquirido prendas pertenecientes a 2 o más temporadas distintas.',
    tipo: 'Conjunta',
    seccion: 'Consultas Conjuntas (CU02.4)',
    ruta: '/admin/reportes/clientes-multitemporada',
    requiereSeleccionPrevia: false
  }
];

function obtenerReportePorSlug(slug) {
  return CATALOGO_REPORTES.find((r) => r.slug === slug) || null;
}

module.exports = {
  CATALOGO_REPORTES,
  obtenerReportePorSlug
};