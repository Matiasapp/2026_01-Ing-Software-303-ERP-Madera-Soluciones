import React, { useMemo, useState } from 'react';
import * as XLSX from 'xlsx';
import { useBilling } from '../../context/BillingContext';
import { useInventory } from '../../context/InventoryContext';
import {
  DirectCustomer,
  OrderStatus,
  SalesChannel,
  SalesItem,
  SalesOrder,
  useSales,
} from '../../context/SalesContext';
import { useNotification } from '../../context/NotificationContext';
import { parseCsv, sanitizeRow } from '../../lib/csv';
import { PHONE_PREFIX, formatPhone, telefonoVacio } from '../../lib/format';
import { emptyLine } from './constants';
import type {
  CsvImportPreview,
  ManualSaleForm,
  MlOrigin,
  SaleLine,
  Tab,
  TopProduct,
} from './types';
import { validateManualSale } from './validators';

type CustomerCollision = { customer: DirectCustomer; by: 'correo' | 'nombre' } | null;

const aggregateTopProducts = (orders: SalesOrder[]): TopProduct[] => {
  const entries = orders
    .flatMap(order => order.productos)
    .reduce<Map<string, TopProduct>>((acc, item) => {
      const current = acc.get(item.nombre) ?? { nombre: item.nombre, cantidad: 0, monto: 0 };
      current.cantidad += item.cantidad;
      current.monto += item.monto;
      acc.set(item.nombre, current);
      return acc;
    }, new Map());
  return Array.from(entries.values())
    .sort((a, b) => b.monto - a.monto)
    .slice(0, 5);
};

export function useVentasPage() {
  const {
    orders,
    directCustomers,
    monthlySalesByChannel,
    currentMonthTotal,
    previousMonthTotal,
    addOrders,
    addDirectSale,
    updateOrderStatus,
  } = useSales();
  const { invoices, dueThisWeekCount, overdueCount } = useBilling();
  const { products, movements, addMovement } = useInventory();
  const { success, error: notifyError, info } = useNotification();

  const [activeTab, setActiveTab] = useState<Tab>('todas');
  const [expandedRows, setExpandedRows] = useState<Set<number>>(new Set());
  const [showSaleModal, setShowSaleModal] = useState(false);
  const [allSearch, setAllSearch] = useState('');
  const [allCanal, setAllCanal] = useState<SalesChannel | 'Todos'>('Todos');
  const [allDesde, setAllDesde] = useState('');
  const [allHasta, setAllHasta] = useState('');
  const [mlDesde, setMlDesde] = useState('');
  const [mlHasta, setMlHasta] = useState('');
  const [apanioDesde, setApanioDesde] = useState('');
  const [apanioHasta, setApanioHasta] = useState('');
  const [directaDesde, setDirectaDesde] = useState('');
  const [directaHasta, setDirectaHasta] = useState('');
  const [mlPreview, setMlPreview] = useState<CsvImportPreview | null>(null);
  const [apanioPreview, setApanioPreview] = useState<CsvImportPreview | null>(null);
  const [mlOrigin, setMlOrigin] = useState<MlOrigin>('ML Full');
  const [importing, setImporting] = useState(false);
  const [manualSale, setManualSale] = useState<ManualSaleForm>({
    nombre: '',
    correo: '',
    telefono: PHONE_PREFIX,
    referencia: '',
    lineas: [emptyLine()],
  });
  const [selectedCustomerId, setSelectedCustomerId] = useState('');

  const handleStatusChange = async (id: number, estado: OrderStatus) => {
    try {
      await updateOrderStatus(id, estado);
    } catch {
      notifyError('No se pudo actualizar el estado. Intenta nuevamente.');
    }
  };

  const toggleRow = (id: number) =>
    setExpandedRows(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });

  // En modo "cliente nuevo" (sin selección), detecta si los datos escritos a
  // mano coinciden con un cliente ya registrado, usando la misma prioridad que
  // el backend (correo → nombre exacto).
  const customerCollision: CustomerCollision = useMemo(() => {
    if (selectedCustomerId) return null;
    const correo = manualSale.correo.trim().toLowerCase();
    if (correo) {
      const byEmail = directCustomers.find(c => (c.correo ?? '').toLowerCase() === correo);
      if (byEmail) return { customer: byEmail, by: 'correo' as const };
    }
    const nombre = manualSale.nombre.trim();
    if (nombre) {
      const byName = directCustomers.find(c => c.nombre === nombre);
      if (byName) return { customer: byName, by: 'nombre' as const };
    }
    return null;
  }, [selectedCustomerId, manualSale.nombre, manualSale.correo, directCustomers]);

  const selectCustomer = (clienteId: string) => {
    setSelectedCustomerId(clienteId);
    if (!clienteId) {
      setManualSale(c => ({ ...c, nombre: '', correo: '', telefono: PHONE_PREFIX }));
      return;
    }
    const customer = directCustomers.find(c => String(c.id) === clienteId);
    if (!customer) return;
    setManualSale(c => ({
      ...c,
      nombre: customer.nombre,
      correo: customer.correo ?? '',
      telefono: formatPhone(customer.telefono ?? ''),
    }));
  };

  const manualErrors = useMemo(() => validateManualSale(manualSale), [manualSale]);
  const manualValid =
    !manualErrors.nombre &&
    !manualErrors.correo &&
    !manualErrors.telefono &&
    !manualErrors.header &&
    manualErrors.lineas.every(e => !e);

  const saleTotal = useMemo(
    () => manualSale.lineas.reduce((sum, l) => sum + (Number(l.monto) || 0), 0),
    [manualSale.lineas]
  );

  const updateLine = (index: number, patch: Partial<SaleLine>) => {
    setManualSale(c => ({
      ...c,
      lineas: c.lineas.map((l, i) => (i === index ? { ...l, ...patch } : l)),
    }));
  };

  const autoFillMonto = (index: number, productoId: string, cantidad: string) => {
    const prod = products.find(p => p.id === Number(productoId));
    if (!prod) return;
    const monto = String(prod.precioSitioWeb * (Number(cantidad) || 1));
    updateLine(index, { monto });
  };

  const addLine = () => setManualSale(c => ({ ...c, lineas: [...c.lineas, emptyLine()] }));

  const removeLine = (index: number) =>
    setManualSale(c => ({ ...c, lineas: c.lineas.filter((_, i) => i !== index) }));

  // Todas las ventas de Mercado Libre (no solo el mes), con filtro opcional de
  // fecha (desde/hasta) para acotar cuando se quiera.
  const marketLibreOrders = useMemo(
    () =>
      orders.filter(order => {
        if (order.canal !== 'Mercado Libre') return false;
        if (mlDesde && order.fecha < mlDesde) return false;
        if (mlHasta && order.fecha > mlHasta) return false;
        return true;
      }),
    [orders, mlDesde, mlHasta]
  );
  const apanioOrders = useMemo(
    () =>
      orders.filter(order => {
        if (order.canal !== 'Apanio') return false;
        if (apanioDesde && order.fecha < apanioDesde) return false;
        if (apanioHasta && order.fecha > apanioHasta) return false;
        return true;
      }),
    [orders, apanioDesde, apanioHasta]
  );
  const directOrders = useMemo(
    () =>
      orders.filter(order => {
        if (order.canal !== 'Venta directa') return false;
        if (directaDesde && order.fecha < directaDesde) return false;
        if (directaHasta && order.fecha > directaHasta) return false;
        return true;
      }),
    [orders, directaDesde, directaHasta]
  );
  const estadoOrders = useMemo(() => orders.filter(order => order.canal === 'Estado'), [orders]);

  const allOrdersFiltered = useMemo(() => {
    const q = allSearch.trim().toLowerCase();
    return orders.filter(order => {
      if (allCanal !== 'Todos' && order.canal !== allCanal) return false;
      if (allDesde && order.fecha < allDesde) return false;
      if (allHasta && order.fecha > allHasta) return false;
      if (
        q &&
        !order.referencia.toLowerCase().includes(q) &&
        !order.cliente.toLowerCase().includes(q)
      )
        return false;
      return true;
    });
  }, [orders, allCanal, allDesde, allHasta, allSearch]);

  const topProductsAll = useMemo(() => aggregateTopProducts(orders), [orders]);
  const topProductsByChannel = (channel: SalesChannel) =>
    aggregateTopProducts(orders.filter(order => order.canal === channel));

  const clearAllFilters = () => {
    setAllSearch('');
    setAllCanal('Todos');
    setAllDesde('');
    setAllHasta('');
  };

  const clearMlFilters = () => {
    setMlDesde('');
    setMlHasta('');
  };

  const clearApanioFilters = () => {
    setApanioDesde('');
    setApanioHasta('');
  };

  const clearDirectaFilters = () => {
    setDirectaDesde('');
    setDirectaHasta('');
  };

  const handleImportCsv = (
    event: React.ChangeEvent<HTMLInputElement>,
    channel: 'Mercado Libre' | 'Apanio'
  ) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = () => {
      const raw = String(reader.result ?? '');
      const rows = parseCsv(raw).map(row => ({
        referencia: row.referencia,
        fecha: row.fecha,
        cliente: row.cliente,
        monto: Number(row.monto),
        producto: row.producto,
        cantidad: Number(row.cantidad),
        origen: row.origen || (channel === 'Mercado Libre' ? mlOrigin : 'Apanio'),
      }));

      if (channel === 'Mercado Libre') {
        setMlPreview({ fileName: file.name, rows });
        info(`Archivo ${file.name} listo para importación en Mercado Libre.`);
      } else {
        setApanioPreview({ fileName: file.name, rows });
        info(`Archivo ${file.name} listo para importación en Apanio.`);
      }
    };
    reader.readAsText(file);
  };

  const confirmImport = async (channel: 'Mercado Libre' | 'Apanio') => {
    const preview = channel === 'Mercado Libre' ? mlPreview : apanioPreview;
    if (!preview) return;

    const invalidRows = preview.rows.filter(
      row =>
        !row.referencia.trim() ||
        isNaN(new Date(row.fecha).getTime()) ||
        isNaN(row.monto) ||
        row.monto <= 0 ||
        isNaN(row.cantidad) ||
        row.cantidad <= 0
    );

    if (invalidRows.length > 0) {
      notifyError(`${invalidRows.length} fila(s) con datos inválidos. Revisa el archivo CSV.`);
      return;
    }

    const ordersToAdd: Omit<SalesOrder, 'id'>[] = preview.rows.map(row => ({
      fecha: row.fecha,
      canal: channel,
      referencia: row.referencia,
      cliente: row.cliente,
      monto: row.monto,
      productos: [{ nombre: row.producto, cantidad: row.cantidad, monto: row.monto }],
      origen: row.origen,
      estado: 'Pendiente' as OrderStatus,
    }));

    setImporting(true);
    try {
      await addOrders(ordersToAdd);
      if (channel === 'Mercado Libre') setMlPreview(null);
      else setApanioPreview(null);
      success(`${ordersToAdd.length} órdenes de ${channel} importadas correctamente.`);
    } catch {
      notifyError(`Error al importar órdenes de ${channel}. Ninguna fila fue guardada.`);
    } finally {
      setImporting(false);
    }
  };

  const handleManualSale = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!manualValid) {
      notifyError('Completa correctamente la venta antes de registrar.');
      return;
    }

    const productosItems: SalesItem[] = manualSale.lineas.map(l => {
      const prod = products.find(p => p.id === Number(l.productoId));
      return {
        nombre: prod?.nombre ?? '',
        cantidad: Number(l.cantidad),
        monto: Number(l.monto),
        producto_id: prod?.id ?? null,
      };
    });

    const fecha = new Date().toISOString().slice(0, 10);

    try {
      await addDirectSale({
        nombre: manualSale.nombre,
        correo: manualSale.correo,
        // No persistir solo el prefijo '+56 ' cuando no se ingresó teléfono.
        telefono: telefonoVacio(manualSale.telefono) ? '' : manualSale.telefono,
        canalCompra: 'Venta directa',
        referencia: manualSale.referencia,
        monto: saleTotal,
        productos: productosItems,
        fecha,
      });

      // Registrar la salida de inventario por cada línea (descuenta stock e inserta
      // el movimiento 'salida directa'). Un fallo por línea (p.ej. stock insuficiente)
      // no revierte la venta: se avisa cuáles no pudieron descontarse.
      const fallosStock: string[] = [];
      for (const l of manualSale.lineas) {
        const pid = Number(l.productoId);
        if (!pid) continue;
        try {
          await addMovement({
            productId: pid,
            tipo: 'salida directa',
            cantidad: Number(l.cantidad),
            canal: manualSale.referencia,
            fecha,
          });
        } catch {
          const prod = products.find(p => p.id === pid);
          fallosStock.push(prod?.nombre ?? `producto ${pid}`);
        }
      }

      setManualSale({ nombre: '', correo: '', telefono: PHONE_PREFIX, referencia: '', lineas: [emptyLine()] });
      setSelectedCustomerId('');
      setShowSaleModal(false);
      if (fallosStock.length > 0) {
        notifyError(
          `Venta registrada, pero no se pudo descontar stock de: ${fallosStock.join(', ')} ` +
            '(¿stock insuficiente?). Ajusta el inventario manualmente.',
        );
      } else {
        success('Venta directa registrada y stock actualizado.');
      }
    } catch {
      notifyError('Error al registrar la venta. Intenta nuevamente.');
    }
  };

  const exportSalesMonthly = () => {
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(
      workbook,
      XLSX.utils.json_to_sheet(monthlySalesByChannel.map(sanitizeRow)),
      'VentasCanal'
    );
    XLSX.utils.book_append_sheet(
      workbook,
      XLSX.utils.json_to_sheet([
        { periodo: 'Mes actual', total: currentMonthTotal },
        { periodo: 'Mes anterior', total: previousMonthTotal },
      ]),
      'Comparativa'
    );
    XLSX.writeFile(workbook, 'reporte-ventas-mensual-canal.xlsx');
    success('Reporte de ventas mensual exportado.');
  };

  const exportInventoryReport = () => {
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(
      workbook,
      XLSX.utils.json_to_sheet(
        products.map(p =>
          sanitizeRow({
            SKU: p.sku,
            Nombre: p.nombre,
            Categoria: p.categoria,
            Proveedor: p.proveedor,
            CostoCompra: p.costoCompra,
            PrecioML: p.precioML,
            PrecioSitioWeb: p.precioSitioWeb,
            PrecioEstado: p.precioEstado,
            StockActual: p.stockActual,
            StockMinimo: p.stockMinimo,
            Estado: p.estado,
          })
        )
      ),
      'Catalogo'
    );
    XLSX.utils.book_append_sheet(
      workbook,
      XLSX.utils.json_to_sheet(
        movements.map(m =>
          sanitizeRow({
            Fecha: m.fecha,
            Tipo: m.tipo,
            Cantidad: m.cantidad,
            Canal: m.canal,
            Producto: products.find(p => p.id === m.productId)?.nombre ?? 'Desconocido',
          })
        )
      ),
      'Movimientos'
    );
    XLSX.writeFile(workbook, 'reporte-inventario-movimientos.xlsx');
    success('Reporte de inventario exportado.');
  };

  const exportBillingReport = () => {
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(
      workbook,
      XLSX.utils.json_to_sheet(
        invoices.map(inv =>
          sanitizeRow({
            Folio: inv.folio,
            Organismo: inv.organismo,
            Total: inv.total,
            FechaEmision: inv.fechaEmision,
            FechaPagoEsperada: inv.fechaPagoEsperada,
            Estado: inv.estado,
            Notas: inv.notas,
          })
        )
      ),
      'Facturas'
    );
    XLSX.utils.book_append_sheet(
      workbook,
      XLSX.utils.json_to_sheet([
        { indicador: 'Facturas por cobrar esta semana', valor: dueThisWeekCount },
        { indicador: 'Facturas vencidas', valor: overdueCount },
        { indicador: 'Total facturas', valor: invoices.length },
      ]),
      'Resumen'
    );
    XLSX.writeFile(workbook, 'reporte-cobranza-estado.xlsx');
    success('Reporte de cobranza exportado.');
  };

  const tabs: { id: Tab; label: string; count?: number }[] = [
    { id: 'todas', label: 'Todas', count: orders.length },
    { id: 'ml', label: 'Mercado Libre', count: marketLibreOrders.length },
    { id: 'apanio', label: 'Apanio', count: apanioOrders.length },
    { id: 'directa', label: 'Venta directa', count: directOrders.length },
    { id: 'estado', label: 'Estado', count: estadoOrders.length },
  ];

  return {
    // datos de contexto
    orders,
    directCustomers,
    products,
    invoices,
    dueThisWeekCount,
    overdueCount,
    currentMonthTotal,
    // tabs
    activeTab,
    setActiveTab,
    tabs,
    // "todas"
    expandedRows,
    toggleRow,
    allSearch,
    setAllSearch,
    allCanal,
    setAllCanal,
    allDesde,
    setAllDesde,
    allHasta,
    setAllHasta,
    allOrdersFiltered,
    clearAllFilters,
    topProductsAll,
    topProductsByChannel,
    // canales
    marketLibreOrders,
    mlDesde,
    setMlDesde,
    mlHasta,
    setMlHasta,
    clearMlFilters,
    apanioOrders,
    apanioDesde,
    setApanioDesde,
    apanioHasta,
    setApanioHasta,
    clearApanioFilters,
    directOrders,
    directaDesde,
    setDirectaDesde,
    directaHasta,
    setDirectaHasta,
    clearDirectaFilters,
    estadoOrders,
    handleStatusChange,
    // importación CSV
    mlOrigin,
    setMlOrigin,
    mlPreview,
    setMlPreview,
    apanioPreview,
    setApanioPreview,
    importing,
    handleImportCsv,
    confirmImport,
    // modal venta directa
    showSaleModal,
    setShowSaleModal,
    manualSale,
    setManualSale,
    manualErrors,
    manualValid,
    saleTotal,
    selectedCustomerId,
    selectCustomer,
    customerCollision,
    updateLine,
    autoFillMonto,
    addLine,
    removeLine,
    handleManualSale,
    // export
    exportSalesMonthly,
    exportInventoryReport,
    exportBillingReport,
  };
}

export type VentasVM = ReturnType<typeof useVentasPage>;
