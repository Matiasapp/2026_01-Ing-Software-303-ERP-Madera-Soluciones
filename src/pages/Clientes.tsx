import React, { useMemo, useState } from 'react';
import { useSales, DirectCustomer, SalesOrder } from '../context/SalesContext';
import { useNotification } from '../context/NotificationContext';
import AnimatedNumber from '../components/AnimatedNumber';
import { formatCurrency as currency, formatPhone, telefonoVacio, validarTelefono } from '../lib/format';

type CustomerForm = {
  nombre: string;
  correo: string;
  telefono: string;
};

const Clientes: React.FC = () => {
  const { directCustomers, orders, updateCustomer } = useSales();
  const { success, error: notifyError } = useNotification();
  const [selected, setSelected] = useState<string | null>(
    directCustomers.length > 0 ? directCustomers[0].nombre : null
  );
  const [editingCustomer, setEditingCustomer] = useState<DirectCustomer | null>(null);
  const [form, setForm] = useState<CustomerForm | null>(null);
  const [saving, setSaving] = useState(false);

  const customers = useMemo(() => {
    return directCustomers.map(c => {
      const related = orders.filter(o => o.cliente === c.nombre);
      const monto = related.reduce((s, r) => s + r.monto, 0);
      const pedidos = related.length || c.historialPedidos || 0;
      return {
        ...c,
        montoTotalHistorico: Math.max(c.montoTotalHistorico || 0, monto),
        historialPedidos: pedidos,
      };
    });
  }, [directCustomers, orders]);

  const selectedOrders = useMemo(() => {
    if (!selected) return [] as SalesOrder[];
    return orders.filter(o => o.cliente === selected);
  }, [orders, selected]);

  const startEdit = (c: DirectCustomer) => {
    setEditingCustomer(c);
    setForm({ nombre: c.nombre, correo: c.correo ?? '', telefono: formatPhone(c.telefono ?? '') });
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingCustomer || !form) return;
    setSaving(true);
    try {
      // No persistir solo el prefijo '+56 ' cuando no se ingresó teléfono.
      await updateCustomer(editingCustomer.id, {
        ...form,
        telefono: telefonoVacio(form.telefono) ? '' : form.telefono,
      });
      if (selected === editingCustomer.nombre) setSelected(form.nombre);
      setEditingCustomer(null);
      setForm(null);
      success(`Cliente ${form.nombre} actualizado correctamente.`);
    } catch {
      notifyError('Error al guardar el cliente. Intenta nuevamente.');
    } finally {
      setSaving(false);
    }
  };

  const backdropDown = React.useRef(false);

  return (
    <section className="space-y-6">
      <header className="rounded-2xl border border-amber-900/20 bg-[linear-gradient(135deg,_#1c1005_0%,_#6b3a1f_52%,_#c27d3a_100%)] px-6 py-5 text-white shadow-[0_24px_60px_rgba(120,53,15,0.22)]">
        <p className="text-sm/6 text-amber-100">Gestión de clientes</p>
        <h2 className="text-3xl font-semibold">Clientes directos</h2>
        <p className="mt-1 text-sm text-amber-200/80">Solo se muestran clientes de venta directa. Los compradores de Mercado Libre y Apanio no se registran aquí ya que sus datos de contacto no están disponibles.</p>
      </header>

      <div className="grid gap-6 xl:grid-cols-[1fr_340px]">
        <div className="min-w-0 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <h3 className="text-xl font-semibold text-slate-900 mb-4">Listado de clientes</h3>
          <div className="overflow-hidden rounded-2xl border border-slate-200">
            <div className="overflow-x-auto">
              <table className="min-w-[700px] w-full divide-y divide-slate-200 text-sm">
                <thead className="bg-slate-50 text-left text-xs uppercase tracking-wide text-slate-500">
                  <tr>
                    <th className="px-4 py-3">Nombre</th>
                    <th className="px-4 py-3">Correo</th>
                    <th className="px-4 py-3">Teléfono</th>
                    <th className="px-4 py-3">Canal</th>
                    <th className="px-4 py-3 text-right">Pedidos</th>
                    <th className="px-4 py-3 text-right">Monto histórico</th>
                    <th className="px-4 py-3">Acciones</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 bg-white">
                  {customers.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="px-4 py-8 text-center text-sm text-slate-400">
                        No hay clientes registrados.
                      </td>
                    </tr>
                  ) : (
                    customers.map(c => (
                      <tr
                        key={c.id}
                        onClick={() => setSelected(c.nombre)}
                        className={`cursor-pointer transition hover:bg-slate-50 ${selected === c.nombre ? 'bg-amber-50/60' : ''}`}
                      >
                        <td className="px-4 py-3 font-medium text-slate-900">{c.nombre}</td>
                        <td className="px-4 py-3 text-slate-600">{c.correo}</td>
                        <td className="px-4 py-3 text-slate-600">{c.telefono}</td>
                        <td className="px-4 py-3">
                          <span className="rounded-full bg-slate-100 px-2.5 py-1 text-xs font-medium text-slate-600 whitespace-nowrap">
                            {c.canalCompra}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-right text-slate-700">{c.historialPedidos}</td>
                        <td className="px-4 py-3 text-right font-medium text-slate-800">
                          {currency(c.montoTotalHistorico)}
                        </td>
                        <td className="px-4 py-3">
                          <button
                            onClick={e => { e.stopPropagation(); startEdit(c); }}
                            className="rounded-lg border border-amber-200 px-2.5 py-1.5 text-xs font-semibold text-amber-700 hover:bg-amber-50"
                          >
                            Editar
                          </button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        <aside className="space-y-6">
          <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
            <h3 className="text-xl font-semibold text-slate-900 mb-4">Detalle cliente</h3>
            {!selected ? (
              <p className="text-sm text-slate-500">Selecciona un cliente para ver su historial.</p>
            ) : (
              <div className="space-y-4">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">Cliente</p>
                  <p className="font-semibold text-slate-900">{selected}</p>
                </div>
                <div className="grid grid-cols-2 gap-3 text-sm">
                  <div className="rounded-xl bg-slate-50 px-3 py-2">
                    <p className="text-xs text-slate-500">Pedidos</p>
                    <p className="font-semibold text-slate-900">
                      <AnimatedNumber value={selectedOrders.length} className="tabular-nums" />
                    </p>
                  </div>
                  <div className="rounded-xl bg-slate-50 px-3 py-2">
                    <p className="text-xs text-slate-500">Monto total</p>
                    <p className="font-semibold text-slate-900">
                      <AnimatedNumber
                        value={selectedOrders.reduce((s, o) => s + o.monto, 0)}
                        format={currency}
                        className="tabular-nums"
                      />
                    </p>
                  </div>
                </div>
                <div>
                  <h4 className="mb-2 text-sm font-semibold text-slate-700">Historial de pedidos</h4>
                  {selectedOrders.length === 0 ? (
                    <p className="text-sm text-slate-400">Sin pedidos registrados.</p>
                  ) : (
                    <ul className="max-h-64 space-y-2 overflow-auto">
                      {selectedOrders.map(o => (
                        <li key={o.id} className="rounded-xl border border-slate-100 bg-slate-50 p-3">
                          <div className="flex justify-between text-sm">
                            <div>
                              <p className="font-medium text-slate-900">{o.referencia}</p>
                              <p className="text-xs text-slate-500">{o.fecha} · {o.canal}</p>
                            </div>
                            <p className="font-semibold text-slate-800">{currency(o.monto)}</p>
                          </div>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              </div>
            )}
          </div>
        </aside>
      </div>

      {editingCustomer && form && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4 backdrop-blur-sm"
          onMouseDown={e => { backdropDown.current = e.target === e.currentTarget; }}
          onClick={e => { if (backdropDown.current && e.target === e.currentTarget) { setEditingCustomer(null); setForm(null); } }}
        >
          <div className="w-full max-w-md rounded-3xl border border-slate-200 bg-white shadow-[0_32px_80px_rgba(15,23,42,0.18)]">
            <div className="flex items-center justify-between border-b border-slate-100 px-6 py-4">
              <div>
                <h3 className="text-lg font-semibold text-slate-900">Editar cliente</h3>
                <p className="text-sm text-slate-500">Modifica los datos y guarda los cambios.</p>
              </div>
              <button
                type="button"
                onClick={() => { setEditingCustomer(null); setForm(null); }}
                className="flex h-8 w-8 items-center justify-center rounded-full text-slate-400 transition hover:bg-slate-100 hover:text-slate-600"
              >
                ✕
              </button>
            </div>
            <form onSubmit={handleSave} className="space-y-4 p-6">
              <label className="block">
                <span className="mb-1 block text-sm font-medium text-slate-700">Nombre</span>
                <input
                  type="text"
                  value={form.nombre}
                  onChange={e => setForm(f => f && ({ ...f, nombre: e.target.value }))}
                  required
                  className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm outline-none transition focus:border-amber-400 focus:ring-4 focus:ring-amber-100"
                />
              </label>
              <label className="block">
                <span className="mb-1 block text-sm font-medium text-slate-700">Correo</span>
                <input
                  type="email"
                  value={form.correo}
                  onChange={e => setForm(f => f && ({ ...f, correo: e.target.value }))}
                  className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm outline-none transition focus:border-amber-400 focus:ring-4 focus:ring-amber-100"
                />
              </label>
              <label className="block">
                <span className="mb-1 block text-sm font-medium text-slate-700">Teléfono</span>
                <input
                  type="text"
                  value={form.telefono}
                  onChange={e => setForm(f => f && ({ ...f, telefono: formatPhone(e.target.value) }))}
                  aria-invalid={!telefonoVacio(form.telefono) && !validarTelefono(form.telefono)}
                  className={`w-full rounded-xl border px-3 py-2 text-sm outline-none transition focus:ring-4 ${!telefonoVacio(form.telefono) && !validarTelefono(form.telefono) ? 'border-rose-300 focus:border-rose-400 focus:ring-rose-100' : 'border-slate-200 focus:border-amber-400 focus:ring-amber-100'}`}
                />
                {!telefonoVacio(form.telefono) && !validarTelefono(form.telefono) && (
                  <span className="mt-1 block text-xs text-rose-600">
                    Teléfono inválido (debe tener 9 dígitos).
                  </span>
                )}
              </label>
              <div className="flex justify-end gap-2 border-t border-slate-100 pt-4">
                <button
                  type="button"
                  onClick={() => { setEditingCustomer(null); setForm(null); }}
                  className="rounded-xl border border-slate-200 px-4 py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-50"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={
                    saving ||
                    !form.nombre.trim() ||
                    (!telefonoVacio(form.telefono) && !validarTelefono(form.telefono))
                  }
                  className="rounded-xl bg-amber-700 px-5 py-2.5 text-sm font-semibold text-white hover:bg-amber-800 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {saving ? 'Guardando…' : 'Guardar cambios'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </section>
  );
};

export default Clientes;
