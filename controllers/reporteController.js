/**
 * Archivo: controllers/reporteController.js
 * Propósito: Controlar la ejecución de consultas específicas, conjuntas (CU02.4) y reportes (CU02.8).
 */
const ReporteModel = require('../models/reporteModel');

class ReporteController {
  static async panelConsultasYReportes(req, res) {
    try {
      const { clientes, temporadas } = await ReporteModel.obtenerListasFiltro();

      // Parámetros configurables desde la vista con valores por defecto
      const umbralStock = parseInt(req.query.umbral) || 3;
      const idCliente = req.query.id_cliente || (clientes[0] ? clientes[0].id_usuario : 2);
      const idTemporada = req.query.id_temporada || (temporadas[0] ? temporadas[0].id_temporada : 1);
      const fechaInicio = req.query.fecha_inicio || '2025-01-01';
      const fechaFin = req.query.fecha_fin || '2027-12-31';

      // Ejecutar las 5 consultas específicas, 4 conjuntas y 2 reportes en paralelo
      const [
        esp1_stockBajo,
        esp2_historialCliente,
        esp3_masVendidosTemp,
        esp4_clientesFidelizacion,
        esp5_pedidosPendientes,
        conj1_disponibilidadReal,
        conj2_pagoZona,
        conj3_productosTemporada,
        conj4_clientesMultitemporada,
        rep1_balancePrendas,
        rep2_ventasPeriodo
      ] = await Promise.all([
        ReporteModel.stockBajoPorTallaColor(umbralStock),
        ReporteModel.historialClienteEspecifico(idCliente),
        ReporteModel.masVendidosPorTemporada(),
        ReporteModel.clientesMayorFidelizacion(),
        ReporteModel.pedidosPendientesEntrega(),
        ReporteModel.disponibilidadTiempoReal(),
        ReporteModel.relacionMetodoPagoZonaEntrega(),
        ReporteModel.desempenoPorTemporada(idTemporada),
        ReporteModel.clientesMultitemporada(),
        ReporteModel.obtenerBalancePrendas(),
        ReporteModel.obtenerVentasPorPeriodo(fechaInicio, fechaFin)
      ]);

      res.render('admin/consultas', {
        titulo: 'Consultas y Reportes Gerenciales - PIJIC',
        clientes,
        temporadas,
        filtros: { umbralStock, idCliente, idTemporada, fechaInicio, fechaFin },
        esp1_stockBajo,
        esp2_historialCliente,
        esp3_masVendidosTemp,
        esp4_clientesFidelizacion,
        esp5_pedidosPendientes,
        conj1_disponibilidadReal,
        conj2_pagoZona,
        conj3_productosTemporada,
        conj4_clientesMultitemporada,
        rep1_balancePrendas,
        rep2_ventasPeriodo
      });
    } catch (error) {
      console.error('Error al cargar consultas y reportes:', error);
      res.status(500).render('errors/500', { titulo: 'Error del servidor' });
    }
  }
}

module.exports = ReporteController;