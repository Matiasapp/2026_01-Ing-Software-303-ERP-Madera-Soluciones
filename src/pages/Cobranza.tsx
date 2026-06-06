import React, { useEffect, useMemo, useState } from 'react';
import { useNotification } from '../context/NotificationContext';

type FacturaEstado =
  | 'Pendiente'
  | 'En revisión SII'
  | 'Aprobada'
  | 'Rechazada'
  | 'Cobrada'
  | 'Pagada'
  | 'Vencida';

type Factura = {
  id: number;
  folio: string;
  organismo: string;
  rut: string;
  montoNeto: number;
  iva: number;
  total: number;
  fechaEmision: string;
  fechaRecepcionConforme: string;
  fechaPagoEsperada: string;
  fechaPrimeraAlerta: string;
  fechaAlertaUrgente: string;
  descripcion: string;
  ordenCompra: string;
  estado: FacturaEstado;
  notas: string;
};

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

const initialInvoices: Factura[] = [
  {
    id: 1,
    folio: 'F-1001',
    organismo: 'Municipalidad de Santiago',
    rut: '60.010.000-1',
    montoNeto: 2500000,
    iva: 475000,
    total: 2975000,
    fechaEmision: '2026-04-01',
    fechaRecepcionConforme: '2026-04-13',
    fechaPagoEsperada: '2026-05-13',
    fechaPrimeraAlerta: '2026-05-06',
    fechaAlertaUrgente: '2026-05-11',
    descripcion: 'Suministro de herramientas para mantención',
    ordenCompra: 'OC-55678',
    estado: 'Pendiente',
    notas: 'Factura enviada al organismo y en seguimiento.',
  },
  {
    id: 2,
    folio: 'F-1002',
    organismo: 'Gobierno Regional Metropolitano',
    rut: '61.000.000-0',
    montoNeto: 1800000,
    iva: 342000,
    total: 2142000,
    fechaEmision: '2026-03-20',
    fechaRecepcionConforme: '2026-04-01',
    fechaPagoEsperada: '2026-05-01',
    fechaPrimeraAlerta: '2026-04-24',
    fechaAlertaUrgente: '2026-04-29',
    descripcion: 'Compra de insumos para bodegas',
    ordenCompra: 'OC-55120',
    estado: 'En revisión SII',
    notas: 'Revisión tributaria en curso.',
  },
  {
    id: 3,
    folio: 'F-1003',
    organismo: 'Hospital Regional de Valparaíso',
    rut: '61.704.000-5',
    montoNeto: 5200000,
    iva: 988000,
    total: 6188000,
    fechaEmision: '2026-03-05',
    fechaRecepcionConforme: '2026-03-17',
    fechaPagoEsperada: '2026-04-16',
    fechaPrimeraAlerta: '2026-04-09',
    fechaAlertaUrgente: '2026-04-14',
    descripcion: 'Equipamiento para área de mantenimiento',
    ordenCompra: 'OC-54790',
    estado: 'Aprobada',
    notas: 'Aprobada por compras, pendiente instrucción de pago.',
  },
  {
    id: 4,
    folio: 'F-1004',
    organismo: 'Seremi de Vivienda',
    rut: '61.979.000-2',
    montoNeto: 990000,
    iva: 188100,
    total: 1178100,
    fechaEmision: '2026-02-10',
    fechaRecepcionConforme: '2026-02-20',
    fechaPagoEsperada: '2026-03-22',
    fechaPrimeraAlerta: '2026-03-15',
    fechaAlertaUrgente: '2026-03-20',
    descripcion: 'Ferretería general para proyectos habitacionales',
    ordenCompra: 'OC-53318',
    estado: 'Cobrada',
    notas: 'Documento cobrado, falta confirmar conciliación.',
  },
  {
    id: 5,
    folio: 'F-1005',
    organismo: 'Municipalidad de Concepción',
    rut: '69.170.100-6',
    montoNeto: 1500000,
    iva: 285000,
    total: 1785000,
    fechaEmision: '2026-01-15',
    fechaRecepcionConforme: '2026-01-27',
    fechaPagoEsperada: '2026-02-26',
    fechaPrimeraAlerta: '2026-02-19',
    fechaAlertaUrgente: '2026-02-24',
    descripcion: 'Pedido de cerraduras y pernos especiales',
    ordenCompra: 'OC-52100',
    estado: 'Vencida',
    notas: 'Sin respuesta de pago. Escalada a gestión comercial.',
  },
];

const formatCurrency = (value: number) =>
  new Intl.NumberFormat('es-CL', {
    style: 'currency',
    currency: 'CLP',
    maximumFractionDigits: 0,
  }).format(value);

const formatDate = (value: string) =>
  new Intl.DateTimeFormat('es-CL', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  }).format(new Date(`${value}T00:00:00`));

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
  const [facturas, setFacturas] = useState<Factura[]>(initialInvoices);
  const [selectedId, setSelectedId] = useState<number>(initialInvoices[0].id);
  const [statusFilter, setStatusFilter] = useState<'Todos' | FacturaEstado>('Todos');
  const [organismoFilter, setOrganismoFilter] = useState('');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [notesDraft, setNotesDraft] = useState('');
  const { success, error: notifyError } = useNotification();
  const [form, setForm] = useState<FormState>({
    folio: '',
    organismo: '',
    rut: '',
    montoNeto: '',
    fechaEmision: toInputDate(today()),
    descripcion: '',
    ordenCompra: '',
  });

  const selectedInvoice = facturas.find(item => item.id === selectedId) ?? facturas[0];
  const formErrors = useMemo(() => validateInvoiceForm(form), [form]);
  const formValid = Object.keys(formErrors).length === 0;

  useEffect(() => {
    if (selectedInvoice) {
      setNotesDraft(selectedInvoice.notas);
    }
  }, [selectedInvoice?.id]);

  useEffect(() => {
    if (!selectedInvoice && facturas.length > 0) {
      setSelectedId(facturas[0].id);
    }
  }, [facturas, selectedInvoice]);

  const filteredInvoices = useMemo(() => {
    return facturas.filter(invoice => {
      const matchesStatus = statusFilter === 'Todos' || invoice.estado === statusFilter;
      const matchesOrganismo = invoice.organismo
        .toLowerCase()
        .includes(organismoFilter.toLowerCase());
      const invoiceDate = parseDate(invoice.fechaEmision);
      const fromOk = !dateFrom || invoiceDate >= parseDate(dateFrom);
      const toOk = !dateTo || invoiceDate <= parseDate(dateTo);
      return matchesStatus && matchesOrganismo && fromOk && toOk;
    });
  }, [facturas, statusFilter, organismoFilter, dateFrom, dateTo]);

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

  const handleSubmit = (event: React.FormEvent) => {
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
    const iva = Math.round(neto * IVA_RATE);
    const total = neto + iva;

    const newInvoice: Factura = {
      id: Date.now(),
      folio: form.folio,
      organismo: form.organismo,
      rut: form.rut,
      montoNeto: neto,
      iva,
      total,
      fechaEmision: form.fechaEmision,
      fechaRecepcionConforme: toInputDate(recepcion),
      fechaPagoEsperada: toInputDate(pagoEsperado),
      fechaPrimeraAlerta: toInputDate(primeraAlerta),
      fechaAlertaUrgente: toInputDate(alertaUrgente),
      descripcion: form.descripcion,
      ordenCompra: form.ordenCompra,
      estado: 'Pendiente',
      notas: 'Factura recién ingresada al sistema.',
    };

    setFacturas(current => [newInvoice, ...current]);
    setSelectedId(newInvoice.id);
    success(`Factura ${form.folio} registrada correctamente.`);
    setForm({
      folio: '',
      organismo: '',
      rut: '',
      montoNeto: '',
      fechaEmision: toInputDate(today()),
      descripcion: '',
      ordenCompra: '',
    });
  };

  const updateSelectedNotes = (value: string) => {
    setNotesDraft(value);
    if (!selectedInvoice) return;

    setFacturas(current =>
      current.map(invoice =>
        invoice.id === selectedInvoice.id ? { ...invoice, notas: value } : invoice
      )
    );
  };

  const selectedDaysRemaining = selectedInvoice
    ? daysBetween(today(), parseDate(selectedInvoice.fechaPagoEsperada))
    : 0;
  const selectedTone = getUrgencyTone(selectedDaysRemaining);

  const detailTimeline = selectedInvoice
    ? [
        { label: 'Emisión', date: selectedInvoice.fechaEmision, done: true },
        { label: 'Recepción conforme', date: selectedInvoice.fechaRecepcionConforme, done: true },
        {
          label: 'Primera alerta',
          date: selectedInvoice.fechaPrimeraAlerta,
          done: daysBetween(today(), parseDate(selectedInvoice.fechaPrimeraAlerta)) <= 0,
        },
        {
          label: 'Alerta urgente',
          date: selectedInvoice.fechaAlertaUrgente,
          done: daysBetween(today(), parseDate(selectedInvoice.fechaAlertaUrgente)) <= 0,
        },
        {
          label: 'Pago esperado',
          date: selectedInvoice.fechaPagoEsperada,
          done: selectedInvoice.estado === 'Pagada' || selectedInvoice.estado === 'Cobrada',
        },
      ]
    : [];

  return (
    <section className="space-y-6">
      <header className="rounded-2xl border border-blue-100 bg-gradient-to-r from-blue-600 to-sky-500 px-6 py-5 text-white shadow-sm">
        <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
          <div>
            <p className="text-sm/6 text-blue-100">Módulo de Cobranza · Mercado Público</p>
            <h2 className="text-3xl font-semibold">Gestión completa de facturas</h2>
          </div>
          <div className="rounded-xl border border-white/20 bg-white/10 px-4 py-2 text-sm">
            Seguimiento automático de fechas, alertas y gestión de cobro
          </div>
        </div>
      </header>

      <div className="grid gap-4 md:grid-cols-4">
        <SummaryCard
          title="Total facturado"
          value={formatCurrency(summary.totalFacturado)}
          accent="from-blue-500 to-cyan-500"
        />
        <SummaryCard
          title="Cobrado"
          value={formatCurrency(summary.cobrado)}
          accent="from-emerald-500 to-teal-500"
        />
        <SummaryCard
          title="Pendiente"
          value={formatCurrency(summary.pendiente)}
          accent="from-amber-500 to-orange-500"
        />
        <SummaryCard
          title="Facturas por vencer esta semana"
          value={`${summary.vencenEstaSemana}`}
          accent="from-rose-500 to-pink-500"
        />
      </div>

      <div className="grid gap-6 xl:grid-cols-[1.1fr_0.9fr]">
        <form
          onSubmit={handleSubmit}
          className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm"
        >
          <div className="mb-5 flex items-start justify-between gap-4">
            <div>
              <h3 className="text-xl font-semibold text-slate-900">Ingreso de facturas</h3>
              <p className="text-sm text-slate-500">
                Los totales, recepción conforme y fechas de alerta se calculan automáticamente.
              </p>
            </div>
            <span className="rounded-full bg-blue-50 px-3 py-1 text-xs font-semibold uppercase tracking-wide text-blue-700">
              19% IVA
            </span>
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <Field
              label="Número de folio"
              value={form.folio}
              onChange={value => setForm(current => ({ ...current, folio: value }))}
              error={formErrors.folio}
            />
            <Field
              label="Organismo comprador"
              value={form.organismo}
              onChange={value => setForm(current => ({ ...current, organismo: value }))}
              error={formErrors.organismo}
            />
            <Field
              label="RUT"
              value={form.rut}
              onChange={value => setForm(current => ({ ...current, rut: value }))}
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
              className={`w-full rounded-xl border px-3 py-2 text-sm outline-none transition focus:ring-4 ${formErrors.descripcion ? 'border-rose-300 focus:border-rose-400 focus:ring-rose-100' : 'border-slate-200 focus:border-blue-400 focus:ring-blue-100'}`}
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

          <button
            type="submit"
            className="mt-5 inline-flex items-center rounded-xl bg-slate-900 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-60"
            disabled={!formValid}
          >
            Registrar factura
          </button>
        </form>

        <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <div className="mb-4 flex items-center justify-between gap-4">
            <div>
              <h3 className="text-xl font-semibold text-slate-900">Filtros y listado</h3>
              <p className="text-sm text-slate-500">
                Consulta facturas por estado, fecha y organismo.
              </p>
            </div>
            <div className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-600">
              {filteredInvoices.length} resultados
            </div>
          </div>

          <div className="grid gap-3 md:grid-cols-3">
            <select
              value={statusFilter}
              onChange={event => setStatusFilter(event.target.value as 'Todos' | FacturaEstado)}
              className="rounded-xl border border-slate-200 px-3 py-2 text-sm outline-none focus:border-blue-400 focus:ring-4 focus:ring-blue-100"
            >
              <option value="Todos">Todos los estados</option>
              {statusOptions.map(status => (
                <option key={status} value={status}>
                  {status}
                </option>
              ))}
            </select>
            <input
              value={organismoFilter}
              onChange={event => setOrganismoFilter(event.target.value)}
              className="rounded-xl border border-slate-200 px-3 py-2 text-sm outline-none focus:border-blue-400 focus:ring-4 focus:ring-blue-100"
              placeholder="Filtrar por organismo"
            />
            <div className="grid grid-cols-2 gap-2">
              <input
                type="date"
                value={dateFrom}
                onChange={event => setDateFrom(event.target.value)}
                className="rounded-xl border border-slate-200 px-3 py-2 text-sm outline-none focus:border-blue-400 focus:ring-4 focus:ring-blue-100"
                aria-label="Fecha inicial"
              />
              <input
                type="date"
                value={dateTo}
                onChange={event => setDateTo(event.target.value)}
                className="rounded-xl border border-slate-200 px-3 py-2 text-sm outline-none focus:border-blue-400 focus:ring-4 focus:ring-blue-100"
                aria-label="Fecha final"
              />
            </div>
          </div>

          <div className="mt-4 overflow-hidden rounded-2xl border border-slate-200">
            <div className="max-h-[530px] overflow-auto">
              <table className="min-w-full divide-y divide-slate-200 text-sm">
                <thead className="sticky top-0 bg-slate-50 text-left text-xs uppercase tracking-wide text-slate-500">
                  <tr>
                    <th className="px-4 py-3">Folio</th>
                    <th className="px-4 py-3">Organismo</th>
                    <th className="px-4 py-3">Monto</th>
                    <th className="px-4 py-3">Fecha emisión</th>
                    <th className="px-4 py-3">Fecha pago esperada</th>
                    <th className="px-4 py-3">Estado</th>
                    <th className="px-4 py-3">Días restantes</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 bg-white">
                  {filteredInvoices.map(invoice => {
                    const daysRemaining = daysBetween(
                      today(),
                      parseDate(invoice.fechaPagoEsperada)
                    );
                    const tone = getUrgencyTone(daysRemaining);

                    return (
                      <tr
                        key={invoice.id}
                        onClick={() => setSelectedId(invoice.id)}
                        className={`cursor-pointer transition hover:bg-slate-50 ${selectedId === invoice.id ? 'bg-blue-50/70' : ''}`}
                      >
                        <td className="px-4 py-3 font-medium text-slate-900">{invoice.folio}</td>
                        <td className="px-4 py-3 text-slate-600">{invoice.organismo}</td>
                        <td className="px-4 py-3 text-slate-700">
                          {formatCurrency(invoice.total)}
                        </td>
                        <td className="px-4 py-3 text-slate-600">
                          {formatDate(invoice.fechaEmision)}
                        </td>
                        <td className="px-4 py-3 text-slate-600">
                          {formatDate(invoice.fechaPagoEsperada)}
                        </td>
                        <td className="px-4 py-3">
                          <span
                            className={`rounded-full px-3 py-1 text-xs font-semibold ${statusClasses[invoice.estado]}`}
                          >
                            {invoice.estado}
                          </span>
                        </td>
                        <td className="px-4 py-3">
                          <span
                            className={`rounded-full border px-3 py-1 text-xs font-semibold ${toneClasses[tone]}`}
                          >
                            {daysRemaining >= 0
                              ? `${daysRemaining} días`
                              : `${Math.abs(daysRemaining)} días vencida`}
                          </span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>

      <div className="grid gap-6 xl:grid-cols-[0.95fr_1.05fr]">
        <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <div className="mb-4 flex items-start justify-between gap-3">
            <div>
              <h3 className="text-xl font-semibold text-slate-900">Detalle de factura</h3>
              <p className="text-sm text-slate-500">
                Haz clic en una factura para revisar su proceso y gestionar notas.
              </p>
            </div>
            {selectedInvoice && (
              <span
                className={`rounded-full border px-3 py-1 text-xs font-semibold ${toneClasses[selectedTone]}`}
              >
                {selectedDaysRemaining >= 0
                  ? `${selectedDaysRemaining} días para pago`
                  : 'Factura vencida'}
              </span>
            )}
          </div>

          {selectedInvoice ? (
            <div className="space-y-5">
              <div className="grid gap-3 md:grid-cols-2">
                <InfoBlock label="Folio" value={selectedInvoice.folio} />
                <InfoBlock label="Organismo" value={selectedInvoice.organismo} />
                <InfoBlock label="RUT" value={selectedInvoice.rut} />
                <InfoBlock label="Orden de compra" value={selectedInvoice.ordenCompra} />
                <InfoBlock label="Monto neto" value={formatCurrency(selectedInvoice.montoNeto)} />
                <InfoBlock label="Total" value={formatCurrency(selectedInvoice.total)} />
              </div>

              <div className="rounded-2xl bg-slate-50 p-4">
                <div className="mb-3 flex items-center justify-between">
                  <h4 className="font-semibold text-slate-900">Línea de tiempo del proceso</h4>
                  <span
                    className={`rounded-full px-3 py-1 text-xs font-semibold ${statusClasses[selectedInvoice.estado]}`}
                  >
                    {selectedInvoice.estado}
                  </span>
                </div>

                <div className="space-y-3">
                  {detailTimeline.map((step, index) => (
                    <div key={step.label} className="flex gap-3">
                      <div className="flex flex-col items-center">
                        <div
                          className={`flex h-7 w-7 items-center justify-center rounded-full text-xs font-bold ${step.done ? 'bg-blue-600 text-white' : 'bg-slate-200 text-slate-500'}`}
                        >
                          {index + 1}
                        </div>
                        {index < detailTimeline.length - 1 && (
                          <div className="h-full w-px bg-slate-200" />
                        )}
                      </div>
                      <div className="pb-4">
                        <div className="font-medium text-slate-900">{step.label}</div>
                        <div className="text-sm text-slate-500">{formatDate(step.date)}</div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div>
                <label className="mb-1 block text-sm font-medium text-slate-700">
                  Notas de gestión
                </label>
                <textarea
                  value={notesDraft}
                  onChange={event => updateSelectedNotes(event.target.value)}
                  rows={5}
                  className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm outline-none transition focus:border-blue-400 focus:ring-4 focus:ring-blue-100"
                  placeholder="Registrar llamadas, correos, compromisos de pago o incidencias"
                />
                <button
                  type="button"
                  onClick={() =>
                    selectedInvoice &&
                    success(`Notas de ${selectedInvoice.folio} guardadas correctamente.`)
                  }
                  className="mt-3 rounded-xl bg-slate-900 px-4 py-2 text-sm font-semibold text-white hover:bg-slate-800"
                >
                  Guardar notas
                </button>
              </div>
            </div>
          ) : (
            <EmptyState text="No hay una factura seleccionada para mostrar su detalle." />
          )}
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <div className="mb-4">
            <h3 className="text-xl font-semibold text-slate-900">Vista resumen operativa</h3>
            <p className="text-sm text-slate-500">Estado general de la cartera de cobro.</p>
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <MiniStat title="Total facturado" value={formatCurrency(summary.totalFacturado)} />
            <MiniStat title="Cobrado" value={formatCurrency(summary.cobrado)} />
            <MiniStat title="Pendiente por cobrar" value={formatCurrency(summary.pendiente)} />
            <MiniStat
              title="Por vencer esta semana"
              value={`${summary.vencenEstaSemana} facturas`}
            />
          </div>

          <div className="mt-5 rounded-2xl border border-dashed border-slate-200 bg-slate-50 p-4">
            <div className="flex items-center justify-between text-sm text-slate-600">
              <span>Estado de la cartera</span>
              <span>
                {Math.round((summary.cobrado / summary.totalFacturado) * 100) || 0}% cobrado
              </span>
            </div>
            <div className="mt-3 h-3 overflow-hidden rounded-full bg-slate-200">
              <div
                className="h-full rounded-full bg-gradient-to-r from-emerald-500 to-cyan-500"
                style={{
                  width: `${Math.max(8, (summary.cobrado / summary.totalFacturado) * 100) || 8}%`,
                }}
              />
            </div>
          </div>

          <div className="mt-5 space-y-3">
            {statusOptions.map(status => {
              const count = facturas.filter(invoice => invoice.estado === status).length;
              return (
                <div
                  key={status}
                  className="flex items-center justify-between rounded-xl border border-slate-100 px-4 py-3"
                >
                  <span className="text-sm font-medium text-slate-700">{status}</span>
                  <span className="rounded-full bg-slate-100 px-2.5 py-1 text-xs font-semibold text-slate-600">
                    {count}
                  </span>
                </div>
              );
            })}
          </div>
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
      className={`w-full rounded-xl border px-3 py-2 text-sm outline-none transition focus:ring-4 ${error ? 'border-rose-300 focus:border-rose-400 focus:ring-rose-100' : 'border-slate-200 focus:border-blue-400 focus:ring-blue-100'}`}
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

const SummaryCard: React.FC<{ title: string; value: string; accent: string }> = ({
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

const MiniStat: React.FC<{ title: string; value: string }> = ({ title, value }) => (
  <div className="rounded-2xl bg-slate-50 p-4">
    <div className="text-sm text-slate-500">{title}</div>
    <div className="mt-1 text-lg font-semibold text-slate-900">{value}</div>
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

const validateInvoiceForm = (form: FormState) => {
  const errors: Partial<Record<keyof FormState, string>> = {};

  if (!form.folio.trim()) errors.folio = 'El folio es obligatorio.';
  if (!form.organismo.trim()) errors.organismo = 'El organismo comprador es obligatorio.';
  if (!form.rut.trim()) errors.rut = 'El RUT es obligatorio.';
  if (!form.montoNeto || Number(form.montoNeto) <= 0 || Number.isNaN(Number(form.montoNeto)))
    errors.montoNeto = 'Ingresa un monto neto mayor a 0.';
  if (!form.fechaEmision) errors.fechaEmision = 'Selecciona la fecha de emisión.';
  if (!form.descripcion.trim()) errors.descripcion = 'La descripción es obligatoria.';
  if (!form.ordenCompra.trim()) errors.ordenCompra = 'El número de orden de compra es obligatorio.';

  return errors;
};

export default Cobranza;
