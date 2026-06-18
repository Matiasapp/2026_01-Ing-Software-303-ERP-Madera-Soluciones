import React from 'react';
import { formatDate } from '../../../lib/format';
import type { InventarioVM } from '../useInventarioPage';

const MovimientosTab: React.FC<{ vm: InventarioVM }> = ({ vm }) => (
  <div className="mt-5">
    <div className="mb-4 space-y-3">
      <div className="flex items-center justify-between gap-4">
        <div>
          <h4 className="font-semibold text-slate-900">Historial de entradas y salidas</h4>
          <p className="text-sm text-slate-500">
            {vm.movements.length} movimientos
            {vm.movDesde || vm.movHasta ? ' en el período' : ' más recientes'}.
          </p>
        </div>
        <button
          type="button"
          onClick={vm.openMovementModal}
          className="shrink-0 rounded-xl bg-amber-700 px-4 py-2 text-sm font-semibold text-white transition hover:bg-amber-800"
        >
          + Registrar movimiento
        </button>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <div className="flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-1.5">
          <span className="text-xs text-slate-400 shrink-0">Desde</span>
          <input
            type="date"
            value={vm.movDesde}
            onChange={e => vm.handleMovDesde(e.target.value)}
            className="bg-transparent text-sm text-slate-700 outline-none"
          />
        </div>
        <div className="flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-1.5">
          <span className="text-xs text-slate-400 shrink-0">Hasta</span>
          <input
            type="date"
            value={vm.movHasta}
            onChange={e => vm.handleMovHasta(e.target.value)}
            className="bg-transparent text-sm text-slate-700 outline-none"
          />
        </div>
        {(vm.movDesde || vm.movHasta) && (
          <button
            type="button"
            onClick={vm.clearMovFilters}
            className="rounded-xl border border-rose-200 bg-rose-50 px-3 py-1.5 text-xs font-semibold text-rose-700 hover:bg-rose-100"
          >
            Limpiar
          </button>
        )}
        {vm.isLoadingMovements && <span className="text-xs text-slate-400">Cargando…</span>}
      </div>
    </div>

    <div className="overflow-hidden rounded-2xl border border-slate-200">
      <div className="max-h-[1000px] overflow-y-auto overflow-x-auto">
        <table className="min-w-[700px] w-full divide-y divide-slate-200 text-sm">
          <thead className="bg-slate-50 text-left text-xs uppercase tracking-wide text-slate-500 sticky top-0">
            <tr>
              <th className="px-4 py-3 whitespace-nowrap">#</th>
              <th className="px-4 py-3 whitespace-nowrap">Tipo</th>
              <th className="px-4 py-3">Producto</th>
              <th className="px-4 py-3">Movimiento</th>
              <th className="px-4 py-3 whitespace-nowrap">Fecha</th>
              <th className="px-4 py-3">Canal</th>
              <th className="px-4 py-3 text-right whitespace-nowrap">Cantidad</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 bg-white">
            {vm.movements.length === 0 ? (
              <tr>
                <td colSpan={7} className="px-4 py-8 text-center text-sm text-slate-400">
                  No hay movimientos registrados aún.
                </td>
              </tr>
            ) : (
              vm.movements.map(movement => {
                const product = vm.products.find(item => item.id === movement.productId);
                const isEntrada = movement.tipo === 'entrada por compra';
                const isSalida = movement.tipo.startsWith('salida');
                const badgeStyle = isEntrada
                  ? 'bg-emerald-100 text-emerald-700'
                  : isSalida
                    ? 'bg-rose-100 text-rose-700'
                    : 'bg-amber-100 text-amber-700';
                const qtyStyle = isEntrada
                  ? 'text-emerald-700'
                  : isSalida
                    ? 'text-rose-700'
                    : 'text-amber-700';
                const arrow = isEntrada ? '↑' : isSalida ? '↓' : '↕';
                return (
                  <tr key={movement.id} className="hover:bg-slate-50 transition">
                    <td className="px-4 py-3 text-xs font-mono text-slate-500">#{movement.id}</td>
                    <td className="px-4 py-3">
                      <span
                        className={`inline-flex h-7 w-7 items-center justify-center rounded-lg text-sm font-bold ${badgeStyle}`}
                      >
                        {arrow}
                      </span>
                    </td>
                    <td className="px-4 py-3 font-medium text-slate-900">
                      {product?.nombre ?? 'Producto eliminado'}
                    </td>
                    <td className="px-4 py-3 text-slate-500 text-xs">{movement.tipo}</td>
                    <td className="px-4 py-3 whitespace-nowrap text-slate-600">
                      {formatDate(movement.fecha)}
                    </td>
                    <td className="px-4 py-3 text-slate-600">{movement.canal}</td>
                    <td className={`px-4 py-3 text-right font-semibold ${qtyStyle}`}>
                      {isEntrada ? '+' : isSalida ? '−' : ''}
                      {movement.cantidad}
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
    </div>
  </div>
);

export default MovimientosTab;
