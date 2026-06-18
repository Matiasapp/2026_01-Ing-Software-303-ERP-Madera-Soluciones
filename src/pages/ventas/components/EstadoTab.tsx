import React from 'react';
import { Link } from 'react-router-dom';
import AnimatedNumber from '../../../components/AnimatedNumber';
import { formatCurrency as currency } from '../../../lib/format';
import type { VentasVM } from '../useVentasPage';
import ChannelSummary from './ChannelSummary';
import TopProducts from './TopProducts';
import { MiniStat } from './cards';

const EstadoTab: React.FC<{ vm: VentasVM }> = ({ vm }) => {
  const estadoTotal = vm.estadoOrders.reduce((sum, o) => sum + o.monto, 0);
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-4">
        <div>
          <h3 className="text-xl font-semibold text-slate-900">Estado / Mercado Público</h3>
          <p className="text-sm text-slate-500">
            Órdenes del canal Estado y su situación de cobranza.
          </p>
        </div>
        <Link
          to="/cobranza"
          className="rounded-xl bg-slate-900 px-4 py-2 text-sm font-semibold text-white hover:bg-slate-800"
        >
          Ir a Cobranza →
        </Link>
      </div>

      <div className="grid gap-4 md:grid-cols-4">
        <MiniStat
          label="Monto total Estado"
          value={<AnimatedNumber value={estadoTotal} format={currency} className="tabular-nums" />}
        />
        <MiniStat
          label="Facturas por cobrar"
          value={<AnimatedNumber value={vm.dueThisWeekCount + vm.overdueCount} className="tabular-nums" />}
        />
        <MiniStat
          label="Facturas pagadas"
          value={
            <AnimatedNumber
              value={
                vm.invoices.filter(inv => inv.estado === 'Pagada' || inv.estado === 'Cobrada').length
              }
              className="tabular-nums"
            />
          }
        />
        <MiniStat
          label="Promedio por orden"
          value={
            <AnimatedNumber
              value={vm.estadoOrders.length ? estadoTotal / vm.estadoOrders.length : 0}
              format={currency}
              className="tabular-nums"
            />
          }
        />
      </div>

      <ChannelSummary
        orders={vm.estadoOrders}
        title="Órdenes Estado"
        onStatusChange={vm.handleStatusChange}
      />
      <TopProducts title="Top 5 productos" items={vm.topProductsByChannel('Estado')} />
    </div>
  );
};

export default EstadoTab;
