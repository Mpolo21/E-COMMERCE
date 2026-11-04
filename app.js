/**
 * Archivo: app.js
 * Propósito: Punto de entrada de la aplicación, configuración de Express, sesiones, EJS y rutas.
 */
require('dotenv').config();
const express = require('express');
const session = require('express-session');
const path = require('path');
const { pool, verificarConexion } = require('./config/db');

const app = express();
const PORT = process.env.PORT || 3000;

// 1. Configuración del motor de plantillas EJS
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));

// 2. Middlewares para parsear formularios POST (application/x-www-form-urlencoded) y JSON
app.use(express.urlencoded({ extended: true }));
app.use(express.json());

// 3. Archivos estáticos (CSS, JS de cliente, imágenes)
app.use(express.static(path.join(__dirname, 'public')));

// 4. Configuración de sesiones
app.use(
  session({
    secret: process.env.SESSION_SECRET || 'secreto_desarrollo_pijic',
    resave: false,
    saveUninitialized: false,
    cookie: {
      httpOnly: true, // Previene acceso a la cookie desde JavaScript del navegador (XSS)
      maxAge: 1000 * 60 * 60 * 4 // 4 horas de duración de sesión
    }
  })
);

// 5. Middleware global para inyectar datos de sesión y mensajes flash en todas las vistas EJS
app.use((req, res, next) => {
  res.locals.usuarioActual = req.session.usuario || null;
  res.locals.carritoCantidad = req.session.carrito
    ? req.session.carrito.reduce((acc, item) => acc + item.cantidad, 0)
    : 0;
  res.locals.mensajeExito = req.session.mensajeExito || null;
  res.locals.mensajeError = req.session.mensajeError || null;
  // Limpiar mensajes después de pasarlos a la vista
  delete req.session.mensajeExito;
  delete req.session.mensajeError;
  next();
});

// 6. Enrutadores de la aplicación
const authRoutes = require('./routes/auth');
const catalogoRoutes = require('./routes/catalogo');
const carritoRoutes = require('./routes/carrito');
app.use('/carrito', carritoRoutes);
app.use('/auth', authRoutes);
app.use('/catalogo', catalogoRoutes);

// 7. Ruta de prueba de salud del sistema (para validar Fase 0 y Fase 1)
app.get('/health', async (req, res) => {
  try {
    const [roles] = await pool.query('SELECT * FROM roles');
    const [productos] = await pool.query('SELECT COUNT(*) AS total_productos FROM productos');
    const [balance] = await pool.query('SELECT COUNT(*) AS filas_vista FROM vista_balance_prendas');
    res.status(200).json({
      estado: 'OK',
      mensaje: 'Servidor Express y Base de Datos MySQL funcionando correctamente',
      roles_registrados: roles,
      total_productos: productos[0].total_productos,
      vista_balance_operativa: balance[0].filas_vista
    });
  } catch (error) {
    console.error('Error en /health:', error);
    res.status(500).json({
      estado: 'ERROR',
      mensaje: 'Fallo al consultar la base de datos. Asegúrate de haber ejecutado schema.sql, migraciones.sql y seed.sql.',
      detalle: error.message
    });
  }
});

// Ruta raíz que redirige al login
app.get('/', (req, res) => {
  res.redirect('/auth/login');
});

// 8. Manejo de errores 404 (Ruta no encontrada)
app.use((req, res) => {
  res.status(404).send('<h1>404 - Página no encontrada</h1><a href="/catalogo">Volver al inicio</a>');
});

// 9. Manejo global de errores 500
app.use((err, req, res, next) => {
  console.error('Error no controlado:', err);
  res.status(500).send('<h1>500 - Error interno del servidor</h1><p>Ocurrió un problema inesperado.</p>');
});

// 10. Arranque del servidor
app.listen(PORT, async () => {
  console.log(`🚀 Servidor ejecutándose en http://localhost:${PORT}`);
  await verificarConexion();
});