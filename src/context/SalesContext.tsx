import React, { createContext, useContext, useMemo, useState, useEffect } from 'react';
import { fetchVentas, fetchClientes, addVenta as addVentaSupabase, addCliente as addClienteSupabase } from '../lib/supabase-queries';

export type SalesChannel = 'Mercado Libre' | 'Apanio' | 'WhatsApp' | 'Estado' | 'Sitio web';

export type SalesItem = {
  nombre: string;
  cantidad: number;
  monto: number;
};

export type SalesOrder = {
  id: number;
  fecha: string;
  canal: SalesChannel;
  referencia: string;
  cliente: string;
  monto: number;
  productos: SalesItem[];
  origen: string;
};

export type DirectCustomer = {
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
  addOrders: (orders: Omit<SalesOrder, 'id'>[]) => void;
  addDirectSale: (
    sale: Omit<DirectCustomer, 'historialPedidos' | 'montoTotalHistorico'> & {
      monto: number;
      referencia: string;
      productos: SalesItem[];
      fecha?: string;
    }
  ) => void;
};

const SalesContext = createContext<SalesContextType | undefined>(undefined);

const currentMonth = '2026-05';
const previousMonth = '2026-04';

const dateMonth = (date: string) => date.slice(0, 7);

const normalizeMonthTotals = (orders: SalesOrder[], month: string) => {
  const grouped = new Map<SalesChannel, { canal: SalesChannel; monto: number; pedidos: number }>([
    ['Mercado Libre', { canal: 'Mercado Libre', monto: 0, pedidos: 0 }],
    ['Apanio', { canal: 'Apanio', monto: 0, pedidos: 0 }],
    ['WhatsApp', { canal: 'WhatsApp', monto: 0, pedidos: 0 }],
    ['Estado', { canal: 'Estado', monto: 0, pedidos: 0 }],
    ['Sitio web', { canal: 'Sitio web', monto: 0, pedidos: 0 }],
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

const aggregateOrdersByDate = (orders: SalesOrder[], date: string) =>
  orders.filter(order => order.fecha === date);

export const SalesProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [orders, setOrders] = useState<SalesOrder[]>([]);
  const [directCustomers, setDirectCustomers] = useState<DirectCustomer[]>([]);
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

      // Cargar ventas desde Supabase
      const ventasData = await fetchVentas();
      const mappedOrders: SalesOrder[] = ventasData.map((row: any) => ({
        id: row.id,
        fecha: row.fecha,
        canal: row.canal as SalesChannel,
        referencia: row.referencia,
        cliente: row.cliente,
        monto: Number(row.monto),
        productos: typeof row.productos_json === 'string' ? JSON.parse(row.productos_json) : row.productos_json,
        origen: row.origen,
      }));
      setOrders(mappedOrders);

      // Cargar clientes desde Supabase
      const clientesData = await fetchClientes();
      const mappedCustomers: DirectCustomer[] = clientesData.map((row: any) => ({
        nombre: row.nombre,
        correo: row.correo,
        telefono: row.telefono,
        canalCompra: row.canal_compra as SalesChannel,
        historialPedidos: row.historial_pedidos,
        montoTotalHistorico: Number(row.monto_total_historico),
      }));
      setDirectCustomers(mappedCustomers);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Error al cargar datos';
      setError(message);
      console.error('Error loading sales data:', err);
    } finally {
      setLoading(false);
    }
  };

  const monthlySalesByChannel = useMemo(() => normalizeMonthTotals(orders, currentMonth), [orders]);

  const currentMonthOrders = useMemo(
    () => orders.filter(order => dateMonth(order.fecha) === currentMonth),
    [orders]
  );
  const todaysOrders = useMemo(() => aggregateOrdersByDate(orders, '2026-05-03'), [orders]);

  const currentMonthTotal = useMemo(
    () => currentMonthOrders.reduce((sum, order) => sum + order.monto, 0),
    [currentMonthOrders]
  );
  const previousMonthTotal = useMemo(
    () =>
      orders
        .filter(order => dateMonth(order.fecha) === previousMonth)
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
          cliente: order.cliente,
          monto: order.monto,
          productos_json: JSON.stringify(order.productos),
          origen: order.origen,
        });
        
        setOrders(current => [{
          id: result.id,
          fecha: result.fecha,
          canal: result.canal as SalesChannel,
          referencia: result.referencia,
          cliente: result.cliente,
          monto: Number(result.monto),
          productos: typeof result.productos_json === 'string' ? JSON.parse(result.productos_json) : result.productos_json,
          origen: result.origen,
        }, ...current]);
      }
    } catch (err) {
      console.error('Error adding orders:', err);
      throw err;
    }
  };

  const addDirectSale = async (
    sale: Omit<DirectCustomer, 'historialPedidos' | 'montoTotalHistorico'> & {
      monto: number;
      referencia: string;
      productos: SalesItem[];
      fecha?: string;
    }
  ) => {
    try {
      const date = sale.fecha ?? '2026-05-03';

      const order: Omit<SalesOrder, 'id'> = {
        fecha: date,
        canal: sale.canalCompra,
        referencia: sale.referencia,
        cliente: sale.nombre,
        monto: sale.monto,
        productos: sale.productos,
        origen: 'Venta manual',
      };

      // Agregar venta a Supabase
      const ventaResult = await addVentaSupabase({
        fecha: order.fecha,
        canal: order.canal,
        referencia: order.referencia,
        cliente: order.cliente,
        monto: order.monto,
        productos_json: JSON.stringify(order.productos),
        origen: order.origen,
      });

      setOrders(current => [{
        id: ventaResult.id,
        fecha: ventaResult.fecha,
        canal: ventaResult.canal as SalesChannel,
        referencia: ventaResult.referencia,
        cliente: ventaResult.cliente,
        monto: Number(ventaResult.monto),
        productos: typeof ventaResult.productos_json === 'string' ? JSON.parse(ventaResult.productos_json) : ventaResult.productos_json,
        origen: ventaResult.origen,
      }, ...current]);

      // Actualizar o crear cliente
      const existing = directCustomers.find(
        customer => customer.nombre === sale.nombre || customer.correo === sale.correo
      );

      if (!existing) {
        const clientResult = await addClienteSupabase({
          nombre: sale.nombre,
          correo: sale.correo,
          telefono: sale.telefono,
          canal_compra: sale.canalCompra,
          historial_pedidos: 1,
          monto_total_historico: sale.monto,
        });

        setDirectCustomers(current => [{
          nombre: clientResult.nombre,
          correo: clientResult.correo,
          telefono: clientResult.telefono,
          canalCompra: clientResult.canal_compra as SalesChannel,
          historialPedidos: clientResult.historial_pedidos,
          montoTotalHistorico: Number(clientResult.monto_total_historico),
        }, ...current]);
      } else {
        // Actualizar cliente existente
        setDirectCustomers(current =>
          current.map(customer =>
            customer.nombre === existing.nombre || customer.correo === existing.correo
              ? {
                  ...customer,
                  historialPedidos: customer.historialPedidos + 1,
                  montoTotalHistorico: customer.montoTotalHistorico + sale.monto,
                  canalCompra: sale.canalCompra,
                }
              : customer
          )
        );
      }
    } catch (err) {
      console.error('Error adding direct sale:', err);
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
