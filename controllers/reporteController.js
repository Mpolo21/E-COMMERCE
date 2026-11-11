/**
 * Archivo: controllers/reporteController.js
 * Propósito: Controlar consultas (CU02.4), reportes (CU02.8) y gestión de puntos por cliente (Ajuste 4.7).
 */
const ReporteModel = require('../models/reporteModel');

class ReporteController {
  static async panelConsultasYReportes(req, res) {
    try {
      const { clientes, temporadas } = await ReporteModel.obtenerListasFiltro();

      const umbralStock = parseInt(req.query.umbral, 10) || 3;
      const idCliente = req.query.id_cliente || (clientes[0] ? clientes[0].id_usuario : 2);
      const idTemporada = req.query.id_temporada || (temporadas[0] ? temporadas[0].id_temporada : 1);
      const fechaInicio = req.query.fecha_inicio || '2025-01-01';
      const fechaFin = req.query.fecha_fin || '2027-12-31';

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

  static async verMovimientosCliente(req, res) {
    try {
      const { id } = req.params;
      const datos = await ReporteModel.obtenerClienteYMovimientos(id);
      if (!datos) {
        req.session.mensajeError = 'El cliente solicitado no existe.';
        return res.redirect('/admin/consultas');
      }

      res.render('admin/puntos_cliente', {
        titulo: `Historial de Puntos: ${datos.cliente.nombre} - PIJIC`,
        cliente: datos.cliente,
        movimientos: datos.movimientos
      });
    } catch (error) {
      console.error('Error en verMovimientosCliente:', error);
      res.status(500).render('errors/500', { titulo: 'Error del servidor' });
    }
  }

  static async ajustarPuntosCliente(req, res) {
    try {
      const { id_usuario, puntos, motivo } = req.body;
      const nuevoSaldo = await ReporteModel.realizarAjustePuntosAdmin(id_usuario, puntos, motivo);
      req.session.mensajeExito = `Ajuste de puntos aplicado correctamente. Nuevo saldo del cliente: ${nuevoSaldo} puntos.`;
      res.redirect(`/admin/puntos/${id_usuario}`);
    } catch (error) {
      req.session.mensajeError = error.message || 'No se pudo aplicar el ajuste de puntos.';
      res.redirect(`/admin/puntos/${req.body.id_usuario || ''}`);
    }
  }
}

module.exports = ReporteController;