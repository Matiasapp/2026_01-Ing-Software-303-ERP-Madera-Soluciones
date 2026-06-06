import React, { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import * as XLSX from 'xlsx';
import { useBilling } from '../context/BillingContext';
import { useInventory } from '../context/InventoryContext';
import { SalesChannel, SalesItem, SalesOrder, useSales } from '../context/SalesContext';
import { useNotification } from '../context/NotificationContext';

type CsvImportPreview = {
  fileName: string;
  rows: ImportedRow[];
};

type ImportedRow = {
  referencia: string;
  fecha: string;
  cliente: string;
  monto: number;
  producto: string;
  cantidad: number;
  origen: string;
};

type ManualSaleForm = {
  nombre: string;
  correo: string;
  telefono: string;
  referencia: string;
  monto: string;
  producto: string;
  cantidad: string;
};

const currency = (value: number) =>
  new Intl.NumberFormat('es-CL', {
    style: 'currency',
    currency: 'CLP',
    maximumFractionDigits: 0,
  }).format(value);

const currentMonth = '2026-05';

const Ventas: React.FC = () => {
  const {
    orders,
    directCustomers,
    currentMonthOrders,
    monthlySalesByChannel,
    currentMonthTotal,
    previousMonthTotal,
    addOrders,
    addDirectSale,
  } = useSales();
  const { invoices, dueThisWeekCount, overdueCount } = useBilling();
  const { products, movements } = useInventory();
  const { success, error: notifyError, info } = useNotification();

  const [mlPreview, setMlPreview] = useState<CsvImportPreview | null>(null);
  const [apanioPreview, setApanioPreview] = useState<CsvImportPreview | null>(null);
  const [mlOrigin, setMlOrigin] = useState<'ML Full' | 'ML Flex' | 'ML Envíos'>('ML Full');
  const [manualSale, setManualSale] = useState<ManualSaleForm>({
    nombre: '',
    correo: '',
    telefono: '',
    referencia: '',
    monto: '',
    producto: '',
    cantidad: '1',
  });
  const [message, setMessage] = useState('');
  const manualErrors = useMemo(() => validateManualSale(manualSale), [manualSale]);
  const manualValid = Object.keys(manualErrors).length === 0;

  const marketLibreOrders = useMemo(
    () => currentMonthOrders.filter(order => order.canal === 'Mercado Libre'),
    [currentMonthOrders]
  );
  const apanioOrders = useMemo(
    () => currentMonthOrders.filter(order => order.canal === 'Apanio'),
    [currentMonthOrders]
  );
  const whatsappOrders = useMemo(
    () => orders.filter(order => order.canal === 'WhatsApp'),
    [orders]
  );
  const estadoOrders = useMemo(() => orders.filter(order => order.canal === 'Estado'), [orders]);

  const topProductsByChannel = (channel: SalesChannel) => {
    const entries = orders
      .filter(order => order.canal === channel)
      .flatMap(order => order.productos)
      .reduce<Map<string, { nombre: string; cantidad: number; monto: number }>>((acc, item) => {
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

  const mlTopProducts = topProductsByChannel('Mercado Libre');
  const apanioTopProducts = topProductsByChannel('Apanio');

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

  const confirmImport = (channel: 'Mercado Libre' | 'Apanio') => {
    const preview = channel === 'Mercado Libre' ? mlPreview : apanioPreview;
    if (!preview) return;

    const ordersToAdd: Omit<SalesOrder, 'id'>[] = preview.rows.map(row => ({
      fecha: row.fecha,
      canal: channel,
      referencia: row.referencia,
      cliente: row.cliente,
      monto: row.monto,
      productos: [{ nombre: row.producto, cantidad: row.cantidad, monto: row.monto }],
      origen: row.origen,
    }));

    addOrders(ordersToAdd);
    if (channel === 'Mercado Libre') {
      setMlPreview(null);
    } else {
      setApanioPreview(null);
    }
    const text = `Importación de ${channel} completada correctamente.`;
    setMessage(text);
    success(text);
  };

  const handleManualSale = (event: React.FormEvent) => {
    event.preventDefault();
    const monto = Number(manualSale.monto);
    const cantidad = Number(manualSale.cantidad);
    if (!manualValid) {
      notifyError('Completa correctamente la venta manual antes de registrar.');
      return;
    }

    const product: SalesItem = {
      nombre: manualSale.producto,
      cantidad,
      monto,
    };

    addDirectSale({
      nombre: manualSale.nombre,
      correo: manualSale.correo,
      telefono: manualSale.telefono,
      canalCompra: 'WhatsApp',
      referencia: manualSale.referencia,
      monto,
      productos: [product],
      fecha: '2026-05-03',
    });

    setManualSale({
      nombre: '',
      correo: '',
      telefono: '',
      referencia: '',
      monto: '',
      producto: '',
      cantidad: '1',
    });
    setMessage('Venta directa registrada desde WhatsApp.');
    success('Venta directa registrada desde WhatsApp.');
  };

  const exportSalesMonthly = () => {
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(
      workbook,
      XLSX.utils.json_to_sheet(monthlySalesByChannel),
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
    success('Reporte de ventas mensual exportado correctamente.');
  };

  const exportInventoryReport = () => {
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(
      workbook,
      XLSX.utils.json_to_sheet(
        products.map(product => ({
          SKU: product.sku,
          Nombre: product.nombre,
          Categoria: product.categoria,
          Proveedor: product.proveedor,
          CostoCompra: product.costoCompra,
          PrecioML: product.precioML,
          PrecioSitioWeb: product.precioSitioWeb,
          PrecioEstado: product.precioEstado,
          StockActual: product.stockActual,
          StockMinimo: product.stockMinimo,
          Estado: product.estado,
        }))
      ),
      'Catalogo'
    );
    XLSX.utils.book_append_sheet(
      workbook,
      XLSX.utils.json_to_sheet(
        movements.map(movement => ({
          Fecha: movement.fecha,
          Tipo: movement.tipo,
          Cantidad: movement.cantidad,
          Canal: movement.canal,
          Producto:
            products.find(product => product.id === movement.productId)?.nombre ?? 'Desconocido',
        }))
      ),
      'Movimientos'
    );
    XLSX.writeFile(workbook, 'reporte-inventario-movimientos.xlsx');
    success('Reporte de inventario y movimientos exportado correctamente.');
  };

  const exportBillingReport = () => {
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(
      workbook,
      XLSX.utils.json_to_sheet(
        invoices.map(invoice => ({
          Folio: invoice.folio,
          Organismo: invoice.organismo,
          Total: invoice.total,
          FechaEmision: invoice.fechaEmision,
          FechaPagoEsperada: invoice.fechaPagoEsperada,
          Estado: invoice.estado,
          Notas: invoice.notas,
        }))
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
    success('Reporte de cobranza Estado exportado correctamente.');
  };

  return (
    <section className="space-y-6">
      <header className="rounded-2xl border border-blue-100 bg-gradient-to-r from-blue-600 to-sky-500 px-6 py-5 text-white shadow-sm">
        <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <div>
            <p className="text-sm/6 text-blue-100">Módulo de Ventas</p>
            <h2 className="text-3xl font-semibold">
              Ventas por canal, clientes directos y reportes
            </h2>
          </div>
          <div className="flex flex-wrap gap-2">
            <button
              onClick={exportSalesMonthly}
              className="rounded-xl border border-white/20 bg-white/10 px-4 py-2 text-sm font-semibold text-white transition hover:bg-white/20"
            >
              Reporte ventas mensual
            </button>
            <button
              onClick={exportInventoryReport}
              className="rounded-xl border border-white/20 bg-white/10 px-4 py-2 text-sm font-semibold text-white transition hover:bg-white/20"
            >
              Reporte inventario
            </button>
            <button
              onClick={exportBillingReport}
              className="rounded-xl border border-white/20 bg-white/10 px-4 py-2 text-sm font-semibold text-white transition hover:bg-white/20"
            >
              Reporte cobranza Estado
            </button>
          </div>
        </div>
      </header>

      {message && (
        <div className="rounded-2xl border border-blue-100 bg-blue-50 px-4 py-3 text-sm text-blue-700">
          {message}
        </div>
      )}

      <div className="grid gap-4 md:grid-cols-4">
        <KpiCard title="Ventas mes actual" value={currency(currentMonthTotal)} />
        <KpiCard title="Pedidos Mercado Libre" value={`${marketLibreOrders.length}`} />
        <KpiCard title="Pedidos WhatsApp" value={`${whatsappOrders.length}`} />
        <KpiCard title="Pedidos Estado" value={`${estadoOrders.length}`} />
      </div>

      <div className="grid gap-6 xl:grid-cols-[1.2fr_0.8fr]">
        <div className="space-y-6">
          <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
            <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
              <div>
                <h3 className="text-xl font-semibold text-slate-900">Mercado Libre</h3>
                <p className="text-sm text-slate-500">
                  Importación CSV, órdenes del mes y top 5 productos.
                </p>
              </div>
              <div className="flex items-center gap-2">
                <label className="rounded-xl border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50">
                  Importar CSV
                  <input
                    type="file"
                    accept=".csv,text/csv"
                    className="hidden"
                    onChange={event => handleImportCsv(event, 'Mercado Libre')}
                  />
                </label>
                <select
                  value={mlOrigin}
                  onChange={event => setMlOrigin(event.target.value as typeof mlOrigin)}
                  className="rounded-xl border border-slate-200 px-3 py-2 text-sm outline-none"
                >
                  <option value="ML Full">ML Full</option>
                  <option value="ML Flex">ML Flex</option>
                  <option value="ML Envíos">ML Envíos</option>
                </select>
              </div>
            </div>

            <ChannelSummary orders={marketLibreOrders} title="Órdenes Mercado Libre" />
            <ImportPreviewTable
              preview={mlPreview}
              onConfirm={() => confirmImport('Mercado Libre')}
              onCancel={() => setMlPreview(null)}
              channelLabel="Mercado Libre"
            />
            <TopProducts title="Top 5 productos Mercado Libre" items={mlTopProducts} />
          </div>

          <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
            <div className="flex items-center justify-between gap-4">
              <div>
                <h3 className="text-xl font-semibold text-slate-900">Mercado Público</h3>
                <p className="text-sm text-slate-500">Resumen vinculado al módulo de cobranza.</p>
              </div>
              <Link
                to="/cobranza"
                className="rounded-xl bg-slate-900 px-4 py-2 text-sm font-semibold text-white hover:bg-slate-800"
              >
                Ir a Cobranza
              </Link>
            </div>

            <div className="mt-5 grid gap-4 md:grid-cols-4">
              <MiniStat label="Facturas totales" value={`${invoices.length}`} />
              <MiniStat label="Por cobrar semana" value={`${dueThisWeekCount}`} />
              <MiniStat label="Vencidas" value={`${overdueCount}`} />
              <MiniStat
                label="Monto Estado"
                value={currency(estadoOrders.reduce((sum, order) => sum + order.monto, 0))}
              />
            </div>
          </div>

          <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
            <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
              <div>
                <h3 className="text-xl font-semibold text-slate-900">Apanio</h3>
                <p className="text-sm text-slate-500">
                  Importación CSV de ventas y seguimiento del canal.
                </p>
              </div>
              <label className="rounded-xl border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50">
                Importar CSV
                <input
                  type="file"
                  accept=".csv,text/csv"
                  className="hidden"
                  onChange={event => handleImportCsv(event, 'Apanio')}
                />
              </label>
            </div>

            <ChannelSummary orders={apanioOrders} title="Órdenes Apanio" />
            <ImportPreviewTable
              preview={apanioPreview}
              onConfirm={() => confirmImport('Apanio')}
              onCancel={() => setApanioPreview(null)}
              channelLabel="Apanio"
            />
            <TopProducts title="Top 5 productos Apanio" items={apanioTopProducts} />
          </div>
        </div>

        <aside className="space-y-6">
          <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
            <h3 className="text-xl font-semibold text-slate-900">Ventas directas WhatsApp</h3>
            <p className="text-sm text-slate-500">
              Ingreso manual de clientes directos para ventas rápidas.
            </p>

            <form onSubmit={handleManualSale} className="mt-4 space-y-3">
              <InputField
                label="Nombre"
                value={manualSale.nombre}
                onChange={value => setManualSale(current => ({ ...current, nombre: value }))}
                error={manualErrors.nombre}
              />
              <InputField
                label="Correo"
                value={manualSale.correo}
                onChange={value => setManualSale(current => ({ ...current, correo: value }))}
                type="email"
                error={manualErrors.correo}
              />
              <InputField
                label="Teléfono"
                value={manualSale.telefono}
                onChange={value => setManualSale(current => ({ ...current, telefono: value }))}
                error={manualErrors.telefono}
              />
              <InputField
                label="Referencia"
                value={manualSale.referencia}
                onChange={value => setManualSale(current => ({ ...current, referencia: value }))}
                error={manualErrors.referencia}
              />
              <div className="grid gap-3 md:grid-cols-2">
                <InputField
                  label="Producto"
                  value={manualSale.producto}
                  onChange={value => setManualSale(current => ({ ...current, producto: value }))}
                  error={manualErrors.producto}
                />
                <InputField
                  label="Cantidad"
                  value={manualSale.cantidad}
                  onChange={value => setManualSale(current => ({ ...current, cantidad: value }))}
                  type="number"
                  error={manualErrors.cantidad}
                />
              </div>
              <InputField
                label="Monto"
                value={manualSale.monto}
                onChange={value => setManualSale(current => ({ ...current, monto: value }))}
                type="number"
                error={manualErrors.monto}
              />
              <button
                type="submit"
                className="w-full rounded-xl bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-60"
                disabled={!manualValid}
              >
                Registrar venta WhatsApp
              </button>
            </form>
          </div>

          <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
            <h3 className="text-xl font-semibold text-slate-900">Base de clientes directos</h3>
            <p className="text-sm text-slate-500">
              Historial de compras y monto histórico acumulado.
            </p>
            <div className="mt-4 max-h-[420px] space-y-3 overflow-auto pr-1">
              {directCustomers.map(customer => (
                <div
                  key={`${customer.nombre}-${customer.correo}`}
                  className="rounded-xl border border-slate-100 bg-slate-50 p-3"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <div className="font-medium text-slate-900">{customer.nombre}</div>
                      <div className="text-sm text-slate-500">{customer.correo}</div>
                    </div>
                    <span className="rounded-full bg-white px-3 py-1 text-xs font-semibold text-slate-700 shadow-sm">
                      {customer.canalCompra}
                    </span>
                  </div>
                  <div className="mt-2 grid grid-cols-2 gap-2 text-sm text-slate-600">
                    <div>Pedidos: {customer.historialPedidos}</div>
                    <div>Monto: {currency(customer.montoTotalHistorico)}</div>
                    <div>Teléfono: {customer.telefono}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </aside>
      </div>

      <div className="grid gap-6 xl:grid-cols-[1fr_1fr]">
        <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <div className="flex items-center justify-between gap-4">
            <div>
              <h3 className="text-xl font-semibold text-slate-900">Mercado Público vinculado</h3>
              <p className="text-sm text-slate-500">
                Resumen de cobranza y situación de pagos para órdenes Estado.
              </p>
            </div>
          </div>
          <div className="mt-4 grid gap-4 md:grid-cols-2">
            <MiniStat
              label="Facturación Estado"
              value={currency(estadoOrders.reduce((sum, order) => sum + order.monto, 0))}
            />
            <MiniStat label="Pendientes de pago" value={`${dueThisWeekCount + overdueCount}`} />
            <MiniStat
              label="Pagadas"
              value={`${invoices.filter(invoice => invoice.estado === 'Pagada' || invoice.estado === 'Cobrada').length}`}
            />
            <MiniStat
              label="Promedio por orden"
              value={currency(
                estadoOrders.length
                  ? estadoOrders.reduce((sum, order) => sum + order.monto, 0) / estadoOrders.length
                  : 0
              )}
            />
          </div>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <h3 className="text-xl font-semibold text-slate-900">Reportes exportables</h3>
          <p className="text-sm text-slate-500">Excel listo para dirección, compras y cobranza.</p>
          <div className="mt-4 grid gap-3 md:grid-cols-3">
            <button
              onClick={exportSalesMonthly}
              className="rounded-xl border border-slate-200 px-4 py-3 text-sm font-semibold text-slate-700 hover:bg-slate-50"
            >
              Ventas mensual por canal
            </button>
            <button
              onClick={exportInventoryReport}
              className="rounded-xl border border-slate-200 px-4 py-3 text-sm font-semibold text-slate-700 hover:bg-slate-50"
            >
              Inventario con movimientos
            </button>
            <button
              onClick={exportBillingReport}
              className="rounded-xl border border-slate-200 px-4 py-3 text-sm font-semibold text-slate-700 hover:bg-slate-50"
            >
              Cobranza Estado
            </button>
          </div>
        </div>
      </div>
    </section>
  );
};

const KpiCard: React.FC<{ title: string; value: string }> = ({ title, value }) => (
  <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
    <div className="text-sm text-slate-500">{title}</div>
    <div className="mt-2 text-3xl font-semibold text-slate-900">{value}</div>
  </div>
);

const MiniStat: React.FC<{ label: string; value: string }> = ({ label, value }) => (
  <div className="rounded-xl bg-slate-50 p-4">
    <div className="text-sm text-slate-500">{label}</div>
    <div className="mt-1 text-lg font-semibold text-slate-900">{value}</div>
  </div>
);

const InputField: React.FC<{
  label: string;
  value: string;
  onChange: (value: string) => void;
  type?: string;
  error?: string;
}> = ({ label, value, onChange, type = 'text', error }) => (
  <label className="block">
    <span className="mb-1 block text-sm font-medium text-slate-700">{label}</span>
    <input
      type={type}
      value={value}
      onChange={event => onChange(event.target.value)}
      aria-invalid={Boolean(error)}
      className={`w-full rounded-xl border px-3 py-2 text-sm outline-none transition focus:ring-4 ${error ? 'border-rose-300 focus:border-rose-400 focus:ring-rose-100' : 'border-slate-200 focus:border-blue-400 focus:ring-blue-100'}`}
    />
    {error && <span className="mt-1 block text-xs text-rose-600">{error}</span>}
  </label>
);

const validateManualSale = (form: ManualSaleForm) => {
  const errors: Partial<Record<keyof ManualSaleForm, string>> = {};

  if (!form.nombre.trim()) errors.nombre = 'El nombre es obligatorio.';
  if (!form.correo.trim()) errors.correo = 'El correo es obligatorio.';
  else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.correo))
    errors.correo = 'Ingresa un correo válido.';
  if (!form.telefono.trim()) errors.telefono = 'El teléfono es obligatorio.';
  if (!form.referencia.trim()) errors.referencia = 'La referencia es obligatoria.';
  if (!form.producto.trim()) errors.producto = 'El producto es obligatorio.';
  if (!Number(form.cantidad) || Number(form.cantidad) <= 0)
    errors.cantidad = 'La cantidad debe ser mayor a 0.';
  if (!Number(form.monto) || Number(form.monto) <= 0) errors.monto = 'El monto debe ser mayor a 0.';

  return errors;
};

const ChannelSummary: React.FC<{ title: string; orders: SalesOrder[] }> = ({ title, orders }) => (
  <div className="mt-5 rounded-2xl bg-slate-50 p-4">
    <div className="flex items-center justify-between gap-4">
      <h4 className="font-semibold text-slate-900">{title}</h4>
      <span className="rounded-full bg-white px-3 py-1 text-xs font-semibold text-slate-700 shadow-sm">
        {orders.length} órdenes
      </span>
    </div>
    <div className="mt-4 overflow-auto rounded-xl border border-slate-200 bg-white">
      <table className="min-w-full text-sm">
        <thead className="bg-slate-50 text-left text-xs uppercase tracking-wide text-slate-500">
          <tr>
            <th className="px-3 py-2">Referencia</th>
            <th className="px-3 py-2">Cliente</th>
            <th className="px-3 py-2">Monto</th>
            <th className="px-3 py-2">Origen</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-100">
          {orders.map(order => (
            <tr key={order.id}>
              <td className="px-3 py-2 font-medium text-slate-900">{order.referencia}</td>
              <td className="px-3 py-2 text-slate-600">{order.cliente}</td>
              <td className="px-3 py-2 text-slate-700">{currency(order.monto)}</td>
              <td className="px-3 py-2 text-slate-500">{order.origen}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  </div>
);

const TopProducts: React.FC<{
  title: string;
  items: { nombre: string; cantidad: number; monto: number }[];
}> = ({ title, items }) => (
  <div className="mt-5">
    <h4 className="font-semibold text-slate-900">{title}</h4>
    <div className="mt-3 grid gap-3 md:grid-cols-2 xl:grid-cols-5">
      {items.map((item, index) => (
        <div
          key={item.nombre}
          className="rounded-xl border border-slate-200 bg-white p-3 shadow-sm"
        >
          <div className="text-xs font-semibold uppercase tracking-wide text-slate-500">
            #{index + 1}
          </div>
          <div className="mt-1 text-sm font-semibold text-slate-900">{item.nombre}</div>
          <div className="mt-2 text-sm text-slate-500">{item.cantidad} unidades</div>
          <div className="text-sm text-slate-700">{currency(item.monto)}</div>
        </div>
      ))}
    </div>
  </div>
);

const ImportPreviewTable: React.FC<{
  preview: CsvImportPreview | null;
  onConfirm: () => void;
  onCancel: () => void;
  channelLabel: string;
}> = ({ preview, onConfirm, onCancel, channelLabel }) => {
  if (!preview) return null;

  return (
    <div className="mt-5 rounded-2xl border border-blue-100 bg-blue-50 p-4">
      <div className="flex items-center justify-between gap-4">
        <div>
          <h4 className="font-semibold text-slate-900">Previsualización CSV · {channelLabel}</h4>
          <p className="text-sm text-slate-500">Archivo: {preview.fileName}</p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={onConfirm}
            className="rounded-xl bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700"
          >
            Confirmar
          </button>
          <button
            onClick={onCancel}
            className="rounded-xl border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-white"
          >
            Cancelar
          </button>
        </div>
      </div>
      <div className="mt-4 overflow-auto rounded-xl border border-slate-200 bg-white">
        <table className="min-w-full text-sm">
          <thead className="bg-slate-50 text-left text-xs uppercase tracking-wide text-slate-500">
            <tr>
              <th className="px-3 py-2">Referencia</th>
              <th className="px-3 py-2">Fecha</th>
              <th className="px-3 py-2">Cliente</th>
              <th className="px-3 py-2">Monto</th>
              <th className="px-3 py-2">Producto</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {preview.rows.map((row, index) => (
              <tr key={`${row.referencia}-${index}`}>
                <td className="px-3 py-2 font-medium text-slate-900">{row.referencia}</td>
                <td className="px-3 py-2 text-slate-600">{row.fecha}</td>
                <td className="px-3 py-2 text-slate-600">{row.cliente}</td>
                <td className="px-3 py-2 text-slate-700">{currency(row.monto)}</td>
                <td className="px-3 py-2 text-slate-600">{row.producto}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

const parseCsv = (content: string) => {
  const lines = content
    .split(/\r?\n/)
    .map(line => line.trim())
    .filter(Boolean);

  if (lines.length === 0) return [];

  const delimiter = lines[0].includes(';') ? ';' : ',';
  const headers = splitCsvLine(lines[0], delimiter).map(header => header.trim());

  return lines.slice(1).map(line => {
    const values = splitCsvLine(line, delimiter);
    return headers.reduce<Record<string, string>>((acc, header, index) => {
      acc[header] = values[index] ?? '';
      return acc;
    }, {});
  });
};

const splitCsvLine = (line: string, delimiter: string) => {
  const result: string[] = [];
  let current = '';
  let inQuotes = false;

  for (let index = 0; index < line.length; index += 1) {
    const char = line[index];
    if (char === '"') {
      inQuotes = !inQuotes;
      continue;
    }

    if (char === delimiter && !inQuotes) {
      result.push(current.trim());
      current = '';
      continue;
    }

    current += char;
  }

  result.push(current.trim());
  return result;
};

export default Ventas;
