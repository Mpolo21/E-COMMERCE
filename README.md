# Sistema Web de E-commerce de Ropa Masculina

Proyecto académico desarrollado para la asignatura **Diseño de Software** — **Politécnico Jaime Isaza Cadavid (Sede Apartadó)**.

## 1. Descripción del Sistema
Plataforma web centralizada en arquitectura MVC para la comercialización y gestión operativa de una tienda de ropa masculina. Permite:
- **Módulo Cliente (E-commerce):** Navegar por el catálogo con filtros dinámicos (categoría, marca, talla, color) ordenado por prioridad visual, gestionar el carrito de compras validando stock en tiempo real, ejecutar compras mediante un checkout transaccional con acumulación de puntos de fidelización y consultar el historial de pedidos y entregas.
- **Módulo Administrador (Backoffice):** Controlar el inventario estacional (verano, invierno, colecciones), marcas, proveedores, transportadoras y métodos de pago; registrar compras a proveedores recalculando automáticamente el **Costo Promedio Ponderado**; coordinar despachos (logística propia en zona de cobertura o transportadora externa) y generar consultas específicas, conjuntas y reportes financieros apoyados en la vista `vista_balance_prendas`.
- **Módulo Proveedor:** Portal de solo lectura con control de acceso por rol para consultar las prendas suministradas, órdenes de compra emitidas por la tienda, estados de solicitud e historial de suministros.

---

## 2. Stack Tecnológico
- **Backend:** Node.js + Express.js
- **Base de Datos:** MySQL (`mysql2/promise` con pool de conexiones y soporte transaccional)
- **Motor de Plantillas:** EJS (HTML5 + CSS3 responsive sin frameworks SPA)
- **Autenticación y Seguridad:** Sesiones con `express-session`, hashes de contraseñas con `bcrypt`, variables de entorno con `dotenv`, middlewares de control de acceso por rol (`requiereLogin`, `requiereRol`) y consultas SQL 100% parametrizadas (prevención de inyección SQL).

---

## 3. Estructura de Carpetas
```text
ecommerce-ropa/
├── .env.example               # Plantilla de variables de entorno
├── package.json               # Dependencias y scripts npm
├── app.js                     # Punto de entrada y configuración Express
├── config/
│   └── db.js                  # Pool de conexiones MySQL con promesas
├── database/
│   ├── schema.sql             # Esquema base oficial validado
│   ├── migraciones.sql        # Ajustes estructurales, UNIQUE, FKs e índices
│   └── seed.sql               # Datos semilla (roles, usuarios, 15 productos, compras, pedidos)
├── middlewares/
│   ├── auth.js                # Middleware requiereLogin
│   └── roles.js               # Middleware requiereRol (control 403)
├── models/                    # Capa de acceso a datos y transacciones SQL
├── controllers/               # Lógica de negocio por módulo
├── routes/                    # Definición de rutas GET/POST
├── views/                     # Vistas EJS organizadas por rol y partials
└── public/css/style.css       # Hoja de estilos responsive