import React, { useMemo, useState } from 'react';
import AnimatedNumber from '../components/AnimatedNumber';
import { formatCurrency as currency } from '../lib/format';
import { motion } from 'framer-motion';

const percent = (v: number) => `${v.toFixed(1)}%`;
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { useSales } from '../context/SalesContext';
import { useBilling } from '../context/BillingContext';
import { useInventory } from '../context/InventoryContext';

type Period = '7d' | '30d' | 'mes' | 'trimestre' | 'año';
type MetricType = 'ventas' | 'costos' | 'utilidades';

const METRICS: { key: MetricType; label: string; color: string }[] = [
  { key: 'ventas',     label: 'Ventas',     color: '#c27d3a' },
  { key: 'costos',     label: 'Costos',     color: '#64748b' },
  { key: 'utilidades', label: 'Utilidades', color: '#059669' },
];

const PERIODS: { key: Period; label: string }[] = [
  { key: '7d', label: '7 días' },
  { key: '30d', label: '30 días' },
  { key: 'mes', label: 'Este mes' },
  { key: 'trimestre', label: 'Trimestre' },
  { key: 'año', label: 'Año' },
];

const CHANNEL_COLORS: Record<MetricType, Record<string, string>> = {
  ventas: {
    'Mercado Libre': '#f59e0b',
    Apanio:          '#ef4444',
    'Venta directa': '#f97316',
    Estado:          '#78350f',
  },
  costos: {
    'Mercado Libre': '#3b82f6',
    Apanio:          '#8b5cf6',
    'Venta directa': '#64748b',
    Estado:          '#1e293b',
  },
  utilidades: {
    'Mercado Libre': '#22c55e',
    Apanio:          '#14b8a6',
    'Venta directa': '#84cc16',
    Estado:          '#166534',
  },
};

const getPeriodBounds = (period: Period): { from: Date; to: Date } => {
  const now = new Date();
  const to = new Date(now);
  to.setHours(23, 59, 59, 999);
  const from = new Date(now);
  from.setHours(0, 0, 0, 0);

  if (period === '7d') from.setDate(now.getDate() - 6);
  else if (period === '30d') from.setDate(now.getDate() - 29);
  else if (period === 'mes') from.setDate(1);
  else if (period === 'trimestre') from.setDate(now.getDate() - 89);
  else { from.setMonth(0); from.setDate(1); }

  return { from, to };
};

const CURRENT_YEAR = new Date().getFullYear();

const Estadisticas: React.FC = () => {
  const { orders } = useSales();
  const { invoices, overdueCount, dueThisWeekCount } = useBilling();
  const { products } = useInventory();
  const [period, setPeriod] = useState<Period>('30d');
  const [selectedYear, setSelectedYear] = useState<number>(CURRENT_YEAR);
  const [metric, setMetric] = useState<MetricType>('ventas');

  const productCostMap = useMemo(() => {
    const map = new Map<string, number>();
    products.forEach(p => map.set(p.nombre, p.costoCompra));
    return map;
  }, [products]);

  const getOrderCost = (order: ReturnType<typeof useSales>['orders'][number]) =>
    order.productos.reduce((sum, p) => sum + (productCostMap.get(p.nombre) ?? 0) * p.cantidad, 0);

  const getOrderValue = (order: ReturnType<typeof useSales>['orders'][number]) => {
    if (metric === 'ventas') return order.monto;
    const cost = getOrderCost(order);
    if (metric === 'costos') return cost;
    return order.monto - cost;
  };

  const availableYears = useMemo(() => {
    const years = new Set<number>([CURRENT_YEAR]);
    orders.forEach(o => years.add(Number(o.fecha.slice(0, 4))));
    return Array.from(years).sort((a, b) => b - a);
  }, [orders]);

  const { from, to } = useMemo(() => {
    if (period === 'año') {
      return {
        from: new Date(selectedYear, 0, 1, 0, 0, 0, 0),
        to: new Date(selectedYear, 11, 31, 23, 59, 59, 999),
      };
    }
    return getPeriodBounds(period);
  }, [period, selectedYear]);

  const filteredOrders = useMemo(
    () =>
      orders.filter(o => {
        const d = new Date(`${o.fecha}T00:00:00`);
        return d >= from && d <= to;
      }),
    [orders, from, to],
  );

  const kpis = useMemo(() => {
    const total = filteredOrders.reduce((sum, o) => sum + getOrderValue(o), 0);
    const count = filteredOrders.length;
    const avg = count > 0 ? total / count : 0;
    const byChannel = filteredOrders.reduce<Record<string, number>>((acc, o) => {
      acc[o.canal] = (acc[o.canal] ?? 0) + getOrderValue(o);
      return acc;
    }, {});
    const topChannel = Object.entries(byChannel).sort((a, b) => b[1] - a[1])[0]?.[0] ?? '—';
    return { total, count, avg, topChannel };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filteredOrders, metric, productCostMap]);

  const trendData = useMemo(() => {
    if (period === '7d' || period === '30d' || period === 'mes') {
      const map = new Map<string, number>();
      const cursor = new Date(from);
      while (cursor <= to) {
        map.set(cursor.toISOString().slice(0, 10), 0);
        cursor.setDate(cursor.getDate() + 1);
      }
      filteredOrders.forEach(o => {
        const key = o.fecha.slice(0, 10);
        if (map.has(key)) map.set(key, (map.get(key) ?? 0) + getOrderValue(o));
      });
      return Array.from(map.entries()).map(([date, valor]) => ({
        label: new Date(`${date}T00:00:00`).toLocaleDateString('es-CL', {
          day: '2-digit',
          month: 'short',
        }),
        valor,
      }));
    }

    if (period === 'trimestre') {
      const weeks = new Map<string, number>();
      filteredOrders.forEach(o => {
        const d = new Date(`${o.fecha}T00:00:00`);
        const weekStart = new Date(d);
        weekStart.setDate(d.getDate() - d.getDay());
        const key = weekStart.toISOString().slice(0, 10);
        weeks.set(key, (weeks.get(key) ?? 0) + getOrderValue(o));
      });
      return Array.from(weeks.entries())
        .sort(([a], [b]) => a.localeCompare(b))
        .map(([date, valor]) => ({
          label: new Date(`${date}T00:00:00`).toLocaleDateString('es-CL', {
            day: '2-digit',
            month: 'short',
          }),
          valor,
        }));
    }

    // año: group by month
    const months = new Map<string, number>();
    filteredOrders.forEach(o => {
      const key = o.fecha.slice(0, 7);
      months.set(key, (months.get(key) ?? 0) + getOrderValue(o));
    });
    return Array.from(months.entries())
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([ym, valor]) => {
        const [y, m] = ym.split('-').map(Number);
        const label = new Date(y, m - 1, 1).toLocaleDateString('es-CL', {
          month: 'short',
          year: '2-digit',
        });
        return { label, valor };
      });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filteredOrders, from, to, period, metric, productCostMap]);

  const channelData = useMemo(() => {
    const map = new Map<string, number>();
    filteredOrders.forEach(o => map.set(o.canal, (map.get(o.canal) ?? 0) + getOrderValue(o)));
    return Array.from(map.entries())
      .map(([name, value]) => ({ name, value }))
      .sort((a, b) => b.value - a.value);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filteredOrders, metric, productCostMap]);

  const topProducts = useMemo(() => {
    const map = new Map<string, { nombre: string; valor: number; cantidad: number }>();
    filteredOrders.forEach(o =>
      o.productos.forEach(p => {
        const cur = map.get(p.nombre) ?? { nombre: p.nombre, valor: 0, cantidad: 0 };
        const cost = productCostMap.get(p.nombre) ?? 0;
        if (metric === 'ventas') cur.valor += p.monto;
        else if (metric === 'costos') cur.valor += cost * p.cantidad;
        else cur.valor += p.monto - cost * p.cantidad;
        cur.cantidad += p.cantidad;
        map.set(p.nombre, cur);
      }),
    );
    return Array.from(map.values())
      .sort((a, b) => b.valor - a.valor)
      .slice(0, 6);
  }, [filteredOrders, metric, productCostMap]);

  const billingMetrics = useMemo(() => {
    const total = invoices.reduce((sum, i) => sum + i.total, 0);
    const cobrado = invoices
      .filter(i => i.estado === 'Cobrada' || i.estado === 'Pagada')
      .reduce((sum, i) => sum + i.total, 0);
    const pendiente = total - cobrado;
    const tasa = total > 0 ? (cobrado / total) * 100 : 0;
    return { total, cobrado, pendiente, tasa };
  }, [invoices]);

  const maxProductValor = topProducts[0]?.valor ?? 1;
  const activeMetric = METRICS.find(m => m.key === metric)!;
  const metricLabel = activeMetric.label;
  const metricColor = activeMetric.color;

  return (
    <section className="space-y-6">
      <motion.header
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.45, ease: 'easeOut' }}
        className="overflow-hidden rounded-[2rem] border border-amber-900/20 bg-[linear-gradient(135deg,_#1c1005_0%,_#6b3a1f_52%,_#c27d3a_100%)] px-6 py-6 text-white shadow-[0_24px_60px_rgba(120,53,15,0.22)]"
      >
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div>
            <p className="text-sm/6 text-amber-100">Estadísticas · Madera Soluciones ERP</p>
            <h2 className="text-3xl font-semibold tracking-tight">Análisis por período</h2>
            <p className="mt-1 max-w-2xl text-sm text-amber-50/90">
              Ventas, canales, productos destacados y cobranza con vista histórica configurable.
            </p>
          </div>
          <div className="rounded-2xl border border-white/20 bg-white/10 px-4 py-3 text-sm shadow-sm backdrop-blur">
            {filteredOrders.length} órdenes · período seleccionado
          </div>
        </div>
      </motion.header>

      {/* Metric toggle */}
      <div className="flex items-center gap-1 self-start rounded-2xl border border-slate-200 bg-white p-1 shadow-sm">
        {METRICS.map(m => (
          <button
            key={m.key}
            onClick={() => setMetric(m.key)}
            className={`rounded-xl px-4 py-1.5 text-sm font-semibold transition-all duration-200 ${
              metric === m.key
                ? 'text-white shadow-sm'
                : 'text-slate-500 hover:text-slate-800'
            }`}
            style={metric === m.key ? { background: m.color } : {}}
          >
            {m.label}
          </button>
        ))}
      </div>

      {/* Period selector */}
      <div className="flex flex-wrap items-center gap-2">
        {PERIODS.map(p => (
          <button
            key={p.key}
            onClick={() => setPeriod(p.key)}
            className={`rounded-2xl border px-4 py-2 text-sm font-semibold transition-all duration-200 ${
              period === p.key
                ? 'border-amber-800/30 bg-gradient-to-r from-[#6b3a1f] to-[#c27d3a] text-white shadow-[0_8px_20px_rgba(120,53,15,0.2)]'
                : 'border-slate-200 bg-white text-slate-600 hover:border-slate-300 hover:bg-slate-50'
            }`}
          >
            {p.label}
          </button>
        ))}

        {period === 'año' && (
          <div className="ml-2 flex items-center gap-1 rounded-2xl border border-slate-200 bg-white px-3 py-1.5 shadow-sm">
            <button
              onClick={() => setSelectedYear(y => y - 1)}
              className="flex h-7 w-7 items-center justify-center rounded-xl text-slate-500 transition hover:bg-slate-100 hover:text-slate-800"
              aria-label="Año anterior"
            >
              ‹
            </button>
            <span className="w-12 text-center text-sm font-semibold text-slate-800">
              {selectedYear}
            </span>
            <button
              onClick={() => setSelectedYear(y => y + 1)}
              disabled={selectedYear >= CURRENT_YEAR}
              className="flex h-7 w-7 items-center justify-center rounded-xl text-slate-500 transition hover:bg-slate-100 hover:text-slate-800 disabled:cursor-not-allowed disabled:opacity-30"
              aria-label="Año siguiente"
            >
              ›
            </button>
          </div>
        )}
      </div>

      {/* KPI row */}
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <KpiCard
          title={`Total ${metricLabel.toLowerCase()}`}
          value={<AnimatedNumber value={kpis.total} format={currency} className="tabular-nums" />}
          sub={`${kpis.count} pedido${kpis.count !== 1 ? 's' : ''} en el período`}
        />
        <KpiCard
          title={`${metricLabel} promedio`}
          value={
            kpis.count > 0 ? (
              <AnimatedNumber value={kpis.avg} format={currency} className="tabular-nums" />
            ) : (
              '—'
            )
          }
          sub="por orden"
        />
        <KpiCard title="Canal líder" value={kpis.topChannel} sub={`por ${metricLabel.toLowerCase()} acumulada`} />
        <KpiCard
          title="Tasa de cobro"
          value={<AnimatedNumber value={billingMetrics.tasa} format={percent} className="tabular-nums" />}
          sub={`${overdueCount} factura${overdueCount !== 1 ? 's' : ''} vencida${overdueCount !== 1 ? 's' : ''}`}
        />
      </div>

      {/* Trend + Channel */}
      <div className="grid gap-6 xl:grid-cols-[1.4fr_0.6fr]">
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.35 }}
          className="rounded-[2rem] border border-slate-200/80 bg-white/95 p-6 shadow-[0_18px_45px_rgba(15,23,42,0.08)]"
        >
          <h3 className="text-lg font-semibold text-slate-900">Evolución de {metricLabel.toLowerCase()}</h3>
          <p className="text-sm text-slate-500">{metricLabel} acumuladas en el período seleccionado.</p>
          <div className="mt-5 h-72">
            {trendData.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={trendData} margin={{ top: 4, right: 8, left: 0, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                  <XAxis
                    dataKey="label"
                    tick={{ fill: '#64748b', fontSize: 11 }}
                    interval="preserveStartEnd"
                  />
                  <YAxis
                    tick={{ fill: '#64748b', fontSize: 11 }}
                    tickFormatter={v => `${Math.round(Number(v) / 1000)}k`}
                    width={40}
                  />
                  <Tooltip
                    formatter={(v: number) => [currency(v), metricLabel]}
                    contentStyle={{ borderRadius: '16px', borderColor: '#e2e8f0', fontSize: 13 }}
                  />
                  <Bar dataKey="valor" name={metricLabel} radius={[6, 6, 0, 0]} fill={metricColor} />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="flex h-full items-center justify-center text-sm text-slate-400">
                Sin órdenes en este período.
              </div>
            )}
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.35, delay: 0.06 }}
          className="rounded-[2rem] border border-slate-200/80 bg-white/95 p-6 shadow-[0_18px_45px_rgba(15,23,42,0.08)]"
        >
          <h3 className="text-lg font-semibold text-slate-900">{metricLabel} por canal</h3>
          <p className="text-sm text-slate-500">Participación en el período.</p>
          {channelData.length > 0 ? (
            <>
              <div className="mt-2 h-44">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={channelData}
                      dataKey="value"
                      nameKey="name"
                      cx="50%"
                      cy="50%"
                      innerRadius={46}
                      outerRadius={76}
                      paddingAngle={3}
                    >
                      {channelData.map(entry => (
                        <Cell key={entry.name} fill={CHANNEL_COLORS[metric][entry.name] ?? '#94a3b8'} />
                      ))}
                    </Pie>
                    <Tooltip
                      formatter={(v: number) => [currency(v), metricLabel]}
                      contentStyle={{ borderRadius: '12px', fontSize: 13 }}
                    />
                  </PieChart>
                </ResponsiveContainer>
              </div>
              <div className="mt-1 space-y-2">
                {channelData.map(entry => (
                  <div key={entry.name} className="flex items-center justify-between text-sm">
                    <div className="flex items-center gap-2">
                      <div
                        className="h-2.5 w-2.5 shrink-0 rounded-full"
                        style={{ background: CHANNEL_COLORS[metric][entry.name] ?? '#94a3b8' }}
                      />
                      <span className="text-slate-700">{entry.name}</span>
                    </div>
                    <span className="font-medium text-slate-900">{currency(entry.value)}</span>
                  </div>
                ))}
              </div>
            </>
          ) : (
            <div className="mt-12 text-center text-sm text-slate-400">
              Sin datos en este período.
            </div>
          )}
        </motion.div>
      </div>

      {/* Top products + Billing */}
      <div className="grid gap-6 xl:grid-cols-[1.2fr_0.8fr]">
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.35, delay: 0.1 }}
          className="rounded-[2rem] border border-slate-200/80 bg-white/95 p-6 shadow-[0_18px_45px_rgba(15,23,42,0.08)]"
        >
          <h3 className="text-lg font-semibold text-slate-900">Top productos</h3>
          <p className="text-sm text-slate-500">Por {metricLabel.toLowerCase()} acumuladas en el período.</p>
          {topProducts.length > 0 ? (
            <div className="mt-5 space-y-3.5">
              {topProducts.map((p, i) => (
                <div key={p.nombre} className="flex items-center gap-3">
                  <span className="w-5 shrink-0 text-right text-xs font-bold text-slate-400">
                    #{i + 1}
                  </span>
                  <div className="min-w-0 flex-1">
                    <div className="mb-1.5 flex items-center justify-between gap-2 text-sm">
                      <span className="truncate font-medium text-slate-800">{p.nombre}</span>
                      <span className="shrink-0 font-semibold text-slate-700">
                        {currency(p.valor)}
                      </span>
                    </div>
                    <div className="h-2 overflow-hidden rounded-full bg-slate-100">
                      <div
                        className="h-full rounded-full transition-all duration-700"
                        style={{
                          width: `${(p.valor / maxProductValor) * 100}%`,
                          background: `linear-gradient(to right, ${metricColor}cc, ${metricColor})`,
                        }}
                      />
                    </div>
                  </div>
                  <span className="shrink-0 text-xs text-slate-400">{p.cantidad} u.</span>
                </div>
              ))}
            </div>
          ) : (
            <div className="mt-10 text-center text-sm text-slate-400">
              Sin datos en este período.
            </div>
          )}
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.35, delay: 0.14 }}
          className="rounded-[2rem] border border-slate-200/80 bg-white/95 p-6 shadow-[0_18px_45px_rgba(15,23,42,0.08)]"
        >
          <h3 className="text-lg font-semibold text-slate-900">Resumen de cobranza</h3>
          <p className="text-sm text-slate-500">Estado global de la cartera de facturas.</p>
          <div className="mt-5 space-y-3">
            <BillingRow label="Total facturado" value={currency(billingMetrics.total)} />
            <BillingRow
              label="Cobrado"
              value={currency(billingMetrics.cobrado)}
              highlight="emerald"
            />
            <BillingRow
              label="Pendiente"
              value={currency(billingMetrics.pendiente)}
              highlight="amber"
            />
            <BillingRow
              label="Facturas vencidas"
              value={`${overdueCount} factura${overdueCount !== 1 ? 's' : ''}`}
              highlight="rose"
            />
            <BillingRow
              label="Por cobrar esta semana"
              value={`${dueThisWeekCount} factura${dueThisWeekCount !== 1 ? 's' : ''}`}
            />
          </div>
          <div className="mt-5 rounded-2xl border border-dashed border-slate-200 bg-slate-50 p-4">
            <div className="flex items-center justify-between text-sm text-slate-600">
              <span>Tasa de cobro</span>
              <span className="font-semibold text-slate-900">
                {billingMetrics.tasa.toFixed(1)}%
              </span>
            </div>
            <div className="mt-3 h-3 overflow-hidden rounded-full bg-slate-200">
              <motion.div
                initial={{ width: 0 }}
                animate={{ width: `${Math.max(4, billingMetrics.tasa)}%` }}
                transition={{ duration: 0.8, ease: 'easeOut' }}
                className="h-full rounded-full bg-gradient-to-r from-emerald-500 to-teal-500"
              />
            </div>
          </div>
        </motion.div>
      </div>
    </section>
  );
};

const KpiCard: React.FC<{ title: string; value: React.ReactNode; sub: string }> = ({ title, value, sub }) => (
  <motion.div
    whileHover={{ y: -4, scale: 1.01 }}
    transition={{ duration: 0.2 }}
    className="rounded-[1.75rem] border border-slate-200/80 bg-white/95 p-5 shadow-[0_16px_40px_rgba(15,23,42,0.07)]"
  >
    <div className="text-sm font-medium text-slate-500">{title}</div>
    <div className="mt-2 truncate text-2xl font-semibold tracking-tight text-slate-900">{value}</div>
    <div className="mt-1 text-xs text-slate-400">{sub}</div>
  </motion.div>
);

const BillingRow: React.FC<{
  label: string;
  value: string;
  highlight?: 'emerald' | 'amber' | 'rose';
}> = ({ label, value, highlight }) => {
  const colors = {
    emerald: 'text-emerald-700',
    amber: 'text-amber-700',
    rose: 'text-rose-600',
  } as const;
  return (
    <div className="flex items-center justify-between rounded-xl border border-slate-100 px-4 py-2.5">
      <span className="text-sm text-slate-600">{label}</span>
      <span
        className={`text-sm font-semibold ${highlight ? colors[highlight] : 'text-slate-800'}`}
      >
        {value}
      </span>
    </div>
  );
};

export default Estadisticas;
