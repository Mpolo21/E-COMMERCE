/**
 * Archivo: routes/admin/index.js
 * Propósito: Enrutador del Backoffice Administrador protegido por middleware de rol.
 */
const express = require('express');
const router = express.Router();
const AdminController = require('../../controllers/adminController');
const CompraEntregaController = require('../../controllers/compraEntregaController');
const ReporteController = require('../../controllers/reporteController');
const reportesRoutes = require('./reportes');
const { requiereLogin } = require('../../middlewares/auth');
const { requiereRol } = require('../../middlewares/roles');

router.use(requiereLogin, requiereRol('Administrador'));

// Dashboard general
router.get('/dashboard', AdminController.dashboard);

// CU02.1 Inventario estacional + Actualización 2 (Baja lógica, Reactivación y Eliminación definitiva)
router.get('/inventario', AdminController.vistaInventario);
router.post('/inventario/producto/crear', AdminController.crearProducto);
router.post('/inventario/producto/actualizar', AdminController.actualizarProducto);
router.post('/inventario/producto/baja', AdminController.darDeBajaProducto);
router.post('/inventario/producto/reactivar', AdminController.reactivarProducto);
router.post('/inventario/producto/eliminar', AdminController.eliminarProductoDefinitivamente);
router.post('/inventario/stock', AdminController.asignarStock);
router.post('/inventario/auxiliar', AdminController.crearCatalogoAuxiliar);

// CU02.5 Gestión de marcas
router.get('/marcas', AdminController.vistaMarcas);
router.post('/marcas/crear', AdminController.crearMarca);
router.post('/marcas/actualizar', AdminController.actualizarMarca);

// CU02.7 Gestión de proveedores
router.get('/proveedores', AdminController.vistaProveedores);
router.post('/proveedores/crear', AdminController.crearProveedor);
router.post('/proveedores/actualizar', AdminController.actualizarProveedor);

// CU02.6 Gestión de transportadoras
router.get('/transportadoras', AdminController.vistaTransportadoras);
router.post('/transportadoras/crear', AdminController.crearTransportadora);
router.post('/transportadoras/actualizar', AdminController.actualizarTransportadora);
router.post('/transportadoras/eliminar', AdminController.eliminarTransportadora);

// CU02.2 Configuración de pagos
router.get('/pagos', AdminController.vistaPagos);
router.post('/pagos/crear', AdminController.crearPago);
router.post('/pagos/estado', AdminController.cambiarEstadoPago);

// CU02.3 Gestión de entregas
router.get('/entregas', CompraEntregaController.vistaEntregas);
router.post('/entregas/actualizar', CompraEntregaController.actualizarEntrega);

// AJUSTE 1: Pagos Contraentrega y AJUSTE 4.5: Cancelación de pedidos
router.get('/contraentrega', CompraEntregaController.vistaPagosContraentrega);
router.post('/contraentrega/pagar', CompraEntregaController.confirmarPagoContraentrega);
router.post('/pedidos/cancelar', CompraEntregaController.cancelarPedido);

// Registro de compras a proveedores
router.get('/compras', CompraEntregaController.vistaCompras);
router.post('/compras/registrar', CompraEntregaController.registrarCompra);

// ACTUALIZACIÓN 1: Nuevo Centro de Reportes Independientes
router.use('/reportes', reportesRoutes);

// Redirección limpia de la ruta antigua /admin/consultas al nuevo Centro de Reportes
router.get('/consultas', (req, res) => res.redirect('/admin/reportes'));

// Auditoría y ajuste manual de puntos por cliente
router.get('/puntos/:id', ReporteController.verMovimientosCliente);
router.post('/puntos/ajustar', ReporteController.ajustarPuntosCliente);

module.exports = router;