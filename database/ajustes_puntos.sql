-- ============================================================================
-- ARCHIVO: database/ajustes_puntos.sql
-- PROPÓSITO: Migración para el Ajuste 1 (Contraentrega) y Ajuste 4 (Puntos como descuento).
-- ============================================================================

USE ecommerce_ropa;

-- 1. Agregar columnas de desglose financiero y puntos a la tabla pedidos
ALTER TABLE pedidos
  ADD COLUMN subtotal DECIMAL(10,2) NOT NULL DEFAULT 0.00 AFTER id_metodo_pago,
  ADD COLUMN puntos_canjeados INT NOT NULL DEFAULT 0 AFTER subtotal,
  ADD COLUMN descuento_puntos DECIMAL(10,2) NOT NULL DEFAULT 0.00 AFTER puntos_canjeados,
  ADD COLUMN puntos_ganados INT NOT NULL DEFAULT 0 AFTER total;

-- 2. Para pedidos antiguos ya registrados, igualar subtotal = total
UPDATE pedidos SET subtotal = total WHERE subtotal = 0;

-- 3. Crear tabla de auditoría e historial de puntos (movimientos_puntos)
CREATE TABLE IF NOT EXISTS movimientos_puntos (
  id_movimiento INT AUTO_INCREMENT PRIMARY KEY,
  id_usuario INT NOT NULL,
  id_pedido INT NULL,
  tipo ENUM('GANADO','CANJEADO','DEVUELTO','REVERTIDO','AJUSTE_ADMIN') NOT NULL,
  puntos INT NOT NULL COMMENT 'Positivo suma, negativo resta',
  saldo_resultante INT NOT NULL,
  descripcion VARCHAR(255) NOT NULL,
  fecha DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (id_usuario) REFERENCES usuarios(id_usuario) ON DELETE CASCADE,
  FOREIGN KEY (id_pedido) REFERENCES pedidos(id_pedido) ON DELETE SET NULL
);

CREATE INDEX idx_movimientos_usuario ON movimientos_puntos(id_usuario, fecha DESC);
CREATE INDEX idx_movimientos_pedido ON movimientos_puntos(id_pedido);

-- 4. Asegurar que puntos_fidelizacion nunca sea negativo
ALTER TABLE usuarios
  ADD CONSTRAINT chk_puntos_no_negativos CHECK (puntos_fidelizacion >= 0);

-- 5. Asegurar método de pago interno para pedidos cubiertos al 100% con puntos ($0 a pagar)
INSERT INTO metodos_pago (nombre_metodo, estado)
SELECT 'Puntos de Fidelización', TRUE
FROM DUAL
WHERE NOT EXISTS (
  SELECT 1 FROM metodos_pago WHERE LOWER(nombre_metodo) LIKE '%puntos de fidelizaci%'
);

-- 6. Conciliar saldos existentes ("decorativos") creando su movimiento inicial AJUSTE_ADMIN
INSERT INTO movimientos_puntos (id_usuario, id_pedido, tipo, puntos, saldo_resultante, descripcion)
SELECT u.id_usuario, NULL, 'AJUSTE_ADMIN', u.puntos_fidelizacion, u.puntos_fidelizacion, 'Saldo inicial migrado al nuevo sistema de puntos'
FROM usuarios u
WHERE u.puntos_fidelizacion > 0
  AND NOT EXISTS (
    SELECT 1 FROM movimientos_puntos mp WHERE mp.id_usuario = u.id_usuario
  );