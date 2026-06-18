import React from 'react';
import type { InventarioVM } from '../useInventarioPage';

const ProveedoresTab: React.FC<{ vm: InventarioVM }> = ({ vm }) => (
  <div className="mt-5 space-y-5">
    <div className="flex items-center justify-between gap-4">
      <div>
        <h4 className="font-semibold text-slate-900">Directorio de proveedores</h4>
        <p className="text-sm text-slate-500">{vm.suppliers.length} proveedores registrados.</p>
      </div>
      <button
        type="button"
        onClick={vm.startCreateSupplier}
        className="shrink-0 rounded-xl bg-amber-700 px-4 py-2 text-sm font-semibold text-white transition hover:bg-amber-800"
      >
        + Nuevo proveedor
      </button>
    </div>

    <div className="overflow-hidden rounded-2xl border border-slate-200">
      <div className="max-h-[1000px] overflow-y-auto overflow-x-auto">
        <table className="min-w-[700px] w-full divide-y divide-slate-200 text-sm">
          <thead className="bg-slate-50 text-left text-xs uppercase tracking-wide text-slate-500 sticky top-0">
            <tr>
              <th className="px-4 py-3">Nombre</th>
              <th className="px-4 py-3">RUT</th>
              <th className="px-4 py-3">Correo</th>
              <th className="px-4 py-3">Teléfono</th>
              <th className="px-4 py-3">Ciudad</th>
              <th className="px-4 py-3 text-center">Productos</th>
              <th className="px-4 py-3">Acciones</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 bg-white">
            {vm.suppliers.length === 0 ? (
              <tr>
                <td colSpan={7} className="px-4 py-8 text-center text-sm text-slate-400">
                  No hay proveedores registrados. Agrega el primero con el botón de arriba.
                </td>
              </tr>
            ) : (
              vm.suppliers.map(supplier => (
                <tr key={supplier.id} className="hover:bg-slate-50 transition">
                  <td className="px-4 py-3 font-semibold text-slate-900 whitespace-nowrap">
                    {supplier.nombre}
                  </td>
                  <td className="px-4 py-3 font-mono text-slate-600 whitespace-nowrap">
                    {supplier.rut}
                  </td>
                  <td className="px-4 py-3 text-slate-600">{supplier.contacto}</td>
                  <td className="px-4 py-3 text-slate-600 whitespace-nowrap">{supplier.telefono}</td>
                  <td className="px-4 py-3 text-slate-600">{supplier.ciudad || '—'}</td>
                  <td className="px-4 py-3 text-center">
                    <span className="rounded-full bg-slate-100 px-2.5 py-0.5 text-xs font-medium text-slate-600">
                      {supplier.productos.length}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex gap-2">
                      <button
                        onClick={() => vm.startEditSupplier(supplier)}
                        className="rounded-lg border border-amber-200 px-2.5 py-1 text-xs font-semibold text-amber-700 hover:bg-amber-50"
                      >
                        Editar
                      </button>
                      <button
                        onClick={() => vm.confirmDeleteSupplier(supplier)}
                        className="rounded-lg border border-rose-200 px-2.5 py-1 text-xs font-semibold text-rose-700 hover:bg-rose-50"
                      >
                        Eliminar
                      </button>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  </div>
);

export default ProveedoresTab;
