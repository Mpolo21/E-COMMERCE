/**
 * Archivo: routes/admin/index.js
 * Propósito: Enrutador del Backoffice Administrador protegido por middleware de rol.
 */
const express = require('express');
const router = express.Router();
const AdminController = require('../../controllers/adminController');
const CompraEntregaController = require('../../controllers/compraEntregaController');
const ReporteController = require('../../controllers/reporteController');
const { requiereLogin } = require('../../middlewares/auth');
const { requiereRol } = require('../../middlewares/roles');

// Todas las rutas requieren rol Administrador
router.use(requiereLogin, requiereRol('Administrador'));

// Dashboard general
router.get('/dashboard', AdminController.dashboard);

// CU02.1 Inventario estacional
router.get('/inventario', AdminController.vistaInventario);
router.post('/inventario/producto/crear', AdminController.crearProducto);
router.post('/inventario/producto/actualizar', AdminController.actualizarProducto);
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

// CU02.4 Consultas, CU02.8 Reportes y AJUSTE 4.7 Auditoría/Ajuste de Puntos
router.get('/consultas', ReporteController.panelConsultasYReportes);
router.get('/puntos/:id', ReporteController.verMovimientosCliente);
router.post('/puntos/ajustar', ReporteController.ajustarPuntosCliente);

module.exports = router;