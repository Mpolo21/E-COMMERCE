/**
 * Archivo: controllers/cuentaController.js
 * Propósito: Controlar la visualización del historial de pedidos, puntos y movimientos del cliente (CU01.3 y Ajuste 4.6).
 */
const CuentaModel = require('../models/cuentaModel');
const { configPuntos } = require('../config/puntos');

class CuentaController {
  static async verHistorialPedidos(req, res) {
    try {
      const id_cliente = req.session.usuario.id_usuario;
      const [cliente, pedidos, movimientos] = await Promise.all([
        CuentaModel.obtenerDatosCliente(id_cliente),
        CuentaModel.obtenerHistorialPedidos(id_cliente),
        CuentaModel.obtenerMovimientosPuntos(id_cliente)
      ]);

      const equivalenciaPesos = (Number(cliente.puntos_fidelizacion) || 0) * configPuntos.valorPuntoCop;

      res.render('cliente/historial_pedidos', {
        titulo: 'Mi Cuenta y Puntos - PIJIC Menswear',
        cliente,
        pedidos,
        movimientos,
        equivalenciaPesos
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
        titulo: `Detalle Pedido #${pedido.id_pedido} - PIJIC Menswear`,
        pedido
      });
    } catch (error) {
      console.error('Error al ver detalle de pedido:', error);
      res.status(500).render('errors/500', { titulo: 'Error del servidor' });
    }
  }
}

module.exports = CuentaController;