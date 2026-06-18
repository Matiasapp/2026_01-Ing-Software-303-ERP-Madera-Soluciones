import React from 'react';
import { TextField } from '../../../components/forms';
import { formatCurrency as currency, formatPhone } from '../../../lib/format';
import type { VentasVM } from '../useVentasPage';
import CustomerSearchSelect from './CustomerSearchSelect';

const SaleModal: React.FC<{ vm: VentasVM }> = ({ vm }) => {
  if (!vm.showSaleModal) return null;
  const {
    directCustomers,
    selectedCustomerId,
    selectCustomer,
    manualSale,
    setManualSale,
    manualErrors,
    customerCollision,
    addLine,
    removeLine,
    updateLine,
    autoFillMonto,
    products,
    saleTotal,
    manualValid,
    handleManualSale,
  } = vm;
  const close = () => vm.setShowSaleModal(false);

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto bg-black/40 p-4 backdrop-blur-sm"
      onClick={close}
    >
      <form
        onSubmit={handleManualSale}
        onClick={e => e.stopPropagation()}
        className="relative my-auto w-full max-w-xl rounded-2xl border border-slate-200 bg-white shadow-xl max-h-[90vh] flex flex-col"
      >
        <div className="flex items-center justify-between gap-4 border-b border-slate-100 px-6 py-4">
          <div>
            <h3 className="text-lg font-semibold text-slate-900">Nueva venta directa</h3>
            <p className="text-sm text-slate-500">Presencial, teléfono u otro canal externo.</p>
          </div>
          <button
            type="button"
            onClick={close}
            className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-600"
          >
            ✕
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-6 space-y-5">
          <div>
            <p className="mb-3 text-xs font-semibold uppercase tracking-wide text-slate-400">
              Datos del cliente
            </p>
            {directCustomers.length > 0 && (
              <div className="mb-3">
                <span className="mb-1 block text-sm font-medium text-slate-700">
                  Cliente existente
                </span>
                <CustomerSearchSelect
                  customers={directCustomers}
                  selectedId={selectedCustomerId}
                  onSelect={selectCustomer}
                />
                <span className="mt-1 block text-xs text-slate-400">
                  {selectedCustomerId
                    ? 'Datos bloqueados — quita el cliente con ✕ para ingresar otros.'
                    : 'Busca un cliente registrado para autocompletar sus datos.'}
                </span>
              </div>
            )}
            <div className="grid gap-3 sm:grid-cols-2">
              <TextField
                label="Nombre"
                value={manualSale.nombre}
                onChange={value => setManualSale(c => ({ ...c, nombre: value }))}
                error={manualErrors.nombre}
                disabled={Boolean(selectedCustomerId)}
              />
              <TextField
                label="Teléfono (opcional)"
                value={manualSale.telefono}
                onChange={value => setManualSale(c => ({ ...c, telefono: formatPhone(value) }))}
                error={manualErrors.telefono}
                disabled={Boolean(selectedCustomerId)}
              />
              <div className="sm:col-span-2">
                <TextField
                  label="Correo (opcional)"
                  value={manualSale.correo}
                  onChange={value => setManualSale(c => ({ ...c, correo: value }))}
                  type="email"
                  error={manualErrors.correo}
                  disabled={Boolean(selectedCustomerId)}
                />
              </div>
            </div>
            {customerCollision && (
              <div className="mt-3 flex flex-col gap-2 rounded-xl border border-amber-300 bg-amber-50 px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
                <p className="text-sm text-amber-800">
                  Ya existe un cliente con este {customerCollision.by}:{' '}
                  <span className="font-semibold">{customerCollision.customer.nombre}</span>. La venta
                  se asociará a él.
                </p>
                <button
                  type="button"
                  onClick={() => selectCustomer(String(customerCollision.customer.id))}
                  className="shrink-0 rounded-lg bg-amber-700 px-3 py-1.5 text-xs font-semibold text-white hover:bg-amber-800"
                >
                  Usar este cliente
                </button>
              </div>
            )}
          </div>

          <div>
            <p className="mb-3 text-xs font-semibold uppercase tracking-wide text-slate-400">
              Detalle de la venta
            </p>
            <TextField
              label="Referencia"
              value={manualSale.referencia}
              onChange={value => setManualSale(c => ({ ...c, referencia: value }))}
              error={manualErrors.header}
            />
          </div>

          <div>
            <div className="mb-2 flex items-center justify-between">
              <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">
                Productos
              </p>
              <button
                type="button"
                onClick={addLine}
                className="rounded-lg bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-700 hover:bg-slate-200"
              >
                + Agregar línea
              </button>
            </div>

            <div className="space-y-2">
              {manualSale.lineas.map((linea, i) => {
                const lineError = manualErrors.lineas[i];
                return (
                  <div key={i} className="rounded-xl border border-slate-200 bg-slate-50 p-3">
                    <div className="grid gap-2 sm:grid-cols-[1fr_80px_100px_28px]">
                      <div>
                        <select
                          value={linea.productoId}
                          onChange={e => {
                            const pid = e.target.value;
                            updateLine(i, { productoId: pid });
                            autoFillMonto(i, pid, linea.cantidad);
                          }}
                          className={`w-full rounded-lg border px-2 py-1.5 text-sm outline-none focus:ring-2 ${lineError ? 'border-rose-300 focus:ring-rose-100' : 'border-slate-200 focus:border-amber-400 focus:ring-amber-100'}`}
                        >
                          <option value="">Seleccionar…</option>
                          {products
                            .filter(p => p.estado === 'activo')
                            .map(p => (
                              <option key={p.id} value={p.id}>
                                {p.nombre} ({p.sku})
                              </option>
                            ))}
                        </select>
                        {lineError && (
                          <span className="mt-0.5 block text-xs text-rose-600">{lineError}</span>
                        )}
                      </div>
                      <input
                        type="number"
                        min="1"
                        value={linea.cantidad}
                        onChange={e => {
                          updateLine(i, { cantidad: e.target.value });
                          autoFillMonto(i, linea.productoId, e.target.value);
                        }}
                        placeholder="Cant."
                        className="rounded-lg border border-slate-200 px-2 py-1.5 text-sm outline-none focus:border-amber-400 focus:ring-2 focus:ring-amber-100"
                      />
                      <input
                        type="number"
                        min="0"
                        value={linea.monto}
                        onChange={e => updateLine(i, { monto: e.target.value })}
                        placeholder="Monto"
                        className="rounded-lg border border-slate-200 px-2 py-1.5 text-sm outline-none focus:border-amber-400 focus:ring-2 focus:ring-amber-100"
                      />
                      {manualSale.lineas.length > 1 && (
                        <button
                          type="button"
                          onClick={() => removeLine(i)}
                          className="flex items-center justify-center rounded-lg text-slate-400 hover:bg-rose-50 hover:text-rose-500"
                        >
                          ✕
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {saleTotal > 0 && (
            <div className="rounded-xl bg-amber-50 px-4 py-3 flex items-center justify-between">
              <span className="text-sm text-amber-700">Total a registrar</span>
              <span className="text-lg font-semibold text-amber-900">{currency(saleTotal)}</span>
            </div>
          )}
        </div>

        <div className="flex gap-2 border-t border-slate-100 px-6 py-4">
          <button
            type="submit"
            disabled={!manualValid}
            className="rounded-xl bg-amber-700 px-5 py-2.5 text-sm font-semibold text-white hover:bg-amber-800 disabled:cursor-not-allowed disabled:opacity-60"
          >
            Registrar venta
          </button>
          <button
            type="button"
            onClick={close}
            className="rounded-xl border border-slate-200 px-5 py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-50"
          >
            Cancelar
          </button>
        </div>
      </form>
    </div>
  );
};

export default SaleModal;
