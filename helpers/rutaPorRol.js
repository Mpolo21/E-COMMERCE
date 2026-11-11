/**
 * Archivo: helpers/rutaPorRol.js
 * Propósito: Función centralizada que devuelve la ruta de inicio según el rol en sesión (Ajuste 3).
 */
function obtenerRutaPorRol(usuario) {
  if (!usuario || !usuario.nombre_rol) {
    return '/auth/login';
  }

  switch (usuario.nombre_rol) {
    case 'Administrador':
      return '/admin/dashboard';
    case 'Proveedor':
      return '/proveedor/consultas';
    case 'Cliente':
    default:
      return '/catalogo';
  }
}

module.exports = {
  obtenerRutaPorRol
};