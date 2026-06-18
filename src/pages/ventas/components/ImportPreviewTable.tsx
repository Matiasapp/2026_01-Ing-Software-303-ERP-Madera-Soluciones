import React from 'react';
import { formatCurrency as currency } from '../../../lib/format';
import type { CsvImportPreview } from '../types';

const ImportPreviewTable: React.FC<{
  preview: CsvImportPreview | null;
  onConfirm: () => void;
  onCancel: () => void;
  channelLabel: string;
}> = ({ preview, onConfirm, onCancel, channelLabel }) => {
  if (!preview) return null;

  return (
    <div className="rounded-2xl border border-amber-200 bg-amber-50 p-4">
      <div className="flex items-center justify-between gap-4">
        <div>
          <h4 className="font-semibold text-slate-900">Vista previa · {channelLabel}</h4>
          <p className="text-sm text-slate-500">
            {preview.fileName} — {preview.rows.length} filas
          </p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={onConfirm}
            className="rounded-xl bg-amber-700 px-4 py-2 text-sm font-semibold text-white hover:bg-amber-800"
          >
            Confirmar importación
          </button>
          <button
            onClick={onCancel}
            className="rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50"
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

export default ImportPreviewTable;
