import React from 'react';
import type { MlOrigin } from '../types';
import type { VentasVM } from '../useVentasPage';
import ChannelSummary from './ChannelSummary';
import ImportPreviewTable from './ImportPreviewTable';
import TopProducts from './TopProducts';

const MercadoLibreTab: React.FC<{ vm: VentasVM }> = ({ vm }) => (
  <div className="space-y-6">
    <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
      <div>
        <h3 className="text-xl font-semibold text-slate-900">Mercado Libre</h3>
        <p className="text-sm text-slate-500">Importación CSV, órdenes del mes y top productos.</p>
      </div>
      <div className="flex items-center gap-2">
        <select
          value={vm.mlOrigin}
          onChange={event => vm.setMlOrigin(event.target.value as MlOrigin)}
          className="rounded-xl border border-slate-200 px-3 py-2 text-sm outline-none focus:border-amber-400 focus:ring-4 focus:ring-amber-100"
        >
          <option value="ML Full">ML Full</option>
          <option value="ML Flex">ML Flex</option>
          <option value="ML Envíos">ML Envíos</option>
        </select>
        <label className="cursor-pointer rounded-xl bg-amber-700 px-4 py-2 text-sm font-semibold text-white hover:bg-amber-800">
          Importar CSV
          <input
            type="file"
            accept=".csv,text/csv"
            className="hidden"
            onChange={event => vm.handleImportCsv(event, 'Mercado Libre')}
          />
        </label>
      </div>
    </div>
    <ImportPreviewTable
      preview={vm.mlPreview}
      onConfirm={() => vm.confirmImport('Mercado Libre')}
      onCancel={() => vm.setMlPreview(null)}
      channelLabel="Mercado Libre"
    />
    <ChannelSummary
      orders={vm.marketLibreOrders}
      title="Órdenes del mes"
      onStatusChange={vm.handleStatusChange}
    />
    <TopProducts title="Top 5 productos" items={vm.topProductsByChannel('Mercado Libre')} />
  </div>
);

export default MercadoLibreTab;
