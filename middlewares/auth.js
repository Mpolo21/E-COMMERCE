/**
 * Archivo: middlewares/auth.js
 * Propósito: Middleware para verificar si el usuario tiene una sesión activa (Ajuste 3).
 */
function requiereLogin(req, res, next) {
  if (req.session && req.session.usuario) {
    return next();
  }
  if (req.session) {
    req.session.mensajeError = 'Debes iniciar sesión para acceder a esta página.';
  }
  return res.redirect('/auth/login');
}

module.exports = {
  requiereLogin
};