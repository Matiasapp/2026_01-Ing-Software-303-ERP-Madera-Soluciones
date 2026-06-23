import React from 'react';

// Filtro de rango de fechas (desde/hasta) reutilizable por las pestañas de canal.
const DateRangeFilter: React.FC<{
  desde: string;
  hasta: string;
  onDesde: (value: string) => void;
  onHasta: (value: string) => void;
  onClear: () => void;
}> = ({ desde, hasta, onDesde, onHasta, onClear }) => (
  <div className="flex flex-wrap items-center gap-2">
    <div className="flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2">
      <span className="text-xs text-slate-400">Desde</span>
      <input
        type="date"
        value={desde}
        onChange={e => onDesde(e.target.value)}
        className="bg-transparent text-sm text-slate-700 outline-none"
      />
    </div>
    <div className="flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2">
      <span className="text-xs text-slate-400">Hasta</span>
      <input
        type="date"
        value={hasta}
        onChange={e => onHasta(e.target.value)}
        className="bg-transparent text-sm text-slate-700 outline-none"
      />
    </div>
    {(desde || hasta) && (
      <button
        type="button"
        onClick={onClear}
        className="rounded-xl border border-rose-200 bg-rose-50 px-3 py-2 text-xs font-semibold text-rose-700 hover:bg-rose-100"
      >
        Limpiar filtros
      </button>
    )}
  </div>
);

export default DateRangeFilter;
