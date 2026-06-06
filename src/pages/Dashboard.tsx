import React, { useMemo } from 'react';
import { motion } from 'framer-motion';
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import AnimatedNumber from '../components/AnimatedNumber';
import { useBilling } from '../context/BillingContext';
import { useInventory } from '../context/InventoryContext';
import { useSales } from '../context/SalesContext';

const currency = (value: number) =>
  new Intl.NumberFormat('es-CL', {
    style: 'currency',
    currency: 'CLP',
    maximumFractionDigits: 0,
  }).format(value);

const cardContainer = {
  hidden: {},
  show: {
    transition: {
      staggerChildren: 0.08,
      delayChildren: 0.05,
    },
  },
};

const cardItem = {
  hidden: { opacity: 0, y: 18, scale: 0.98 },
  show: { opacity: 1, y: 0, scale: 1 },
};

const Dashboard: React.FC = () => {
  const { todaysOrders, monthlySalesByChannel, currentMonthTotal, previousMonthTotal } = useSales();
  const { dueThisWeekCount, overdueCount, alertsDueThisWeek, overdueInvoices } = useBilling();
  const { lowStockProducts, lowStockCount } = useInventory();

  const todaySummary = useMemo(() => {
    const totalSales = todaysOrders.reduce((sum, order) => sum + order.monto, 0);
    const byChannel = ['Mercado Libre', 'Apanio', 'WhatsApp', 'Estado', 'Sitio web'].map(
      channel => {
        const channelOrders = todaysOrders.filter(order => order.canal === channel);
        return {
          canal: channel,
          pedidos: channelOrders.length,
          monto: channelOrders.reduce((sum, order) => sum + order.monto, 0),
        };
      }
    );

    return { totalSales, byChannel };
  }, [todaysOrders]);

  const comparison = useMemo(() => {
    const delta = currentMonthTotal - previousMonthTotal;
    const growth = previousMonthTotal > 0 ? (delta / previousMonthTotal) * 100 : 0;

    return { delta, growth };
  }, [currentMonthTotal, previousMonthTotal]);

  return (
    <section className="space-y-6">
      <motion.header
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.45, ease: 'easeOut' }}
        className="overflow-hidden rounded-[2rem] border border-blue-100 bg-[linear-gradient(135deg,_#0f172a_0%,_#1d4ed8_52%,_#38bdf8_100%)] px-6 py-6 text-white shadow-[0_24px_60px_rgba(37,99,235,0.24)]"
      >
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div>
            <p className="text-sm/6 text-blue-100">Home · Cercotec ERP</p>
            <h2 className="text-3xl font-semibold tracking-tight">Resumen ejecutivo del día</h2>
            <p className="mt-1 max-w-2xl text-sm text-blue-50/90">
              Indicadores comerciales y financieros con lectura rápida, estados críticos y ventas
              por canal.
            </p>
          </div>
          <div className="rounded-2xl border border-white/20 bg-white/10 px-4 py-3 text-sm shadow-sm backdrop-blur">
            Operación comercial y financiera en tiempo real
          </div>
        </div>
      </motion.header>

      <motion.div
        variants={cardContainer}
        initial="hidden"
        animate="show"
        className="grid gap-4 md:grid-cols-2 xl:grid-cols-4"
      >
        <StatCard
          title="Ventas totales del día"
          note={`${todaysOrders.length} pedidos hoy`}
          value={<AnimatedNumber value={todaySummary.totalSales} format={currency} className="tabular-nums" />}
        />
        <StatCard
          title="Facturas por cobrar esta semana"
          note={`${alertsDueThisWeek.length} con vencimiento cercano`}
          value={<AnimatedNumber value={dueThisWeekCount} className="tabular-nums" />}
        />
        <StatCard
          title="Productos bajo stock mínimo"
          note={`${lowStockProducts.length} SKU con alerta`}
          value={<AnimatedNumber value={lowStockCount} className="tabular-nums" />}
        />
        <StatCard
          title="Facturas vencidas"
          note={`${overdueInvoices.length} facturas requieren gestión`}
          value={<AnimatedNumber value={overdueCount} className="tabular-nums" />}
        />
      </motion.div>

      <div className="grid gap-6 xl:grid-cols-[1.1fr_0.9fr]">
        <motion.section
          variants={cardItem}
          initial="hidden"
          animate="show"
          transition={{ duration: 0.35 }}
          className="rounded-[2rem] border border-slate-200/80 bg-white/95 p-6 shadow-[0_18px_45px_rgba(15,23,42,0.08)] backdrop-blur"
        >
          <div className="flex items-center justify-between gap-4">
            <div>
              <h3 className="text-xl font-semibold text-slate-900">Pedidos por canal</h3>
              <p className="text-sm text-slate-500">
                Resumen del día por Mercado Libre, Apanio, WhatsApp, Estado y sitio web.
              </p>
            </div>
            <div className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-600">
              {todaysOrders.length} pedidos activos
            </div>
          </div>

          <motion.div
            variants={cardContainer}
            initial="hidden"
            animate="show"
            className="mt-5 grid gap-4 md:grid-cols-2 xl:grid-cols-3"
          >
            {todaySummary.byChannel.map(item => (
              <motion.div
                key={item.canal}
                variants={cardItem}
                whileHover={{ y: -4, scale: 1.01 }}
                transition={{ duration: 0.2 }}
                className="rounded-3xl border border-slate-200 bg-[linear-gradient(180deg,_#ffffff,_#f8fafc)] p-4 shadow-sm"
              >
                <div className="text-sm font-medium text-slate-500">{item.canal}</div>
                <div className="mt-2 text-2xl font-semibold text-slate-900">{item.pedidos}</div>
                <div className="text-sm text-slate-500">{currency(item.monto)}</div>
              </motion.div>
            ))}
          </motion.div>

          <motion.div
            variants={cardItem}
            initial="hidden"
            animate="show"
            transition={{ duration: 0.35, delay: 0.1 }}
            className="mt-6 rounded-3xl border border-slate-200 bg-slate-50 p-4"
          >
            <div className="flex items-center justify-between gap-4">
              <h4 className="font-semibold text-slate-900">Comparativa mes actual vs mes anterior</h4>
              <span
                className={`rounded-full px-3 py-1 text-xs font-semibold ${comparison.growth >= 0 ? 'bg-emerald-100 text-emerald-700' : 'bg-rose-100 text-rose-700'}`}
              >
                {comparison.growth >= 0 ? '+' : ''}
                {comparison.growth.toFixed(1)}%
              </span>
            </div>
            <div className="mt-4 grid gap-4 md:grid-cols-2">
              <MetricPanel title="Mes actual" value={currentMonthTotal} />
              <MetricPanel title="Mes anterior" value={previousMonthTotal} />
            </div>
          </motion.div>
        </motion.section>

        <motion.aside
          variants={cardItem}
          initial="hidden"
          animate="show"
          transition={{ duration: 0.35, delay: 0.08 }}
          className="rounded-[2rem] border border-slate-200/80 bg-white/95 p-6 shadow-[0_18px_45px_rgba(15,23,42,0.08)] backdrop-blur"
        >
          <div className="mb-4">
            <h3 className="text-xl font-semibold text-slate-900">Alertas activas</h3>
            <p className="text-sm text-slate-500">Gestión prioritaria de cobranza e inventario.</p>
          </div>

          <div className="space-y-3">
            <AlertCard
              title="Facturas por cobrar esta semana"
              value={`${dueThisWeekCount}`}
              description="Vencen dentro de los próximos 7 días."
              tone="amber"
            />
            <AlertCard
              title="Productos bajo stock mínimo"
              value={`${lowStockCount}`}
              description="Revisión inmediata para compra o ajuste."
              tone="rose"
            />
            <AlertCard
              title="Facturas vencidas"
              value={`${overdueCount}`}
              description="Requieren seguimiento comercial urgente."
              tone="sky"
            />
          </div>
        </motion.aside>
      </div>

      <div className="grid gap-6 xl:grid-cols-[1.2fr_0.8fr]">
        <motion.section
          variants={cardItem}
          initial="hidden"
          animate="show"
          transition={{ duration: 0.35, delay: 0.12 }}
          className="rounded-[2rem] border border-slate-200/80 bg-white/95 p-6 shadow-[0_18px_45px_rgba(15,23,42,0.08)] backdrop-blur"
        >
          <div className="flex items-center justify-between gap-4">
            <div>
              <h3 className="text-xl font-semibold text-slate-900">Ventas del mes por canal</h3>
              <p className="text-sm text-slate-500">
                Gráfico de barras con el comportamiento del mes en curso.
              </p>
            </div>
          </div>

          <div className="mt-6 h-96">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={monthlySalesByChannel}
                margin={{ top: 10, right: 20, left: 0, bottom: 0 }}
              >
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                <XAxis dataKey="canal" tick={{ fill: '#475569', fontSize: 12 }} />
                <YAxis
                  tick={{ fill: '#475569', fontSize: 12 }}
                  tickFormatter={value => `${Math.round(Number(value) / 1000)}k`}
                />
                <Tooltip
                  formatter={(value: number) => currency(value)}
                  contentStyle={{ borderRadius: '18px', borderColor: '#e2e8f0' }}
                />
                <Legend />
                <Bar dataKey="monto" name="Ventas" radius={[12, 12, 0, 0]}>
                  {monthlySalesByChannel.map((entry, index) => (
                    <Cell
                      key={`cell-${entry.canal}`}
                      fill={['#2563eb', '#0ea5e9', '#14b8a6', '#f59e0b', '#6366f1'][index % 5]}
                    />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </motion.section>

        <motion.section
          variants={cardItem}
          initial="hidden"
          animate="show"
          transition={{ duration: 0.35, delay: 0.16 }}
          className="rounded-[2rem] border border-slate-200/80 bg-white/95 p-6 shadow-[0_18px_45px_rgba(15,23,42,0.08)] backdrop-blur"
        >
          <h3 className="text-xl font-semibold text-slate-900">Comparativa ejecutiva</h3>
          <p className="text-sm text-slate-500">Rendimiento relativo de la cartera comercial.</p>

          <div className="mt-5 space-y-4">
            <ProgressMetric
              label="Crecimiento mensual"
              value={Math.max(0, comparison.growth)}
              tone="bg-blue-600"
            />
            <ProgressMetric
              label="Cobranza en semana"
              value={Math.min(
                100,
                (dueThisWeekCount / Math.max(1, dueThisWeekCount + overdueCount)) * 100
              )}
              tone="bg-amber-500"
            />
            <ProgressMetric
              label="Stock en alerta"
              value={Math.min(100, (lowStockCount / Math.max(1, lowStockCount + 8)) * 100)}
              tone="bg-rose-500"
            />
          </div>
        </motion.section>
      </div>
    </section>
  );
};

const StatCard: React.FC<{ title: string; value: React.ReactNode; note: string }> = ({
  title,
  value,
  note,
}) => (
  <motion.article
    variants={cardItem}
    whileHover={{ y: -5, scale: 1.01 }}
    transition={{ duration: 0.2 }}
    className="rounded-[1.75rem] border border-slate-200/80 bg-white/95 p-5 shadow-[0_16px_40px_rgba(15,23,42,0.08)] backdrop-blur"
  >
    <div className="text-sm font-medium text-slate-500">{title}</div>
    <div className="mt-2 text-3xl font-semibold tracking-tight text-slate-900">{value}</div>
    <div className="mt-1 text-sm text-slate-500">{note}</div>
  </motion.article>
);

const MetricPanel: React.FC<{ title: string; value: number }> = ({ title, value }) => (
  <div className="rounded-2xl bg-white p-4 shadow-sm ring-1 ring-slate-100">
    <div className="text-sm text-slate-500">{title}</div>
    <div className="mt-1 text-2xl font-semibold text-slate-900">
      <AnimatedNumber value={value} format={currency} className="tabular-nums" />
    </div>
  </div>
);

const AlertCard: React.FC<{
  title: string;
  value: string;
  description: string;
  tone: 'amber' | 'rose' | 'sky';
}> = ({ title, value, description, tone }) => {
  const toneClasses = {
    amber: 'border-amber-200 bg-amber-50 text-amber-700',
    rose: 'border-rose-200 bg-rose-50 text-rose-700',
    sky: 'border-sky-200 bg-sky-50 text-sky-700',
  } as const;

  return (
    <motion.div
      whileHover={{ y: -3, scale: 1.01 }}
      transition={{ duration: 0.2 }}
      className="rounded-3xl border border-slate-200 bg-slate-50 p-4"
    >
      <div className="flex items-start justify-between gap-4">
        <div>
          <div className="text-sm font-medium text-slate-500">{title}</div>
          <div className="mt-1 text-2xl font-semibold text-slate-900">{value}</div>
          <div className="mt-1 text-sm text-slate-500">{description}</div>
        </div>
        <div className={`rounded-full border px-3 py-1 text-xs font-semibold ${toneClasses[tone]}`}>
          {value}
        </div>
      </div>
    </motion.div>
  );
};

const ProgressMetric: React.FC<{ label: string; value: number; tone: string }> = ({
  label,
  value,
  tone,
}) => (
  <div>
    <div className="mb-2 flex items-center justify-between text-sm">
      <span className="font-medium text-slate-700">{label}</span>
      <span className="text-slate-500">{value.toFixed(1)}%</span>
    </div>
    <div className="h-3 overflow-hidden rounded-full bg-slate-200">
      <motion.div
        initial={{ width: 0 }}
        animate={{ width: `${Math.max(8, Math.min(100, value))}%` }}
        transition={{ duration: 0.8, ease: 'easeOut' }}
        className={`h-full rounded-full ${tone}`}
      />
    </div>
  </div>
);

export default Dashboard;
