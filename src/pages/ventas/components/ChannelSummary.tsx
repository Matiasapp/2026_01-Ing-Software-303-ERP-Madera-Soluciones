import React, { useState } from 'react';
import type { OrderStatus, SalesOrder } from '../../../context/SalesContext';
import { formatCurrency as currency, formatTime } from '../../../lib/format';
import { OrderStatusBadge, OrderStatusSelect } from './status';

const ChannelSummary: React.FC<{
  title: string;
  orders: SalesOrder[];
  onStatusChange: (id: number, estado: OrderStatus) => void;
}> = ({ title, orders, onStatusChange }) => {
  const [expandedRows, setExpandedRows] = useState<Set<number>>(new Set());
  const toggle = (id: number) =>
    setExpandedRows(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });

  return (
    <div>
      <div className="mb-3 flex items-center justify-between gap-4">
        <h4 className="font-semibold text-slate-900">{title}</h4>
        <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-600">
          {orders.length} órdenes
        </span>
      </div>
      {orders.length === 0 ? (
        <p className="py-6 text-center text-sm text-slate-400">Sin órdenes registradas.</p>
      ) : (
        <div className="overflow-auto rounded-xl border border-slate-200">
          <table className="min-w-full text-sm">
            <thead className="bg-slate-50 text-left text-xs uppercase tracking-wide text-slate-500">
              <tr>
                <th className="w-6 px-2 py-2" />
                <th className="px-3 py-2">Fecha y hora</th>
                <th className="px-3 py-2">Referencia</th>
                <th className="px-3 py-2">Cliente</th>
                <th className="px-3 py-2">Estado</th>
                <th className="px-3 py-2">Monto</th>
                <th className="px-3 py-2">Origen</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 bg-white">
              {orders.map(order => {
                const isExpanded = expandedRows.has(order.id);
                return (
                  <React.Fragment key={order.id}>
                    <tr
                      className="cursor-pointer hover:bg-slate-50"
                      onClick={() => toggle(order.id)}
                    >
                      <td className="px-2 py-2 text-slate-400">
                        <svg
                          className={`h-3.5 w-3.5 transition-transform ${isExpanded ? 'rotate-90' : ''}`}
                          fill="none"
                          viewBox="0 0 24 24"
                          stroke="currentColor"
                          strokeWidth={2.5}
                        >
                          <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
                        </svg>
                      </td>
                      <td className="px-3 py-2 text-slate-500">
                        {order.fecha}
                        {order.createdAt && (
                          <span className="ml-2 text-xs text-slate-400">
                            {formatTime(order.createdAt)}
                          </span>
                        )}
                      </td>
                      <td className="px-3 py-2 font-medium text-slate-900">{order.referencia}</td>
                      <td className="px-3 py-2 text-slate-600">{order.cliente}</td>
                      <td className="px-3 py-2">
                        <OrderStatusBadge estado={order.estado} />
                      </td>
                      <td className="px-3 py-2 text-slate-700">{currency(order.monto)}</td>
                      <td className="px-3 py-2 text-slate-500">{order.origen}</td>
                    </tr>
                    {isExpanded && (
                      <tr className="bg-amber-50/60">
                        <td />
                        <td colSpan={6} className="px-4 py-3 space-y-3">
                          <div className="flex items-center gap-2">
                            <span className="text-xs font-medium text-slate-500">Estado:</span>
                            {order.canal === 'Mercado Libre' ? (
                              <>
                                <OrderStatusBadge estado={order.estado} />
                                <span className="text-xs text-slate-400">
                                  Gestionado por Mercado Libre
                                </span>
                              </>
                            ) : (
                              <OrderStatusSelect
                                value={order.estado}
                                onChange={estado => onStatusChange(order.id, estado)}
                              />
                            )}
                          </div>
                          {order.productos.length === 0 ? (
                            <span className="text-xs text-slate-400">Sin detalle de productos.</span>
                          ) : (
                            <table className="w-full text-xs">
                              <thead>
                                <tr className="text-left text-slate-500">
                                  <th className="pb-1 font-medium">Producto</th>
                                  <th className="pb-1 font-medium text-right">Cantidad</th>
                                  <th className="pb-1 font-medium text-right">Subtotal</th>
                                </tr>
                              </thead>
                              <tbody className="divide-y divide-amber-100">
                                {order.productos.map((item, i) => (
                                  <tr key={i}>
                                    <td className="py-1 text-slate-700">{item.nombre}</td>
                                    <td className="py-1 text-right text-slate-600">
                                      {item.cantidad}
                                    </td>
                                    <td className="py-1 text-right font-medium text-slate-800">
                                      {currency(item.monto)}
                                    </td>
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                          )}
                        </td>
                      </tr>
                    )}
                  </React.Fragment>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};

export default ChannelSummary;
