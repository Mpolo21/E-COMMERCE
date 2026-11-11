-- ============================================================================
-- ARCHIVO: database/actualizacion_reportes.sql
-- PROPÓSITO: Índices para optimizar filtros, fechas y joins en reportes (Actualización 1.3).
-- ============================================================================

USE ecommerce_ropa;

CREATE INDEX idx_pedidos_fecha_estado ON pedidos(fecha_pedido, estado_pedido);
CREATE INDEX idx_pedidos_cliente_estado ON pedidos(id_cliente, estado_pedido);
CREATE INDEX idx_productos_temporada_categoria ON productos(id_temporada, id_categoria);
CREATE INDEX idx_detalles_pedido_producto ON detalles_pedido(id_producto);
CREATE INDEX idx_entregas_estado ON entregas(estado_entrega);
CREATE INDEX idx_inventario_stock ON inventario(cantidad_stock);