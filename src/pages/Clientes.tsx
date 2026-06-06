import React, { useMemo, useState } from 'react';
import { useSales, DirectCustomer, SalesOrder } from '../context/SalesContext';

const Clientes: React.FC = () => {
  const { directCustomers, orders } = useSales();
  const [selected, setSelected] = useState<string | null>(
    directCustomers.length > 0 ? directCustomers[0].nombre : null
  );

  const customers = useMemo(() => {
    // Ensure customers list includes aggregated values from orders if missing
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

  return (
    <section>
      <h2 className="text-2xl font-semibold mb-4">Clientes</h2>
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div className="lg:col-span-2">
          <div className="bg-white rounded-lg shadow p-4">
            <h3 className="text-lg font-medium mb-3">Listado de clientes directos</h3>
            <div className="overflow-x-auto">
              <table className="min-w-full text-sm text-left">
                <thead>
                  <tr className="text-xs text-gray-500">
                    <th className="px-3 py-2">Nombre</th>
                    <th className="px-3 py-2">Correo</th>
                    <th className="px-3 py-2">Teléfono</th>
                    <th className="px-3 py-2">Canal</th>
                    <th className="px-3 py-2">Pedidos</th>
                    <th className="px-3 py-2">Monto histórico</th>
                  </tr>
                </thead>
                <tbody>
                  {customers.map(c => (
                    <tr
                      key={c.nombre}
                      className={`border-t hover:bg-gray-50 cursor-pointer ${selected === c.nombre ? 'bg-gray-100' : ''}`}
                      onClick={() => setSelected(c.nombre)}
                    >
                      <td className="px-3 py-2 font-medium">{c.nombre}</td>
                      <td className="px-3 py-2 text-gray-600">{c.correo}</td>
                      <td className="px-3 py-2">{c.telefono}</td>
                      <td className="px-3 py-2">{c.canalCompra}</td>
                      <td className="px-3 py-2">{c.historialPedidos}</td>
                      <td className="px-3 py-2">
                        ${c.montoTotalHistorico.toLocaleString('es-CL')}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        <aside className="bg-white rounded-lg shadow p-4">
          <h3 className="text-lg font-medium mb-2">Detalle cliente</h3>
          {!selected ? (
            <div className="text-gray-600">Seleccione un cliente para ver su historial.</div>
          ) : (
            <div>
              <div className="mb-3">
                <strong>{selected}</strong>
              </div>
              <div className="text-sm text-gray-700 mb-3">
                <div>Pedidos totales: {selectedOrders.length}</div>
                <div>
                  Monto total: $
                  {selectedOrders.reduce((s, o) => s + o.monto, 0).toLocaleString('es-CL')}
                </div>
              </div>

              <div>
                <h4 className="font-medium mb-2">Historial de pedidos</h4>
                {selectedOrders.length === 0 ? (
                  <div className="text-gray-600 text-sm">
                    No hay pedidos registrados para este cliente.
                  </div>
                ) : (
                  <ul className="space-y-2 max-h-64 overflow-auto">
                    {selectedOrders.map(o => (
                      <li key={o.id} className="p-2 border rounded">
                        <div className="flex justify-between text-sm">
                          <div>
                            <div className="font-medium">{o.referencia}</div>
                            <div className="text-gray-600">
                              {o.fecha} · {o.canal}
                            </div>
                          </div>
                          <div className="font-semibold">${o.monto.toLocaleString('es-CL')}</div>
                        </div>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            </div>
          )}
        </aside>
      </div>
    </section>
  );
};

export default Clientes;
