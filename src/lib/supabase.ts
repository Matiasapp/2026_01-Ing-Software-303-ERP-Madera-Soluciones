import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL as string;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string;

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('Supabase URL and Anon Key must be defined in environment variables');
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

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
          iva: number;                   // GENERATED ALWAYS AS — solo lectura
          monto_total: number;           // GENERATED ALWAYS AS — solo lectura
          estado: string;
          fecha_emision: string;
          fecha_recepcion: string;
          fecha_recepcion_conforme: string;
          fecha_pago_esperado: string;
          fecha_primera_alerta: string;
          fecha_alerta_urgente: string;
          descripcion: string;
          orden_compra: string;
          notas: string;
          created_at: string;
        };
        // iva y monto_total NO se incluyen en Insert: Postgres los calcula
        Insert: {
          folio: string;
          organismo: string;
          rut: string;
          monto_neto: number;
          estado?: string;
          fecha_emision: string;
          fecha_recepcion: string;
          fecha_recepcion_conforme: string;
          fecha_pago_esperado: string;
          fecha_primera_alerta: string;
          fecha_alerta_urgente: string;
          descripcion?: string;
          orden_compra?: string;
          notas?: string;
        };
        Update: Partial<Database['public']['Tables']['facturas']['Insert']>;
      };
      productos: {
        Row: {
          id: number;
          sku: string;
          nombre: string;
          proveedor_id: number | null;   // FK a proveedores
          categoria: string;
          costo_compra: number;
          precio_ml: number;
          precio_sitio_web: number;
          precio_estado: number;
          stock_actual: number;
          stock_minimo: number;
          unidad_medida: string;
          estado: string;
          created_at: string;
        };
        Insert: Omit<Database['public']['Tables']['productos']['Row'], 'id' | 'created_at'>;
        Update: Partial<Database['public']['Tables']['productos']['Insert']>;
      };
      proveedores: {
        Row: {
          id: number;
          nombre: string;
          correo: string;
          telefono: string;
          rut: string;
          ciudad: string | null;
          created_at: string;
        };
        Insert: Omit<Database['public']['Tables']['proveedores']['Row'], 'id' | 'created_at'>;
        Update: Partial<Database['public']['Tables']['proveedores']['Insert']>;
      };
      clientes: {
        Row: {
          id: number;
          nombre: string;
          correo: string | null;
          telefono: string | null;
          canal_compra: string;
          created_at: string;
        };
        Insert: {
          nombre: string;
          correo?: string | null;
          telefono?: string | null;
          canal_compra: string;
        };
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
        Update: Partial<Database['public']['Tables']['movimientos_stock']['Insert']>;
      };
      ventas: {
        Row: {
          id: number;
          fecha: string;
          canal: string;
          referencia: string;
          cliente_id: number | null;
          monto: number;
          origen: string;
          estado: string;
          ml_order_id: string | null;    // null para ventas manuales; UNIQUE
          created_at: string;
        };
        Insert: Omit<Database['public']['Tables']['ventas']['Row'], 'id' | 'created_at' | 'ml_order_id'> & { ml_order_id?: string | null; estado?: string };
        Update: Partial<Database['public']['Tables']['ventas']['Insert']>;
      };
      ml_credentials: {
        Row: {
          id: number;
          seller_id: string;
          access_token: string;
          refresh_token: string;
          expires_at: string;
          updated_at: string;
        };
        Insert: Omit<Database['public']['Tables']['ml_credentials']['Row'], 'id'>;
        Update: Partial<Database['public']['Tables']['ml_credentials']['Insert']>;
      };
      ventas_items: {
        Row: {
          id: number;
          venta_id: number;
          producto_id: number | null;
          nombre: string;
          cantidad: number;
          precio_unitario: number;
          subtotal: number;              // GENERATED ALWAYS AS — solo lectura
        };
        // subtotal NO se incluye en Insert: Postgres lo calcula
        Insert: {
          venta_id: number;
          producto_id?: number | null;
          nombre: string;
          cantidad: number;
          precio_unitario: number;
        };
        Update: Partial<Database['public']['Tables']['ventas_items']['Insert']>;
      };
    };
  };
};
