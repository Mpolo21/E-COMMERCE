/**
 * Archivo: app.js
 * Propósito: Punto de entrada de la aplicación, configuración de Express, sesiones, EJS y rutas.
 */
require('dotenv').config();
const express = require('express');
const session = require('express-session');
const path = require('path');
const { pool, verificarConexion } = require('./config/db');
const { obtenerRutaPorRol } = require('./helpers/rutaPorRol');
const { configPuntos } = require('./config/puntos');

const app = express();
const PORT = process.env.PORT || 3000;

// 1. Configuración del motor de plantillas EJS
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));

// 2. Middlewares para parsear formularios POST y JSON
app.use(express.urlencoded({ extended: true }));
app.use(express.json());

// 3. Archivos estáticos
app.use(express.static(path.join(__dirname, 'public')));

// 4. Configuración de sesiones
app.use(
  session({
    secret: process.env.SESSION_SECRET || 'secreto_desarrollo_pijic',
    resave: false,
    saveUninitialized: false,
    cookie: {
      httpOnly: true,
      maxAge: 1000 * 60 * 60 * 4
    }
  })
);

// 5. Middleware global para inyectar datos de sesión, helper de moneda, puntos y ruta por rol en vistas
const formateadorCOP = new Intl.NumberFormat('es-CO', {
  style: 'currency',
  currency: 'COP',
  maximumFractionDigits: 0
});

app.use((req, res, next) => {
  res.locals.usuarioActual = req.session.usuario || null;
  res.locals.rutaInicioRol = obtenerRutaPorRol(req.session.usuario);
  res.locals.formatoCOP = (valor) => formateadorCOP.format(Number(valor) || 0);
  res.locals.configPuntos = configPuntos;
  res.locals.carritoCantidad = req.session.carrito
    ? req.session.carrito.reduce((acc, item) => acc + item.cantidad, 0)
    : 0;
  res.locals.mensajeExito = req.session.mensajeExito || null;
  res.locals.mensajeError = req.session.mensajeError || null;
  res.locals.mensajeAviso = req.session.mensajeAviso || null;
  delete req.session.mensajeExito;
  delete req.session.mensajeError;
  delete req.session.mensajeAviso;
  next();
});

// 6. Enrutadores de la aplicación
const authRoutes = require('./routes/auth');
const catalogoRoutes = require('./routes/catalogo');
const carritoRoutes = require('./routes/carrito');
const cuentaRoutes = require('./routes/cuenta');
const adminRoutes = require('./routes/admin');
const proveedorRoutes = require('./routes/proveedor');

app.use('/auth', authRoutes);
// Alias cortos para /login y /registro (Ajuste 3 punto 4)
app.get('/login', (req, res) => res.redirect('/auth/login'));
app.get('/registro', (req, res) => res.redirect('/auth/register'));

app.use('/catalogo', catalogoRoutes);
app.use('/carrito', carritoRoutes);
app.use('/cuenta', cuentaRoutes);
app.use('/admin', adminRoutes);
app.use('/proveedor', proveedorRoutes);

// 7. Endpoint de salud
app.get('/health', async (req, res) => {
  try {
    const [roles] = await pool.query('SELECT * FROM roles');
    const [productos] = await pool.query('SELECT COUNT(*) AS total_productos FROM productos');
    const [balance] = await pool.query('SELECT COUNT(*) AS filas_vista FROM vista_balance_prendas');
    res.status(200).json({
      estado: 'OK',
      roles_registrados: roles,
      total_productos: productos[0].total_productos,
      vista_balance_operativa: balance[0].filas_vista
    });
  } catch (error) {
    res.status(500).json({ estado: 'ERROR', detalle: error.message });
  }
});

// 8. Ruta raíz inteligente según sesión y rol
app.get('/', (req, res) => {
  if (req.session && req.session.usuario) {
    return res.redirect(obtenerRutaPorRol(req.session.usuario));
  }
  return res.redirect('/auth/login');
});

// 9. Manejador 404 (Ruta no encontrada) con regreso según rol
app.use((req, res) => {
  res.status(404).render('errors/404', {
    titulo: '404 - Página No Encontrada',
    rutaRetorno: obtenerRutaPorRol(req.session ? req.session.usuario : null)
  });
});

// 10. Manejador global de errores 500 con regreso según rol
app.use((err, req, res, next) => {
  console.error('Error no controlado:', err);
  res.status(500).render('errors/500', {
    titulo: '500 - Error Interno del Servidor',
    rutaRetorno: obtenerRutaPorRol(req.session ? req.session.usuario : null)
  });
});

// 11. Arranque del servidor
app.listen(PORT, async () => {
  console.log(`🚀 Servidor ejecutándose en http://localhost:${PORT}`);
  await verificarConexion();
});