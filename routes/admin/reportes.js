/**
 * Archivo: routes/admin/reportes.js
 * Propósito: Rutas independientes para el Centro de Reportes, cada consulta y exportación CSV (Actualización 1.2).
 */
const express = require('express');
const router = express.Router();
const ReportesController = require('../../controllers/admin/reportesController');
const { requiereLogin } = require('../../middlewares/auth');
const { requiereRol } = require('../../middlewares/roles');

router.use(requiereLogin, requiereRol('Administrador'));

// Centro de selección (no ejecuta consultas pesadas)
router.get('/', ReportesController.centroReportes);

// Exportación CSV sin paginación respetando filtros activos
router.get('/:slug/exportar.csv', ReportesController.exportarCSV);

// Vista individual de cada reporte o consulta
router.get('/:slug', ReportesController.verReporte);

module.exports = router;