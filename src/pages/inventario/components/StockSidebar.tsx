import React from 'react';
import { formatCurrency } from '../../../lib/format';
import type { InventarioVM } from '../useInventarioPage';
import { DetailLine } from './ui';

const StockSidebar: React.FC<{ vm: InventarioVM }> = ({ vm }) => {
  const { selectedProduct } = vm;
  return (
    <aside className="space-y-6">
      <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <div className="flex items-center justify-between gap-4">
          <div>
            <h3 className="text-xl font-semibold text-slate-900">Alertas de stock mínimo</h3>
            <p className="text-sm text-slate-500">Productos bajo stock mínimo.</p>
          </div>
          <span className="rounded-full bg-rose-100 px-3 py-1 text-xs font-semibold text-rose-700">
            {vm.lowStockCount}
          </span>
        </div>
        <div className="mt-4 space-y-3">
          {vm.lowStockSorted.map(product => {
            const supplier = vm.findSupplierByProduct(product);
            return (
              <div key={product.id} className="rounded-xl border border-rose-100 bg-rose-50 p-3">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <div className="font-medium text-slate-900">{product.nombre}</div>
                    <div className="text-sm text-slate-500">
                      Stock {product.stockActual} / mínimo {product.stockMinimo}
                    </div>
                  </div>
                </div>
                <div className="mt-2 text-xs text-slate-500">
                  Proveedor sugerido: {supplier?.nombre ?? product.proveedor}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <h3 className="text-xl font-semibold text-slate-900">Vista detalle</h3>
        {selectedProduct ? (
          <div className="mt-4 space-y-3">
            <div className="rounded-xl bg-slate-50 p-3">
              <div className="text-xs font-semibold uppercase tracking-wide text-slate-500">SKU</div>
              <div className="text-sm font-semibold text-slate-900">{selectedProduct.sku}</div>
            </div>
            <div className="rounded-xl bg-slate-50 p-3">
              <div className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                Estado de stock
              </div>
              <div
                className={`mt-1 inline-flex rounded-full px-3 py-1 text-xs font-semibold ${selectedProduct.stockActual <= selectedProduct.stockMinimo ? 'bg-rose-100 text-rose-700' : 'bg-emerald-100 text-emerald-700'}`}
              >
                {selectedProduct.stockActual <= selectedProduct.stockMinimo
                  ? 'Bajo mínimo'
                  : 'Saludable'}
              </div>
            </div>
            <div className="grid gap-2 text-sm text-slate-600">
              <DetailLine label="Precio ML" value={formatCurrency(selectedProduct.precioML)} />
              <DetailLine
                label="Precio sitio web"
                value={formatCurrency(selectedProduct.precioSitioWeb)}
              />
              <DetailLine
                label="Precio Estado"
                value={formatCurrency(selectedProduct.precioEstado)}
              />
              <DetailLine label="Proveedor" value={selectedProduct.proveedor} />
            </div>
          </div>
        ) : (
          <div className="mt-4 text-sm text-slate-500">No hay un producto seleccionado.</div>
        )}
      </div>
    </aside>
  );
};

export default StockSidebar;
