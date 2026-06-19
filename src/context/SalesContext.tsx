import React, { createContext, useContext, useMemo, useState, useEffect } from 'react';
import {
  fetchVentas,
  fetchClientes,
  fetchVentaById,
  addVenta as addVentaSupabase,
  createDirectSale,
  updateCliente as updateClienteSupabase,
  updateVentaEstado,
} from '../lib/supabase-queries';
import { supabase } from '../lib/supabase';

export type SalesChannel = 'Mercado Libre' | 'Apanio' | 'Venta directa' | 'Estado';
export type OrderStatus = 'Pendiente' | 'En preparación' | 'Despachado' | 'Entregado' | 'Cancelado';

export type SalesItem = {
  nombre: string;
  cantidad: number;
  monto: number;
};

export type SalesOrder = {
  id: number;
  fecha: string;
  // Timestamp ISO de creación del registro (created_at). Aporta la hora, que
  // `fecha` (solo día) no tiene. Opcional: en altas optimistas puede no estar
  // hasta recargar.
  createdAt?: string;
  canal: SalesChannel;
  referencia: string;
  cliente: string;
  monto: number;
  productos: SalesItem[];
  origen: string;
  estado: OrderStatus;
};

export type DirectCustomer = {
  id: number;
  nombre: string;
  correo: string;
  telefono: string;
  canalCompra: SalesChannel;
  historialPedidos: number;
  montoTotalHistorico: number;
};

type SalesContextType = {
  orders: SalesOrder[];
  directCustomers: DirectCustomer[];
  monthlySalesByChannel: { canal: SalesChannel; monto: number; pedidos: number }[];
  currentMonthTotal: number;
  previousMonthTotal: number;
  currentMonthOrders: SalesOrder[];
  todaysOrders: SalesOrder[];
  isLoading: boolean;
  error: string | null;
  addOrders: (orders: Omit<SalesOrder, 'id'>[]) => Promise<void>;
  addDirectSale: (
    sale: Omit<DirectCustomer, 'id' | 'historialPedidos' | 'montoTotalHistorico'> & {
      monto: number;
      referencia: string;
      productos: SalesItem[];
      fecha?: string;
    }
  ) => void;
  updateOrderStatus: (id: number, estado: OrderStatus) => Promise<void>;
  updateCustomer: (id: number, patch: Pick<DirectCustomer, 'nombre' | 'correo' | 'telefono'>) => Promise<void>;
};

const SalesContext = createContext<SalesContextType | undefined>(undefined);

const dateMonth = (date: string) => date.slice(0, 7);

const getCurrentMonth = () => new Date().toISOString().slice(0, 7);
const getPreviousMonth = () => {
  const d = new Date();
  d.setMonth(d.getMonth() - 1);
  return d.toISOString().slice(0, 7);
};

const normalizeMonthTotals = (orders: SalesOrder[], month: string) => {
  const grouped = new Map<SalesChannel, { canal: SalesChannel; monto: number; pedidos: number }>([
    ['Mercado Libre', { canal: 'Mercado Libre', monto: 0, pedidos: 0 }],
    ['Apanio', { canal: 'Apanio', monto: 0, pedidos: 0 }],
    ['Venta directa', { canal: 'Venta directa', monto: 0, pedidos: 0 }],
    ['Estado', { canal: 'Estado', monto: 0, pedidos: 0 }],
  ]);

  orders
    .filter(order => dateMonth(order.fecha) === month)
    .forEach(order => {
      const current = grouped.get(order.canal);
      if (!current) return;
      current.monto += order.monto;
      current.pedidos += 1;
    });

  return Array.from(grouped.values());
};

const mapItems = (ventasItems: any[]): SalesItem[] =>
  ventasItems.map(item => ({
    nombre: item.nombre,
    cantidad: item.cantidad,
    monto: Number(item.subtotal ?? item.precio_unitario * item.cantidad),
  }));

export const SalesProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [orders, setOrders] = useState<SalesOrder[]>([]);
  const [directCustomers, setDirectCustomers] = useState<DirectCustomer[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadData();
  }, []);

  // Escuchar órdenes nuevas de Mercado Libre en tiempo real (requiere Realtime
  // activado en la tabla "ventas" desde el Dashboard de Supabase)
  useEffect(() => {
    const channel = supabase
      .channel('ventas-ml-realtime')
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'ventas', filter: 'canal=eq.Mercado Libre' },
        async (payload) => {
          try {
            const fullOrder = await fetchVentaById(payload.new.id as number);
            const mapped: SalesOrder = {
              id: fullOrder.id,
              fecha: fullOrder.fecha,
              createdAt: (fullOrder as any).created_at,
              canal: fullOrder.canal as SalesChannel,
              referencia: fullOrder.referencia,
              cliente: (fullOrder as any).clientes?.nombre ?? fullOrder.referencia,
              monto: Number(fullOrder.monto),
              productos: mapItems((fullOrder as any).ventas_items ?? []),
              origen: fullOrder.origen,
              estado: (fullOrder.estado ?? 'Pendiente') as OrderStatus,
            };
            setOrders(current => [mapped, ...current]);
          } catch (err) {
            console.error('Error al recibir orden ML en tiempo real:', err);
          }
        },
      )
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      setError(null);

      const ventasData = await fetchVentas();
      const mappedOrders: SalesOrder[] = ventasData.map((row: any) => ({
        id: row.id,
        fecha: row.fecha,
        createdAt: row.created_at,
        canal: row.canal as SalesChannel,
        referencia: row.referencia,
        cliente: row.clientes?.nombre ?? row.referencia,
        monto: Number(row.monto),
        productos: mapItems(row.ventas_items ?? []),
        origen: row.origen,
        estado: (row.estado ?? 'Pendiente') as OrderStatus,
      }));
      setOrders(mappedOrders);

      const clientesData = await fetchClientes();
      const mappedCustomers: DirectCustomer[] = clientesData.map((row: any) => ({
        id: row.id,
        nombre: row.nombre,
        correo: row.correo,
        telefono: row.telefono,
        canalCompra: row.canal_compra as SalesChannel,
        historialPedidos: row.historial_pedidos,
        montoTotalHistorico: Number(row.monto_total_historico),
      }));
      setDirectCustomers(mappedCustomers);
    } catch (err) {
      const message =
        err instanceof Error
          ? err.message
          : typeof (err as any)?.message === 'string'
          ? `${(err as any).message}${(err as any).code ? ` [${(err as any).code}]` : ''}`
          : JSON.stringify(err);
      setError(message);
      console.error('Error loading sales data:', err);
    } finally {
      setLoading(false);
    }
  };

  const monthlySalesByChannel = useMemo(
    () => normalizeMonthTotals(orders, getCurrentMonth()),
    [orders]
  );

  const currentMonthOrders = useMemo(
    () => orders.filter(order => dateMonth(order.fecha) === getCurrentMonth()),
    [orders]
  );

  const todaysOrders = useMemo(() => {
    const today = new Date().toISOString().slice(0, 10);
    return orders.filter(order => order.fecha === today);
  }, [orders]);

  const currentMonthTotal = useMemo(
    () => currentMonthOrders.reduce((sum, order) => sum + order.monto, 0),
    [currentMonthOrders]
  );

  const previousMonthTotal = useMemo(
    () =>
      orders
        .filter(order => dateMonth(order.fecha) === getPreviousMonth())
        .reduce((sum, order) => sum + order.monto, 0),
    [orders]
  );

  const addOrders = async (newOrders: Omit<SalesOrder, 'id'>[]) => {
    try {
      for (const order of newOrders) {
        const result = await addVentaSupabase({
          fecha: order.fecha,
          canal: order.canal,
          referencia: order.referencia,
          cliente_id: null,
          monto: order.monto,
          origen: order.origen,
          estado: order.estado ?? 'Pendiente',
          items: order.productos.map(p => ({
            nombre: p.nombre,
            cantidad: p.cantidad,
            precio_unitario: p.cantidad > 0 ? p.monto / p.cantidad : p.monto,
          })),
        });

        setOrders(current => [{
          id: result.id,
          fecha: result.fecha,
          canal: result.canal as SalesChannel,
          referencia: result.referencia,
          cliente: order.cliente,
          monto: Number(result.monto),
          productos: order.productos,
          origen: result.origen,
          estado: (result.estado ?? 'Pendiente') as OrderStatus,
        }, ...current]);
      }
    } catch (err) {
      console.error('Error adding orders:', err);
      throw err;
    }
  };

  const addDirectSale = async (
    sale: Omit<DirectCustomer, 'id' | 'historialPedidos' | 'montoTotalHistorico'> & {
      monto: number;
      referencia: string;
      productos: SalesItem[];
      fecha?: string;
    }
  ) => {
    const fecha = sale.fecha ?? new Date().toISOString().slice(0, 10);

    // Una sola llamada atómica: si la venta falla, el cliente no queda creado
    const result = await createDirectSale({
      nombre:       sale.nombre,
      correo:       sale.correo || null,
      telefono:     sale.telefono || null,
      canalCompra:  sale.canalCompra,
      fecha,
      referencia:   sale.referencia,
      monto:        sale.monto,
      origen:       'Venta manual',
      items: sale.productos.map(p => ({
        nombre:          p.nombre,
        cantidad:        p.cantidad,
        precio_unitario: p.cantidad > 0 ? p.monto / p.cantidad : p.monto,
      })),
    });

    // Actualizar estado local solo después de que la BD confirmó el éxito
    setOrders(current => [{
      id:        result.venta_id,
      fecha,
      canal:     sale.canalCompra,
      referencia: sale.referencia,
      cliente:   sale.nombre,
      monto:     sale.monto,
      productos: sale.productos,
      origen:    'Venta manual',
      estado:    'Pendiente' as OrderStatus,
    }, ...current]);

    if (result.cliente_es_nuevo) {
      setDirectCustomers(current => [{
        id:                   result.cliente_id,
        nombre:               sale.nombre,
        correo:               sale.correo,
        telefono:             sale.telefono,
        canalCompra:          sale.canalCompra,
        historialPedidos:     1,
        montoTotalHistorico:  sale.monto,
      }, ...current]);
    } else {
      setDirectCustomers(current =>
        current.map(c =>
          c.id === result.cliente_id
            ? {
                ...c,
                historialPedidos:    c.historialPedidos + 1,
                montoTotalHistorico: c.montoTotalHistorico + sale.monto,
                canalCompra:         sale.canalCompra,
              }
            : c
        )
      );
    }
  };

  const updateCustomer = async (
    id: number,
    patch: Pick<DirectCustomer, 'nombre' | 'correo' | 'telefono'>
  ) => {
    const oldNombre = directCustomers.find(c => c.id === id)?.nombre;
    await updateClienteSupabase(id, {
      nombre:   patch.nombre,
      correo:   patch.correo?.trim()   || null,
      telefono: patch.telefono?.trim() || null,
    });
    setDirectCustomers(current =>
      current.map(c => (c.id === id ? { ...c, ...patch } : c))
    );
    if (oldNombre && oldNombre !== patch.nombre) {
      setOrders(current =>
        current.map(o => (o.cliente === oldNombre ? { ...o, cliente: patch.nombre } : o))
      );
    }
  };

  const updateOrderStatus = async (id: number, estado: OrderStatus) => {
    const previous = orders.find(o => o.id === id)?.estado;
    setOrders(current => current.map(o => (o.id === id ? { ...o, estado } : o)));
    try {
      await updateVentaEstado(id, estado);
    } catch (err) {
      if (previous !== undefined) {
        setOrders(current => current.map(o => (o.id === id ? { ...o, estado: previous } : o)));
      }
      throw err;
    }
  };

  const value: SalesContextType = {
    orders,
    directCustomers,
    monthlySalesByChannel,
    currentMonthTotal,
    previousMonthTotal,
    currentMonthOrders,
    todaysOrders,
    isLoading: loading,
    error,
    addOrders,
    addDirectSale,
    updateOrderStatus,
    updateCustomer,
  };

  return <SalesContext.Provider value={value}>{children}</SalesContext.Provider>;
};

export const useSales = () => {
  const context = useContext(SalesContext);
  if (!context) {
    throw new Error('useSales debe usarse dentro de SalesProvider');
  }
  return context;
};
