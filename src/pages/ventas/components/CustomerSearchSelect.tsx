import React, { useEffect, useMemo, useRef, useState } from 'react';
import type { DirectCustomer } from '../../../context/SalesContext';

const CustomerSearchSelect: React.FC<{
  customers: DirectCustomer[];
  selectedId: string;
  onSelect: (id: string) => void;
}> = ({ customers, selectedId, onSelect }) => {
  const [query, setQuery] = useState('');
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  const selected = customers.find(c => String(c.id) === selectedId);

  useEffect(() => {
    const handler = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setOpen(false);
        setQuery('');
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return customers;
    return customers.filter(
      c =>
        c.nombre.toLowerCase().includes(q) ||
        (c.correo ?? '').toLowerCase().includes(q) ||
        (c.telefono ?? '').toLowerCase().includes(q)
    );
  }, [customers, query]);

  const selectedLabel = selected
    ? `${selected.nombre}${selected.correo ? ` · ${selected.correo}` : ''}`
    : '';

  const choose = (id: string) => {
    onSelect(id);
    setOpen(false);
    setQuery('');
  };

  return (
    <div ref={containerRef} className="relative">
      <input
        type="text"
        value={open ? query : selectedLabel}
        onChange={event => {
          setQuery(event.target.value);
          setOpen(true);
        }}
        onFocus={() => {
          setOpen(true);
          setQuery('');
        }}
        placeholder="Buscar por nombre, correo o teléfono…"
        className="w-full rounded-xl border border-slate-200 px-3 py-2 pr-8 text-sm outline-none transition focus:border-amber-400 focus:ring-4 focus:ring-amber-100"
      />
      {selected && !open && (
        <button
          type="button"
          onClick={() => choose('')}
          aria-label="Quitar cliente seleccionado"
          className="absolute right-2 top-1/2 -translate-y-1/2 rounded-lg p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-600"
        >
          ✕
        </button>
      )}
      {open && (
        <div className="absolute z-10 mt-1 max-h-56 w-full overflow-auto rounded-xl border border-slate-200 bg-white py-1 shadow-lg">
          <button
            type="button"
            onClick={() => choose('')}
            className="block w-full px-3 py-2 text-left text-sm font-medium text-amber-700 hover:bg-amber-50"
          >
            + Nuevo cliente…
          </button>
          {filtered.length === 0 ? (
            <p className="px-3 py-2 text-sm text-slate-400">Sin coincidencias.</p>
          ) : (
            filtered.map(c => (
              <button
                key={c.id}
                type="button"
                onClick={() => choose(String(c.id))}
                className={`block w-full px-3 py-2 text-left hover:bg-slate-50 ${String(c.id) === selectedId ? 'bg-amber-50' : ''}`}
              >
                <span className="block text-sm font-medium text-slate-800">{c.nombre}</span>
                <span className="block text-xs text-slate-400">
                  {[c.correo, c.telefono].filter(Boolean).join(' · ') || 'Sin contacto'}
                </span>
              </button>
            ))
          )}
        </div>
      )}
    </div>
  );
};

export default CustomerSearchSelect;
