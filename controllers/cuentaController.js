/**
 * Archivo: controllers/cuentaController.js
 * Propósito: Controlar la visualización del historial de pedidos y cuenta del cliente (CU01.3).
 */
const CuentaModel = require('../models/cuentaModel');

class CuentaController {
  static async verHistorialPedidos(req, res) {
    try {
      const id_cliente = req.session.usuario.id_usuario;
      const cliente = await CuentaModel.obtenerDatosCliente(id_cliente);
      const pedidos = await CuentaModel.obtenerHistorialPedidos(id_cliente);

      res.render('cliente/historial_pedidos', {
        titulo: 'Mi Cuenta y Pedidos - PIJIC',
        cliente,
        pedidos
      });
    } catch (error) {
      console.error('Error al ver historial de pedidos:', error);
      res.status(500).render('errors/500', { titulo: 'Error del servidor' });
    }
  }

  static async verDetallePedido(req, res) {
    try {
      const id_cliente = req.session.usuario.id_usuario;
      const { id } = req.params;

      const pedido = await CuentaModel.obtenerDetallePedidoPorId(id, id_cliente);
      if (!pedido) {
        req.session.mensajeError = 'El pedido solicitado no existe o no te pertenece.';
        return res.redirect('/cuenta/pedidos');
      }

      res.render('cliente/detalle_pedido', {
        titulo: `Detalle Pedido #${pedido.id_pedido} - PIJIC`,
        pedido
      });
    } catch (error) {
      console.error('Error al ver detalle de pedido:', error);
      res.status(500).render('errors/500', { titulo: 'Error del servidor' });
    }
  }
}

module.exports = CuentaController;