import React from 'react';
import { formatCurrency as currency } from '../../../lib/format';
import type { TopProduct } from '../types';

const TopProducts: React.FC<{ title: string; items: TopProduct[] }> = ({ title, items }) => (
  <div>
    <h4 className="mb-3 font-semibold text-slate-900">{title}</h4>
    {items.length === 0 ? (
      <p className="py-4 text-center text-sm text-slate-400">Sin datos de productos aún.</p>
    ) : (
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-5">
        {items.map((item, index) => (
          <div key={item.nombre} className="rounded-xl border border-slate-200 bg-slate-50 p-3">
            <div className="text-xs font-semibold uppercase tracking-wide text-slate-400">
              #{index + 1}
            </div>
            <div className="mt-1 text-sm font-semibold text-slate-900 leading-tight">
              {item.nombre}
            </div>
            <div className="mt-2 text-sm text-slate-500">{item.cantidad} un.</div>
            <div className="text-sm font-medium text-slate-700">{currency(item.monto)}</div>
          </div>
        ))}
      </div>
    )}
  </div>
);

export default TopProducts;
