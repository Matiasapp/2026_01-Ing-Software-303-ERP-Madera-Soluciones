import React from 'react';
import type { VentasVM } from '../useVentasPage';
import ChannelSummary from './ChannelSummary';
import TopProducts from './TopProducts';

const DirectaTab: React.FC<{ vm: VentasVM }> = ({ vm }) => (
  <div className="space-y-4">
    <div className="flex items-center justify-between gap-4">
      <div>
        <h3 className="text-xl font-semibold text-slate-900">Venta directa</h3>
        <p className="text-sm text-slate-500">
          Ventas fuera de plataformas — presencial, teléfono u otro canal.
        </p>
      </div>
      <button
        type="button"
        onClick={() => vm.setShowSaleModal(true)}
        className="shrink-0 rounded-xl bg-amber-700 px-4 py-2 text-sm font-semibold text-white transition hover:bg-amber-800"
      >
        + Nueva venta directa
      </button>
    </div>

    <ChannelSummary
      orders={vm.directOrders}
      title="Órdenes del mes"
      onStatusChange={vm.handleStatusChange}
    />
    <TopProducts title="Top 5 productos" items={vm.topProductsByChannel('Venta directa')} />
  </div>
);

export default DirectaTab;
