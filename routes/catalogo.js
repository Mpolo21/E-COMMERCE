/**
 * Archivo: routes/catalogo.js
 * Propósito: Definir rutas GET para el catálogo de ropa y detalle de producto.
 */
const express = require('express');
const router = express.Router();
const CatalogoController = require('../controllers/catalogoController');
const { requiereLogin } = require('../middlewares/auth');

router.get('/', requiereLogin, CatalogoController.listarCatalogo);
router.get('/producto/:id', requiereLogin, CatalogoController.verDetalle);

module.exports = router;