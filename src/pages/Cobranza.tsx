import React, { useEffect, useMemo, useState } from 'react';
import { useNotification } from '../context/NotificationContext';
import { useBilling, type Invoice, type InvoiceStatus } from '../context/BillingContext';
import { useSales } from '../context/SalesContext';
import AnimatedNumber from '../components/AnimatedNumber';
import { formatCurrency, formatDate, formatFolio, formatRut, validarRut } from '../lib/format';

type FacturaEstado = InvoiceStatus;
type Factura = Invoice;

type FormState = {
  folio: string;
  organismo: string;
  rut: string;
  montoNeto: string;
  fechaEmision: string;
  descripcion: string;
  ordenCompra: string;
};

const IVA_RATE = 0.19;

const statusOptions: FacturaEstado[] = [
  'Pendiente',
  'En revisión SII',
  'Aprobada',
  'Rechazada',
  'Cobrada',
  'Pagada',
  'Vencida',
];


const parseDate = (value: string) => new Date(`${value}T00:00:00`);

const toInputDate = (date: Date) => date.toISOString().slice(0, 10);

const addDays = (date: Date, days: number) => {
  const result = new Date(date);
  result.setDate(result.getDate() + days);
  return result;
};

const addBusinessDays = (date: Date, businessDays: number) => {
  const result = new Date(date);
  let added = 0;

  while (added < businessDays) {
    result.setDate(result.getDate() + 1);
    const day = result.getDay();
    if (day !== 0 && day !== 6) {
      added += 1;
    }
  }

  return result;
};

const daysBetween = (from: Date, to: Date) => {
  const ms = to.getTime() - from.getTime();
  return Math.ceil(ms / (1000 * 60 * 60 * 24));
};

const today = () => {
  const current = new Date();
  current.setHours(0, 0, 0, 0);
  return current;
};

const getUrgencyTone = (daysRemaining: number) => {
  if (daysRemaining > 15) return 'verde';
  if (daysRemaining >= 7) return 'amarillo';
  return 'rojo';
};

const toneClasses: Record<string, string> = {
  verde: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  amarillo: 'bg-amber-50 text-amber-700 border-amber-200',
  rojo: 'bg-rose-50 text-rose-700 border-rose-200',
};

const statusClasses: Record<FacturaEstado, string> = {
  Pendiente: 'bg-slate-100 text-slate-700',
  'En revisión SII': 'bg-blue-100 text-blue-700',
  Aprobada: 'bg-emerald-100 text-emerald-700',
  Rechazada: 'bg-rose-100 text-rose-700',
  Cobrada: 'bg-cyan-100 text-cyan-700',
  Pagada: 'bg-indigo-100 text-indigo-700',
  Vencida: 'bg-red-100 text-red-700',
};

const Cobranza: React.FC = () => {
  const { invoices: facturas, addInvoice, updateInvoiceNotes, updateInvoiceStatus, isLoading } = useBilling();
  const { directCustomers } = useSales();
  const estadoClientes = useMemo(
    () => directCustomers.filter(c => c.canalCompra === 'Estado'),
    [directCustomers]
  );
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [statusFilter, setStatusFilter] = useState<'Todos' | FacturaEstado>('Todos');
  const [searchQuery, setSearchQuery] = useState('');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [notesDraft, setNotesDraft] = useState('');
  const { success, error: notifyError } = useNotification();
  const [showInvoiceModal, setShowInvoiceModal] = useState(false);
  const [organismoManual, setOrganismoManual] = useState(false);
  const [form, setForm] = useState<FormState>({
    folio: '',
    organismo: '',
    rut: '',
    montoNeto: '',
    fechaEmision: toInputDate(today()),
    descripcion: '',
    ordenCompra: '',
  });

  const selectedInvoice = facturas.find(item => item.id === selectedId) ?? facturas[0] ?? null;
  const formErrors = useMemo(() => validateInvoiceForm(form, facturas), [form, facturas]);
  const formValid = Object.keys(formErrors).length === 0;

  useEffect(() => {
    if (selectedInvoice) {
      setNotesDraft(selectedInvoice.notas);
    }
  }, [selectedInvoice?.id]);

  useEffect(() => {
    if (selectedId === null && facturas.length > 0) {
      setSelectedId(facturas[0].id);
    }
  }, [facturas, selectedId]);

  const filteredInvoices = useMemo(() => {
    const q = searchQuery.toLowerCase().trim();
    return facturas.filter(invoice => {
      const matchesStatus = statusFilter === 'Todos' || invoice.estado === statusFilter;
      const invoiceDate = parseDate(invoice.fechaEmision);
      const fromOk = !dateFrom || invoiceDate >= parseDate(dateFrom);
      const toOk = !dateTo || invoiceDate <= parseDate(dateTo);
      const matchesSearch = !q || [
        invoice.folio,
        invoice.organismo,
        invoice.rut,
        invoice.ordenCompra,
        invoice.descripcion,
      ].some(field => field.toLowerCase().includes(q));
      return matchesStatus && fromOk && toOk && matchesSearch;
    });
  }, [facturas, statusFilter, searchQuery, dateFrom, dateTo]);

  const summary = useMemo(() => {
    const totalFacturado = facturas.reduce((sum, invoice) => sum + invoice.total, 0);
    const cobrado = facturas
      .filter(invoice => invoice.estado === 'Cobrada' || invoice.estado === 'Pagada')
      .reduce((sum, invoice) => sum + invoice.total, 0);
    const pendiente = totalFacturado - cobrado;
    const vencenEstaSemana = facturas.filter(invoice => {
      const dias = daysBetween(today(), parseDate(invoice.fechaPagoEsperada));
      return dias >= 0 && dias <= 7 && invoice.estado !== 'Pagada';
    }).length;

    return { totalFacturado, cobrado, pendiente, vencenEstaSemana };
  }, [facturas]);

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!formValid) {
      notifyError('Corrige los errores del formulario de cobranza antes de guardar.');
      return;
    }
    const neto = Number(form.montoNeto);
    const emision = parseDate(form.fechaEmision);
    const recepcion = addBusinessDays(emision, 8);
    const pagoEsperado = addDays(recepcion, 30);
    const primeraAlerta = addDays(pagoEsperado, -7);
    const alertaUrgente = addDays(pagoEsperado, -2);

    try {
      const saved = await addInvoice({
        folio: form.folio,
        organismo: form.organismo,
        rut: form.rut,
        montoNeto: neto,
        iva: Math.round(neto * IVA_RATE),
        total: neto + Math.round(neto * IVA_RATE),
        fechaEmision: form.fechaEmision,
        fechaRecepcionConforme: toInputDate(recepcion),
        fechaPagoEsperada: toInputDate(pagoEsperado),
        fechaPrimeraAlerta: toInputDate(primeraAlerta),
        fechaAlertaUrgente: toInputDate(alertaUrgente),
        descripcion: form.descripcion,
        ordenCompra: form.ordenCompra,
        estado: 'Pendiente',
        notas: 'Factura recién ingresada al sistema.',
      });
      setSelectedId(saved.id);
      success(`Factura ${form.folio} registrada correctamente.`);
      setForm({ folio: '', organismo: '', rut: '', montoNeto: '', fechaEmision: toInputDate(today()), descripcion: '', ordenCompra: '' });
      setOrganismoManual(false);
      setShowInvoiceModal(false);
    } catch (err) {
      // 23505 = violación de UNIQUE(folio): otra factura con el mismo folio ya existe.
      if ((err as { code?: string })?.code === '23505') {
        notifyError(`Ya existe una factura con el folio ${form.folio}.`);
      } else {
        notifyError('Error al guardar la factura. Intenta nuevamente.');
      }
    }
  };

  const updateSelectedNotes = (value: string) => {
    setNotesDraft(value);
    if (!selectedInvoice) return;
    updateInvoiceNotes(selectedInvoice.id, value);
  };

  const selectedDaysRemaining = selectedInvoice
    ? daysBetween(today(), parseDate(selectedInvoice.fechaPagoEsperada))
    : 0;
  const selectedTone = getUrgencyTone(selectedDaysRemaining);

  const [updatingStatus, setUpdatingStatus] = useState(false);

  const statusFlow: FacturaEstado[] = ['Pendiente', 'En revisión SII', 'Aprobada', 'Cobrada', 'Pagada'];
  const terminalNegative = selectedInvoice && (selectedInvoice.estado === 'Rechazada' || selectedInvoice.estado === 'Vencida');
  const terminalPositive = selectedInvoice?.estado === 'Pagada';
  const currentFlowIndex = selectedInvoice ? statusFlow.indexOf(selectedInvoice.estado) : -1;
  const nextStatus = currentFlowIndex >= 0 && currentFlowIndex < statusFlow.length - 1
    ? statusFlow[currentFlowIndex + 1]
    : null;
  const prevStatus = currentFlowIndex > 0 ? statusFlow[currentFlowIndex - 1] : null;

  const handleAdvanceStatus = async () => {
    if (!selectedInvoice || !nextStatus) return;
    setUpdatingStatus(true);
    try {
      await updateInvoiceStatus(selectedInvoice.id, nextStatus);
      success(`Factura ${selectedInvoice.folio} avanzada a "${nextStatus}".`);
    } catch {
      notifyError('Error al actualizar el estado. Intenta nuevamente.');
    } finally {
      setUpdatingStatus(false);
    }
  };

  const handleSetStatus = async (estado: FacturaEstado) => {
    if (!selectedInvoice) return;
    setUpdatingStatus(true);
    try {
      await updateInvoiceStatus(selectedInvoice.id, estado);
      success(`Factura ${selectedInvoice.folio} marcada como "${estado}".`);
    } catch {
      notifyError('Error al actualizar el estado. Intenta nuevamente.');
    } finally {
      setUpdatingStatus(false);
    }
  };

  // Retroceso de un paso dentro del flujo positivo. Es corrección de errores,
  // no parte del flujo normal, por eso pide confirmación.
  const handleRetroceder = () => {
    if (!selectedInvoice || !prevStatus) return;
    if (window.confirm(`¿Retroceder la factura ${selectedInvoice.folio} a "${prevStatus}"?`)) {
      handleSetStatus(prevStatus);
    }
  };

  // Revertir "Pagada" descuadra la cobranza (el pago ya se registró como
  // recibido), así que exige confirmación reforzada: escribir el folio exacto.
  const handleRevertPagada = () => {
    if (!selectedInvoice || !prevStatus) return;
    const typed = window.prompt(
      `Esta factura está marcada como PAGADA: el pago ya se registró como recibido. ` +
        `Revertir el estado solo debe hacerse para corregir un error y puede descuadrar la cobranza.\n\n` +
        `Para confirmar, escribe el folio exacto: ${selectedInvoice.folio}`
    );
    if (typed === null) return;
    if (typed.trim() !== selectedInvoice.folio) {
      notifyError('El folio no coincide. El estado no se modificó.');
      return;
    }
    handleSetStatus(prevStatus);
  };

  return (
    <section className="space-y-6">
      <header className="rounded-2xl border border-amber-900/20 bg-[linear-gradient(135deg,_#1c1005_0%,_#6b3a1f_52%,_#c27d3a_100%)] px-6 py-5 text-white shadow-[0_24px_60px_rgba(120,53,15,0.22)]">
        <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
          <div>
            <p className="text-sm/6 text-amber-100">Módulo de Cobranza · Mercado Público</p>
            <h2 className="text-3xl font-semibold">Gestión completa de facturas</h2>
          </div>
          <div className="rounded-xl border border-white/20 bg-white/10 px-4 py-2 text-sm">
            Seguimiento automático de fechas, alertas y gestión de cobro
          </div>
        </div>
      </header>

      <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
        <SummaryCard
          title="Total facturado"
          value={<AnimatedNumber value={summary.totalFacturado} format={formatCurrency} className="tabular-nums" />}
          accent="from-amber-500 to-orange-500"
        />
        <SummaryCard
          title="Cobrado"
          value={<AnimatedNumber value={summary.cobrado} format={formatCurrency} className="tabular-nums" />}
          accent="from-emerald-500 to-teal-500"
        />
        <SummaryCard
          title="Pendiente"
          value={<AnimatedNumber value={summary.pendiente} format={formatCurrency} className="tabular-nums" />}
          accent="from-amber-500 to-orange-500"
        />
        <SummaryCard
          title="Facturas por vencer esta semana"
          value={<AnimatedNumber value={summary.vencenEstaSemana} className="tabular-nums" />}
          accent="from-rose-500 to-pink-500"
        />
      </div>

      <div className="rounded-2xl border border-slate-200 bg-white px-6 py-4 shadow-sm">
        <div className="mb-3 flex items-center justify-between">
          <span className="text-sm font-medium text-slate-700">Estado de la cartera</span>
          <span className="text-sm text-slate-500">
            {Math.round((summary.cobrado / summary.totalFacturado) * 100) || 0}% cobrado
          </span>
        </div>
        <div className="mb-4 h-2.5 overflow-hidden rounded-full bg-slate-200">
          <div
            className="h-full rounded-full bg-gradient-to-r from-emerald-500 to-cyan-500"
            style={{ width: `${Math.max(4, (summary.cobrado / summary.totalFacturado) * 100) || 4}%` }}
          />
        </div>
        <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
          {statusOptions.map(status => {
            const count = facturas.filter(invoice => invoice.estado === status).length;
            return (
              <div key={status} className="flex items-center justify-between rounded-xl border border-slate-100 px-3 py-2">
                <span className="text-sm text-slate-600">{status}</span>
                <span className="rounded-full bg-slate-100 px-2.5 py-0.5 text-xs font-semibold text-slate-600">{count}</span>
              </div>
            );
          })}
        </div>
      </div>

      {showInvoiceModal && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4 backdrop-blur-sm"
          onClick={() => setShowInvoiceModal(false)}
        >
          <form
            onSubmit={handleSubmit}
            onClick={e => e.stopPropagation()}
            className="w-full max-w-2xl rounded-2xl border border-slate-200 bg-white p-6 shadow-xl"
          >
            <div className="mb-5 flex items-start justify-between gap-4">
              <div>
                <h3 className="text-xl font-semibold text-slate-900">Nueva factura</h3>
                <p className="text-sm text-slate-500">
                  Los totales, recepción conforme y fechas de alerta se calculan automáticamente.
                </p>
              </div>
              <div className="flex items-center gap-3">
                <span className="rounded-full bg-amber-50 px-3 py-1 text-xs font-semibold uppercase tracking-wide text-amber-700">
                  19% IVA
                </span>
                <button
                  type="button"
                  onClick={() => setShowInvoiceModal(false)}
                  className="rounded-lg p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-600"
                >
                  ✕
                </button>
              </div>
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <Field
                label="Número de folio"
                value={form.folio}
                onChange={value => setForm(current => ({ ...current, folio: formatFolio(value) }))}
                error={formErrors.folio}
              />
              <div>
                <label className="mb-1 block text-sm font-medium text-slate-700">Organismo comprador</label>
                {estadoClientes.length > 0 && !organismoManual ? (
                  <select
                    value={form.organismo}
                    onChange={e => {
                      if (e.target.value === '__otro__') {
                        setOrganismoManual(true);
                        setForm(current => ({ ...current, organismo: '' }));
                      } else {
                        setForm(current => ({ ...current, organismo: e.target.value }));
                      }
                    }}
                    aria-invalid={Boolean(formErrors.organismo)}
                    className={`w-full rounded-xl border px-3 py-2 text-sm outline-none transition focus:ring-4 ${formErrors.organismo ? 'border-rose-300 focus:border-rose-400 focus:ring-rose-100' : 'border-slate-200 focus:border-amber-400 focus:ring-amber-100'}`}
                  >
                    <option value="">— Seleccionar organismo —</option>
                    {estadoClientes.map(c => (
                      <option key={c.id} value={c.nombre}>{c.nombre}</option>
                    ))}
                    <option value="__otro__">Otro (escribir manualmente)</option>
                  </select>
                ) : (
                  <div className="flex gap-2">
                    <input
                      value={form.organismo}
                      onChange={e => setForm(current => ({ ...current, organismo: e.target.value }))}
                      placeholder="Nombre del organismo"
                      aria-invalid={Boolean(formErrors.organismo)}
                      className={`flex-1 rounded-xl border px-3 py-2 text-sm outline-none transition focus:ring-4 ${formErrors.organismo ? 'border-rose-300 focus:border-rose-400 focus:ring-rose-100' : 'border-slate-200 focus:border-amber-400 focus:ring-amber-100'}`}
                    />
                    {estadoClientes.length > 0 && (
                      <button
                        type="button"
                        onClick={() => { setOrganismoManual(false); setForm(current => ({ ...current, organismo: '' })); }}
                        className="shrink-0 rounded-xl border border-slate-200 px-3 py-2 text-xs text-slate-500 hover:bg-slate-50"
                      >
                        ← Lista
                      </button>
                    )}
                  </div>
                )}
                {formErrors.organismo && (
                  <span className="mt-1 block text-xs text-rose-600">{formErrors.organismo}</span>
                )}
              </div>
              <Field
                label="RUT"
                value={form.rut}
                onChange={value => setForm(current => ({ ...current, rut: formatRut(value) }))}
                error={formErrors.rut}
              />
              <Field
                label="Monto neto"
                type="number"
                value={form.montoNeto}
                onChange={value => setForm(current => ({ ...current, montoNeto: value }))}
                error={formErrors.montoNeto}
              />
              <Field
                label="Fecha de emisión"
                type="date"
                value={form.fechaEmision}
                onChange={value => setForm(current => ({ ...current, fechaEmision: value }))}
                error={formErrors.fechaEmision}
              />
              <Field
                label="Número de orden de compra"
                value={form.ordenCompra}
                onChange={value => setForm(current => ({ ...current, ordenCompra: value }))}
                error={formErrors.ordenCompra}
              />
            </div>

            <div className="mt-4">
              <label className="mb-1 block text-sm font-medium text-slate-700">Descripción</label>
              <textarea
                value={form.descripcion}
                onChange={event =>
                  setForm(current => ({ ...current, descripcion: event.target.value }))
                }
                rows={3}
                aria-invalid={Boolean(formErrors.descripcion)}
                className={`w-full rounded-xl border px-3 py-2 text-sm outline-none transition focus:ring-4 ${formErrors.descripcion ? 'border-rose-300 focus:border-rose-400 focus:ring-rose-100' : 'border-slate-200 focus:border-amber-400 focus:ring-amber-100'}`}
                placeholder="Detalle de la factura"
              />
              {formErrors.descripcion && (
                <span className="mt-1 block text-xs text-rose-600">{formErrors.descripcion}</span>
              )}
            </div>

            <div className="mt-4 grid gap-4 md:grid-cols-3">
              <CalculatedField
                label="IVA"
                value={formatCurrency(Math.round(Number(form.montoNeto || 0) * IVA_RATE))}
              />
              <CalculatedField
                label="Total"
                value={formatCurrency(
                  Number(form.montoNeto || 0) + Math.round(Number(form.montoNeto || 0) * IVA_RATE)
                )}
              />
              <CalculatedField
                label="Recepción conforme"
                value={
                  form.fechaEmision
                    ? formatDate(toInputDate(addBusinessDays(parseDate(form.fechaEmision), 8)))
                    : '-'
                }
              />
            </div>

            <div className="mt-5 flex gap-2">
              <button
                type="submit"
                className="rounded-xl bg-slate-900 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-60"
                disabled={!formValid}
              >
                Registrar factura
              </button>
              <button
                type="button"
                onClick={() => setShowInvoiceModal(false)}
                className="rounded-xl border border-slate-200 px-4 py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-50"
              >
                Cancelar
              </button>
            </div>
          </form>
        </div>
      )}

      <div className="grid gap-6 xl:grid-cols-[2fr_3fr] xl:items-stretch">

        {/* Panel izquierdo: filtros + lista */}
        <div className="flex flex-col rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <div className="mb-4 flex items-center justify-between gap-4">
            <div>
              <h3 className="text-xl font-semibold text-slate-900">Facturas</h3>
              <p className="text-sm text-slate-500">{filteredInvoices.length} resultados</p>
            </div>
            <button
              type="button"
              onClick={() => setShowInvoiceModal(true)}
              className="shrink-0 rounded-xl bg-amber-700 px-4 py-2 text-sm font-semibold text-white transition hover:bg-amber-800"
            >
              + Nueva factura
            </button>
          </div>

          <div className="space-y-2">
            <input
              value={searchQuery}
              onChange={event => setSearchQuery(event.target.value)}
              className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm outline-none focus:border-amber-400 focus:ring-4 focus:ring-amber-100"
              placeholder="Buscar por folio, organismo, RUT, OC…"
            />
            <select
              value={statusFilter}
              onChange={event => setStatusFilter(event.target.value as 'Todos' | FacturaEstado)}
              className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm outline-none focus:border-amber-400 focus:ring-4 focus:ring-amber-100"
            >
              <option value="Todos">Todos los estados</option>
              {statusOptions.map(status => (
                <option key={status} value={status}>{status}</option>
              ))}
            </select>
            <div className="grid grid-cols-2 gap-2">
              <input
                type="date"
                value={dateFrom}
                onChange={event => setDateFrom(event.target.value)}
                className="rounded-xl border border-slate-200 px-3 py-2 text-sm outline-none focus:border-amber-400 focus:ring-4 focus:ring-amber-100"
                aria-label="Fecha inicial"
              />
              <input
                type="date"
                value={dateTo}
                onChange={event => setDateTo(event.target.value)}
                className="rounded-xl border border-slate-200 px-3 py-2 text-sm outline-none focus:border-amber-400 focus:ring-4 focus:ring-amber-100"
                aria-label="Fecha final"
              />
            </div>
          </div>

          <div className="mt-4 min-h-0 flex-1 space-y-1 overflow-y-auto">
            {isLoading && (
              <p className="py-6 text-center text-sm text-slate-400">Cargando facturas…</p>
            )}
            {!isLoading && filteredInvoices.map(invoice => {
              const daysRemaining = daysBetween(today(), parseDate(invoice.fechaPagoEsperada));
              const tone = getUrgencyTone(daysRemaining);
              const isSelected = selectedId === invoice.id;
              return (
                <button
                  key={invoice.id}
                  type="button"
                  onClick={() => setSelectedId(invoice.id)}
                  className={`w-full rounded-xl border px-4 py-3 text-left transition hover:bg-slate-50 ${isSelected ? 'border-amber-300 bg-amber-50/60' : 'border-slate-100 bg-white'}`}
                >
                  <div className="flex items-center justify-between gap-2">
                    <span className="font-semibold text-slate-900">{invoice.folio}</span>
                    <span className={`shrink-0 rounded-full border px-2.5 py-0.5 text-xs font-semibold ${toneClasses[tone]}`}>
                      {daysRemaining >= 0 ? `${daysRemaining}d` : `${Math.abs(daysRemaining)}d vencida`}
                    </span>
                  </div>
                  <div className="mt-0.5 truncate text-sm text-slate-500">{invoice.organismo}</div>
                  <div className="mt-1 flex items-center justify-between gap-2">
                    <span className="text-sm font-medium text-slate-700">{formatCurrency(invoice.total)}</span>
                    <span className={`rounded-full px-2.5 py-0.5 text-xs font-semibold ${statusClasses[invoice.estado]}`}>
                      {invoice.estado}
                    </span>
                  </div>
                </button>
              );
            })}
            {filteredInvoices.length === 0 && (
              <p className="py-6 text-center text-sm text-slate-400">Sin resultados.</p>
            )}
          </div>
        </div>

        {/* Panel derecho: detalle */}
        <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <div className="mb-4 flex items-start justify-between gap-3">
            <div>
              <h3 className="text-xl font-semibold text-slate-900">Detalle de factura</h3>
              <p className="text-sm text-slate-500">
                Selecciona una factura para revisar su proceso y gestionar notas.
              </p>
            </div>
            {selectedInvoice && (
              <span className={`rounded-full border px-3 py-1 text-xs font-semibold ${toneClasses[selectedTone]}`}>
                {selectedDaysRemaining >= 0
                  ? `${selectedDaysRemaining} días para pago`
                  : 'Factura vencida'}
              </span>
            )}
          </div>

          {selectedInvoice ? (
            <div className="space-y-5">
              <div className="grid gap-3 md:grid-cols-3">
                <InfoBlock label="Folio" value={selectedInvoice.folio} />
                <InfoBlock label="Organismo" value={selectedInvoice.organismo} />
                <InfoBlock label="RUT" value={selectedInvoice.rut} />
                <InfoBlock label="Orden de compra" value={selectedInvoice.ordenCompra} />
                <InfoBlock label="Monto neto" value={formatCurrency(selectedInvoice.montoNeto)} />
                <InfoBlock label="Total" value={formatCurrency(selectedInvoice.total)} />
                <InfoBlock label="Fecha emisión" value={formatDate(selectedInvoice.fechaEmision)} />
                <InfoBlock label="Recepción conforme" value={formatDate(selectedInvoice.fechaRecepcionConforme)} />
                <InfoBlock label="Pago esperado" value={formatDate(selectedInvoice.fechaPagoEsperada)} />
              </div>

              <div className="rounded-2xl bg-slate-50 p-4">
                <h4 className="mb-4 font-semibold text-slate-900">Estado del proceso</h4>
                {terminalNegative ? (
                  <div className="space-y-3">
                    <div className={`inline-flex items-center gap-2 rounded-xl px-4 py-2 text-sm font-semibold ${statusClasses[selectedInvoice.estado]}`}>
                      <span>●</span>
                      {selectedInvoice.estado}
                    </div>
                    <div>
                      <button
                        type="button"
                        disabled={updatingStatus}
                        onClick={() => handleSetStatus('Pendiente')}
                        className="rounded-xl border border-slate-200 px-3 py-1.5 text-xs font-semibold text-slate-600 hover:bg-white disabled:opacity-50"
                      >
                        Reabrir factura
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="space-y-4">
                    <div className="flex items-center gap-0">
                      {statusFlow.map((step, index) => {
                        const done = currentFlowIndex > index;
                        const active = currentFlowIndex === index;
                        return (
                          <React.Fragment key={step}>
                            <div className="flex flex-col items-center gap-1">
                              <div className={`flex h-8 w-8 items-center justify-center rounded-full text-xs font-bold transition ${active ? 'bg-amber-700 text-white ring-4 ring-amber-200' : done ? 'bg-amber-700 text-white' : 'bg-slate-200 text-slate-400'}`}>
                                {done ? '✓' : index + 1}
                              </div>
                              <span className={`max-w-[72px] text-center text-xs leading-tight ${active ? 'font-semibold text-amber-800' : done ? 'text-slate-600' : 'text-slate-400'}`}>
                                {step}
                              </span>
                            </div>
                            {index < statusFlow.length - 1 && (
                              <div className={`mb-5 h-px flex-1 ${done ? 'bg-amber-700' : 'bg-slate-200'}`} />
                            )}
                          </React.Fragment>
                        );
                      })}
                    </div>
                    {!terminalPositive && (
                      <div className="flex flex-wrap gap-2">
                        {nextStatus && (
                          <button
                            type="button"
                            disabled={updatingStatus}
                            onClick={handleAdvanceStatus}
                            className="rounded-xl bg-amber-700 px-4 py-2 text-sm font-semibold text-white hover:bg-amber-800 disabled:cursor-not-allowed disabled:opacity-60"
                          >
                            {updatingStatus ? 'Actualizando…' : `Avanzar a "${nextStatus}"`}
                          </button>
                        )}
                        {prevStatus && (
                          <button
                            type="button"
                            disabled={updatingStatus}
                            onClick={handleRetroceder}
                            className="rounded-xl border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-500 hover:bg-slate-100 disabled:opacity-50"
                          >
                            ← Retroceder
                          </button>
                        )}
                        <button
                          type="button"
                          disabled={updatingStatus}
                          onClick={() => handleSetStatus('Rechazada')}
                          className="rounded-xl border border-rose-200 px-4 py-2 text-sm font-semibold text-rose-600 hover:bg-rose-50 disabled:opacity-50"
                        >
                          Rechazar
                        </button>
                        <button
                          type="button"
                          disabled={updatingStatus}
                          onClick={() => handleSetStatus('Vencida')}
                          className="rounded-xl border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-500 hover:bg-slate-100 disabled:opacity-50"
                        >
                          Marcar vencida
                        </button>
                      </div>
                    )}
                    {terminalPositive && prevStatus && (
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="text-xs text-slate-400">
                          Factura pagada. Revierte solo si fue un error.
                        </span>
                        <button
                          type="button"
                          disabled={updatingStatus}
                          onClick={handleRevertPagada}
                          className="rounded-xl border border-rose-200 px-4 py-2 text-sm font-semibold text-rose-600 hover:bg-rose-50 disabled:opacity-50"
                        >
                          Revertir pago (corrección)
                        </button>
                      </div>
                    )}
                  </div>
                )}
              </div>

              <div>
                <label className="mb-1 block text-sm font-medium text-slate-700">Notas de gestión</label>
                <textarea
                  value={notesDraft}
                  onChange={event => updateSelectedNotes(event.target.value)}
                  rows={5}
                  className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm outline-none transition focus:border-amber-400 focus:ring-4 focus:ring-amber-100"
                  placeholder="Registrar llamadas, correos, compromisos de pago o incidencias"
                />
                <button
                  type="button"
                  onClick={() => selectedInvoice && success(`Notas de ${selectedInvoice.folio} guardadas correctamente.`)}
                  className="mt-3 rounded-xl bg-slate-900 px-4 py-2 text-sm font-semibold text-white hover:bg-slate-800"
                >
                  Guardar notas
                </button>
              </div>
            </div>
          ) : (
            <EmptyState text="Selecciona una factura de la lista para ver su detalle." />
          )}
        </div>

      </div>

    </section>
  );
};

type FieldProps = {
  label: string;
  value: string;
  onChange: (value: string) => void;
  type?: string;
  error?: string;
};

const Field: React.FC<FieldProps> = ({ label, value, onChange, type = 'text', error }) => (
  <div>
    <label className="mb-1 block text-sm font-medium text-slate-700">{label}</label>
    <input
      value={value}
      type={type}
      onChange={event => onChange(event.target.value)}
      aria-invalid={Boolean(error)}
      className={`w-full rounded-xl border px-3 py-2 text-sm outline-none transition focus:ring-4 ${error ? 'border-rose-300 focus:border-rose-400 focus:ring-rose-100' : 'border-slate-200 focus:border-amber-400 focus:ring-amber-100'}`}
    />
    {error && <span className="mt-1 block text-xs text-rose-600">{error}</span>}
  </div>
);

const CalculatedField: React.FC<{ label: string; value: string }> = ({ label, value }) => (
  <div className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2">
    <div className="text-xs font-medium uppercase tracking-wide text-slate-500">{label}</div>
    <div className="mt-1 text-sm font-semibold text-slate-900">{value}</div>
  </div>
);

const SummaryCard: React.FC<{ title: string; value: React.ReactNode; accent: string }> = ({
  title,
  value,
  accent,
}) => (
  <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
    <div className={`mb-4 h-2 rounded-full bg-gradient-to-r ${accent}`} />
    <div className="text-sm text-slate-500">{title}</div>
    <div className="mt-2 text-2xl font-semibold text-slate-900">{value}</div>
  </div>
);


const InfoBlock: React.FC<{ label: string; value: string }> = ({ label, value }) => (
  <div className="rounded-xl border border-slate-200 bg-white p-3">
    <div className="text-xs font-medium uppercase tracking-wide text-slate-500">{label}</div>
    <div className="mt-1 text-sm font-semibold text-slate-900">{value}</div>
  </div>
);

const EmptyState: React.FC<{ text: string }> = ({ text }) => (
  <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50 px-4 py-6 text-sm text-slate-500">
    {text}
  </div>
);

const validateInvoiceForm = (form: FormState, invoices: Factura[]) => {
  const errors: Partial<Record<keyof FormState, string>> = {};

  const folio = form.folio.trim();
  if (!folio) errors.folio = 'El folio es obligatorio.';
  else if (invoices.some(inv => inv.folio.trim().toLowerCase() === folio.toLowerCase()))
    errors.folio = 'Ya existe una factura con este folio.';
  if (!form.organismo.trim()) errors.organismo = 'El organismo comprador es obligatorio.';
  if (!form.rut.trim()) errors.rut = 'El RUT es obligatorio.';
  else if (!validarRut(form.rut)) errors.rut = 'RUT inválido (revisa el dígito verificador).';
  if (!form.montoNeto || Number(form.montoNeto) <= 0 || Number.isNaN(Number(form.montoNeto)))
    errors.montoNeto = 'Ingresa un monto neto mayor a 0.';
  if (!form.fechaEmision) errors.fechaEmision = 'Selecciona la fecha de emisión.';
  if (!form.descripcion.trim()) errors.descripcion = 'La descripción es obligatoria.';
  if (!form.ordenCompra.trim()) errors.ordenCompra = 'El número de orden de compra es obligatorio.';

  return errors;
};

export default Cobranza;
