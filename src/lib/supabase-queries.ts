import { supabase } from './supabase';
import type { Database } from './supabase';

// Productos
export async function fetchProductos() {
  const { data, error } = await supabase
    .from('productos')
    .select('*');
  if (error) throw error;
  return data || [];
}

export async function addProducto(producto: Database['public']['Tables']['productos']['Insert']) {
  const { data, error } = await supabase
    .from('productos')
    .insert([producto])
    .select()
    .single();
  if (error) throw error;
  return data;
}

export async function updateProducto(id: number, updates: Database['public']['Tables']['productos']['Update']) {
  const { data, error } = await supabase
    .from('productos')
    .update(updates)
    .eq('id', id)
    .select()
    .single();
  if (error) throw error;
  return data;
}

// Proveedores
export async function fetchProveedores() {
  const { data, error } = await supabase
    .from('proveedores')
    .select('*');
  if (error) throw error;
  return data || [];
}

export async function addProveedor(proveedor: Database['public']['Tables']['proveedores']['Insert']) {
  const { data, error } = await supabase
    .from('proveedores')
    .insert([proveedor])
    .select()
    .single();
  if (error) throw error;
  return data;
}

// Movimientos Stock
export async function fetchMovimientos() {
  const { data, error } = await supabase
    .from('movimientos_stock')
    .select('*')
    .order('fecha', { ascending: false });
  if (error) throw error;
  return data || [];
}

export async function addMovimiento(movimiento: Database['public']['Tables']['movimientos_stock']['Insert']) {
  const { data, error } = await supabase
    .from('movimientos_stock')
    .insert([movimiento])
    .select()
    .single();
  if (error) throw error;
  return data;
}

// Facturas
export async function fetchFacturas() {
  const { data, error } = await supabase
    .from('facturas')
    .select('*')
    .order('fecha_recepcion', { ascending: false });
  if (error) throw error;
  return data || [];
}

export async function addFactura(factura: Database['public']['Tables']['facturas']['Insert']) {
  const { data, error } = await supabase
    .from('facturas')
    .insert([factura])
    .select()
    .single();
  if (error) throw error;
  return data;
}

export async function updateFactura(id: number, updates: Database['public']['Tables']['facturas']['Update']) {
  const { data, error } = await supabase
    .from('facturas')
    .update(updates)
    .eq('id', id)
    .select()
    .single();
  if (error) throw error;
  return data;
}

// Clientes
export async function fetchClientes() {
  const { data, error } = await supabase
    .from('clientes')
    .select('*')
    .order('monto_total_historico', { ascending: false });
  if (error) throw error;
  return data || [];
}

export async function addCliente(cliente: Database['public']['Tables']['clientes']['Insert']) {
  const { data, error } = await supabase
    .from('clientes')
    .insert([cliente])
    .select()
    .single();
  if (error) throw error;
  return data;
}

export async function updateCliente(id: number, updates: Database['public']['Tables']['clientes']['Update']) {
  const { data, error } = await supabase
    .from('clientes')
    .update(updates)
    .eq('id', id)
    .select()
    .single();
  if (error) throw error;
  return data;
}

// Ventas
export async function fetchVentas() {
  const { data, error } = await supabase
    .from('ventas')
    .select('*')
    .order('fecha', { ascending: false });
  if (error) throw error;
  return data || [];
}

export async function addVenta(venta: Database['public']['Tables']['ventas']['Insert']) {
  const { data, error } = await supabase
    .from('ventas')
    .insert([venta])
    .select()
    .single();
  if (error) throw error;
  return data;
}
