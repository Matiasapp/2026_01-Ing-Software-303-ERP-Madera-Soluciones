import React from 'react';
import AnimatedNumber from '../components/AnimatedNumber';
import { formatCurrency as currency } from '../lib/format';
import ApanioTab from './ventas/components/ApanioTab';
import DirectaTab from './ventas/components/DirectaTab';
import EstadoTab from './ventas/components/EstadoTab';
import MercadoLibreTab from './ventas/components/MercadoLibreTab';
import SaleModal from './ventas/components/SaleModal';
import TodasTab from './ventas/components/TodasTab';
import { KpiCard } from './ventas/components/cards';
import { useVentasPage } from './ventas/useVentasPage';

const Ventas: React.FC = () => {
  const vm = useVentasPage();

  return (
    <section className="space-y-6">
      <SaleModal vm={vm} />

      <header className="rounded-2xl border border-amber-900/20 bg-[linear-gradient(135deg,_#1c1005_0%,_#6b3a1f_52%,_#c27d3a_100%)] px-6 py-5 text-white shadow-[0_24px_60px_rgba(120,53,15,0.22)]">
        <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <div>
            <p className="text-sm/6 text-amber-100">Módulo de Ventas</p>
            <h2 className="text-3xl font-semibold">Ventas por canal</h2>
          </div>
          <div className="flex flex-wrap gap-2">
            <button
              onClick={vm.exportSalesMonthly}
              className="rounded-xl border border-white/20 bg-white/10 px-4 py-2 text-sm font-semibold text-white transition hover:bg-white/20"
            >
              Reporte ventas mensual
            </button>
            <button
              onClick={vm.exportInventoryReport}
              className="rounded-xl border border-white/20 bg-white/10 px-4 py-2 text-sm font-semibold text-white transition hover:bg-white/20"
            >
              Reporte inventario
            </button>
            <button
              onClick={vm.exportBillingReport}
              className="rounded-xl border border-white/20 bg-white/10 px-4 py-2 text-sm font-semibold text-white transition hover:bg-white/20"
            >
              Reporte cobranza Estado
            </button>
          </div>
        </div>
      </header>

      <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
        <KpiCard
          title="Ventas mes actual"
          value={<AnimatedNumber value={vm.currentMonthTotal} format={currency} className="tabular-nums" />}
        />
        <KpiCard
          title="Pedidos Mercado Libre"
          value={<AnimatedNumber value={vm.marketLibreOrders.length} className="tabular-nums" />}
        />
        <KpiCard
          title="Pedidos Apanio"
          value={<AnimatedNumber value={vm.apanioOrders.length} className="tabular-nums" />}
        />
        <KpiCard
          title="Ventas directas"
          value={<AnimatedNumber value={vm.directOrders.length} className="tabular-nums" />}
        />
      </div>

      <div className="rounded-2xl border border-slate-200 bg-white shadow-sm">
        <div className="flex overflow-x-auto border-b border-slate-200">
          {vm.tabs.map(tab => (
            <button
              key={tab.id}
              type="button"
              onClick={() => vm.setActiveTab(tab.id)}
              className={`flex shrink-0 items-center gap-2 px-4 py-4 text-sm font-semibold whitespace-nowrap transition sm:px-6 ${
                vm.activeTab === tab.id
                  ? 'border-b-2 border-amber-700 text-amber-800'
                  : 'text-slate-500 hover:text-slate-700'
              }`}
            >
              {tab.label}
              {tab.count !== undefined && (
                <span
                  className={`rounded-full px-2 py-0.5 text-xs font-semibold ${vm.activeTab === tab.id ? 'bg-amber-100 text-amber-700' : 'bg-slate-100 text-slate-500'}`}
                >
                  {tab.count}
                </span>
              )}
            </button>
          ))}
        </div>

        <div className="p-6">
          {vm.activeTab === 'todas' && <TodasTab vm={vm} />}
          {vm.activeTab === 'ml' && <MercadoLibreTab vm={vm} />}
          {vm.activeTab === 'apanio' && <ApanioTab vm={vm} />}
          {vm.activeTab === 'directa' && <DirectaTab vm={vm} />}
          {vm.activeTab === 'estado' && <EstadoTab vm={vm} />}
        </div>
      </div>
    </section>
  );
};

export default Ventas;
