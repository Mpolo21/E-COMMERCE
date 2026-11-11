/**
 * Archivo: config/puntos.js
 * Propósito: Parámetros configurables para acumulación y canje de puntos de fidelización (Ajuste 4).
 */
require('dotenv').config();

const configPuntos = {
  copPorPuntoGanado: Math.max(1, parseInt(process.env.COP_POR_PUNTO_GANADO, 10) || 100),
  valorPuntoCop: Math.max(1, parseInt(process.env.VALOR_PUNTO_COP, 10) || 1),
  minPuntosCanje: Math.max(0, parseInt(process.env.MIN_PUNTOS_CANJE, 10) || 0)
};

module.exports = {
  configPuntos
};