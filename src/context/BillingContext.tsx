import React, { createContext, useContext, useMemo, useState, useEffect } from 'react';
import { fetchFacturas, addFactura as addFacturaSupabase, updateFactura as updateFacturaSupabase } from '../lib/supabase-queries';

export type InvoiceStatus =
  | 'Pendiente'
  | 'En revisión SII'
  | 'Aprobada'
  | 'Rechazada'
  | 'Cobrada'
  | 'Pagada'
  | 'Vencida';

export type Invoice = {
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
  estado: InvoiceStatus;
  notas: string;
};

type BillingContextType = {
  invoices: Invoice[];
  alertsDueThisWeek: Invoice[];
  overdueInvoices: Invoice[];
  dueThisWeekCount: number;
  overdueCount: number;
  isLoading: boolean;
  error: string | null;
  updateInvoiceNotes: (id: number, notes: string) => void;
  addInvoice: (invoice: Omit<Invoice, 'id'>) => void;
};

const BillingContext = createContext<BillingContextType | undefined>(undefined);

const parseDate = (value: string) => new Date(`${value}T00:00:00`);

const daysBetween = (from: Date, to: Date) =>
  Math.ceil((to.getTime() - from.getTime()) / (1000 * 60 * 60 * 24));

const today = () => {
  const current = new Date();
  current.setHours(0, 0, 0, 0);
  return current;
};

export const BillingProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Cargar datos desde Supabase al montar el componente
  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      setError(null);

      // Cargar facturas desde Supabase
      const facturasData = await fetchFacturas();
      const mappedInvoices: Invoice[] = facturasData.map((row: any) => ({
        id: row.id,
        folio: row.folio,
        organismo: row.organismo,
        rut: row.rut,
        montoNeto: Number(row.monto_neto),
        iva: Number(row.iva),
        total: Number(row.monto_total),
        fechaEmision: row.fecha_emision,
        fechaRecepcionConforme: row.fecha_recepcion_conforme || row.fecha_recepcion,
        fechaPagoEsperada: row.fecha_pago_esperado,
        fechaPrimeraAlerta: row.fecha_primera_alerta,
        fechaAlertaUrgente: row.fecha_alerta_urgente,
        descripcion: row.descripcion || '',
        ordenCompra: row.orden_compra || '',
        estado: row.estado as InvoiceStatus,
        notas: row.notas || '',
      }));
      setInvoices(mappedInvoices);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Error al cargar datos';
      setError(message);
      console.error('Error loading billing data:', err);
    } finally {
      setLoading(false);
    }
  };

  const alertsDueThisWeek = useMemo(
    () =>
      invoices.filter(invoice => {
        const days = daysBetween(today(), parseDate(invoice.fechaPagoEsperada));
        return days >= 0 && days <= 7 && invoice.estado !== 'Pagada';
      }),
    [invoices]
  );

  const overdueInvoices = useMemo(
    () =>
      invoices.filter(
        invoice =>
          daysBetween(today(), parseDate(invoice.fechaPagoEsperada)) < 0 &&
          invoice.estado !== 'Pagada'
      ),
    [invoices]
  );

  const updateInvoiceNotes = async (id: number, notes: string) => {
    try {
      await updateFacturaSupabase(id, { notas: notes });
      setInvoices(current =>
        current.map(invoice => (invoice.id === id ? { ...invoice, notas: notes } : invoice))
      );
    } catch (err) {
      console.error('Error updating invoice notes:', err);
      throw err;
    }
  };

  const addInvoice = async (invoice: Omit<Invoice, 'id'>) => {
    try {
      const result = await addFacturaSupabase({
        folio: invoice.folio,
        organismo: invoice.organismo,
        rut: invoice.rut,
        monto_neto: invoice.montoNeto,
        iva: invoice.iva,
        monto_total: invoice.total,
        estado: invoice.estado,
        fecha_emision: invoice.fechaEmision,
        fecha_recepcion: invoice.fechaEmision,
        fecha_recepcion_conforme: invoice.fechaRecepcionConforme,
        fecha_pago_esperado: invoice.fechaPagoEsperada,
        fecha_primera_alerta: invoice.fechaPrimeraAlerta,
        fecha_alerta_urgente: invoice.fechaAlertaUrgente,
        descripcion: invoice.descripcion,
        orden_compra: invoice.ordenCompra,
        notas: invoice.notas,
      });

      setInvoices(current => [{
        id: result.id,
        folio: result.folio,
        organismo: result.organismo,
        rut: result.rut,
        montoNeto: Number(result.monto_neto),
        iva: Number(result.iva),
        total: Number(result.monto_total),
        fechaEmision: result.fecha_emision,
        fechaRecepcionConforme: result.fecha_recepcion_conforme || result.fecha_recepcion,
        fechaPagoEsperada: result.fecha_pago_esperado,
        fechaPrimeraAlerta: result.fecha_primera_alerta,
        fechaAlertaUrgente: result.fecha_alerta_urgente,
        descripcion: result.descripcion || '',
        ordenCompra: result.orden_compra || '',
        estado: result.estado as InvoiceStatus,
        notas: result.notas || '',
      }, ...current]);
    } catch (err) {
      console.error('Error adding invoice:', err);
      throw err;
    }
  };

  const value: BillingContextType = {
    invoices,
    alertsDueThisWeek,
    overdueInvoices,
    dueThisWeekCount: alertsDueThisWeek.length,
    overdueCount: overdueInvoices.length,
    isLoading: loading,
    error,
    updateInvoiceNotes,
    addInvoice,
  };

  return <BillingContext.Provider value={value}>{children}</BillingContext.Provider>;
};

export const useBilling = () => {
  const context = useContext(BillingContext);
  if (!context) {
    throw new Error('useBilling debe usarse dentro de BillingProvider');
  }
  return context;
};
