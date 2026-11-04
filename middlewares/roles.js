/**
 * Archivo: middlewares/roles.js
 * Propósito: Middleware para restringir rutas según el rol del usuario (CU03 transversal).
 */
function requiereRol(rolesPermitidos) {
  return (req, res, next) => {
    if (!req.session || !req.session.usuario) {
      req.session.mensajeError = 'Acceso denegado. Inicia sesión primero.';
      return res.redirect('/auth/login');
    }

    const rolUsuario = req.session.usuario.nombre_rol;

    if (rolesPermitidos.includes(rolUsuario)) {
      return next();
    }

    // Si no tiene el rol requerido, retornar error 403
    return res.status(403).render('errors/403', {
      titulo: 'Acceso Denegado',
      mensaje: `No tienes permisos de rol (${rolUsuario}) para acceder a este módulo.`
    });
  };
}

module.exports = {
  requiereRol
};