/**
 * Archivo: controllers/authController.js
 * Propósito: Controladores para login, registro de clientes y logout (Ajuste 3).
 */
const bcrypt = require('bcrypt');
const UsuarioModel = require('../models/usuarioModel');
const { obtenerRutaPorRol } = require('../helpers/rutaPorRol');

class AuthController {
  static mostrarLogin(req, res) {
    if (req.session && req.session.usuario) {
      return res.redirect(obtenerRutaPorRol(req.session.usuario));
    }
    res.render('auth/login', { titulo: 'Iniciar Sesión - PIJIC Menswear' });
  }

  static async procesarLogin(req, res) {
    try {
      const { correo, contrasena } = req.body;
      const usuario = await UsuarioModel.buscarPorCorreo(correo ? correo.trim() : '');

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

      req.session.usuario = {
        id_usuario: usuario.id_usuario,
        nombre: usuario.nombre,
        correo: usuario.correo,
        direccion: usuario.direccion || '',
        nombre_rol: usuario.nombre_rol,
        rol: usuario.nombre_rol,
        id_proveedor: usuario.id_proveedor || null
      };

      return res.redirect(obtenerRutaPorRol(req.session.usuario));
    } catch (error) {
      console.error('Error en procesarLogin:', error);
      res.status(500).render('errors/500', {
        titulo: 'Error del servidor',
        rutaRetorno: obtenerRutaPorRol(req.session ? req.session.usuario : null)
      });
    }
  }

  static mostrarRegistro(req, res) {
    if (req.session && req.session.usuario) {
      return res.redirect(obtenerRutaPorRol(req.session.usuario));
    }
    res.render('auth/register', { titulo: 'Registro de Cliente - PIJIC Menswear' });
  }

  static async procesarRegistro(req, res) {
    try {
      if (req.session && req.session.usuario) {
        return res.redirect(obtenerRutaPorRol(req.session.usuario));
      }

      const { nombre, correo, contrasena, direccion } = req.body;
      const existente = await UsuarioModel.buscarPorCorreo(correo ? correo.trim() : '');

      if (existente) {
        return res.render('auth/register', {
          titulo: 'Registro de Cliente',
          error: 'El correo electrónico ya se encuentra registrado.'
        });
      }

      const saltRounds = 10;
      const contrasenaHash = await bcrypt.hash(contrasena, saltRounds);

      await UsuarioModel.crearCliente({
        nombre: nombre.trim(),
        correo: correo.trim(),
        contrasenaHash,
        direccion: direccion ? direccion.trim() : ''
      });

      req.session.mensajeExito = '¡Registro exitoso! Ahora puedes iniciar sesión.';
      return res.redirect('/auth/login');
    } catch (error) {
      console.error('Error en procesarRegistro:', error);
      res.status(500).render('errors/500', {
        titulo: 'Error del servidor',
        rutaRetorno: '/auth/login'
      });
    }
  }

  static logout(req, res) {
    req.session.destroy(() => {
      res.redirect('/auth/login');
    });
  }
}

module.exports = AuthController;