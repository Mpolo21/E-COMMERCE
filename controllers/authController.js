/**
 * Archivo: controllers/authController.js
 * Propósito: Controladores para login, registro de clientes y logout.
 */
const bcrypt = require('bcrypt');
const UsuarioModel = require('../models/usuarioModel');

class AuthController {
  static mostrarLogin(req, res) {
    if (req.session.usuario) {
      return AuthController.redireccionarSegunRol(req.session.usuario, res);
    }
    res.render('auth/login', { titulo: 'Iniciar Sesión - E-commerce Ropa' });
  }

  static async procesarLogin(req, res) {
    try {
      const { correo, contrasena } = req.body;
      const usuario = await UsuarioModel.buscarPorCorreo(correo);

      if (!usuario) {
        return res.render('auth/login', {
          titulo: 'Iniciar Sesión',
          error: 'Correo o contraseña incorrectos.'
        });
      }

      const passwordValida = await bcrypt.compare(contrasena, usuario.contrasena);
      if (!passwordValida) {
        return res.render('auth/login', {
          titulo: 'Iniciar Sesión',
          error: 'Correo o contraseña incorrectos.'
        });
      }

      // Guardar datos en sesión (excluyendo la contraseña)
      req.session.usuario = {
        id_usuario: usuario.id_usuario,
        nombre: usuario.nombre,
        correo: usuario.correo,
        nombre_rol: usuario.nombre_rol,
        id_proveedor: usuario.id_proveedor || null
      };

      return AuthController.redireccionarSegunRol(req.session.usuario, res);
    } catch (error) {
      console.error('Error en procesarLogin:', error);
      res.status(500).render('errors/500', { titulo: 'Error del servidor' });
    }
  }

  static mostrarRegistro(req, res) {
    res.render('auth/register', { titulo: 'Registro de Cliente' });
  }

  static async procesarRegistro(req, res) {
    try {
      const { nombre, correo, contrasena, direccion } = req.body;
      const existente = await UsuarioModel.buscarPorCorreo(correo);

      if (existente) {
        return res.render('auth/register', {
          titulo: 'Registro de Cliente',
          error: 'El correo electrónico ya se encuentra registrado.'
        });
      }

      const saltRounds = 10;
      const contrasenaHash = await bcrypt.hash(contrasena, saltRounds);

      await UsuarioModel.crearCliente({ nombre, correo, contrasenaHash, direccion });

      req.session.mensajeExito = '¡Registro exitoso! Por favor inicia sesión.';
      return res.redirect('/auth/login');
    } catch (error) {
      console.error('Error en procesarRegistro:', error);
      res.status(500).render('errors/500', { titulo: 'Error del servidor' });
    }
  }

  static logout(req, res) {
    req.session.destroy(() => {
      res.redirect('/auth/login');
    });
  }

  static redireccionarSegunRol(usuario, res) {
    if (usuario.nombre_rol === 'Administrador') {
      return res.redirect('/admin/dashboard');
    } else if (usuario.nombre_rol === 'Proveedor') {
      return res.redirect('/proveedor/consultas');
    } else {
      return res.redirect('/catalogo');
    }
  }
}

module.exports = AuthController;