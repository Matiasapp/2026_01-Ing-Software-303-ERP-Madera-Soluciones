import React from 'react';
import type { MovementType, Product, Supplier } from '../../../context/InventoryContext';
import { movementOptions } from '../constants';
import type { MovementForm } from '../types';
import { formatProductLabel } from '../utils';
import { ModalHeader, ModalShell, SelectField, TextField } from './ui';

type MovementModalProps = {
  open: boolean;
  editingId: number | null;
  form: MovementForm;
  errors: Partial<Record<keyof MovementForm, string>>;
  valid: boolean;
  products: Product[];
  suppliers: Supplier[];
  onChange: (patch: Partial<MovementForm>) => void;
  onSubmit: (e: React.FormEvent) => void;
  onCancel: () => void;
};

const MovementModal: React.FC<MovementModalProps> = ({
  open,
  editingId,
  form,
  errors,
  valid,
  products,
  suppliers,
  onChange,
  onSubmit,
  onCancel,
}) => {
  if (!open) return null;
  return (
    <ModalShell
      onClose={onCancel}
      className="w-full max-w-md rounded-3xl border border-slate-200 bg-white shadow-[0_32px_80px_rgba(15,23,42,0.18)]"
    >
      <ModalHeader
        title={editingId ? 'Editar movimiento' : 'Registrar movimiento'}
        subtitle="Entrada, salida o ajuste de stock."
        onClose={onCancel}
      />
      <form onSubmit={onSubmit} className="p-6 space-y-4">
        <SelectField
          label="Producto"
          value={form.productId}
          options={products.map(p => ({ label: formatProductLabel(p), value: String(p.id) }))}
          onChange={v => onChange({ productId: v })}
          error={errors.productId}
        />
        <SelectField
          label="Tipo de movimiento"
          value={form.tipo}
          options={movementOptions}
          onChange={v => {
            onChange({ tipo: v as MovementType, canal: '' });
          }}
          error={errors.tipo}
        />
        <div className="grid grid-cols-2 gap-3">
          <TextField
            label="Cantidad"
            type="number"
            value={form.cantidad}
            onChange={v => onChange({ cantidad: v })}
            error={errors.cantidad}
          />
          <TextField
            label="Fecha"
            type="date"
            value={form.fecha}
            onChange={v => onChange({ fecha: v })}
            error={errors.fecha}
          />
        </div>
        {form.tipo === 'entrada por compra' ? (
          <SelectField
            label="Proveedor"
            value={form.canal}
            options={[
              { label: '— Seleccionar proveedor —', value: '' },
              ...suppliers.map(s => ({ label: s.nombre, value: s.nombre })),
            ]}
            onChange={v => onChange({ canal: v })}
            error={errors.canal}
          />
        ) : form.tipo === 'ajuste de inventario' || form.tipo === 'merma' ? (
          <TextField
            label="Motivo"
            value={form.canal}
            onChange={v => onChange({ canal: v })}
            error={errors.canal}
          />
        ) : (
          <TextField
            label="Referencia de venta"
            value={form.canal}
            onChange={v => onChange({ canal: v })}
            error={errors.canal}
          />
        )}
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
            {editingId ? 'Guardar cambios' : 'Registrar movimiento'}
          </button>
        </div>
      </form>
    </ModalShell>
  );
};

export default MovementModal;
