/**
 * Archivo: middlewares/roles.js
 * Propósito: Middleware para restringir rutas según el rol del usuario (CU03 y Ajuste 3).
 */
const { obtenerRutaPorRol } = require('../helpers/rutaPorRol');

function requiereRol(rolesPermitidos) {
  const listaRoles = Array.isArray(rolesPermitidos) ? rolesPermitidos : [rolesPermitidos];

  return (req, res, next) => {
    if (!req.session || !req.session.usuario) {
      if (req.session) {
        req.session.mensajeError = 'Debes iniciar sesión para acceder a esta página.';
      }
      return res.redirect('/auth/login');
    }

    const rolUsuario = req.session.usuario.nombre_rol;

    if (listaRoles.includes(rolUsuario)) {
      return next();
    }

    // Con sesión pero sin permiso: responder 403 con botón hacia su propio panel
    return res.status(403).render('errors/403', {
      titulo: '403 - Acceso Denegado',
      mensaje: 'No tienes permiso para acceder a esta página.',
      rutaRetorno: obtenerRutaPorRol(req.session.usuario)
    });
  };
}

module.exports = {
  requiereRol
};