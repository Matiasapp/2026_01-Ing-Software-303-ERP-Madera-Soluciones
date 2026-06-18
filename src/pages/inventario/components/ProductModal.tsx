import React from 'react';
import type { ProductCategory, ProductStatus, Supplier } from '../../../context/InventoryContext';
import { categoryOptions, statusOptions, unidadOptions } from '../constants';
import type { ProductForm } from '../types';
import { ModalHeader, ModalShell, SelectField, TextField } from './ui';

type ProductModalProps = {
  open: boolean;
  editingId: number | null;
  form: ProductForm;
  errors: Partial<Record<keyof ProductForm, string>>;
  valid: boolean;
  suppliers: Supplier[];
  onChange: (patch: Partial<ProductForm>) => void;
  onSubmit: (e: React.FormEvent) => void;
  onCancel: () => void;
};

const ProductModal: React.FC<ProductModalProps> = ({
  open,
  editingId,
  form,
  errors,
  valid,
  suppliers,
  onChange,
  onSubmit,
  onCancel,
}) => {
  const [isCustomUnidad, setIsCustomUnidad] = React.useState(
    () => form.unidadMedida !== '' && !unidadOptions.includes(form.unidadMedida)
  );
  if (!open) return null;
  return (
    <ModalShell
      onClose={onCancel}
      className="w-full max-w-2xl max-h-[90vh] overflow-y-auto rounded-3xl border border-slate-200 bg-white shadow-[0_32px_80px_rgba(15,23,42,0.18)]"
    >
      <ModalHeader
        title={editingId ? 'Editar producto' : 'Nuevo producto'}
        subtitle={
          editingId
            ? 'Modifica los campos y guarda los cambios.'
            : 'Completa los datos para agregar al catálogo.'
        }
        onClose={onCancel}
      />

      <form onSubmit={onSubmit} className="p-6 space-y-5">
        <div>
          <p className="mb-2.5 text-[11px] font-semibold uppercase tracking-widest text-slate-400">
            Identificación
          </p>
          <div className="grid gap-3 sm:grid-cols-2 md:grid-cols-3">
            <TextField
              label="SKU"
              value={form.sku}
              onChange={v => onChange({ sku: v })}
              error={errors.sku}
            />
            <TextField
              label="Nombre"
              value={form.nombre}
              onChange={v => onChange({ nombre: v })}
              error={errors.nombre}
            />
            <SelectField
              label="Categoría"
              value={form.categoria}
              options={[
                { label: '— Seleccionar categoría —', value: '' },
                ...categoryOptions.map(c => ({ label: c, value: c })),
              ]}
              onChange={v => onChange({ categoria: v as ProductCategory })}
              error={errors.categoria}
            />
            <SelectField
              label="Proveedor"
              value={form.proveedor}
              options={[
                { label: '— Seleccionar proveedor —', value: '' },
                ...suppliers.map(s => ({ label: s.nombre, value: s.nombre })),
              ]}
              onChange={v => onChange({ proveedor: v })}
              error={errors.proveedor}
            />
            <label className="block">
              <span className="mb-1 block text-sm font-medium text-slate-700">
                Unidad de medida
              </span>
              <select
                value={isCustomUnidad ? 'otro' : form.unidadMedida}
                onChange={e => {
                  if (e.target.value !== 'otro') {
                    setIsCustomUnidad(false);
                    onChange({ unidadMedida: e.target.value });
                  } else {
                    setIsCustomUnidad(true);
                    onChange({ unidadMedida: '' });
                  }
                }}
                className={`w-full rounded-xl border px-3 py-2 text-sm outline-none transition focus:ring-4 ${errors.unidadMedida ? 'border-rose-300 focus:border-rose-400 focus:ring-rose-100' : 'border-slate-200 focus:border-amber-400 focus:ring-amber-100'}`}
              >
                <option value="">— Seleccionar unidad —</option>
                {unidadOptions.map(u => (
                  <option key={u} value={u}>
                    {u}
                  </option>
                ))}
              </select>
              {isCustomUnidad && (
                <input
                  type="text"
                  placeholder="Especifica la unidad…"
                  value={form.unidadMedida}
                  onChange={e => onChange({ unidadMedida: e.target.value })}
                  className="mt-2 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm outline-none transition focus:border-amber-400 focus:ring-4 focus:ring-amber-100"
                />
              )}
              {errors.unidadMedida && (
                <span className="mt-1 block text-xs text-rose-600">{errors.unidadMedida}</span>
              )}
            </label>
            <SelectField
              label="Estado"
              value={form.estado}
              options={editingId ? statusOptions : statusOptions.filter(s => s !== 'descontinuado')}
              onChange={v => onChange({ estado: v as ProductStatus })}
              error={errors.estado}
            />
          </div>
        </div>

        <div className="border-t border-slate-100 pt-4">
          <p className="mb-2.5 text-[11px] font-semibold uppercase tracking-widest text-slate-400">
            Precios por canal
          </p>
          <div className="grid gap-3 sm:grid-cols-2 md:grid-cols-4">
            <TextField
              label="Costo compra"
              type="number"
              value={form.costoCompra}
              onChange={v => onChange({ costoCompra: v })}
              error={errors.costoCompra}
            />
            <TextField
              label="Precio ML"
              type="number"
              value={form.precioML}
              onChange={v => onChange({ precioML: v })}
              error={errors.precioML}
            />
            <TextField
              label="Precio Apanio"
              type="number"
              value={form.precioSitioWeb}
              onChange={v => onChange({ precioSitioWeb: v })}
              error={errors.precioSitioWeb}
            />
            <TextField
              label="Precio Estado"
              type="number"
              value={form.precioEstado}
              onChange={v => onChange({ precioEstado: v })}
              error={errors.precioEstado}
            />
          </div>
        </div>

        <div className="border-t border-slate-100 pt-4">
          <p className="mb-2.5 text-[11px] font-semibold uppercase tracking-widest text-slate-400">
            Control de stock
          </p>
          <div className="grid gap-3 sm:grid-cols-2">
            <TextField
              label="Stock actual"
              type="number"
              value={form.stockActual}
              onChange={v => onChange({ stockActual: v })}
              error={errors.stockActual}
              disabled={!!editingId}
              hint={editingId ? 'Usa "Registrar movimiento" para modificar el stock.' : undefined}
            />
            <TextField
              label="Stock mínimo"
              type="number"
              value={form.stockMinimo}
              onChange={v => onChange({ stockMinimo: v })}
              error={errors.stockMinimo}
            />
          </div>
        </div>

        <div className="flex items-center justify-end gap-2 border-t border-slate-100 pt-4">
          <button
            type="button"
            onClick={onCancel}
            className="rounded-xl border border-slate-200 px-4 py-2.5 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
          >
            Cancelar
          </button>
          <button
            type="submit"
            disabled={!valid}
            className="rounded-xl bg-amber-700 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-amber-800 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {editingId ? 'Guardar cambios' : 'Crear producto'}
          </button>
        </div>
      </form>
    </ModalShell>
  );
};

export default ProductModal;
