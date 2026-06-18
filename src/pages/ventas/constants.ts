import type { OrderStatus } from '../../context/SalesContext';
import type { SaleLine } from './types';

export const emptyLine = (): SaleLine => ({ productoId: '', cantidad: '1', monto: '' });

export const ORDER_STATUS_STYLES: Record<OrderStatus, string> = {
  Pendiente: 'bg-slate-100 text-slate-600',
  'En preparación': 'bg-amber-100 text-amber-700',
  Despachado: 'bg-blue-100 text-blue-700',
  Entregado: 'bg-emerald-100 text-emerald-700',
  Cancelado: 'bg-rose-100 text-rose-600',
};

export const ORDER_STATUSES: OrderStatus[] = [
  'Pendiente',
  'En preparación',
  'Despachado',
  'Entregado',
  'Cancelado',
];
