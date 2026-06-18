import React from 'react';
import { formatPhone, formatRut } from '../../../lib/format';
import type { SupplierForm } from '../types';
import { ModalHeader, ModalShell, TextField } from './ui';

type SupplierModalProps = {
  open: boolean;
  editingId: number | null;
  form: SupplierForm;
  errors: Partial<Record<keyof SupplierForm, string>>;
  valid: boolean;
  onChange: (patch: Partial<SupplierForm>) => void;
  onSubmit: (e: React.FormEvent) => void;
  onCancel: () => void;
};

const SupplierModal: React.FC<SupplierModalProps> = ({
  open,
  editingId,
  form,
  errors,
  valid,
  onChange,
  onSubmit,
  onCancel,
}) => {
  if (!open) return null;
  return (
    <ModalShell
      onClose={onCancel}
      className="w-full max-w-lg rounded-3xl border border-slate-200 bg-white shadow-[0_32px_80px_rgba(15,23,42,0.18)]"
    >
      <ModalHeader
        title={editingId ? 'Editar proveedor' : 'Nuevo proveedor'}
        subtitle={
          editingId ? 'Modifica los datos y guarda los cambios.' : 'Agrega un proveedor al directorio.'
        }
        onClose={onCancel}
      />
      <form onSubmit={onSubmit} className="p-6 space-y-4">
        <div className="grid gap-3 sm:grid-cols-2">
          <TextField
            label="Nombre"
            value={form.nombre}
            onChange={v => onChange({ nombre: v })}
            error={errors.nombre}
          />
          <TextField
            label="RUT"
            value={form.rut}
            onChange={v => onChange({ rut: formatRut(v) })}
            error={errors.rut}
          />
          <TextField
            label="Correo"
            value={form.contacto}
            onChange={v => onChange({ contacto: v })}
            error={errors.contacto}
          />
          <TextField
            label="Teléfono"
            value={form.telefono}
            onChange={v => onChange({ telefono: formatPhone(v) })}
            error={errors.telefono}
          />
          <TextField
            label="Ciudad"
            value={form.ciudad}
            onChange={v => onChange({ ciudad: v })}
            error={errors.ciudad}
          />
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
            {editingId ? 'Guardar cambios' : 'Crear proveedor'}
          </button>
        </div>
      </form>
    </ModalShell>
  );
};

export default SupplierModal;
