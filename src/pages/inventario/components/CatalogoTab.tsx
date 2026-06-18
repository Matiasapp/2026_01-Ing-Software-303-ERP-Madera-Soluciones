import React from 'react';
import { formatCurrency } from '../../../lib/format';
import { categoryOptions, statusOptions } from '../constants';
import type { FilterCategoria, FilterEstado, SortColumn } from '../types';
import type { InventarioVM } from '../useInventarioPage';
import { SortTh } from './ui';

const CatalogoTab: React.FC<{ vm: InventarioVM }> = ({ vm }) => (
  <>
    <div className="mt-5 space-y-2">
      <div className="flex flex-wrap items-center gap-2">
        <input
          value={vm.catalogSearch}
          onChange={e => vm.setCatalogSearch(e.target.value)}
          placeholder="Buscar por SKU, nombre, categoría o proveedor…"
          className="min-w-0 flex-1 rounded-xl border border-slate-200 px-3 py-2 text-sm outline-none transition focus:border-amber-400 focus:ring-4 focus:ring-amber-100"
        />
        <button
          type="button"
          onClick={vm.startCreateProduct}
          className="shrink-0 rounded-xl bg-amber-700 px-4 py-2 text-sm font-semibold text-white transition hover:bg-amber-800"
        >
          + Nuevo producto
        </button>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <select
          value={vm.filterCategoria}
          onChange={e => vm.setFilterCategoria(e.target.value as FilterCategoria)}
          className="rounded-xl border border-slate-200 bg-white px-3 py-1.5 text-sm text-slate-700 outline-none transition focus:border-amber-400 focus:ring-2 focus:ring-amber-100"
        >
          <option value="todas">Todas las categorías</option>
          {categoryOptions.map(c => (
            <option key={c} value={c}>
              {c}
            </option>
          ))}
        </select>

        <select
          value={vm.filterEstado}
          onChange={e => vm.setFilterEstado(e.target.value as FilterEstado)}
          className="rounded-xl border border-slate-200 bg-white px-3 py-1.5 text-sm text-slate-700 outline-none transition focus:border-amber-400 focus:ring-2 focus:ring-amber-100"
        >
          <option value="todos">Todos los estados</option>
          {statusOptions.map(s => (
            <option key={s} value={s}>
              {s}
            </option>
          ))}
          <option value="bajo_stock">Bajo stock mínimo</option>
        </select>

        <div className="flex items-center gap-1 rounded-xl border border-slate-200 bg-white px-3 py-1.5 text-sm text-slate-700">
          <span className="text-slate-400">Ordenar:</span>
          <select
            value={vm.sortBy}
            onChange={e => vm.setSortBy(e.target.value as SortColumn)}
            className="bg-transparent text-sm text-slate-700 outline-none"
          >
            <option value="nombre">Nombre</option>
            <option value="sku">SKU</option>
            <option value="categoria">Categoría</option>
            <option value="stock">Stock</option>
            <option value="precio_ml">Precio ML</option>
          </select>
          <button
            type="button"
            onClick={() => vm.setSortDir(d => (d === 'asc' ? 'desc' : 'asc'))}
            className="ml-1 font-semibold text-amber-700 hover:text-amber-900"
            title={vm.sortDir === 'asc' ? 'Ascendente' : 'Descendente'}
          >
            {vm.sortDir === 'asc' ? '↑' : '↓'}
          </button>
        </div>

        {(vm.activeFilters > 0 || vm.catalogSearch) && (
          <button
            type="button"
            onClick={vm.clearCatalogFilters}
            className="rounded-xl border border-rose-200 bg-rose-50 px-3 py-1.5 text-xs font-semibold text-rose-700 hover:bg-rose-100"
          >
            Limpiar filtros {vm.activeFilters > 0 && `(${vm.activeFilters})`}
          </button>
        )}

        <span className="ml-auto text-xs text-slate-400">
          {vm.filteredProducts.length} de {vm.products.length} productos
        </span>
      </div>
    </div>

    <div className="mt-4">
      <div className="overflow-hidden rounded-2xl border border-slate-200">
        <div className="max-h-[1000px] overflow-y-auto overflow-x-auto">
          <table className="min-w-[900px] w-full divide-y divide-slate-200 text-sm">
            <thead className="bg-slate-50 text-left text-xs uppercase tracking-wide text-slate-500">
              <tr>
                <SortTh
                  label="Producto"
                  col="nombre"
                  sortBy={vm.sortBy}
                  sortDir={vm.sortDir}
                  onSort={vm.toggleSort}
                />
                <SortTh
                  label="SKU"
                  col="sku"
                  sortBy={vm.sortBy}
                  sortDir={vm.sortDir}
                  onSort={vm.toggleSort}
                />
                <SortTh
                  label="Categoría"
                  col="categoria"
                  sortBy={vm.sortBy}
                  sortDir={vm.sortDir}
                  onSort={vm.toggleSort}
                  className="text-center"
                />
                <th className="px-4 py-3">Proveedor</th>
                <SortTh
                  label="Precio ML"
                  col="precio_ml"
                  sortBy={vm.sortBy}
                  sortDir={vm.sortDir}
                  onSort={vm.toggleSort}
                />
                <SortTh
                  label="Stock"
                  col="stock"
                  sortBy={vm.sortBy}
                  sortDir={vm.sortDir}
                  onSort={vm.toggleSort}
                />
                <th className="px-4 py-3 whitespace-nowrap text-center">Estado</th>
                <th className="px-4 py-3">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 bg-white">
              {vm.filteredProducts.map(product => {
                const isLow =
                  product.estado === 'activo' && product.stockActual <= product.stockMinimo;
                const stockPct =
                  product.stockMinimo > 0
                    ? Math.min(100, (product.stockActual / (product.stockMinimo * 2)) * 100)
                    : 100;
                return (
                  <tr
                    key={product.id}
                    onClick={() => vm.setSelectedProductId(product.id)}
                    className={`cursor-pointer transition hover:bg-slate-50 ${vm.selectedProductId === product.id ? 'bg-amber-50/60' : ''}`}
                  >
                    <td className="px-4 py-3">
                      <div className="font-medium text-slate-900">{product.nombre}</div>
                    </td>
                    <td className="px-4 py-3 text-xs font-mono text-slate-900 whitespace-nowrap">
                      {product.sku}
                    </td>
                    <td className="px-4 py-3 text-center">
                      <span className="rounded-full bg-slate-100 px-2.5 py-1 text-xs font-medium text-slate-600">
                        {product.categoria}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-slate-600">{product.proveedor}</td>
                    <td className="px-4 py-3 font-medium text-slate-800">
                      {formatCurrency(product.precioML)}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex flex-col gap-1.5">
                        <span
                          className={`text-xs font-semibold ${isLow ? 'text-rose-600' : 'text-slate-700'}`}
                        >
                          {product.stockActual} / {product.stockMinimo} {product.unidadMedida}
                        </span>
                        <div className="h-1.5 w-20 overflow-hidden rounded-full bg-slate-200">
                          <div
                            className={`h-full rounded-full transition-all ${isLow ? 'bg-rose-400' : 'bg-emerald-500'}`}
                            style={{ width: `${Math.max(4, stockPct)}%` }}
                          />
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-center">
                      <span
                        className={`inline-block whitespace-nowrap rounded-full px-2.5 py-1 text-xs font-semibold ${
                          product.estado === 'activo'
                            ? 'bg-emerald-100 text-emerald-700'
                            : product.estado === 'inactivo'
                              ? 'bg-slate-100 text-slate-600'
                              : 'bg-rose-100 text-rose-600'
                        }`}
                      >
                        {product.estado}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-1.5">
                        <button
                          onClick={e => {
                            e.stopPropagation();
                            vm.startEditProduct(product);
                          }}
                          className="rounded-lg border border-amber-200 px-2.5 py-1.5 text-xs font-semibold text-amber-700 hover:bg-amber-50"
                        >
                          Editar
                        </button>
                        <button
                          onClick={e => {
                            e.stopPropagation();
                            vm.confirmDeleteProduct(product);
                          }}
                          className="rounded-lg border border-rose-200 px-2.5 py-1.5 text-xs font-semibold text-rose-700 hover:bg-rose-50"
                        >
                          Eliminar
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
              {vm.filteredProducts.length === 0 && (
                <tr>
                  <td colSpan={7} className="px-4 py-8 text-center text-sm text-slate-400">
                    No se encontraron productos para «{vm.catalogSearch}».
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  </>
);

export default CatalogoTab;
