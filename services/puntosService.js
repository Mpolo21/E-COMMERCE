/**
 * Archivo: services/puntosService.js
 * Propósito: Servicio centralizado y transaccional para el manejo de puntos de fidelización (Ajuste 4).
 */
const { configPuntos } = require('../config/puntos');

class PuntosService {
  /**
   * Calcula los puntos ganados sobre el total efectivamente pagado en dinero.
   */
  static calcularPuntosGanados(totalPagado) {
    const monto = Number(totalPagado) || 0;
    if (monto <= 0) return 0;
    return Math.floor(monto / configPuntos.copPorPuntoGanado);
  }

  /**
   * Calcula cuántos puntos máximos puede usar un cliente y el descuento en COP equivalente.
   * Nunca supera el subtotal del pedido ni el saldo disponible del cliente.
   */
  static calcularDescuentoMaximo(subtotal, saldoPuntos) {
    const sub = Math.max(0, Number(subtotal) || 0);
    const saldo = Math.max(0, Math.floor(Number(saldoPuntos) || 0));

    if (saldo < configPuntos.minPuntosCanje || sub === 0) {
      return { puntosMaximos: 0, descuentoMaximoCop: 0 };
    }

    // Puntos necesarios para cubrir el 100% del subtotal
    const puntosParaCubrirSubtotal = Math.floor(sub / configPuntos.valorPuntoCop);
    const puntosMaximos = Math.min(saldo, puntosParaCubrirSubtotal);
    const descuentoMaximoCop = puntosMaximos * configPuntos.valorPuntoCop;

    return { puntosMaximos, descuentoMaximoCop };
  }

  /**
   * Canjea puntos dentro de una transacción activa.
   * Bloquea el usuario con FOR UPDATE para evitar doble gasto en pestañas paralelas.
   */
  static async canjearPuntos(conn, idUsuario, idPedido, puntosACanjear, subtotalPedido) {
    const puntos = Number(puntosACanjear);

    if (!Number.isInteger(puntos) || puntos < 0) {
      throw new Error('La cantidad de puntos a canjear debe ser un número entero positivo.');
    }

    if (puntos === 0) {
      return { puntosCanjeados: 0, descuentoCop: 0, saldoResultante: null };
    }

    if (puntos < configPuntos.minPuntosCanje) {
      throw new Error(`El mínimo requerido para canjear es de ${configPuntos.minPuntosCanje} puntos.`);
    }

    const [userRows] = await conn.query(
      'SELECT puntos_fidelizacion FROM usuarios WHERE id_usuario = ? FOR UPDATE',
      [idUsuario]
    );

    if (userRows.length === 0) {
      throw new Error('Usuario no encontrado para aplicar el canje de puntos.');
    }

    const saldoActual = Number(userRows[0].puntos_fidelizacion) || 0;
    if (puntos > saldoActual) {
      throw new Error(`No tienes suficientes puntos disponibles. Saldo actual: ${saldoActual} puntos.`);
    }

    const { puntosMaximos } = PuntosService.calcularDescuentoMaximo(subtotalPedido, saldoActual);
    if (puntos > puntosMaximos) {
      throw new Error(`Solo puedes usar hasta ${puntosMaximos} puntos para cubrir este pedido.`);
    }

    const descuentoCop = puntos * configPuntos.valorPuntoCop;
    const nuevoSaldo = saldoActual - puntos;

    await conn.query(
      'UPDATE usuarios SET puntos_fidelizacion = ? WHERE id_usuario = ?',
      [nuevoSaldo, idUsuario]
    );

    await conn.query(
      `INSERT INTO movimientos_puntos (id_usuario, id_pedido, tipo, puntos, saldo_resultante, descripcion)
       VALUES (?, ?, 'CANJEADO', ?, ?, ?)`,
      [
        idUsuario,
        idPedido,
        -puntos,
        nuevoSaldo,
        `Canje de ${puntos} puntos (descuento de $${descuentoCop.toLocaleString('es-CO')} COP) en Pedido #${idPedido}`
      ]
    );

    return { puntosCanjeados: puntos, descuentoCop, saldoResultante: nuevoSaldo };
  }

  /**
   * Otorga puntos sobre el total realmente pagado.
   * Evita duplicados verificando que puntos_ganados del pedido sea 0.
   */
  static async otorgarPuntos(conn, idUsuario, idPedido, totalPagado) {
    const [pedRows] = await conn.query(
      'SELECT puntos_ganados FROM pedidos WHERE id_pedido = ? FOR UPDATE',
      [idPedido]
    );

    if (pedRows.length === 0) {
      throw new Error('El pedido especificado no existe.');
    }

    // Evitar doble otorgamiento
    if (Number(pedRows[0].puntos_ganados) > 0) {
      return 0;
    }

    const puntosGanados = PuntosService.calcularPuntosGanados(totalPagado);
    if (puntosGanados <= 0) {
      return 0;
    }

    const [userRows] = await conn.query(
      'SELECT puntos_fidelizacion FROM usuarios WHERE id_usuario = ? FOR UPDATE',
      [idUsuario]
    );
    const saldoActual = Number(userRows[0].puntos_fidelizacion) || 0;
    const nuevoSaldo = saldoActual + puntosGanados;

    await conn.query(
      'UPDATE usuarios SET puntos_fidelizacion = ? WHERE id_usuario = ?',
      [nuevoSaldo, idUsuario]
    );

    await conn.query(
      'UPDATE pedidos SET puntos_ganados = ? WHERE id_pedido = ?',
      [puntosGanados, idPedido]
    );

    await conn.query(
      `INSERT INTO movimientos_puntos (id_usuario, id_pedido, tipo, puntos, saldo_resultante, descripcion)
       VALUES (?, ?, 'GANADO', ?, ?, ?)`,
      [
        idUsuario,
        idPedido,
        puntosGanados,
        nuevoSaldo,
        `Puntos ganados por pago confirmado de Pedido #${idPedido}`
      ]
    );

    return puntosGanados;
  }

  /**
   * Devuelve al cliente los puntos que había canjeado en un pedido si este se cancela.
   */
  static async devolverPuntos(conn, idPedido) {
    const [pedRows] = await conn.query(
      'SELECT id_cliente, puntos_canjeados FROM pedidos WHERE id_pedido = ? FOR UPDATE',
      [idPedido]
    );
    if (pedRows.length === 0) return 0;

    const { id_cliente, puntos_canjeados } = pedRows[0];
    const puntos = Number(puntos_canjeados) || 0;
    if (puntos <= 0) return 0;

    // Verificar que no se hayan devuelto antes para este pedido
    const [movExistente] = await conn.query(
      "SELECT id_movimiento FROM movimientos_puntos WHERE id_pedido = ? AND tipo = 'DEVUELTO'",
      [idPedido]
    );
    if (movExistente.length > 0) return 0;

    const [userRows] = await conn.query(
      'SELECT puntos_fidelizacion FROM usuarios WHERE id_usuario = ? FOR UPDATE',
      [id_cliente]
    );
    const saldoActual = Number(userRows[0].puntos_fidelizacion) || 0;
    const nuevoSaldo = saldoActual + puntos;

    await conn.query(
      'UPDATE usuarios SET puntos_fidelizacion = ? WHERE id_usuario = ?',
      [nuevoSaldo, id_cliente]
    );

    await conn.query(
      `INSERT INTO movimientos_puntos (id_usuario, id_pedido, tipo, puntos, saldo_resultante, descripcion)
       VALUES (?, ?, 'DEVUELTO', ?, ?, ?)`,
      [
        id_cliente,
        idPedido,
        puntos,
        nuevoSaldo,
        `Devolución de puntos canjeados por cancelación del Pedido #${idPedido}`
      ]
    );

    return puntos;
  }

  /**
   * Revierte los puntos ganados en un pedido cuando se cancela, sin dejar el saldo negativo.
   */
  static async revertirPuntosGanados(conn, idPedido) {
    const [pedRows] = await conn.query(
      'SELECT id_cliente, puntos_ganados FROM pedidos WHERE id_pedido = ? FOR UPDATE',
      [idPedido]
    );
    if (pedRows.length === 0) return 0;

    const { id_cliente, puntos_ganados } = pedRows[0];
    const puntosGanadosOriginales = Number(puntos_ganados) || 0;
    if (puntosGanadosOriginales <= 0) return 0;

    const [movExistente] = await conn.query(
      "SELECT id_movimiento FROM movimientos_puntos WHERE id_pedido = ? AND tipo = 'REVERTIDO'",
      [idPedido]
    );
    if (movExistente.length > 0) return 0;

    const [userRows] = await conn.query(
      'SELECT puntos_fidelizacion FROM usuarios WHERE id_usuario = ? FOR UPDATE',
      [id_cliente]
    );
    const saldoActual = Number(userRows[0].puntos_fidelizacion) || 0;

    const puntosARestar = Math.min(saldoActual, puntosGanadosOriginales);
    const nuevoSaldo = saldoActual - puntosARestar;

    let descripcion = `Reversión de puntos ganados por cancelación del Pedido #${idPedido}`;
    if (puntosARestar < puntosGanadosOriginales) {
      descripcion += ` (Ajustado a 0: el cliente ya había utilizado ${puntosGanadosOriginales - puntosARestar} pts)`;
    }

    await conn.query(
      'UPDATE usuarios SET puntos_fidelizacion = ? WHERE id_usuario = ?',
      [nuevoSaldo, id_cliente]
    );

    await conn.query(
      `INSERT INTO movimientos_puntos (id_usuario, id_pedido, tipo, puntos, saldo_resultante, descripcion)
       VALUES (?, ?, 'REVERTIDO', ?, ?, ?)`,
      [id_cliente, idPedido, -puntosARestar, nuevoSaldo, descripcion]
    );

    return puntosARestar;
  }

  /**
   * Permite al Administrador sumar o restar puntos manualmente con motivo obligatorio.
   */
  static async ajusteManualAdmin(conn, idUsuario, cambioPuntos, motivo) {
    const delta = parseInt(cambioPuntos, 10);
    if (!Number.isInteger(delta) || delta === 0) {
      throw new Error('El ajuste de puntos debe ser un número entero distinto de cero.');
    }
    if (!motivo || !motivo.trim()) {
      throw new Error('Debes especificar un motivo obligatorio para el ajuste manual.');
    }

    const [userRows] = await conn.query(
      'SELECT puntos_fidelizacion FROM usuarios WHERE id_usuario = ? FOR UPDATE',
      [idUsuario]
    );
    if (userRows.length === 0) {
      throw new Error('El cliente indicado no existe.');
    }

    const saldoActual = Number(userRows[0].puntos_fidelizacion) || 0;
    if (saldoActual + delta < 0) {
      throw new Error(`El ajuste dejaría al cliente con saldo negativo (Saldo actual: ${saldoActual} pts).`);
    }

    const nuevoSaldo = saldoActual + delta;

    await conn.query(
      'UPDATE usuarios SET puntos_fidelizacion = ? WHERE id_usuario = ?',
      [nuevoSaldo, idUsuario]
    );

    await conn.query(
      `INSERT INTO movimientos_puntos (id_usuario, id_pedido, tipo, puntos, saldo_resultante, descripcion)
       VALUES (?, NULL, 'AJUSTE_ADMIN', ?, ?, ?)`,
      [idUsuario, delta, nuevoSaldo, `Ajuste Admin: ${motivo.trim()}`]
    );

    return nuevoSaldo;
  }
}

module.exports = PuntosService;