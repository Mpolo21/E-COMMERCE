/**
 * Archivo: models/carritoModel.js
 * Propósito: Gestionar inventario y transacciones de checkout con puntos y contraentrega (Ajustes 1 y 4).
 */
const { pool } = require('../config/db');
const PuntosService = require('../services/puntosService');

class CarritoModel {
  static async obtenerItemInventario(id_inventario) {
    const [rows] = await pool.query(
      `SELECT i.*, p.nombre_producto, p.precio, p.id_proveedor, 
              t.nombre_talla, col.nombre_color 
       FROM inventario i
       JOIN productos p ON i.id_producto = p.id_producto
       JOIN tallas t ON i.id_talla = t.id_talla
       JOIN colores col ON i.id_color = col.id_color
       WHERE i.id_inventario = ? AND p.estado = TRUE`,
      [id_inventario]
    );
    return rows[0];
  }

  static async obtenerMetodosPagoActivos() {
    // Excluimos el método interno 'Puntos de Fidelización' del selector manual si el total > 0
    const [rows] = await pool.query(
      `SELECT * FROM metodos_pago 
       WHERE estado = TRUE AND LOWER(nombre_metodo) NOT LIKE '%puntos de fidelizaci%'
       ORDER BY id_metodo ASC`
    );
    return rows;
  }

  static async obtenerSaldoUsuario(id_usuario) {
    const [rows] = await pool.query(
      'SELECT puntos_fidelizacion, direccion FROM usuarios WHERE id_usuario = ?',
      [id_usuario]
    );
    return rows[0] || { puntos_fidelizacion: 0, direccion: '' };
  }

  static async procesarCheckoutTransaccional({ id_cliente, direccion_entrega, id_metodo_pago, carritoItems, puntosACanjear }) {
    const connection = await pool.getConnection();
    try {
      await connection.beginTransaction();

      // 1. Validar stock en tiempo real, obtener precio oficial de BD y descontar inventario
      let subtotalCalculadoBD = 0;
      const itemsValidados = [];

      for (const item of carritoItems) {
        const [invRows] = await connection.query(
          `SELECT i.id_inventario, i.id_producto, i.id_talla, i.id_color, i.cantidad_stock,
                  p.nombre_producto, p.precio, t.nombre_talla, col.nombre_color
           FROM inventario i
           JOIN productos p ON i.id_producto = p.id_producto
           JOIN tallas t ON i.id_talla = t.id_talla
           JOIN colores col ON i.id_color = col.id_color
           WHERE i.id_inventario = ? AND p.estado = TRUE
           FOR UPDATE`,
          [item.id_inventario]
        );

        const cantidadSolicitada = parseInt(item.cantidad, 10);
        if (!Number.isInteger(cantidadSolicitada) || cantidadSolicitada <= 0) {
          throw new Error('Cantidad de producto inválida en el carrito.');
        }

        if (invRows.length === 0 || invRows[0].cantidad_stock < cantidadSolicitada) {
          throw new Error(
            `Stock insuficiente para "${item.nombre_producto}" (Talla: ${item.nombre_talla}, Color: ${item.nombre_color}).`
          );
        }

        const prodBD = invRows[0];
        const precioUnitarioReal = Number(prodBD.precio);
        subtotalCalculadoBD += precioUnitarioReal * cantidadSolicitada;

        await connection.query(
          'UPDATE inventario SET cantidad_stock = cantidad_stock - ? WHERE id_inventario = ?',
          [cantidadSolicitada, prodBD.id_inventario]
        );

        itemsValidados.push({
          id_producto: prodBD.id_producto,
          id_talla: prodBD.id_talla,
          id_color: prodBD.id_color,
          cantidad: cantidadSolicitada,
          precio_unitario: precioUnitarioReal
        });
      }

      // 2. Validar puntos solicitados (entero >= 0)
      const puntosSolicitados = Number(puntosACanjear || 0);
      if (!Number.isInteger(puntosSolicitados) || puntosSolicitados < 0) {
        throw new Error('La cantidad de puntos a canjear no es válida.');
      }

      // Bloquear fila del usuario y verificar saldo antes de insertar pedido
      const [userLock] = await connection.query(
        'SELECT puntos_fidelizacion FROM usuarios WHERE id_usuario = ? FOR UPDATE',
        [id_cliente]
      );
      if (userLock.length === 0) {
        throw new Error('Cliente no encontrado.');
      }
      const saldoActual = Number(userLock[0].puntos_fidelizacion) || 0;
      if (puntosSolicitados > saldoActual) {
        throw new Error(`Intentaste canjear ${puntosSolicitados} puntos, pero tu saldo disponible es de ${saldoActual} puntos.`);
      }

      const { puntosMaximos, descuentoMaximoCop } = PuntosService.calcularDescuentoMaximo(subtotalCalculadoBD, saldoActual);
      if (puntosSolicitados > puntosMaximos) {
        throw new Error(`El máximo de puntos aplicables para cubrir este pedido es de ${puntosMaximos} puntos.`);
      }

      const descuentoAplicado = puntosSolicitados > 0
        ? Math.min(descuentoMaximoCop, puntosSolicitados * (descuentoMaximoCop / (puntosMaximos || 1)))
        : 0;
      const totalAPagar = Math.max(0, subtotalCalculadoBD - descuentoAplicado);

      // 3. Determinar método de pago y estado_pedido inicial (Ajuste 1 y Ajuste 4.3)
      let idMetodoFinal = id_metodo_pago;
      let estadoPedidoInicial = 'Pagado';
      let esContraentrega = false;

      if (totalAPagar === 0) {
        // Cubierto al 100% con puntos: usar método 'Puntos de Fidelización' y marcar Pagado
        const [metodoPuntos] = await connection.query(
          "SELECT id_metodo FROM metodos_pago WHERE LOWER(nombre_metodo) LIKE '%puntos de fidelizaci%' LIMIT 1"
        );
        if (metodoPuntos.length > 0) {
          idMetodoFinal = metodoPuntos[0].id_metodo;
        }
        estadoPedidoInicial = 'Pagado';
      } else {
        // Total > 0: validar que el método elegido exista y esté activo
        const [metodoRows] = await connection.query(
          'SELECT id_metodo, nombre_metodo FROM metodos_pago WHERE id_metodo = ? AND estado = TRUE',
          [id_metodo_pago]
        );
        if (metodoRows.length === 0) {
          throw new Error('Debes seleccionar un método de pago válido y activo.');
        }

        const nombreMetodo = metodoRows[0].nombre_metodo.toLowerCase();
        if (nombreMetodo.includes('contraentrega')) {
          esContraentrega = true;
          estadoPedidoInicial = 'Debiendo'; // Ajuste 1: nunca se marca como pagado al crear
        } else {
          estadoPedidoInicial = 'Pagado';
        }
      }

      // 4. Insertar registro del pedido con subtotal, puntos_canjeados, descuento_puntos y total
      const [pedidoResult] = await connection.query(
        `INSERT INTO pedidos 
          (id_cliente, id_metodo_pago, subtotal, puntos_canjeados, descuento_puntos, total, puntos_ganados, estado_pedido, direccion_entrega)
         VALUES (?, ?, ?, ?, ?, ?, 0, ?, ?)`,
        [
          id_cliente,
          idMetodoFinal,
          subtotalCalculadoBD,
          puntosSolicitados,
          descuentoAplicado,
          totalAPagar,
          estadoPedidoInicial,
          direccion_entrega.trim()
        ]
      );
      const id_pedido = pedidoResult.insertId;

      // 5. Insertar detalles del pedido
      for (const det of itemsValidados) {
        await connection.query(
          `INSERT INTO detalles_pedido (id_pedido, id_producto, id_talla, id_color, cantidad, precio_unitario)
           VALUES (?, ?, ?, ?, ?, ?)`,
          [id_pedido, det.id_producto, det.id_talla, det.id_color, det.cantidad, det.precio_unitario]
        );
      }

      // 6. Ejecutar canje de puntos y registrar movimiento CANJEADO (si puntosSolicitados > 0)
      if (puntosSolicitados > 0) {
        await PuntosService.canjearPuntos(
          connection,
          id_cliente,
          id_pedido,
          puntosSolicitados,
          subtotalCalculadoBD
        );
      }

      // 7. Otorgar puntos ganados SOLO si el pedido quedó Pagado al instante y totalAPagar > 0
      let puntosGanados = 0;
      if (estadoPedidoInicial === 'Pagado' && totalAPagar > 0) {
        puntosGanados = await PuntosService.otorgarPuntos(
          connection,
          id_cliente,
          id_pedido,
          totalAPagar
        );
      }

      // 8. Crear entrega en estado "En preparación"
      await connection.query(
        `INSERT INTO entregas (id_pedido, tipo_entrega, zona_cobertura, id_transportadora, estado_entrega)
         VALUES (?, 'Propia', TRUE, NULL, 'En preparación')`,
        [id_pedido]
      );

      await connection.commit();
      connection.release();

      return {
        success: true,
        id_pedido,
        estadoPedidoInicial,
        esContraentrega,
        puntosCanjeados: puntosSolicitados,
        descuentoAplicado,
        totalAPagar,
        puntosGanados
      };
    } catch (error) {
      await connection.rollback();
      connection.release();
      return { success: false, mensaje: error.message };
    }
  }
}

module.exports = CarritoModel;