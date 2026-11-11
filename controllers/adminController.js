/**
 * Archivo: controllers/adminController.js
 * Propósito: Controladores del módulo Administrador para inventario (con baja lógica y eliminación), marcas, proveedores, transportadoras y pagos.
 */
const AdminModel = require('../models/adminModel');

function construirUrlRetornoInventario(bodyOrQuery = {}) {
  const params = new URLSearchParams();
  if (bodyOrQuery.filtro_estado) params.set('estado', bodyOrQuery.filtro_estado);
  if (bodyOrQuery.filtro_busqueda) params.set('busqueda', bodyOrQuery.filtro_busqueda);
  if (bodyOrQuery.filtro_pagina) params.set('pagina', bodyOrQuery.filtro_pagina);
  if (bodyOrQuery.filtro_limite) params.set('limite', bodyOrQuery.filtro_limite);
  const qs = params.toString();
  return `/admin/inventario${qs ? '?' + qs : ''}`;
}

class AdminController {
  static async dashboard(req, res) {
    try {
      const resumen = await AdminModel.obtenerResumenDashboard();
      res.render('admin/dashboard', {
        titulo: 'Panel Administrador - PIJIC',
        resumen
      });
    } catch (error) {
      console.error('Error en dashboard admin:', error);
      res.status(500).render('errors/500', { titulo: 'Error del servidor' });
    }
  }

  // ==========================================
  // CU02.1 INVENTARIO ESTACIONAL + ACTUALIZACIÓN 2
  // ==========================================
  static async vistaInventario(req, res) {
    try {
      const estadoFiltro = ['activos', 'baja', 'todos'].includes(req.query.estado) ? req.query.estado : 'activos';
      const busqueda = req.query.busqueda ? req.query.busqueda.trim() : '';
      const pagina = Math.max(1, parseInt(req.query.pagina, 10) || 1);
      const limite = [10, 15, 20, 50].includes(parseInt(req.query.limite, 10)) ? parseInt(req.query.limite, 10) : 15;

      const datos = await AdminModel.obtenerDatosInventario({
        estadoFiltro,
        busqueda,
        pagina,
        limite
      });

      res.render('admin/inventario', {
        titulo: 'Gestión de Inventario Estacional - PIJIC',
        ...datos,
        filtros: {
          estado: estadoFiltro,
          busqueda,
          pagina,
          limite
        }
      });
    } catch (error) {
      console.error('Error al cargar inventario:', error);
      res.status(500).render('errors/500', { titulo: 'Error del servidor' });
    }
  }

  static async crearProducto(req, res) {
    try {
      const { nombre_producto, descripcion, precio, id_categoria, id_marca, id_temporada, id_proveedor, prioridad_visual } = req.body;
      if (!nombre_producto || !precio || !id_categoria || !id_marca || !id_temporada || !id_proveedor) {
        req.session.mensajeError = 'Todos los campos obligatorios del producto deben completarse.';
        return res.redirect('/admin/inventario');
      }
      await AdminModel.crearProducto({
        nombre_producto: nombre_producto.trim(),
        descripcion: descripcion ? descripcion.trim() : '',
        precio: parseFloat(precio),
        id_categoria,
        id_marca,
        id_temporada,
        id_proveedor,
        prioridad_visual: parseInt(prioridad_visual, 10) || 0
      });
      req.session.mensajeExito = 'Producto creado correctamente.';
      res.redirect('/admin/inventario');
    } catch (error) {
      console.error('Error al crear producto:', error);
      req.session.mensajeError = 'Error al crear el producto.';
      res.redirect('/admin/inventario');
    }
  }

  static async actualizarProducto(req, res) {
    const urlRetorno = construirUrlRetornoInventario(req.body);
    try {
      const { id_producto, nombre_producto, precio, id_temporada, prioridad_visual } = req.body;
      if (!id_producto || !nombre_producto || !precio) {
        req.session.mensajeError = 'Nombre y precio son obligatorios.';
        return res.redirect(urlRetorno);
      }
      await AdminModel.actualizarProducto({
        id_producto,
        nombre_producto: nombre_producto.trim(),
        precio,
        id_temporada,
        prioridad_visual
      });
      req.session.mensajeExito = `Datos del Producto #${id_producto} actualizados.`;
      res.redirect(urlRetorno);
    } catch (error) {
      console.error('Error al actualizar producto:', error);
      req.session.mensajeError = 'No se pudo actualizar el producto.';
      res.redirect(urlRetorno);
    }
  }

  // Actualización 2: Dar de baja producto
  static async darDeBajaProducto(req, res) {
    const urlRetorno = construirUrlRetornoInventario(req.body);
    try {
      const { id_producto, motivo_baja } = req.body;
      const nombre = await AdminModel.darDeBajaProducto(id_producto, motivo_baja);
      req.session.mensajeExito = `El producto "${nombre}" (#${id_producto}) fue dado de baja. Ya no aparece en el catálogo del cliente y su historial se conserva intacto.`;
      res.redirect(urlRetorno);
    } catch (error) {
      req.session.mensajeError = error.message || 'No se pudo dar de baja el producto.';
      res.redirect(urlRetorno);
    }
  }

  // Actualización 2: Reactivar producto
  static async reactivarProducto(req, res) {
    const urlRetorno = construirUrlRetornoInventario(req.body);
    try {
      const { id_producto } = req.body;
      const nombre = await AdminModel.reactivarProducto(id_producto);
      req.session.mensajeExito = `El producto "${nombre}" (#${id_producto}) ha sido reactivado y vuelve a estar visible en la tienda.`;
      res.redirect(urlRetorno);
    } catch (error) {
      req.session.mensajeError = error.message || 'No se pudo reactivar el producto.';
      res.redirect(urlRetorno);
    }
  }

  // Actualización 2: Eliminar definitivamente producto sin historial
  static async eliminarProductoDefinitivamente(req, res) {
    const urlRetorno = construirUrlRetornoInventario(req.body);
    try {
      const { id_producto, confirmacion_texto } = req.body;
      if (!confirmacion_texto || confirmacion_texto.trim().toUpperCase() !== 'ELIMINAR') {
        req.session.mensajeError = 'Debes escribir exactamente la palabra ELIMINAR para confirmar el borrado definitivo.';
        return res.redirect(urlRetorno);
      }

      const nombre = await AdminModel.eliminarProductoDefinitivamente(id_producto);
      req.session.mensajeExito = `El producto "${nombre}" (#${id_producto}) y sus registros de stock iniciales fueron eliminados definitivamente.`;
      res.redirect(urlRetorno);
    } catch (error) {
      req.session.mensajeError = error.message || 'No se pudo eliminar el producto.';
      res.redirect(urlRetorno);
    }
  }

  static async asignarStock(req, res) {
    try {
      const { id_producto, id_talla, id_color, cantidad_stock } = req.body;
      if (!id_producto || !id_talla || !id_color || cantidad_stock === undefined || cantidad_stock < 0) {
        req.session.mensajeError = 'Datos de stock inválidos.';
        return res.redirect('/admin/inventario');
      }
      await AdminModel.guardarStock({
        id_producto,
        id_talla,
        id_color,
        cantidad_stock: parseInt(cantidad_stock, 10)
      });
      req.session.mensajeExito = 'Stock por talla y color actualizado correctamente.';
      res.redirect('/admin/inventario');
    } catch (error) {
      console.error('Error al guardar stock:', error);
      req.session.mensajeError = 'Error al actualizar el stock.';
      res.redirect('/admin/inventario');
    }
  }

  static async crearCatalogoAuxiliar(req, res) {
    try {
      const { tipo, valor } = req.body;
      if (!tipo || !valor || !valor.trim()) {
        req.session.mensajeError = 'Debe indicar un nombre válido.';
        return res.redirect('/admin/inventario');
      }
      await AdminModel.crearAtributoCatalogo(tipo, valor.trim());
      req.session.mensajeExito = `Nuevo registro de ${tipo} agregado.`;
      res.redirect('/admin/inventario');
    } catch (error) {
      console.error('Error al crear atributo:', error);
      req.session.mensajeError = 'No se pudo agregar el atributo.';
      res.redirect('/admin/inventario');
    }
  }

  // ==========================================
  // CU02.5 GESTIÓN DE MARCAS
  // ==========================================
  static async vistaMarcas(req, res) {
    try {
      const marcas = await AdminModel.listarMarcas();
      res.render('admin/marcas', { titulo: 'Gestión de Marcas - PIJIC', marcas });
    } catch (error) {
      console.error('Error al listar marcas:', error);
      res.status(500).render('errors/500', { titulo: 'Error del servidor' });
    }
  }

  static async crearMarca(req, res) {
    try {
      const { nombre_marca } = req.body;
      if (!nombre_marca || !nombre_marca.trim()) {
        req.session.mensajeError = 'El nombre de la marca es obligatorio.';
        return res.redirect('/admin/marcas');
      }
      await AdminModel.crearMarca(nombre_marca.trim());
      req.session.mensajeExito = 'Marca registrada exitosamente.';
      res.redirect('/admin/marcas');
    } catch (error) {
      if (error.code === 'ER_DUP_ENTRY') {
        req.session.mensajeError = 'Error: Ya existe una marca con ese nombre.';
      } else {
        req.session.mensajeError = 'Error al registrar la marca.';
      }
      res.redirect('/admin/marcas');
    }
  }

  static async actualizarMarca(req, res) {
    try {
      const { id_marca, nombre_marca, estado } = req.body;
      await AdminModel.actualizarMarca(id_marca, nombre_marca.trim(), estado);
      req.session.mensajeExito = 'Marca actualizada correctamente.';
      res.redirect('/admin/marcas');
    } catch (error) {
      req.session.mensajeError = 'No se pudo actualizar la marca (verifica que el nombre no esté duplicado).';
      res.redirect('/admin/marcas');
    }
  }

  // ==========================================
  // CU02.7 GESTIÓN DE PROVEEDORES
  // ==========================================
  static async vistaProveedores(req, res) {
    try {
      const { proveedores, productos } = await AdminModel.listarProveedoresConProductos();
      res.render('admin/proveedores', {
        titulo: 'Gestión de Proveedores - PIJIC',
        proveedores,
        productos
      });
    } catch (error) {
      console.error('Error en vistaProveedores:', error);
      res.status(500).render('errors/500', { titulo: 'Error del servidor' });
    }
  }

  static async crearProveedor(req, res) {
    try {
      const { nombre_proveedor, telefono, correo } = req.body;
      if (!nombre_proveedor || !nombre_proveedor.trim()) {
        req.session.mensajeError = 'El nombre del proveedor es obligatorio.';
        return res.redirect('/admin/proveedores');
      }
      await AdminModel.crearProveedor({
        nombre_proveedor: nombre_proveedor.trim(),
        telefono: telefono ? telefono.trim() : '',
        correo: correo ? correo.trim() : ''
      });
      req.session.mensajeExito = 'Proveedor registrado correctamente.';
      res.redirect('/admin/proveedores');
    } catch (error) {
      req.session.mensajeError = 'Error al crear el proveedor.';
      res.redirect('/admin/proveedores');
    }
  }

  static async actualizarProveedor(req, res) {
    try {
      const { id_proveedor, nombre_proveedor, telefono, correo } = req.body;
      await AdminModel.actualizarProveedor({ id_proveedor, nombre_proveedor: nombre_proveedor.trim(), telefono, correo });
      req.session.mensajeExito = 'Datos del proveedor actualizados.';
      res.redirect('/admin/proveedores');
    } catch (error) {
      req.session.mensajeError = 'Error al actualizar el proveedor.';
      res.redirect('/admin/proveedores');
    }
  }

  // ==========================================
  // CU02.6 GESTIÓN DE TRANSPORTADORAS
  // ==========================================
  static async vistaTransportadoras(req, res) {
    try {
      const transportadoras = await AdminModel.listarTransportadoras();
      res.render('admin/transportadoras', {
        titulo: 'Gestión de Transportadoras - PIJIC',
        transportadoras
      });
    } catch (error) {
      console.error('Error en vistaTransportadoras:', error);
      res.status(500).render('errors/500', { titulo: 'Error del servidor' });
    }
  }

  static async crearTransportadora(req, res) {
    try {
      const { nombre_empresa, telefono, correo } = req.body;
      if (!nombre_empresa || !nombre_empresa.trim()) {
        req.session.mensajeError = 'El nombre de la empresa transportadora es obligatorio.';
        return res.redirect('/admin/transportadoras');
      }
      await AdminModel.crearTransportadora({
        nombre_empresa: nombre_empresa.trim(),
        telefono: telefono ? telefono.trim() : '',
        correo: correo ? correo.trim() : ''
      });
      req.session.mensajeExito = 'Transportadora creada exitosamente.';
      res.redirect('/admin/transportadoras');
    } catch (error) {
      req.session.mensajeError = 'Error al registrar transportadora.';
      res.redirect('/admin/transportadoras');
    }
  }

  static async actualizarTransportadora(req, res) {
    try {
      const { id_transportadora, nombre_empresa, telefono, correo } = req.body;
      await AdminModel.actualizarTransportadora({ id_transportadora, nombre_empresa: nombre_empresa.trim(), telefono, correo });
      req.session.mensajeExito = 'Transportadora actualizada.';
      res.redirect('/admin/transportadoras');
    } catch (error) {
      req.session.mensajeError = 'Error al actualizar transportadora.';
      res.redirect('/admin/transportadoras');
    }
  }

  static async eliminarTransportadora(req, res) {
    try {
      const { id_transportadora } = req.body;
      await AdminModel.eliminarTransportadora(id_transportadora);
      req.session.mensajeExito = 'Transportadora eliminada.';
      res.redirect('/admin/transportadoras');
    } catch (error) {
      req.session.mensajeError = 'No se puede eliminar la transportadora porque tiene entregas asociadas.';
      res.redirect('/admin/transportadoras');
    }
  }

  // ==========================================
  // CU02.2 CONFIGURACIÓN DE MÉTODOS DE PAGO
  // ==========================================
  static async vistaPagos(req, res) {
    try {
      const metodos = await AdminModel.listarMetodosPago();
      res.render('admin/pagos', {
        titulo: 'Configuración de Pagos - PIJIC',
        metodos
      });
    } catch (error) {
      console.error('Error en vistaPagos:', error);
      res.status(500).render('errors/500', { titulo: 'Error del servidor' });
    }
  }

  static async crearPago(req, res) {
    try {
      const { nombre_metodo } = req.body;
      if (!nombre_metodo || !nombre_metodo.trim()) {
        req.session.mensajeError = 'El nombre del método de pago es obligatorio.';
        return res.redirect('/admin/pagos');
      }
      await AdminModel.crearMetodoPago(nombre_metodo.trim());
      req.session.mensajeExito = 'Método de pago creado y habilitado.';
      res.redirect('/admin/pagos');
    } catch (error) {
      req.session.mensajeError = 'Error al crear método de pago.';
      res.redirect('/admin/pagos');
    }
  }

  static async cambiarEstadoPago(req, res) {
    try {
      const { id_metodo, estado } = req.body;
      await AdminModel.cambiarEstadoMetodoPago(id_metodo, estado);
      req.session.mensajeExito = 'Estado del método de pago actualizado.';
      res.redirect('/admin/pagos');
    } catch (error) {
      req.session.mensajeError = 'Error al cambiar estado del método de pago.';
      res.redirect('/admin/pagos');
    }
  }
}

module.exports = AdminController;