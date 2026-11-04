const express = require('express');
const router = express.Router();
const AuthController = require('../controllers/authController');

router.get('/login', AuthController.mostrarLogin);
router.post('/login', AuthController.procesarLogin);
router.get('/register', AuthController.mostrarRegistro);
router.post('/register', AuthController.procesarRegistro);
router.get('/logout', AuthController.logout);

module.exports = router;