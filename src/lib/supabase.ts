import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL as string;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string;

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('Supabase URL and Anon Key must be defined in environment variables');
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

// Type helpers for database tables
export type Database = {
  public: {
    Tables: {
      facturas: {
        Row: {
          id: number;
          folio: string;
          organismo: string;
          rut: string;
          monto_neto: number;
          iva: number;
          monto_total: number;
          estado: string;
          fecha_recepcion: string;
          fecha_recepcion_conforme: string;
          fecha_pago_esperado: string;
          notas: string;
          created_at: string;
        };
        Insert: Omit<
          Database['public']['Tables']['facturas']['Row'],
          'id' | 'created_at'
        >;
        Update: Partial<Database['public']['Tables']['facturas']['Insert']>;
      };
      productos: {
        Row: {
          id: number;
          nombre: string;
          codigo: string;
          categoria: string;
          stock_minimo: number;
          stock_actual: number;
          proveedor_id: number;
          precio: number;
          estado: string;
          created_at: string;
        };
        Insert: Omit<
          Database['public']['Tables']['productos']['Row'],
          'id' | 'created_at'
        >;
        Update: Partial<Database['public']['Tables']['productos']['Insert']>;
      };
      proveedores: {
        Row: {
          id: number;
          nombre: string;
          correo: string;
          telefono: string;
          rut: string;
          ciudad: string;
          created_at: string;
        };
        Insert: Omit<
          Database['public']['Tables']['proveedores']['Row'],
          'id' | 'created_at'
        >;
        Update: Partial<Database['public']['Tables']['proveedores']['Insert']>;
      };
      clientes: {
        Row: {
          id: number;
          nombre: string;
          correo: string;
          telefono: string;
          canal_compra: string;
          historial_pedidos: number;
          monto_total_historico: number;
          created_at: string;
        };
        Insert: Omit<
          Database['public']['Tables']['clientes']['Row'],
          'id' | 'created_at'
        >;
        Update: Partial<Database['public']['Tables']['clientes']['Insert']>;
      };
      movimientos_stock: {
        Row: {
          id: number;
          producto_id: number;
          tipo: string;
          cantidad: number;
          referencia: string;
          fecha: string;
          created_at: string;
        };
        Insert: Omit<
          Database['public']['Tables']['movimientos_stock']['Row'],
          'id' | 'created_at'
        >;
        Update: Partial<
          Database['public']['Tables']['movimientos_stock']['Insert']
        >;
      };
      ventas: {
        Row: {
          id: number;
          fecha: string;
          canal: string;
          referencia: string;
          cliente: string;
          monto: number;
          productos_json: string;
          origen: string;
          created_at: string;
        };
        Insert: Omit<
          Database['public']['Tables']['ventas']['Row'],
          'id' | 'created_at'
        >;
        Update: Partial<Database['public']['Tables']['ventas']['Insert']>;
      };
    };
  };
};
