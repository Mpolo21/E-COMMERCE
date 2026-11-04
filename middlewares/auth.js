/**
 * Archivo: middlewares/auth.js
 * Propósito: Middleware para verificar si el usuario tiene una sesión activa.
 */
function requiereLogin(req, res, next) {
  if (req.session && req.session.usuario) {
    return next();
  }
  req.session.mensajeError = 'Por favor inicia sesión para continuar.';
  return res.redirect('/auth/login');
}

module.exports = {
  requiereLogin
};