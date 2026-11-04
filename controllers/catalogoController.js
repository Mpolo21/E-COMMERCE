/**
 * Archivo: controllers/catalogoController.js
 * Propósito: Controlar la visualización del catálogo web y detalle de productos (CU01.1).
 */
const ProductoModel = require('../models/productoModel');

class CatalogoController {
  static async listarCatalogo(req, res) {
    try {
      const { categoria, marca, talla, color } = req.query;
      const filtrosOp = { categoria, marca, talla, color };

      const filtrosDisponibles = await ProductoModel.obtenerFiltrosCatalogo();
      const productos = await ProductoModel.obtenerCatalogoFiltrado(filtrosOp);

      res.render('cliente/catalogo', {
        titulo: 'Catálogo de Ropa Masculina - PIJIC',
        productos,
        filtrosDisponibles,
        filtrosActivos: filtrosOp
      });
    } catch (error) {
      console.error('Error al listar catálogo:', error);
      res.status(500).render('errors/500', { titulo: 'Error del servidor' });
    }
  }

  static async verDetalle(req, res) {
    try {
      const { id } = req.params;
      const producto = await ProductoModel.obtenerDetalleProducto(id);

      if (!producto) {
        req.session.mensajeError = 'El producto solicitado no está disponible.';
        return res.redirect('/catalogo');
      }

      res.render('cliente/detalle_producto', {
        titulo: `${producto.nombre_producto} - PIJIC`,
        producto
      });
    } catch (error) {
      console.error('Error al ver detalle de producto:', error);
      res.status(500).render('errors/500', { titulo: 'Error del servidor' });
    }
  }
}

module.exports = CatalogoController;