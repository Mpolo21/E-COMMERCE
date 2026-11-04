-- ============================================================================
-- ARCHIVO: database/seed.sql
-- PROPÓSITO: Datos semilla para pruebas integrales de todos los módulos y consultas
-- NOTA DE ACCESO: La contraseña para TODOS los usuarios de prueba es: password
-- Hash bcrypt ($2b$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi)
-- ============================================================================

USE ecommerce_ropa;

-- 1. ROLES
INSERT INTO roles (id_rol, nombre_rol) VALUES
(1, 'Administrador'),
(2, 'Cliente'),
(3, 'Proveedor');

-- 2. PROVEEDORES
INSERT INTO proveedores (id_proveedor, nombre_proveedor, telefono, correo) VALUES
(1, 'Textiles Urabá S.A.S.', '3104567890', 'ventas@textilesuraba.com'),
(2, 'Confecciones Antioquia Ltda.', '3119876543', 'contacto@confeccionesantioquia.co'),
(3, 'Importadora Calzado & Cuero Medellín', '3001112233', 'pedidos@calzadomedellin.com');

-- 3. USUARIOS (Contraseña para todos: password)
INSERT INTO usuarios (id_usuario, nombre, correo, contrasena, direccion, puntos_fidelizacion, id_rol, id_proveedor) VALUES
(1, 'Carlos Administrador', 'admin@pijic.edu.co', '$2b$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', 'Calle 100 # 95-20 Barrio Ortiz, Apartadó', 0, 1, NULL),
(2, 'Juan Pérez (Cliente)', 'cliente@pijic.edu.co', '$2b$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', 'Carrera 103 # 98-15 Barrio Vélez, Apartadó', 340, 2, NULL),
(3, 'Andrés Gómez (Cliente Multitemporada)', 'andres.gomez@correo.com', '$2b$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', 'Calle 45 # 70-12, Medellín', 520, 2, NULL),
(4, 'Representante Textiles Urabá', 'proveedor@textilesuraba.com', '$2b$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', 'Zona Industrial Apartadó Bodega 4', 0, 3, 1),
(5, 'Representante Confecciones Antioquia', 'proveedor@confeccionesantioquia.co', '$2b$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', 'Itagüí, Antioquia', 0, 3, 2);

-- 4. CATEGORÍAS (5 obligatorias)
INSERT INTO categorias (id_categoria, nombre_categoria) VALUES
(1, 'Camisas'),
(2, 'Pantalones'),
(3, 'Chaquetas'),
(4, 'Calzado'),
(5, 'Accesorios');

-- 5. MARCAS
INSERT INTO marcas (id_marca, nombre_marca, estado) VALUES
(1, 'Arturo Calle', TRUE),
(2, 'Gef Men', TRUE),
(3, 'Koaj Urban', TRUE),
(4, 'Vélez Cuero', TRUE),
(5, 'Patprimo Classic', TRUE);

-- 6. TEMPORADAS
INSERT INTO temporadas (id_temporada, nombre_temporada) VALUES
(1, 'Verano Tropical'),
(2, 'Invierno Urbano'),
(3, 'Colección Formal Ejecutiva'),
(4, 'Colección Casual Fin de Año');

-- 7. TALLAS
INSERT INTO tallas (id_talla, nombre_talla) VALUES
(1, 'S'),
(2, 'M'),
(3, 'L'),
(4, 'XL'),
(5, '32'),
(6, '34'),
(7, '40'),
(8, '42'),
(9, 'Única');

-- 8. COLORES
INSERT INTO colores (id_color, nombre_color) VALUES
(1, 'Blanco'),
(2, 'Negro'),
(3, 'Azul Marino'),
(4, 'Beige'),
(5, 'Verde Oliva'),
(6, 'Café Cuero'),
(7, 'Gris Oxford');

-- 9. MÉTODOS DE PAGO
INSERT INTO metodos_pago (id_metodo, nombre_metodo, estado) VALUES
(1, 'Transferencia PSE / Nequi', TRUE),
(2, 'Tarjeta de Crédito / Débito', TRUE),
(3, 'Pago Contraentrega (Solo Urabá)', TRUE),
(4, 'Bono Empresarial (Inactivo)', FALSE);

-- 10. TRANSPORTADORAS
INSERT INTO transportadoras (id_transportadora, nombre_empresa, telefono, correo) VALUES
(1, 'Servientrega S.A.', '6044441122', 'despachos@servientrega.com'),
(2, 'Inter Rapidísimo', '6043220011', 'corporativo@interrapidisimo.com'),
(3, 'Coordinadora Mercantil', '6042889900', 'clientes@coordinadora.com');

-- 11. PRODUCTOS (15 productos de ropa masculina distribuidos en categorías y temporadas)
INSERT INTO productos (id_producto, nombre_producto, descripcion, precio, id_categoria, id_marca, id_temporada, id_proveedor, estado, prioridad_visual, costo_promedio_ponderado) VALUES
(1, 'Camisa Guayabera Lino Premium', 'Camisa fresca 100% lino ideal para clima cálido húmedo.', 120000.00, 1, 1, 1, 1, TRUE, 100, 65000.00),
(2, 'Camisa Oxford Manga Larga', 'Camisa formal corte slim fit para oficina o eventos.', 110000.00, 1, 5, 3, 2, TRUE, 90, 58000.00),
(3, 'Camiseta Polo Piqué Clásica', 'Polo de algodón transpirable con cuello tejido.', 75000.00, 1, 2, 1, 1, TRUE, 85, 38000.00),
(4, 'Camisa Estampada Verano Caribe', 'Camisa manga corta con diseño botánico discreto.', 85000.00, 1, 3, 1, 1, TRUE, 70, 42000.00),
(5, 'Pantalón Chino Drill Stretch', 'Pantalón casual semi-formal de alta comodidad.', 135000.00, 2, 1, 3, 2, TRUE, 95, 70000.00),
(6, 'Jean Slim Fit Lavado Oscuro', 'Jean masculino clásico de 5 bolsillos resistente.', 140000.00, 2, 3, 4, 2, TRUE, 88, 72000.00),
(7, 'Bermuda Cargo Algodón', 'Bermuda fresca con bolsillos laterales para verano.', 90000.00, 2, 2, 1, 1, TRUE, 75, 45000.00),
(8, 'Pantalón Lino Resort', 'Pantalón ligero de corte recto para eventos en tierra caliente.', 130000.00, 2, 5, 1, 1, TRUE, 65, 68000.00),
(9, 'Chaqueta Rompevientos Impermeable', 'Chaqueta ligera resistente a lluvias intensas.', 180000.00, 3, 3, 2, 2, TRUE, 92, 95000.00),
(10, 'Chaqueta Bomber Casual', 'Chaqueta urbana con cierre metálico y puños acanalados.', 195000.00, 3, 1, 2, 2, TRUE, 80, 105000.00),
(11, 'Blazer Ejecutivo Slim', 'Saco formal masculino para reuniones de negocios.', 280000.00, 3, 1, 3, 2, TRUE, 78, 150000.00),
(12, 'Tenis Urbanos Cuero Blanco', 'Calzado casual versátil con plantilla ortopédica.', 210000.00, 4, 4, 4, 3, TRUE, 98, 115000.00),
(13, 'Mocasines Driver de Cuero', 'Mocasines cosidos a mano ideales para usar sin medias.', 230000.00, 4, 4, 1, 3, TRUE, 82, 125000.00),
(14, 'Cinturón Doble Faz en Cuero', 'Cinturón reversible negro/café con hebilla metálica.', 85000.00, 5, 4, 3, 3, TRUE, 60, 40000.00),
(15, 'Gorra Clásica Bordada', 'Gorra ajustable 100% algodón con visera curva.', 55000.00, 5, 2, 1, 1, TRUE, 50, 25000.00);

-- 12. INVENTARIO (Incluye productos con stock holgado y otros con stock bajo <= 3 para probar alertas)
INSERT INTO inventario (id_producto, id_talla, id_color, cantidad_stock) VALUES
-- Prod 1: Guayabera
(1, 2, 1, 15), -- Talla M, Blanco
(1, 3, 1, 12), -- Talla L, Blanco
(1, 2, 4, 2),  -- Talla M, Beige (STOCK BAJO)
-- Prod 2: Camisa Oxford
(2, 2, 3, 10), -- Talla M, Azul Marino
(2, 3, 1, 8),  -- Talla L, Blanco
-- Prod 3: Polo Piqué
(3, 1, 2, 14), -- Talla S, Negro
(3, 2, 5, 3),  -- Talla M, Verde Oliva (STOCK BAJO)
-- Prod 4: Camisa Estampada
(4, 2, 3, 9),
(4, 3, 3, 7),
-- Prod 5: Pantalón Chino
(5, 5, 4, 11), -- Talla 32, Beige
(5, 6, 3, 9),  -- Talla 34, Azul Marino
-- Prod 6: Jean Slim
(6, 5, 3, 16), -- Talla 32, Azul Marino
(6, 6, 2, 2),  -- Talla 34, Negro (STOCK BAJO)
-- Prod 7: Bermuda Cargo
(7, 5, 5, 10), -- Talla 32, Verde Oliva
-- Prod 8: Pantalón Lino
(8, 5, 1, 6),  -- Talla 32, Blanco
-- Prod 9: Chaqueta Rompevientos
(9, 2, 2, 12), -- Talla M, Negro
(9, 3, 3, 8),  -- Talla L, Azul Marino
-- Prod 10: Chaqueta Bomber
(10, 3, 5, 5), -- Talla L, Verde Oliva
-- Prod 11: Blazer Ejecutivo
(11, 3, 7, 4), -- Talla L, Gris Oxford
-- Prod 12: Tenis Urbanos
(12, 7, 1, 10), -- Talla 40, Blanco
(12, 8, 1, 1),  -- Talla 42, Blanco (STOCK BAJO)
-- Prod 13: Mocasines
(13, 7, 6, 7),  -- Talla 40, Café Cuero
(13, 8, 6, 6),  -- Talla 42, Café Cuero
-- Prod 14: Cinturón
(14, 9, 6, 20), -- Talla Única, Café Cuero
-- Prod 15: Gorra
(15, 9, 2, 18); -- Talla Única, Negro

-- 13. COMPRAS A PROVEEDORES (Para alimentar la vista_balance_prendas y el módulo Proveedor)
INSERT INTO compras (id_compra, id_proveedor, fecha_compra, total_compra, estado_compra) VALUES
(1, 1, '2025-01-15 09:30:00', 2535000.00, 'Recibida'),
(2, 2, '2025-01-20 14:15:00', 3410000.00, 'Recibida'),
(3, 3, '2025-02-01 11:00:00', 2210000.00, 'Solicitada');

INSERT INTO detalles_compra (id_compra, id_producto, id_talla, id_color, cantidad, precio_compra_unitario) VALUES
(1, 1, 2, 1, 20, 65000.00),
(1, 3, 1, 2, 20, 38000.00),
(1, 15, 9, 2, 19, 25000.00),
(2, 5, 5, 4, 15, 70000.00),
(2, 6, 5, 3, 20, 72000.00),
(2, 9, 2, 2, 10, 92000.00),
(3, 12, 7, 1, 12, 115000.00),
(3, 14, 9, 6, 20, 41500.00);

-- 14. PEDIDOS Y ENTREGAS DE PRUEBA (Para alimentar reportes, historial y clientes multitemporada)
INSERT INTO pedidos (id_pedido, id_cliente, fecha_pedido, id_metodo_pago, total, estado_pedido, direccion_entrega) VALUES
(1, 2, '2025-02-10 10:00:00', 1, 240000.00, 'Pagado', 'Carrera 103 # 98-15 Barrio Vélez, Apartadó'),
(2, 3, '2025-02-12 16:40:00', 2, 315000.00, 'Pagado', 'Calle 45 # 70-12, Medellín'),
(3, 3, '2025-02-18 11:20:00', 1, 210000.00, 'Pagado', 'Calle 45 # 70-12, Medellín');

INSERT INTO detalles_pedido (id_pedido, id_producto, id_talla, id_color, cantidad, precio_unitario) VALUES
-- Pedido 1 (Cliente Juan Pérez: Verano Tropical)
(1, 1, 2, 1, 2, 120000.00),
-- Pedido 2 (Cliente Andrés Gómez: Temporada 3 Formal + Temporada 2 Invierno)
(2, 5, 5, 4, 1, 135000.00),
(2, 9, 2, 2, 1, 180000.00),
-- Pedido 3 (Cliente Andrés Gómez: Temporada 4 Casual Fin de Año)
(3, 12, 7, 1, 1, 210000.00);

INSERT INTO entregas (id_entrega, id_pedido, tipo_entrega, zona_cobertura, id_transportadora, estado_entrega) VALUES
(1, 1, 'Propia', TRUE, NULL, 'En preparación'),
(2, 2, 'Transportadora Externa', FALSE, 1, 'Despachado'),
(3, 3, 'Transportadora Externa', FALSE, 2, 'Entregado');