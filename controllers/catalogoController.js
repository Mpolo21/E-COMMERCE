/**
 * Archivo: controllers/catalogoController.js
 * Propósito: Controlar la visualización del catálogo, filtros y detalle de prendas (CU01.1 y Actualización 2.4).
 */
const ProductoModel = require('../models/productoModel');
const { obtenerRutaPorRol } = require('../helpers/rutaPorRol');

class CatalogoController {
  static async listarCatalogo(req, res) {
    try {
      const { categoria, marca, talla, color } = req.query;
      const filtrosDisponibles = await ProductoModel.obtenerFiltrosDisponibles();
      const productos = await ProductoModel.obtenerCatalogo({ categoria, marca, talla, color });

      res.render('cliente/catalogo', {
        titulo: 'Catálogo de Ropa Masculina - PIJIC',
        productos,
        filtrosDisponibles,
        filtrosActivos: { categoria, marca, talla, color }
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

      // Si el producto no existe o fue dado de baja (estado = FALSE), responder 404 amigable
      if (!producto) {
        return res.status(404).render('errors/404', {
          titulo: 'Prenda No Disponible - PIJIC Menswear',
          rutaRetorno: obtenerRutaPorRol(req.session ? req.session.usuario : null)
        });
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