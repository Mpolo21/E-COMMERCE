/**
 * Archivo: controllers/compraEntregaController.js
 * Propósito: Lógica de control para gestión de despachos de entregas y registro de compras.
 */
const CompraEntregaModel = require('../models/compraEntregaModel');
const AdminModel = require('../models/adminModel'); // Reutilizamos para listar transportadoras

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
        cantidad: parseInt(cantidad),
        precio_compra_unitario: parseFloat(precio_compra_unitario)
      });

      req.session.mensajeExito = `Compra registrada. Stock sumado y Costo Promedio Ponderado recalculado exitosamente (Nuevo costo: $${Number(resultado.nuevo_costo).toLocaleString('es-CO')}).`;
      res.redirect('/admin/compras');
    } catch (error) {
      console.error('Error en registrarCompra:', error);
      req.session.mensajeError = 'Ocurrió un error al procesar la compra transaccional.';
      res.redirect('/admin/compras');
    }
  }
}

module.exports = CompraEntregaController;