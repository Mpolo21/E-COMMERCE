/**
 * Archivo: controllers/proveedorController.js
 * Propósito: Controlar el módulo de consultas de solo lectura del Proveedor (CU03).
 */
const ProveedorModel = require('../models/proveedorModel');

class ProveedorController {
  static async panelConsultas(req, res) {
    try {
      const id_proveedor = req.session.usuario.id_proveedor;

      if (!id_proveedor) {
        return res.status(403).render('errors/403', {
          titulo: 'Cuenta sin Proveedor Asociado',
          mensaje: 'Tu usuario tiene rol Proveedor, pero aún no está vinculado a un registro de empresa proveedora.'
        });
      }

      const [
        proveedor,
        productosSuministrados,
        comprasRealizadas,
        historialSuministros
      ] = await Promise.all([
        ProveedorModel.obtenerInfoProveedor(id_proveedor),
        ProveedorModel.obtenerProductosSuministrados(id_proveedor),
        ProveedorModel.obtenerComprasRealizadas(id_proveedor),
        ProveedorModel.obtenerHistorialSuministros(id_proveedor)
      ]);

      res.render('proveedor/consultas', {
        titulo: `Portal Proveedor: ${proveedor ? proveedor.nombre_proveedor : ''} - PIJIC`,
        proveedor,
        productosSuministrados,
        comprasRealizadas,
        historialSuministros
      });
    } catch (error) {
      console.error('Error en ProveedorController.panelConsultas:', error);
      res.status(500).render('errors/500', { titulo: 'Error del servidor' });
    }
  }
}

module.exports = ProveedorController;