import { supabase } from './supabase';
import type { Database } from './supabase';

type VentaInsert = Database['public']['Tables']['ventas']['Insert'];
type VentaItemInsert = Database['public']['Tables']['ventas_items']['Insert'];

// ─── Productos ────────────────────────────────────────────────────────────────

export async function fetchProductos() {
  const { data, error } = await supabase
    .from('productos')
    .select('*, proveedores(nombre)');
  if (error) throw error;
  return data || [];
}

export async function addProducto(
  producto: Database['public']['Tables']['productos']['Insert'],
) {
  const { data, error } = await supabase
    .from('productos')
    .insert([producto])
    .select('*, proveedores(nombre)')
    .single();
  if (error) throw error;
  return data;
}

export async function updateProducto(
  id: number,
  updates: Database['public']['Tables']['productos']['Update'],
) {
  const { data, error } = await supabase
    .from('productos')
    .update(updates)
    .eq('id', id)
    .select('*, proveedores(nombre)')
    .single();
  if (error) throw error;
  return data;
}

// ─── Proveedores ──────────────────────────────────────────────────────────────

export async function fetchProveedores() {
  const { data, error } = await supabase.from('proveedores').select('*');
  if (error) throw error;
  return data || [];
}

export async function addProveedor(
  proveedor: Database['public']['Tables']['proveedores']['Insert'],
) {
  const { data, error } = await supabase
    .from('proveedores')
    .insert([proveedor])
    .select()
    .single();
  if (error) throw error;
  return data;
}

export async function updateProveedor(
  id: number,
  updates: Database['public']['Tables']['proveedores']['Update'],
) {
  const { data, error } = await supabase
    .from('proveedores')
    .update(updates)
    .eq('id', id)
    .select()
    .single();
  if (error) throw error;
  return data;
}

export async function deleteProveedor(id: number) {
  const { error } = await supabase.from('proveedores').delete().eq('id', id);
  if (error) throw error;
}

// ─── Movimientos de stock ─────────────────────────────────────────────────────

export async function fetchMovimientos(desde?: string, hasta?: string) {
  let query = supabase
    .from('movimientos_stock')
    .select('*')
    .order('fecha', { ascending: false })
    .limit(100);
  if (desde) query = query.gte('fecha', desde);
  if (hasta) query = query.lte('fecha', hasta);
  const { data, error } = await query;
  if (error) throw error;
  return data || [];
}

export async function addMovimiento(
  movimiento: Database['public']['Tables']['movimientos_stock']['Insert'],
) {
  const { data, error } = await supabase.rpc('apply_stock_movement', {
    p_producto_id: movimiento.producto_id,
    p_tipo:        movimiento.tipo,
    p_cantidad:    movimiento.cantidad,
    p_referencia:  movimiento.referencia,
    p_fecha:       movimiento.fecha,
  });
  if (error) throw error;
  return data as Database['public']['Tables']['movimientos_stock']['Row'];
}


export async function fetchProductoStockActual(id: number): Promise<number> {
  const { data, error } = await supabase
    .from('productos')
    .select('stock_actual')
    .eq('id', id)
    .single();
  if (error) throw error;
  return data.stock_actual;
}

// ─── Facturas ─────────────────────────────────────────────────────────────────

export async function fetchFacturas() {
  const { data, error } = await supabase
    .from('facturas')
    .select('*')
    .order('fecha_recepcion', { ascending: false });
  if (error) throw error;
  return data || [];
}

// iva y monto_total son columnas GENERATED en Postgres: no se pasan en Insert
export async function addFactura(
  factura: Database['public']['Tables']['facturas']['Insert'],
) {
  const { data, error } = await supabase
    .from('facturas')
    .insert([factura])
    .select()
    .single();
  if (error) throw error;
  return data;
}

export async function updateFactura(
  id: number,
  updates: Database['public']['Tables']['facturas']['Update'],
) {
  const { data, error } = await supabase
    .from('facturas')
    .update(updates)
    .eq('id', id)
    .select()
    .single();
  if (error) throw error;
  return data;
}

// ─── Clientes ─────────────────────────────────────────────────────────────────
// historial_pedidos y monto_total_historico se calculan desde ventas mediante
// el join; ya no se almacenan como columnas en la tabla clientes.

export async function fetchClientes() {
  const { data, error } = await supabase
    .from('clientes')
    .select('*, ventas(monto)');
  if (error) throw error;

  return (data || []).map(row => {
    const ventas = (row.ventas as { monto: number }[] | null) ?? [];
    return {
      ...row,
      historial_pedidos: ventas.length,
      monto_total_historico: ventas.reduce((sum, v) => sum + Number(v.monto), 0),
    };
  });
}

export async function addCliente(
  cliente: Database['public']['Tables']['clientes']['Insert'],
) {
  const { data, error } = await supabase
    .from('clientes')
    .insert([cliente])
    .select()
    .single();
  if (error) throw error;
  return data;
}

export async function updateCliente(
  id: number,
  updates: Database['public']['Tables']['clientes']['Update'],
) {
  const { data, error } = await supabase
    .from('clientes')
    .update(updates)
    .eq('id', id)
    .select()
    .single();
  if (error) throw error;
  return data;
}

// ─── Ventas ───────────────────────────────────────────────────────────────────
// Cada venta trae sus items (ventas_items) y el nombre del cliente via join.

export async function fetchVentas() {
  // PostgREST devuelve máximo 1000 filas por request. Paginamos para traerlas
  // todas y no "perder" ventas cuando el volumen supera ese tope.
  const pageSize = 1000;
  const all: any[] = [];
  for (let from = 0; ; from += pageSize) {
    const { data, error } = await supabase
      .from('ventas')
      .select('*, ventas_items(*), clientes(nombre)')
      // Orden por día y, dentro del mismo día, por hora (created_at) descendente,
      // para que el orden coincida con la hora que se muestra en la tabla.
      .order('fecha', { ascending: false })
      .order('created_at', { ascending: false })
      .range(from, from + pageSize - 1);
    if (error) throw error;
    if (!data || data.length === 0) break;
    all.push(...data);
    if (data.length < pageSize) break;
  }
  return all;
}

export async function fetchVentaById(id: number) {
  const { data, error } = await supabase
    .from('ventas')
    .select('*, ventas_items(*), clientes(nombre)')
    .eq('id', id)
    .single();
  if (error) throw error;
  return data;
}

// Inserta la venta y sus items en una sola transacción mediante RPC.
// Si la inserción de items falla, Postgres revierte la venta automáticamente.
export async function addVenta(
  venta: VentaInsert & { items: Omit<VentaItemInsert, 'venta_id'>[] },
) {
  const { items, ...ventaData } = venta;

  const { data, error } = await supabase.rpc('create_venta_with_items', {
    p_fecha:       ventaData.fecha,
    p_canal:       ventaData.canal,
    p_referencia:  ventaData.referencia,
    p_cliente_id:  ventaData.cliente_id ?? null,
    p_monto:       ventaData.monto,
    p_origen:      ventaData.origen,
    p_ml_order_id: ventaData.ml_order_id ?? null,
    p_estado:      (ventaData as any).estado ?? 'Pendiente',
    // p_items es jsonb: se pasa el array directo. Con JSON.stringify llegaría
    // como string escalar y jsonb_array_elements falla (22023).
    p_items:       items,
  });

  if (error) throw error;
  return data as Database['public']['Tables']['ventas']['Row'];
}

export async function updateVentaEstado(id: number, estado: string) {
  const { error } = await supabase.from('ventas').update({ estado }).eq('id', id);
  if (error) throw error;
}

export async function deleteProducto(id: number) {
  const { error } = await supabase.from('productos').delete().eq('id', id);
  if (error) throw error;
}

// ─── Venta directa (atómica) ──────────────────────────────────────────────────

type DirectSaleItem = {
  nombre: string;
  cantidad: number;
  precio_unitario: number;
  producto_id?: number | null;
};

type DirectSaleResult = {
  venta_id: number;
  cliente_id: number;
  cliente_es_nuevo: boolean;
};

export async function createDirectSale(params: {
  nombre: string;
  correo: string | null;
  telefono: string | null;
  canalCompra: string;
  fecha: string;
  referencia: string;
  monto: number;
  origen: string;
  items: DirectSaleItem[];
}): Promise<DirectSaleResult> {
  const { data, error } = await supabase.rpc('create_direct_sale', {
    p_nombre:       params.nombre,
    p_correo:       params.correo ?? null,
    p_telefono:     params.telefono ?? null,
    p_canal_compra: params.canalCompra,
    p_fecha:        params.fecha,
    p_referencia:   params.referencia,
    p_monto:        params.monto,
    p_origen:       params.origen,
    p_items:        JSON.stringify(params.items),
  });
  if (error) throw error;
  return data as DirectSaleResult;
}
