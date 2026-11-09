/**
 * Archivo: routes/proveedor.js
 * Propósito: Definir las rutas exclusivas de solo lectura para el rol Proveedor (CU03).
 */
const express = require('express');
const router = express.Router();
const ProveedorController = require('../controllers/proveedorController');
const { requiereLogin } = require('../middlewares/auth');
const { requiereRol } = require('../middlewares/roles');

// Restricción transversal CU03: Solo el rol Proveedor puede acceder
router.use(requiereLogin, requiereRol(['Proveedor']));

router.get('/', (req, res) => res.redirect('/proveedor/consultas'));
router.get('/consultas', ProveedorController.panelConsultas);

module.exports = router;