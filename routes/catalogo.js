/**
 * Archivo: routes/catalogo.js
 * Propósito: Definir rutas GET para el catálogo de ropa y detalle de producto.
 */
const express = require('express');
const router = express.Router();
const CatalogoController = require('../controllers/catalogoController');
const { requiereLogin } = require('../middlewares/auth');
const { requiereRol } = require('../middlewares/roles');

router.use(requiereLogin, requiereRol(['Cliente', 'Administrador']));

router.get('/', CatalogoController.listarCatalogo);
router.get('/producto/:id', CatalogoController.verDetalle);

module.exports = router;