/**
 * Archivo: controllers/compraEntregaController.js
 * Propósito: Controlar despachos, Pagos Contraentrega (Ajuste 1), Cancelaciones (Ajuste 4.5) y Compras (Actualización 2.4).
 */
const CompraEntregaModel = require('../models/compraEntregaModel');
const AdminModel = require('../models/adminModel');

class CompraEntregaController {
  static async vistaEntregas(req, res) {
    try {
      const entregas = await CompraEntregaModel.listarEntregas();
      const transportadoras = await AdminModel.listarTransportadoras();
      res.render('admin/entregas', {
        titulo: 'Gestión de Entregas - PIJIC',
        entregas,
        transportadoras
      });
    } catch (error) {
      console.error('Error en vistaEntregas:', error);
      res.status(500).render('errors/500', { titulo: 'Error del servidor' });
    }
  }

  static async actualizarEntrega(req, res) {
    try {
      const { id_entrega, tipo_entrega, id_transportadora, estado_entrega } = req.body;
      await CompraEntregaModel.actualizarEntrega({ id_entrega, tipo_entrega, id_transportadora, estado_entrega });
      req.session.mensajeExito = 'Estado y logística de la entrega actualizados correctamente.';
      res.redirect('/admin/entregas');
    } catch (error) {
      req.session.mensajeError = 'No se pudo actualizar la entrega.';
      res.redirect('/admin/entregas');
    }
  }

  static async vistaPagosContraentrega(req, res) {
    try {
      const { estado = '', busqueda = '' } = req.query;
      const pedidos = await CompraEntregaModel.listarPedidosContraentrega({ estado, busqueda });

      res.render('admin/contraentrega', {
        titulo: 'Pagos Contraentrega - PIJIC',
        pedidos,
        filtros: { estado, busqueda }
      });
    } catch (error) {
      console.error('Error en vistaPagosContraentrega:', error);
      res.status(500).render('errors/500', { titulo: 'Error del servidor' });
    }
  }

  static async confirmarPagoContraentrega(req, res) {
    try {
      const { id_pedido } = req.body;
      const resultado = await CompraEntregaModel.marcarContraentregaComoPagado(id_pedido);

      req.session.mensajeExito = `Pedido #${resultado.id_pedido} marcado como PAGADO exitosamente. Se otorgaron ${resultado.puntosOtorgados} puntos de fidelización al cliente.`;
      res.redirect('/admin/contraentrega');
    } catch (error) {
      console.error('Error al confirmar pago contraentrega:', error);
      req.session.mensajeError = error.message || 'No se pudo registrar el pago contraentrega.';
      res.redirect('/admin/contraentrega');
    }
  }

  static async cancelarPedido(req, res) {
    try {
      const { id_pedido, origen } = req.body;
      const resultado = await CompraEntregaModel.cancelarPedidoTransaccional(id_pedido);

      req.session.mensajeExito = `Pedido #${resultado.id_pedido} cancelado. Stock repuesto, ${resultado.puntosDevueltos} pts devueltos y ${resultado.puntosRevertidos} pts revertidos.`;
      res.redirect(origen || '/admin/contraentrega');
    } catch (error) {
      console.error('Error al cancelar pedido:', error);
      req.session.mensajeError = error.message || 'No se pudo cancelar el pedido.';
      res.redirect('/admin/contraentrega');
    }
  }

  static async vistaCompras(req, res) {
    try {
      const catalogos = await CompraEntregaModel.obtenerCatalogosParaCompra();
      res.render('admin/compras', {
        titulo: 'Registrar Compra a Proveedor - PIJIC',
        ...catalogos
      });
    } catch (error) {
      console.error('Error en vistaCompras:', error);
      res.status(500).render('errors/500', { titulo: 'Error del servidor' });
    }
  }

  static async registrarCompra(req, res) {
    try {
      const { id_proveedor, id_producto, id_talla, id_color, cantidad, precio_compra_unitario } = req.body;

      const resultado = await CompraEntregaModel.registrarCompraTransaccional({
        id_proveedor,
        id_producto,
        id_talla,
        id_color,
        cantidad: parseInt(cantidad, 10),
        precio_compra_unitario: parseFloat(precio_compra_unitario)
      });

      req.session.mensajeExito = `Compra registrada. Stock sumado y Costo Promedio Ponderado recalculado ($${Math.round(resultado.nuevo_costo).toLocaleString('es-CO')} COP).`;
      res.redirect('/admin/compras');
    } catch (error) {
      console.error('Error en registrarCompra:', error);
      req.session.mensajeError = error.message || 'Ocurrió un error al procesar la compra transaccional.';
      res.redirect('/admin/compras');
    }
  }
}

module.exports = CompraEntregaController;