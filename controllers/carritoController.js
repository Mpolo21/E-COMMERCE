/**
 * Archivo: controllers/carritoController.js
 * Propósito: Gestionar el carrito de compras y la ejecución del checkout (CU01.2, CU01.5, Ajustes 1 y 4).
 */
const CarritoModel = require('../models/carritoModel');
const PuntosService = require('../services/puntosService');
const { configPuntos } = require('../config/puntos');

class CarritoController {
  static async agregarAlCarrito(req, res) {
    try {
      const { id_inventario, cantidad } = req.body;
      const cantNum = parseInt(cantidad, 10) || 1;

      const itemInv = await CarritoModel.obtenerItemInventario(id_inventario);
      if (!itemInv) {
        req.session.mensajeError = 'La combinación de producto seleccionada no es válida.';
        return res.redirect('/catalogo');
      }

      if (itemInv.cantidad_stock < cantNum) {
        req.session.mensajeError = `Stock insuficiente. Solo hay ${itemInv.cantidad_stock} unidades disponibles.`;
        return res.redirect(`/catalogo/producto/${itemInv.id_producto}`);
      }

      if (!req.session.carrito) {
        req.session.carrito = [];
      }

      const index = req.session.carrito.findIndex((i) => i.id_inventario == id_inventario);
      if (index > -1) {
        const nuevaCantidad = req.session.carrito[index].cantidad + cantNum;
        if (itemInv.cantidad_stock < nuevaCantidad) {
          req.session.mensajeError = `No puedes superar el stock disponible (${itemInv.cantidad_stock} unidades).`;
          return res.redirect('/carrito');
        }
        req.session.carrito[index].cantidad = nuevaCantidad;
      } else {
        req.session.carrito.push({
          id_inventario: itemInv.id_inventario,
          id_producto: itemInv.id_producto,
          id_talla: itemInv.id_talla,
          id_color: itemInv.id_color,
          nombre_producto: itemInv.nombre_producto,
          nombre_talla: itemInv.nombre_talla,
          nombre_color: itemInv.nombre_color,
          precio: Number(itemInv.precio),
          stock_maximo: itemInv.cantidad_stock,
          cantidad: cantNum
        });
      }

      req.session.mensajeExito = 'Prenda agregada al carrito exitosamente.';
      return res.redirect('/carrito');
    } catch (error) {
      console.error('Error al agregar al carrito:', error);
      res.status(500).render('errors/500', { titulo: 'Error del servidor' });
    }
  }

  static verCarrito(req, res) {
    const carrito = req.session.carrito || [];
    const subtotal = carrito.reduce((acc, item) => acc + item.precio * item.cantidad, 0);

    res.render('cliente/carrito', {
      titulo: 'Carrito de Compras - PIJIC Menswear',
      carrito,
      subtotal,
      total: subtotal
    });
  }

  static async modificarCantidad(req, res) {
    try {
      const { id_inventario, accion } = req.body;
      if (!req.session.carrito) return res.redirect('/carrito');

      const index = req.session.carrito.findIndex((i) => i.id_inventario == id_inventario);
      if (index > -1) {
        if (accion === 'aumentar') {
          const itemInv = await CarritoModel.obtenerItemInventario(id_inventario);
          if (!itemInv || req.session.carrito[index].cantidad + 1 > itemInv.cantidad_stock) {
            req.session.mensajeError = 'Alcanzaste el límite de stock disponible para esta prenda.';
            return res.redirect('/carrito');
          }
          req.session.carrito[index].cantidad += 1;
        } else if (accion === 'disminuir') {
          req.session.carrito[index].cantidad -= 1;
          if (req.session.carrito[index].cantidad <= 0) {
            req.session.carrito.splice(index, 1);
          }
        } else if (accion === 'eliminar') {
          req.session.carrito.splice(index, 1);
        }
      }
      res.redirect('/carrito');
    } catch (error) {
      console.error('Error al modificar carrito:', error);
      res.redirect('/carrito');
    }
  }

  static async mostrarCheckout(req, res) {
    try {
      const carrito = req.session.carrito || [];
      if (carrito.length === 0) {
        req.session.mensajeError = 'Tu carrito está vacío.';
        return res.redirect('/catalogo');
      }

      const [metodosPago, datosUsuario] = await Promise.all([
        CarritoModel.obtenerMetodosPagoActivos(),
        CarritoModel.obtenerSaldoUsuario(req.session.usuario.id_usuario)
      ]);

      const subtotal = carrito.reduce((acc, item) => acc + item.precio * item.cantidad, 0);
      const saldoPuntos = Number(datosUsuario.puntos_fidelizacion) || 0;
      const equivalenciaPesos = saldoPuntos * configPuntos.valorPuntoCop;
      const { puntosMaximos, descuentoMaximoCop } = PuntosService.calcularDescuentoMaximo(subtotal, saldoPuntos);

      res.render('cliente/checkout', {
        titulo: 'Finalizar Compra - PIJIC Menswear',
        carrito,
        subtotal,
        total: subtotal,
        metodosPago,
        saldoPuntos,
        equivalenciaPesos,
        puntosMaximos,
        descuentoMaximoCop,
        direccionCliente: datosUsuario.direccion || req.session.usuario.direccion || ''
      });
    } catch (error) {
      console.error('Error al mostrar checkout:', error);
      res.status(500).render('errors/500', { titulo: 'Error del servidor' });
    }
  }

  static async procesarCheckout(req, res) {
    try {
      const { direccion_entrega, id_metodo_pago, usar_puntos, puntos_a_canjear } = req.body;
      const carrito = req.session.carrito || [];

      if (carrito.length === 0) {
        req.session.mensajeError = 'El carrito está vacío.';
        return res.redirect('/catalogo');
      }

      if (!direccion_entrega || !direccion_entrega.trim()) {
        req.session.mensajeError = 'Debes ingresar una dirección de entrega válida.';
        return res.redirect('/carrito/checkout');
      }

      // Si la casilla usar_puntos está marcada, leemos puntos_a_canjear; de lo contrario 0
      let puntosSolicitados = 0;
      if (usar_puntos === '1' || usar_puntos === 'on') {
        const valorBruto = String(puntos_a_canjear ?? '0').trim();
        if (!/^\d+$/.test(valorBruto)) {
          req.session.mensajeError = 'La cantidad de puntos a canjear debe ser un número entero válido.';
          return res.redirect('/carrito/checkout');
        }
        puntosSolicitados = parseInt(valorBruto, 10);
      }

      const resultado = await CarritoModel.procesarCheckoutTransaccional({
        id_cliente: req.session.usuario.id_usuario,
        direccion_entrega,
        id_metodo_pago,
        carritoItems: carrito,
        puntosACanjear: puntosSolicitados
      });

      if (!resultado.success) {
        req.session.mensajeError = `No se pudo procesar la compra: ${resultado.mensaje}`;
        return res.redirect('/carrito/checkout');
      }

      req.session.carrito = [];

      if (resultado.esContraentrega) {
        req.session.mensajeExito = `¡Pedido #${resultado.id_pedido} registrado como Contraentrega (Estado de pago: Debiendo)! Pagarás al recibir. Los puntos se acreditarán cuando el administrador confirme el recaudo.`;
      } else if (resultado.totalAPagar === 0) {
        req.session.mensajeExito = `¡Pedido #${resultado.id_pedido} pagado 100% con tus puntos de fidelización! (${resultado.puntosCanjeados} puntos canjeados).`;
      } else {
        req.session.mensajeExito = `¡Compra exitosa! Pedido #${resultado.id_pedido} pagado. ${
          resultado.puntosCanjeados > 0 ? `Canjeaste ${resultado.puntosCanjeados} pts. ` : ''
        }Ganaste ${resultado.puntosGanados} puntos de fidelización.`;
      }

      return res.redirect('/cuenta/pedidos');
    } catch (error) {
      console.error('Error al procesar checkout:', error);
      res.status(500).render('errors/500', { titulo: 'Error del servidor' });
    }
  }
}

module.exports = CarritoController;