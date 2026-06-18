import React from 'react';
import type { SortColumn, SortDir } from '../types';

// Primitivos de formulario genéricos viven en components/forms; se re-exportan
// para mantener la API local (los componentes de inventario importan desde './ui').
export { SelectField, TextField } from '../../../components/forms';

export const StatCard: React.FC<{ title: string; value: React.ReactNode; tone: string }> = ({
  title,
  value,
  tone,
}) => (
  <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
    <div className={`inline-flex rounded-full px-3 py-1 text-xs font-semibold ${tone}`}>
      {title}
    </div>
    <div className="mt-3 text-2xl font-semibold text-slate-900">{value}</div>
  </div>
);

export const DetailLine: React.FC<{ label: string; value: string }> = ({ label, value }) => (
  <div className="flex items-center justify-between rounded-xl bg-slate-50 px-3 py-2">
    <span className="text-slate-500">{label}</span>
    <span className="font-semibold text-slate-900">{value}</span>
  </div>
);

export const TabButton: React.FC<{ active: boolean; onClick: () => void; label: string }> = ({
  active,
  onClick,
  label,
}) => (
  <button
    onClick={onClick}
    className={`shrink-0 whitespace-nowrap border-b-2 px-4 py-3 text-sm font-semibold transition ${active ? 'border-amber-700 text-amber-700' : 'border-transparent text-slate-500 hover:text-slate-700'}`}
  >
    {label}
  </button>
);

export const SortTh: React.FC<{
  label: string;
  col: SortColumn;
  sortBy: string;
  sortDir: SortDir;
  onSort: (col: SortColumn) => void;
  className?: string;
}> = ({ label, col, sortBy, sortDir, onSort, className = '' }) => (
  <th
    className={`cursor-pointer select-none whitespace-nowrap px-4 py-3 hover:text-amber-700 ${className}`}
    onClick={() => onSort(col)}
  >
    <span className="flex items-center gap-1">
      {label}
      <span className={`text-[10px] ${sortBy === col ? 'text-amber-600' : 'text-slate-300'}`}>
        {sortBy === col ? (sortDir === 'asc' ? '↑' : '↓') : '↕'}
      </span>
    </span>
  </th>
);

// Envoltorio de modal con cierre al hacer click en el fondo. Encapsula el patrón
// de backdrop (mousedown + click sobre el mismo elemento) que se repetía en cada
// modal, evitando que un drag que termina fuera del modal lo cierre por error.
export const ModalShell: React.FC<{
  onClose: () => void;
  children: React.ReactNode;
  className?: string;
}> = ({ onClose, children, className = 'w-full max-w-2xl' }) => {
  const backdropDown = React.useRef(false);
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4 backdrop-blur-sm"
      onMouseDown={e => {
        backdropDown.current = e.target === e.currentTarget;
      }}
      onClick={e => {
        if (backdropDown.current && e.target === e.currentTarget) onClose();
      }}
    >
      <div className={className}>{children}</div>
    </div>
  );
};

// Encabezado estándar de los modales: título, subtítulo y botón de cierre.
export const ModalHeader: React.FC<{
  title: string;
  subtitle: string;
  onClose: () => void;
}> = ({ title, subtitle, onClose }) => (
  <div className="flex items-center justify-between border-b border-slate-100 px-6 py-4">
    <div>
      <h3 className="text-lg font-semibold text-slate-900">{title}</h3>
      <p className="text-sm text-slate-500">{subtitle}</p>
    </div>
    <button
      type="button"
      onClick={onClose}
      className="flex h-8 w-8 items-center justify-center rounded-full text-slate-400 transition hover:bg-slate-100 hover:text-slate-600"
    >
      ✕
    </button>
  </div>
);
