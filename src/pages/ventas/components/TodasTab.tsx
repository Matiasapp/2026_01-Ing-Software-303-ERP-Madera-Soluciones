import React from 'react';
import type { SalesChannel } from '../../../context/SalesContext';
import { formatCurrency as currency } from '../../../lib/format';
import type { VentasVM } from '../useVentasPage';
import { OrderStatusBadge, OrderStatusSelect } from './status';
import TopProducts from './TopProducts';

const TodasTab: React.FC<{ vm: VentasVM }> = ({ vm }) => (
  <div className="space-y-4">
    <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
      <div>
        <h3 className="text-xl font-semibold text-slate-900">Todas las ventas</h3>
        <p className="text-sm text-slate-500">
          {vm.allOrdersFiltered.length} de {vm.orders.length} órdenes
        </p>
      </div>
    </div>

    <div className="flex flex-wrap gap-2">
      <input
        value={vm.allSearch}
        onChange={e => vm.setAllSearch(e.target.value)}
        placeholder="Buscar por referencia o cliente…"
        className="w-64 rounded-xl border border-slate-200 px-3 py-2 text-sm outline-none focus:border-amber-400 focus:ring-4 focus:ring-amber-100"
      />
      <select
        value={vm.allCanal}
        onChange={e => vm.setAllCanal(e.target.value as SalesChannel | 'Todos')}
        className="rounded-xl border border-slate-200 px-3 py-2 text-sm outline-none focus:border-amber-400 focus:ring-4 focus:ring-amber-100"
      >
        <option value="Todos">Todos los canales</option>
        <option value="Mercado Libre">Mercado Libre</option>
        <option value="Apanio">Apanio</option>
        <option value="Venta directa">Venta directa</option>
        <option value="Estado">Estado</option>
      </select>
      <div className="flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2">
        <span className="text-xs text-slate-400">Desde</span>
        <input
          type="date"
          value={vm.allDesde}
          onChange={e => vm.setAllDesde(e.target.value)}
          className="bg-transparent text-sm text-slate-700 outline-none"
        />
      </div>
      <div className="flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2">
        <span className="text-xs text-slate-400">Hasta</span>
        <input
          type="date"
          value={vm.allHasta}
          onChange={e => vm.setAllHasta(e.target.value)}
          className="bg-transparent text-sm text-slate-700 outline-none"
        />
      </div>
      {(vm.allSearch || vm.allCanal !== 'Todos' || vm.allDesde || vm.allHasta) && (
        <button
          type="button"
          onClick={vm.clearAllFilters}
          className="rounded-xl border border-rose-200 bg-rose-50 px-3 py-2 text-xs font-semibold text-rose-700 hover:bg-rose-100"
        >
          Limpiar filtros
        </button>
      )}
    </div>

    {vm.allOrdersFiltered.length === 0 ? (
      <p className="py-8 text-center text-sm text-slate-400">
        Sin órdenes para los filtros seleccionados.
      </p>
    ) : (
      <div className="overflow-auto rounded-xl border border-slate-200">
        <table className="min-w-full text-sm">
          <thead className="bg-slate-50 text-left text-xs uppercase tracking-wide text-slate-500">
            <tr>
              <th className="w-6 px-2 py-2" />
              <th className="px-3 py-2">Fecha</th>
              <th className="px-3 py-2">Referencia</th>
              <th className="px-3 py-2">Cliente</th>
              <th className="px-3 py-2">Canal</th>
              <th className="px-3 py-2">Estado</th>
              <th className="px-3 py-2 text-right">Monto</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 bg-white">
            {vm.allOrdersFiltered.map(order => {
              const isExpanded = vm.expandedRows.has(order.id);
              return (
                <React.Fragment key={order.id}>
                  <tr className="cursor-pointer hover:bg-slate-50" onClick={() => vm.toggleRow(order.id)}>
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
                    <td className="px-3 py-2 text-slate-500">{order.fecha}</td>
                    <td className="px-3 py-2 font-medium text-slate-900">{order.referencia}</td>
                    <td className="px-3 py-2 text-slate-600">{order.cliente}</td>
                    <td className="px-3 py-2">
                      <span className="rounded-full bg-slate-100 px-2.5 py-0.5 text-xs font-semibold text-slate-600">
                        {order.canal}
                      </span>
                    </td>
                    <td className="px-3 py-2">
                      <OrderStatusBadge estado={order.estado} />
                    </td>
                    <td className="px-3 py-2 text-right font-medium text-slate-800">
                      {currency(order.monto)}
                    </td>
                  </tr>
                  {isExpanded && (
                    <tr className="bg-amber-50/60">
                      <td />
                      <td colSpan={6} className="px-4 py-3 space-y-3">
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-medium text-slate-500">Estado:</span>
                          <OrderStatusSelect
                            value={order.estado}
                            onChange={estado => vm.handleStatusChange(order.id, estado)}
                          />
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
                                  <td className="py-1 text-right text-slate-600">{item.cantidad}</td>
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
          <tfoot className="border-t border-slate-200 bg-slate-50">
            <tr>
              <td
                colSpan={6}
                className="px-3 py-2 text-xs font-semibold uppercase tracking-wide text-slate-500"
              >
                Total filtrado
              </td>
              <td className="px-3 py-2 text-right font-semibold text-slate-900">
                {currency(vm.allOrdersFiltered.reduce((sum, o) => sum + o.monto, 0))}
              </td>
            </tr>
          </tfoot>
        </table>
      </div>
    )}
    <TopProducts title="Top 5 productos (todos los canales)" items={vm.topProductsAll} />
  </div>
);

export default TodasTab;
