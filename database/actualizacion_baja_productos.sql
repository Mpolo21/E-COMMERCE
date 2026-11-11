-- ============================================================================
-- ARCHIVO: database/actualizacion_baja_productos.sql
-- PROPÓSITO: Migración para Actualización 2 (Baja lógica, auditoría y vista balance).
-- ============================================================================

USE ecommerce_ropa;

-- 1. Agregar columnas de auditoría de baja a la tabla productos
ALTER TABLE productos
  ADD COLUMN fecha_baja DATETIME NULL DEFAULT NULL AFTER estado,
  ADD COLUMN motivo_baja VARCHAR(255) NULL DEFAULT NULL AFTER fecha_baja;

-- 2. Crear índice sobre productos.estado para acelerar filtros de catálogo e inventario
CREATE INDEX idx_productos_estado ON productos(estado);

-- 3. Actualizar vista_balance_prendas para incluir estado, categoría y temporada
CREATE OR REPLACE VIEW vista_balance_prendas AS
SELECT 
    p.id_producto,
    p.nombre_producto,
    p.estado,
    p.id_categoria,
    c.nombre_categoria,
    p.id_temporada,
    t.nombre_temporada,
    p.precio AS precio_venta_actual,
    p.costo_promedio_ponderado,
    COALESCE(comp.unidades_compradas, 0) AS unidades_compradas,
    COALESCE(comp.dinero_invertido, 0.00) AS dinero_invertido,
    COALESCE(vent.unidades_vendidas, 0) AS unidades_vendidas,
    COALESCE(vent.dinero_ingresado, 0.00) AS dinero_ingresado,
    (COALESCE(vent.dinero_ingresado, 0.00) - COALESCE(comp.dinero_invertido, 0.00)) AS balance_ganancia_perdida
FROM productos p
JOIN categorias c ON p.id_categoria = c.id_categoria
JOIN temporadas t ON p.id_temporada = t.id_temporada
LEFT JOIN (
    SELECT 
        dc.id_producto,
        SUM(dc.cantidad) AS unidades_compradas,
        SUM(dc.cantidad * dc.precio_compra_unitario) AS dinero_invertido
    FROM detalles_compra dc
    INNER JOIN compras co ON dc.id_compra = co.id_compra
    WHERE co.estado_compra = 'Recibida'
    GROUP BY dc.id_producto
) comp ON p.id_producto = comp.id_producto
LEFT JOIN (
    SELECT 
        dp.id_producto,
        SUM(dp.cantidad) AS unidades_vendidas,
        SUM(dp.cantidad * dp.precio_unitario) AS dinero_ingresado
    FROM detalles_pedido dp
    INNER JOIN pedidos pe ON dp.id_pedido = pe.id_pedido
    WHERE pe.estado_pedido != 'Cancelado'
    GROUP BY dp.id_producto
) vent ON p.id_producto = vent.id_producto;