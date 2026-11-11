/**
 * Archivo: controllers/admin/reportesController.js
 * Propósito: Controlador del Centro de Reportes, vistas individuales paginadas y exportación CSV (Actualización 1).
 */
const { CATALOGO_REPORTES, obtenerReportePorSlug } = require('../../config/reportes');
const ReportesModel = require('../../models/reportesModel');

function escaparCeldaCSV(valor) {
  if (valor === null || valor === undefined) return '""';
  const limpio = String(valor).replace(/"/g, '""');
  return `"${limpio}"`;
}

function generarContenidoCSV(columnas, filas) {
  const encabezado = columnas.map((c) => escaparCeldaCSV(c.etiqueta)).join(';');
  const lineas = filas.map((fila) =>
    columnas
      .map((c) => {
        const val = typeof c.csv === 'function' ? c.csv(fila) : fila[c.campo];
        return escaparCeldaCSV(val);
      })
      .join(';')
  );
  // UTF-8 BOM (\uFEFF) y separador ';' para que Excel en español abra columnas y tildes directamente
  return '\uFEFF' + [encabezado, ...lineas].join('\r\n');
}

class ReportesController {
  // 1.1 Centro de Reportes: No ejecuta ninguna consulta SQL pesada
  static centroReportes(req, res) {
    res.render('admin/reportes/centro', {
      titulo: 'Centro de Reportes y Consultas - PIJIC',
      catalogoReportes: CATALOGO_REPORTES
    });
  }

  // Ejecución interna reutilizada por la vista HTML y por el exportador CSV
  static async ejecutarSegunSlug(slug, query, sinPaginar = false) {
    const pagina = Math.max(1, parseInt(query.pagina, 10) || 1);
    const limite = [10, 20, 50].includes(parseInt(query.limite, 10)) ? parseInt(query.limite, 10) : 20;
    const orden = query.orden || '';
    const dir = query.dir || '';

    switch (slug) {
      case 'balance-prendas': {
        const res = await ReportesModel.balancePrendas({
          id_temporada: query.id_temporada || '',
          id_categoria: query.id_categoria || '',
          busqueda: query.busqueda || '',
          orden: orden || 'balance',
          dir: dir || 'DESC',
          pagina,
          limite,
          sinPaginar
        });
        const columnas = [
          { campo: 'id_producto', etiqueta: 'ID', ordenable: 'id' },
          { campo: 'nombre_producto', etiqueta: 'Prenda', ordenable: 'producto', esProductoConEstado: true },
          { campo: 'nombre_categoria', etiqueta: 'Categoría' },
          { campo: 'nombre_temporada', etiqueta: 'Temporada' },
          { campo: 'unidades_compradas', etiqueta: 'Unids. Compradas', ordenable: 'compradas' },
          { campo: 'dinero_invertido', etiqueta: 'Dinero Invertido', ordenable: 'invertido', formato: 'cop' },
          { campo: 'unidades_vendidas', etiqueta: 'Unids. Vendidas', ordenable: 'vendidas' },
          { campo: 'dinero_ingresado', etiqueta: 'Dinero Ingresado', ordenable: 'ingresado', formato: 'cop' },
          { campo: 'balance_ganancia_perdida', etiqueta: 'Balance (Ganancia / Pérdida)', ordenable: 'balance', formato: 'balance_cop' }
        ];
        return { ...res, columnas, pagina, limite, orden: orden || 'balance', dir: dir || 'DESC' };
      }

      case 'ventas-periodo': {
        const fecha_inicio = query.fecha_inicio || '2025-01-01';
        const fecha_fin = query.fecha_fin || '2027-12-31';
        const res = await ReportesModel.ventasPorPeriodo({
          fecha_inicio,
          fecha_fin,
          orden: orden || 'fecha',
          dir: dir || 'DESC',
          pagina,
          limite,
          sinPaginar
        });
        const columnas = [
          { campo: 'fecha', etiqueta: 'Fecha', ordenable: 'fecha', formato: 'fecha' },
          { campo: 'total_pedidos', etiqueta: 'Pedidos Procesados', ordenable: 'pedidos' },
          { campo: 'prendas_vendidas', etiqueta: 'Prendas Vendidas', ordenable: 'prendas' },
          { campo: 'subtotal_bruto', etiqueta: 'Subtotal Bruto', ordenable: 'subtotal', formato: 'cop' },
          { campo: 'descuento_puntos_total', etiqueta: 'Descuento por Puntos', formato: 'cop' },
          { campo: 'ingresos_netos', etiqueta: 'Ingresos Netos Cobrados', ordenable: 'ingresos', formato: 'cop' }
        ];
        return { ...res, columnas, pagina, limite, orden: orden || 'fecha', dir: dir || 'DESC', filtrosExtra: { fecha_inicio, fecha_fin } };
      }

      case 'stock-bajo': {
        const umbral = query.umbral !== undefined && query.umbral !== '' ? parseInt(query.umbral, 10) : 5;
        const res = await ReportesModel.stockBajo({
          umbral,
          busqueda: query.busqueda || '',
          orden: orden || 'stock',
          dir: dir || 'ASC',
          pagina,
          limite,
          sinPaginar
        });
        const columnas = [
          { campo: 'id_producto', etiqueta: 'ID' },
          { campo: 'nombre_producto', etiqueta: 'Producto (Activo)', ordenable: 'producto' },
          { campo: 'nombre_marca', etiqueta: 'Marca', ordenable: 'marca' },
          { campo: 'nombre_talla', etiqueta: 'Talla', ordenable: 'talla' },
          { campo: 'nombre_color', etiqueta: 'Color' },
          { campo: 'cantidad_stock', etiqueta: 'Stock Actual', ordenable: 'stock', formato: 'stock_critico' }
        ];
        return { ...res, columnas, pagina, limite, orden: orden || 'stock', dir: dir || 'ASC', filtrosExtra: { umbral } };
      }

      case 'historial-cliente': {
        const res = await ReportesModel.historialCliente({
          id_cliente: query.id_cliente || '',
          orden: orden || 'fecha',
          dir: dir || 'DESC',
          pagina,
          limite,
          sinPaginar
        });
        const columnas = [
          { campo: 'id_pedido', etiqueta: 'Pedido #', ordenable: 'pedido' },
          { campo: 'fecha_pedido', etiqueta: 'Fecha', ordenable: 'fecha', formato: 'fecha' },
          { campo: 'prendas', etiqueta: 'Prendas Adquiridas' },
          { campo: 'subtotal', etiqueta: 'Subtotal', ordenable: 'subtotal', formato: 'cop' },
          { campo: 'descuento_puntos', etiqueta: 'Descuento Puntos', formato: 'cop' },
          { campo: 'total', etiqueta: 'Total Neto', ordenable: 'total', formato: 'cop' },
          { campo: 'estado_pedido', etiqueta: 'Estado Pago', formato: 'badge' },
          { campo: 'estado_entrega', etiqueta: 'Estado Entrega', formato: 'badge' }
        ];
        return { ...res, columnas, pagina, limite, orden: orden || 'fecha', dir: dir || 'DESC' };
      }

      case 'mas-vendidos-temporada': {
        const res = await ReportesModel.masVendidosTemporada({
          id_temporada: query.id_temporada || '',
          busqueda: query.busqueda || '',
          orden: orden || 'unidades',
          dir: dir || 'DESC',
          pagina,
          limite,
          sinPaginar
        });
        const columnas = [
          { campo: 'nombre_temporada', etiqueta: 'Temporada', ordenable: 'temporada' },
          { campo: 'nombre_producto', etiqueta: 'Producto', ordenable: 'producto', esProductoConEstado: true },
          { campo: 'nombre_marca', etiqueta: 'Marca' },
          { campo: 'total_unidades_vendidas', etiqueta: 'Unidades Vendidas', ordenable: 'unidades' },
          { campo: 'ingresos_generados', etiqueta: 'Ingresos Brutos', ordenable: 'ingresos', formato: 'cop' }
        ];
        return { ...res, columnas, pagina, limite, orden: orden || 'unidades', dir: dir || 'DESC' };
      }

      case 'clientes-fidelizacion': {
        const res = await ReportesModel.clientesFidelizacion({
          busqueda: query.busqueda || '',
          orden: orden || 'puntos',
          dir: dir || 'DESC',
          pagina,
          limite,
          sinPaginar
        });
        const columnas = [
          { campo: 'id_usuario', etiqueta: 'ID' },
          { campo: 'nombre', etiqueta: 'Cliente', ordenable: 'nombre' },
          { campo: 'correo', etiqueta: 'Correo Electrónico' },
          { campo: 'puntos_fidelizacion', etiqueta: 'Saldo Puntos', ordenable: 'puntos', formato: 'puntos' },
          { campo: 'total_pedidos', etiqueta: 'Pedidos Pagados', ordenable: 'pedidos' },
          { campo: 'total_gastado', etiqueta: 'Total Comprado', ordenable: 'gastado', formato: 'cop' },
          { campo: 'id_usuario', etiqueta: 'Auditoría Puntos', formato: 'link_puntos' }
        ];
        return { ...res, columnas, pagina, limite, orden: orden || 'puntos', dir: dir || 'DESC' };
      }

      case 'pedidos-pendientes': {
        const res = await ReportesModel.pedidosPendientes({
          estado_entrega: query.estado_entrega || '',
          busqueda: query.busqueda || '',
          orden: orden || 'fecha',
          dir: dir || 'ASC',
          pagina,
          limite,
          sinPaginar
        });
        const columnas = [
          { campo: 'id_pedido', etiqueta: 'Pedido #', ordenable: 'pedido' },
          { campo: 'fecha_pedido', etiqueta: 'Fecha Pedido', ordenable: 'fecha', formato: 'fecha' },
          { campo: 'cliente', etiqueta: 'Cliente', ordenable: 'cliente' },
          { campo: 'direccion_entrega', etiqueta: 'Dirección de Entrega' },
          { campo: 'responsable', etiqueta: 'Responsable Logístico' },
          { campo: 'estado_pedido', etiqueta: 'Estado Pago', formato: 'badge' },
          { campo: 'estado_entrega', etiqueta: 'Estado Entrega', ordenable: 'estado', formato: 'badge' }
        ];
        return { ...res, columnas, pagina, limite, orden: orden || 'fecha', dir: dir || 'ASC' };
      }

      case 'disponibilidad-tiempo-real': {
        const res = await ReportesModel.disponibilidadTiempoReal({
          busqueda: query.busqueda || '',
          id_categoria: query.id_categoria || '',
          orden: orden || 'stock',
          dir: dir || 'ASC',
          pagina,
          limite,
          sinPaginar
        });
        const columnas = [
          { campo: 'id_producto', etiqueta: 'ID', ordenable: 'id' },
          { campo: 'nombre_producto', etiqueta: 'Producto (Activo)', ordenable: 'producto' },
          { campo: 'nombre_categoria', etiqueta: 'Categoría' },
          { campo: 'nombre_marca', etiqueta: 'Marca' },
          { campo: 'variantes_registradas', etiqueta: 'Variantes (Talla/Color)', ordenable: 'variantes' },
          { campo: 'stock_real_fisico', etiqueta: 'Stock Físico Total', ordenable: 'stock' },
          { campo: 'diagnostico_disponibilidad', etiqueta: 'Diagnóstico Sobreventa', formato: 'badge' }
        ];
        return { ...res, columnas, pagina, limite, orden: orden || 'stock', dir: dir || 'ASC' };
      }

      case 'pago-zona-entrega': {
        const res = await ReportesModel.pagoZonaEntrega({
          tipo_entrega: query.tipo_entrega || '',
          orden: orden || 'pedidos',
          dir: dir || 'DESC',
          pagina,
          limite,
          sinPaginar
        });
        const columnas = [
          { campo: 'nombre_metodo', etiqueta: 'Método de Pago', ordenable: 'metodo' },
          { campo: 'tipo_entrega', etiqueta: 'Logística de Entrega' },
          { campo: 'cobertura', etiqueta: 'Zona de Cobertura' },
          { campo: 'cantidad_pedidos', etiqueta: 'Cantidad Pedidos', ordenable: 'pedidos' },
          { campo: 'monto_total', etiqueta: 'Monto Total', ordenable: 'monto', formato: 'cop' }
        ];
        return { ...res, columnas, pagina, limite, orden: orden || 'pedidos', dir: dir || 'DESC' };
      }

      case 'desempeno-temporada': {
        const res = await ReportesModel.desempenoTemporada({
          id_temporada: query.id_temporada || '',
          busqueda: query.busqueda || '',
          orden: orden || 'ingresos',
          dir: dir || 'DESC',
          pagina,
          limite,
          sinPaginar
        });
        const columnas = [
          { campo: 'nombre_temporada', etiqueta: 'Temporada' },
          { campo: 'nombre_producto', etiqueta: 'Prenda', ordenable: 'producto', esProductoConEstado: true },
          { campo: 'precio_actual', etiqueta: 'Precio Actual', ordenable: 'precio', formato: 'cop' },
          { campo: 'unidades_vendidas', etiqueta: 'Unidades Vendidas', ordenable: 'unidades' },
          { campo: 'ingreso_generado', etiqueta: 'Ingreso Generado', ordenable: 'ingresos', formato: 'cop' }
        ];
        return { ...res, columnas, pagina, limite, orden: orden || 'ingresos', dir: dir || 'DESC' };
      }

      case 'clientes-multitemporada': {
        const res = await ReportesModel.clientesMultitemporada({
          busqueda: query.busqueda || '',
          orden: orden || 'temporadas',
          dir: dir || 'DESC',
          pagina,
          limite,
          sinPaginar
        });
        const columnas = [
          { campo: 'nombre', etiqueta: 'Cliente', ordenable: 'cliente' },
          { campo: 'correo', etiqueta: 'Correo' },
          { campo: 'cantidad_temporadas_distintas', etiqueta: 'Cant. Temporadas', ordenable: 'temporadas' },
          { campo: 'temporadas_compradas', etiqueta: 'Temporadas Compradas' },
          { campo: 'productos_adquiridos', etiqueta: 'Prendas Adquiridas' }
        ];
        return { ...res, columnas, pagina, limite, orden: orden || 'temporadas', dir: dir || 'DESC' };
      }

      default:
        return null;
    }
  }

  // 1.2 Vista individual de un reporte
  static async verReporte(req, res) {
    try {
      const { slug } = req.params;
      const metaReporte = obtenerReportePorSlug(slug);
      if (!metaReporte) {
        return res.status(404).render('errors/404', { titulo: 'Reporte no encontrado' });
      }

      const catalogos = await ReportesModel.obtenerCatalogosFiltros();
      const resultado = await ReportesController.ejecutarSegunSlug(slug, req.query, false);

      const totalPaginas = Math.max(1, Math.ceil((resultado.total || 0) / resultado.limite));

      res.render('admin/reportes/detalle_reporte', {
        titulo: `${metaReporte.titulo} - Reportes PIJIC`,
        reporte: metaReporte,
        catalogos,
        filas: resultado.filas,
        columnas: resultado.columnas,
        esperandoSeleccion: Boolean(resultado.esperandoSeleccion),
        filtros: {
          ...req.query,
          ...(resultado.filtrosExtra || {}),
          orden: resultado.orden,
          dir: resultado.dir,
          limite: resultado.limite,
          pagina: resultado.pagina
        },
        paginacion: {
          paginaActual: resultado.pagina,
          limite: resultado.limite,
          totalRegistros: resultado.total || 0,
          totalPaginas
        }
      });
    } catch (error) {
      console.error('Error en ReportesController.verReporte:', error);
      res.status(500).render('errors/500', { titulo: 'Error al generar el reporte' });
    }
  }

  // 1.3 Exportación CSV respetando filtros activos y sin paginar
  static async exportarCSV(req, res) {
    try {
      const { slug } = req.params;
      const metaReporte = obtenerReportePorSlug(slug);
      if (!metaReporte) {
        return res.status(404).render('errors/404', { titulo: 'Reporte no encontrado' });
      }

      const resultado = await ReportesController.ejecutarSegunSlug(slug, req.query, true);
      const columnasCSV = resultado.columnas.filter((c) => c.formato !== 'link_puntos');

      // Si una columna tiene badge de dado de baja, agregarlo al texto del CSV
      const columnasFormateadas = columnasCSV.map((col) => ({
        ...col,
        csv: (fila) => {
          if (col.esProductoConEstado && fila.estado === 0) {
            return `${fila[col.campo]} (Dado de baja)`;
          }
          if (col.formato === 'fecha' && fila[col.campo]) {
            return new Date(fila[col.campo]).toISOString().split('T')[0];
          }
          return fila[col.campo];
        }
      }));

      const csvTexto = generarContenidoCSV(columnasFormateadas, resultado.filas);
      const fechaHoy = new Date().toISOString().split('T')[0];

      res.setHeader('Content-Type', 'text/csv; charset=utf-8');
      res.setHeader('Content-Disposition', `attachment; filename="reporte_${slug}_${fechaHoy}.csv"`);
      return res.status(200).send(csvTexto);
    } catch (error) {
      console.error('Error al exportar CSV:', error);
      req.session.mensajeError = 'Ocurrió un error al exportar el reporte en CSV.';
      return res.redirect(`/admin/reportes/${req.params.slug}`);
    }
  }
}

module.exports = ReportesController;