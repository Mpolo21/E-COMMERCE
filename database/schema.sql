-- ============================================================================
-- ARCHIVO: database/schema.sql
-- PROPÓSITO: Esquema base oficial validado por el docente
-- ============================================================================

DROP DATABASE IF EXISTS ecommerce_ropa;
CREATE DATABASE IF NOT EXISTS ecommerce_ropa CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
USE ecommerce_ropa;

CREATE TABLE roles (
  id_rol INT AUTO_INCREMENT PRIMARY KEY,
  nombre_rol VARCHAR(50) NOT NULL
);

CREATE TABLE usuarios (
  id_usuario INT AUTO_INCREMENT PRIMARY KEY,
  nombre VARCHAR(100) NOT NULL,
  correo VARCHAR(100) UNIQUE NOT NULL,
  contrasena VARCHAR(255) NOT NULL,
  direccion VARCHAR(255),
  puntos_fidelizacion INT DEFAULT 0,
  id_rol INT NOT NULL,
  fecha_registro DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (id_rol) REFERENCES roles(id_rol)
);

CREATE TABLE categorias (
  id_categoria INT AUTO_INCREMENT PRIMARY KEY,
  nombre_categoria VARCHAR(100) NOT NULL
);

CREATE TABLE marcas (
  id_marca INT AUTO_INCREMENT PRIMARY KEY,
  nombre_marca VARCHAR(100) NOT NULL,
  estado BOOLEAN DEFAULT TRUE
);

CREATE TABLE temporadas (
  id_temporada INT AUTO_INCREMENT PRIMARY KEY,
  nombre_temporada VARCHAR(100) NOT NULL
);

CREATE TABLE proveedores (
  id_proveedor INT AUTO_INCREMENT PRIMARY KEY,
  nombre_proveedor VARCHAR(100) NOT NULL,
  telefono VARCHAR(20),
  correo VARCHAR(100)
);

CREATE TABLE productos (
  id_producto INT AUTO_INCREMENT PRIMARY KEY,
  nombre_producto VARCHAR(150) NOT NULL,
  descripcion TEXT,
  precio DECIMAL(10,2) NOT NULL,
  id_categoria INT NOT NULL,
  id_marca INT NOT NULL,
  id_temporada INT NOT NULL,
  id_proveedor INT NOT NULL,
  estado BOOLEAN DEFAULT TRUE,
  FOREIGN KEY (id_categoria) REFERENCES categorias(id_categoria),
  FOREIGN KEY (id_marca) REFERENCES marcas(id_marca),
  FOREIGN KEY (id_temporada) REFERENCES temporadas(id_temporada),
  FOREIGN KEY (id_proveedor) REFERENCES proveedores(id_proveedor)
);

CREATE TABLE tallas (
  id_talla INT AUTO_INCREMENT PRIMARY KEY,
  nombre_talla VARCHAR(10) NOT NULL
);

CREATE TABLE colores (
  id_color INT AUTO_INCREMENT PRIMARY KEY,
  nombre_color VARCHAR(50) NOT NULL
);

CREATE TABLE inventario (
  id_inventario INT AUTO_INCREMENT PRIMARY KEY,
  id_producto INT NOT NULL,
  id_talla INT NOT NULL,
  id_color INT NOT NULL,
  cantidad_stock INT NOT NULL DEFAULT 0,
  FOREIGN KEY (id_producto) REFERENCES productos(id_producto),
  FOREIGN KEY (id_talla) REFERENCES tallas(id_talla),
  FOREIGN KEY (id_color) REFERENCES colores(id_color)
);

CREATE TABLE metodos_pago (
  id_metodo INT AUTO_INCREMENT PRIMARY KEY,
  nombre_metodo VARCHAR(100) NOT NULL,
  estado BOOLEAN DEFAULT TRUE
);

CREATE TABLE transportadoras (
  id_transportadora INT AUTO_INCREMENT PRIMARY KEY,
  nombre_empresa VARCHAR(100) NOT NULL,
  telefono VARCHAR(20),
  correo VARCHAR(100)
);

CREATE TABLE pedidos (
  id_pedido INT AUTO_INCREMENT PRIMARY KEY,
  id_cliente INT NOT NULL,
  fecha_pedido DATETIME DEFAULT CURRENT_TIMESTAMP,
  id_metodo_pago INT NOT NULL,
  total DECIMAL(10,2) NOT NULL,
  estado_pedido VARCHAR(50) DEFAULT 'Pendiente', -- Pendiente, Pagado, Cancelado
  FOREIGN KEY (id_cliente) REFERENCES usuarios(id_usuario),
  FOREIGN KEY (id_metodo_pago) REFERENCES metodos_pago(id_metodo)
);

CREATE TABLE detalles_pedido (
  id_detalle INT AUTO_INCREMENT PRIMARY KEY,
  id_pedido INT NOT NULL,
  id_producto INT NOT NULL,
  id_talla INT NOT NULL,
  id_color INT NOT NULL,
  cantidad INT NOT NULL,
  precio_unitario DECIMAL(10,2) NOT NULL, -- copia del precio al momento de la venta
  FOREIGN KEY (id_pedido) REFERENCES pedidos(id_pedido),
  FOREIGN KEY (id_producto) REFERENCES productos(id_producto),
  FOREIGN KEY (id_talla) REFERENCES tallas(id_talla),
  FOREIGN KEY (id_color) REFERENCES colores(id_color)
);

CREATE TABLE entregas (
  id_entrega INT AUTO_INCREMENT PRIMARY KEY,
  id_pedido INT NOT NULL,
  tipo_entrega ENUM('Propia','Transportadora Externa') NOT NULL,
  zona_cobertura BOOLEAN DEFAULT TRUE,
  id_transportadora INT, -- NULL si es logística propia
  estado_entrega VARCHAR(50) DEFAULT 'En preparación', -- En preparación, Despachado, Entregado
  fecha_actualizacion DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (id_pedido) REFERENCES pedidos(id_pedido),
  FOREIGN KEY (id_transportadora) REFERENCES transportadoras(id_transportadora)
);

CREATE TABLE compras (
  id_compra INT AUTO_INCREMENT PRIMARY KEY,
  id_proveedor INT NOT NULL,
  fecha_compra DATETIME DEFAULT CURRENT_TIMESTAMP,
  total_compra DECIMAL(10,2) NOT NULL,
  FOREIGN KEY (id_proveedor) REFERENCES proveedores(id_proveedor)
);

CREATE TABLE detalles_compra (
  id_detalle_compra INT AUTO_INCREMENT PRIMARY KEY,
  id_compra INT NOT NULL,
  id_producto INT NOT NULL,
  id_talla INT NOT NULL,
  id_color INT NOT NULL,
  cantidad INT NOT NULL,
  precio_compra_unitario DECIMAL(10,2) NOT NULL, -- costo para la tienda
  FOREIGN KEY (id_compra) REFERENCES compras(id_compra),
  FOREIGN KEY (id_producto) REFERENCES productos(id_producto),
  FOREIGN KEY (id_talla) REFERENCES tallas(id_talla),
  FOREIGN KEY (id_color) REFERENCES colores(id_color)
);

ALTER TABLE productos
  ADD COLUMN prioridad_visual INT DEFAULT 0 COMMENT 'Mayor número = aparece primero en la tienda',
  ADD COLUMN costo_promedio_ponderado DECIMAL(10,2) DEFAULT 0.00;

CREATE VIEW vista_balance_prendas AS
SELECT p.id_producto, p.nombre_producto,
  COALESCE(comp.total_unidades_compradas,0) AS unidades_compradas,
  COALESCE(comp.total_dinero_invertido,0) AS dinero_invertido,
  COALESCE(vent.total_unidades_vendidas,0) AS unidades_vendidas,
  COALESCE(vent.total_dinero_ingresado,0) AS dinero_ingresado,
  (COALESCE(vent.total_dinero_ingresado,0) - COALESCE(comp.total_dinero_invertido,0)) AS balance_ganancia_perdida
FROM productos p
LEFT JOIN (SELECT id_producto, SUM(cantidad) AS total_unidades_compradas,
           SUM(cantidad*precio_compra_unitario) AS total_dinero_invertido
           FROM detalles_compra GROUP BY id_producto) comp ON p.id_producto = comp.id_producto
LEFT JOIN (SELECT dp.id_producto, SUM(dp.cantidad) AS total_unidades_vendidas,
           SUM(dp.cantidad*dp.precio_unitario) AS total_dinero_ingresado
           FROM detalles_pedido dp JOIN pedidos ped ON dp.id_pedido = ped.id_pedido
           WHERE ped.estado_pedido != 'Cancelado' GROUP BY dp.id_producto) vent ON p.id_producto = vent.id_producto;