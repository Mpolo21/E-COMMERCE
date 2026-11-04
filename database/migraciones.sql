-- ============================================================================
-- ARCHIVO: database/migraciones.sql
-- PROPÓSITO: Aplicar mejoras estructurales, restricciones de integridad e
--            índices de rendimiento sobre el esquema base (ecommerce_ropa).
-- ============================================================================

USE ecommerce_ropa;

-- 1. Evitar filas duplicadas de una misma combinación (producto + talla + color) en inventario
ALTER TABLE inventario
  ADD CONSTRAINT uq_inventario_producto_talla_color UNIQUE (id_producto, id_talla, id_color);

-- 2. Agregar dirección de entrega en la tabla pedidos para el flujo de checkout (CU01.5)
ALTER TABLE pedidos
  ADD COLUMN direccion_entrega VARCHAR(255) NOT NULL DEFAULT 'Sin dirección especificada';

-- 3. Agregar estado de la compra en la tabla compras para consulta del rol Proveedor (CU03)
-- Valores manejados: 'Solicitada', 'Recibida', 'Cancelada'
ALTER TABLE compras
  ADD COLUMN estado_compra VARCHAR(50) NOT NULL DEFAULT 'Solicitada';

-- 4. Vincular usuarios de rol Proveedor con su entidad en la tabla proveedores (CU03)
ALTER TABLE usuarios
  ADD COLUMN id_proveedor INT NULL,
  ADD CONSTRAINT fk_usuarios_proveedor
    FOREIGN KEY (id_proveedor) REFERENCES proveedores(id_proveedor)
    ON DELETE SET NULL ON UPDATE CASCADE;

-- 4.1 Evitar marcas duplicadas a nivel de base de datos (CU02.5)
ALTER TABLE marcas
  ADD CONSTRAINT uq_marcas_nombre UNIQUE (nombre_marca);

-- 5. Creación de índices en llaves foráneas y columnas frecuentemente filtradas/ordenadas
CREATE INDEX idx_productos_categoria ON productos(id_categoria);
CREATE INDEX idx_productos_marca ON productos(id_marca);
CREATE INDEX idx_productos_temporada ON productos(id_temporada);
CREATE INDEX idx_productos_proveedor ON productos(id_proveedor);
CREATE INDEX idx_productos_prioridad ON productos(prioridad_visual DESC);

CREATE INDEX idx_inventario_producto ON inventario(id_producto);
CREATE INDEX idx_inventario_talla ON inventario(id_talla);
CREATE INDEX idx_inventario_color ON inventario(id_color);

CREATE INDEX idx_pedidos_cliente ON pedidos(id_cliente);
CREATE INDEX idx_pedidos_estado ON pedidos(estado_pedido);
CREATE INDEX idx_pedidos_fecha ON pedidos(fecha_pedido);

CREATE INDEX idx_entregas_pedido ON entregas(id_pedido);
CREATE INDEX idx_entregas_estado ON entregas(estado_entrega);

CREATE INDEX idx_compras_proveedor ON compras(id_proveedor);

-- ============================================================================
-- NOTAS DOCUMENTALES DE REGLAS DE NEGOCIO (Implementadas en la capa de Servicios/Controladores):
--
-- 6. Fórmula del Costo Promedio Ponderado al registrar compras a proveedores:
--    nuevo_costo = (stock_actual * costo_actual + cant_compra * precio_compra) / (stock_actual + cant_compra)
--    Donde stock_actual = SUM(cantidad_stock) del producto en todas sus tallas y colores antes de sumar la compra.
--
-- 7. Regla de Puntos de Fidelización:
--    puntos_ganados = FLOOR(total_pedido / COP_POR_PUNTO)
--    Donde COP_POR_PUNTO se parametriza en .env (por defecto 1000 COP = 1 punto).
-- ============================================================================