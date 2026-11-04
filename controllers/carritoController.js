/**
 * Archivo: controllers/carritoController.js
 * Propósito: Gestionar el carrito de compras y la ejecución del checkout (CU01.2 y CU01.5).
 */
const CarritoModel = require('../models/carritoModel');

class CarritoController {
  static async agregarAlCarrito(req, res) {
    try {
      const { id_inventario, cantidad } = req.body;
      const cantNum = parseInt(cantidad) || 1;

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

      // Verificar si ya existe en el carrito
      const index = req.session.carrito.findIndex(i => i.id_inventario == id_inventario);
      if (index > -1) {
        const nuevaCantidad = req.session.carrito[index].cantidad + cantNum;
        if (itemInv.cantidad_stock < nuevaCantidad) {
          req.session.mensajeError = 'No puedes agregar más unidades que el stock disponible.';
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
    const subtotal = carrito.reduce((acc, item) => acc + (item.precio * item.cantidad), 0);

    res.render('cliente/carrito', {
      titulo: 'Carrito de Compras - PIJIC',
      carrito,
      subtotal,
      total: subtotal
    });
  }

  static modificarCantidad(req, res) {
    const { id_inventario, accion } = req.body;
    if (!req.session.carrito) return res.redirect('/carrito');

    const index = req.session.carrito.findIndex(i => i.id_inventario == id_inventario);
    if (index > -1) {
      if (accion === 'aumentar') {
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
  }

  static async mostrarCheckout(req, res) {
    try {
      const carrito = req.session.carrito || [];
      if (carrito.length === 0) {
        req.session.mensajeError = 'Tu carrito está vacío.';
        return res.redirect('/catalogo');
      }

      const metodosPago = await CarritoModel.obtenerMetodosPagoActivos();
      const subtotal = carrito.reduce((acc, item) => acc + (item.precio * item.cantidad), 0);

      res.render('cliente/checkout', {
        titulo: 'Finalizar Compra (Checkout) - PIJIC',
        carrito,
        subtotal,
        total: subtotal,
        metodosPago
      });
    } catch (error) {
      console.error('Error al mostrar checkout:', error);
      res.status(500).render('errors/500', { titulo: 'Error del servidor' });
    }
  }

  static async procesarCheckout(req, res) {
    try {
      const { direccion_entrega, id_metodo_pago } = req.body;
      const carrito = req.session.carrito || [];

      if (carrito.length === 0) {
        req.session.mensajeError = 'El carrito está vacío.';
        return res.redirect('/catalogo');
      }

      const totalCompra = carrito.reduce((acc, item) => acc + (item.precio * item.cantidad), 0);
      const copPorPunto = parseInt(process.env.COP_POR_PUNTO) || 1000;

      const resultado = await CarritoModel.procesarCheckoutTransaccional({
        id_cliente: req.session.usuario.id_usuario,
        direccion_entrega,
        id_metodo_pago,
        carritoItems: carrito,
        totalCompra,
        copPorPunto
      });

      if (!resultado.success) {
        req.session.mensajeError = `Error en la compra: ${resultado.mensaje}`;
        return res.redirect('/carrito');
      }

      // Vaciar carrito tras compra exitosa
      req.session.carrito = [];
      req.session.mensajeExito = `¡Compra realizada con éxito! Pedido #${resultado.id_pedido} creado. Ganaste ${resultado.puntosGanados} puntos de fidelización.`;
      return res.redirect('/cuenta/pedidos');

    } catch (error) {
      console.error('Error al procesar checkout:', error);
      res.status(500).render('errors/500', { titulo: 'Error del servidor' });
    }
  }
}

module.exports = CarritoController;