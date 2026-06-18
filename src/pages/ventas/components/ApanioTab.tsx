import React from 'react';
import type { VentasVM } from '../useVentasPage';
import ChannelSummary from './ChannelSummary';
import ImportPreviewTable from './ImportPreviewTable';
import TopProducts from './TopProducts';

const ApanioTab: React.FC<{ vm: VentasVM }> = ({ vm }) => (
  <div className="space-y-6">
    <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
      <div>
        <h3 className="text-xl font-semibold text-slate-900">Apanio</h3>
        <p className="text-sm text-slate-500">Importación CSV de ventas y seguimiento del canal.</p>
      </div>
      <label className="cursor-pointer rounded-xl bg-amber-700 px-4 py-2 text-sm font-semibold text-white hover:bg-amber-800">
        Importar CSV
        <input
          type="file"
          accept=".csv,text/csv"
          className="hidden"
          onChange={event => vm.handleImportCsv(event, 'Apanio')}
        />
      </label>
    </div>
    <ImportPreviewTable
      preview={vm.apanioPreview}
      onConfirm={() => vm.confirmImport('Apanio')}
      onCancel={() => vm.setApanioPreview(null)}
      channelLabel="Apanio"
    />
    <ChannelSummary
      orders={vm.apanioOrders}
      title="Órdenes del mes"
      onStatusChange={vm.handleStatusChange}
    />
    <TopProducts title="Top 5 productos" items={vm.topProductsByChannel('Apanio')} />
  </div>
);

export default ApanioTab;
