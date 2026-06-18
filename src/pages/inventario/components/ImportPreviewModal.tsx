import React from 'react';
import type { ImportPreview } from '../types';
import { ModalHeader, ModalShell } from './ui';

type ImportPreviewModalProps = {
  preview: ImportPreview | null;
  onConfirm: () => void;
  onCancel: () => void;
};

const ImportPreviewModal: React.FC<ImportPreviewModalProps> = ({
  preview,
  onConfirm,
  onCancel,
}) => {
  if (!preview) return null;
  return (
    <ModalShell
      onClose={onCancel}
      className="w-full max-w-2xl rounded-3xl border border-slate-200 bg-white shadow-xl"
    >
      <ModalHeader
        title="Previsualización de importación"
        subtitle={`Archivo: ${preview.rawName} · ${preview.rows.length} productos`}
        onClose={onCancel}
      />
      <div className="max-h-96 overflow-auto p-6">
        <table className="min-w-full divide-y divide-slate-100 text-sm">
          <thead className="bg-slate-50 text-left text-xs uppercase tracking-wide text-slate-500">
            <tr>
              <th className="px-3 py-2">SKU</th>
              <th className="px-3 py-2">Nombre</th>
              <th className="px-3 py-2">Categoría</th>
              <th className="px-3 py-2">Stock</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 bg-white">
            {preview.rows.map(row => (
              <tr key={row.id}>
                <td className="px-3 py-2 font-mono text-slate-700">{row.sku}</td>
                <td className="px-3 py-2 text-slate-900">{row.nombre}</td>
                <td className="px-3 py-2 text-slate-600">{row.categoria}</td>
                <td className="px-3 py-2 text-slate-600">{row.stockActual}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div className="flex gap-2 border-t border-slate-100 px-6 py-4">
        <button
          onClick={onConfirm}
          className="rounded-xl bg-amber-700 px-4 py-2.5 text-sm font-semibold text-white hover:bg-amber-800"
        >
          Confirmar importación
        </button>
        <button
          onClick={onCancel}
          className="rounded-xl border border-slate-200 px-4 py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-50"
        >
          Cancelar
        </button>
      </div>
    </ModalShell>
  );
};

export default ImportPreviewModal;
