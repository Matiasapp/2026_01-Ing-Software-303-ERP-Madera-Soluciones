import React from 'react';
import type { OrderStatus } from '../../../context/SalesContext';
import { ORDER_STATUS_STYLES, ORDER_STATUSES } from '../constants';

export const OrderStatusBadge: React.FC<{ estado: OrderStatus }> = ({ estado }) => (
  <span
    className={`inline-block rounded-full px-2.5 py-0.5 text-xs font-semibold ${ORDER_STATUS_STYLES[estado] ?? 'bg-slate-100 text-slate-600'}`}
  >
    {estado}
  </span>
);

export const OrderStatusSelect: React.FC<{
  value: OrderStatus;
  onChange: (v: OrderStatus) => void;
}> = ({ value, onChange }) => (
  <select
    value={value}
    onChange={e => onChange(e.target.value as OrderStatus)}
    onClick={e => e.stopPropagation()}
    className="rounded-lg border border-slate-200 px-2 py-1 text-xs font-medium outline-none focus:border-amber-400 focus:ring-2 focus:ring-amber-100"
  >
    {ORDER_STATUSES.map(s => (
      <option key={s} value={s}>
        {s}
      </option>
    ))}
  </select>
);
