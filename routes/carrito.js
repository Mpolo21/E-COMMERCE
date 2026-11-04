/**
 * Archivo: routes/carrito.js
 * Propósito: Definir rutas para el carrito y checkout transaccional.
 */
const express = require('express');
const router = express.Router();
const CarritoController = require('../controllers/carritoController');
const { requiereLogin } = require('../middlewares/auth');
const { requiereRol } = require('../middlewares/roles');

const esCliente = requiereRol(['Cliente']);

router.get('/', requiereLogin, esCliente, CarritoController.verCarrito);
router.post('/agregar', requiereLogin, esCliente, CarritoController.agregarAlCarrito);
router.post('/modificar', requiereLogin, esCliente, CarritoController.modificarCantidad);
router.get('/checkout', requiereLogin, esCliente, CarritoController.mostrarCheckout);
router.post('/checkout', requiereLogin, esCliente, CarritoController.procesarCheckout);

module.exports = router;