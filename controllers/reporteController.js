/**
 * Archivo: controllers/reporteController.js
 * Propósito: Controlar la gestión de puntos por cliente y auditoría (Ajuste 4.7).
 */
const ReporteModel = require('../models/reporteModel');

class ReporteController {
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