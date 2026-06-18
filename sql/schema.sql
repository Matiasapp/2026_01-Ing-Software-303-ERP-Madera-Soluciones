-- WARNING: This schema is for context only and is not meant to be run.
-- Table order and constraints may not be valid for execution.

CREATE TABLE public.proveedores (
  id bigint NOT NULL DEFAULT nextval('proveedores_id_seq'::regclass),
  nombre text NOT NULL,
  correo text NOT NULL,
  telefono text NOT NULL,
  rut text NOT NULL UNIQUE,
  ciudad text,
  created_at timestamp with time zone DEFAULT now(),
  CONSTRAINT proveedores_pkey PRIMARY KEY (id)
);
CREATE TABLE public.productos (
  id bigint NOT NULL DEFAULT nextval('productos_id_seq'::regclass),
  sku text NOT NULL UNIQUE,
  nombre text NOT NULL,
  proveedor_id bigint,
  categoria text NOT NULL CHECK (categoria = ANY (ARRAY['barras'::text, 'rieles'::text, 'soportes'::text, 'tornillería'::text, 'otros'::text])),
  costo_compra numeric NOT NULL DEFAULT 0 CHECK (costo_compra >= 0::numeric),
  precio_ml numeric NOT NULL DEFAULT 0 CHECK (precio_ml >= 0::numeric),
  precio_sitio_web numeric NOT NULL DEFAULT 0 CHECK (precio_sitio_web >= 0::numeric),
  precio_estado numeric NOT NULL DEFAULT 0 CHECK (precio_estado >= 0::numeric),
  stock_actual integer NOT NULL DEFAULT 0 CHECK (stock_actual >= 0),
  stock_minimo integer NOT NULL DEFAULT 5 CHECK (stock_minimo >= 0),
  unidad_medida text NOT NULL DEFAULT 'unidad'::text,
  estado text NOT NULL DEFAULT 'activo'::text CHECK (estado = ANY (ARRAY['activo'::text, 'inactivo'::text, 'descontinuado'::text])),
  created_at timestamp with time zone DEFAULT now(),
  CONSTRAINT productos_pkey PRIMARY KEY (id),
  CONSTRAINT productos_proveedor_id_fkey FOREIGN KEY (proveedor_id) REFERENCES public.proveedores(id)
);
CREATE TABLE public.facturas (
  id bigint NOT NULL DEFAULT nextval('facturas_id_seq'::regclass),
  folio text NOT NULL UNIQUE,
  organismo text NOT NULL,
  rut text NOT NULL,
  monto_neto numeric NOT NULL CHECK (monto_neto > 0::numeric),
  iva numeric DEFAULT round((monto_neto * 0.19), 2),
  monto_total numeric DEFAULT (monto_neto + round((monto_neto * 0.19), 2)),
  estado text NOT NULL DEFAULT 'Pendiente'::text CHECK (estado = ANY (ARRAY['Pendiente'::text, 'En revisión SII'::text, 'Aprobada'::text, 'Rechazada'::text, 'Cobrada'::text, 'Pagada'::text, 'Vencida'::text])),
  fecha_emision date NOT NULL,
  fecha_recepcion date NOT NULL,
  fecha_recepcion_conforme date NOT NULL,
  fecha_pago_esperado date NOT NULL,
  fecha_primera_alerta date NOT NULL,
  fecha_alerta_urgente date NOT NULL,
  descripcion text DEFAULT ''::text,
  orden_compra text DEFAULT ''::text,
  notas text DEFAULT ''::text,
  created_at timestamp with time zone DEFAULT now(),
  CONSTRAINT facturas_pkey PRIMARY KEY (id)
);
CREATE TABLE public.clientes (
  id bigint NOT NULL DEFAULT nextval('clientes_id_seq'::regclass),
  nombre text NOT NULL,
  correo text,
  telefono text,
  canal_compra text NOT NULL CHECK (canal_compra = ANY (ARRAY['Mercado Libre'::text, 'Apanio'::text, 'Venta directa'::text, 'Estado'::text])),
  created_at timestamp with time zone DEFAULT now(),
  CONSTRAINT clientes_pkey PRIMARY KEY (id)
);
CREATE TABLE public.ventas (
  id bigint NOT NULL DEFAULT nextval('ventas_id_seq'::regclass),
  fecha date NOT NULL,
  canal text NOT NULL CHECK (canal = ANY (ARRAY['Mercado Libre'::text, 'Apanio'::text, 'Venta directa'::text, 'Estado'::text])),
  referencia text NOT NULL UNIQUE,
  cliente_id bigint,
  monto numeric NOT NULL CHECK (monto > 0::numeric),
  origen text NOT NULL,
  created_at timestamp with time zone DEFAULT now(),
  ml_order_id text UNIQUE,
  estado text NOT NULL DEFAULT 'Pendiente'::text CHECK (estado = ANY (ARRAY['Pendiente'::text, 'En preparación'::text, 'Despachado'::text, 'Entregado'::text, 'Cancelado'::text])),
  CONSTRAINT ventas_pkey PRIMARY KEY (id),
  CONSTRAINT ventas_cliente_id_fkey FOREIGN KEY (cliente_id) REFERENCES public.clientes(id)
);
CREATE TABLE public.ventas_items (
  id bigint NOT NULL DEFAULT nextval('ventas_items_id_seq'::regclass),
  venta_id bigint NOT NULL,
  producto_id bigint,
  nombre text NOT NULL,
  cantidad integer NOT NULL CHECK (cantidad > 0),
  precio_unitario numeric NOT NULL CHECK (precio_unitario >= 0::numeric),
  subtotal numeric DEFAULT ((cantidad)::numeric * precio_unitario),
  meli_item_id text,
  costo_compra_historico numeric,
  CONSTRAINT ventas_items_pkey PRIMARY KEY (id),
  CONSTRAINT ventas_items_venta_id_fkey FOREIGN KEY (venta_id) REFERENCES public.ventas(id),
  CONSTRAINT ventas_items_producto_id_fkey FOREIGN KEY (producto_id) REFERENCES public.productos(id)
);
CREATE TABLE public.movimientos_stock (
  id bigint NOT NULL DEFAULT nextval('movimientos_stock_id_seq'::regclass),
  producto_id bigint NOT NULL,
  tipo text NOT NULL CHECK (tipo = ANY (ARRAY['entrada por compra'::text, 'salida ML Full/Flex/Envíos'::text, 'salida Apanio'::text, 'salida directa'::text, 'salida Estado'::text, 'ajuste de inventario'::text, 'merma'::text])),
  cantidad integer NOT NULL CHECK (cantidad > 0),
  referencia text NOT NULL,
  fecha date NOT NULL,
  created_at timestamp with time zone DEFAULT now(),
  CONSTRAINT movimientos_stock_pkey PRIMARY KEY (id),
  CONSTRAINT movimientos_stock_producto_id_fkey FOREIGN KEY (producto_id) REFERENCES public.productos(id)
);
CREATE TABLE public.ml_credentials (
  id bigint NOT NULL DEFAULT nextval('ml_credentials_id_seq'::regclass),
  seller_id text NOT NULL UNIQUE,
  access_token text NOT NULL,
  refresh_token text NOT NULL,
  expires_at timestamp with time zone NOT NULL,
  updated_at timestamp with time zone DEFAULT now(),
  refresh_lock_until timestamp with time zone,
  CONSTRAINT ml_credentials_pkey PRIMARY KEY (id)
);
CREATE TABLE public.meli_publicaciones (
  id bigint NOT NULL DEFAULT nextval('meli_publicaciones_id_seq'::regclass),
  producto_id bigint NOT NULL,
  meli_item_id text NOT NULL UNIQUE,
  tipo_publicacion text NOT NULL DEFAULT 'classic'::text CHECK (tipo_publicacion = ANY (ARRAY['classic'::text, 'gold_pro'::text])),
  estado_publicacion text NOT NULL DEFAULT 'active'::text CHECK (estado_publicacion = ANY (ARRAY['active'::text, 'paused'::text, 'closed'::text])),
  precio_publicado numeric NOT NULL DEFAULT 0 CHECK (precio_publicado >= 0::numeric),
  costo_envio_subvencionado numeric NOT NULL DEFAULT 0,
  tarifa_fija numeric NOT NULL DEFAULT 0,
  porcentaje_comision numeric NOT NULL DEFAULT 0,
  sincronizacion_activa boolean NOT NULL DEFAULT true,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  CONSTRAINT meli_publicaciones_pkey PRIMARY KEY (id),
  CONSTRAINT meli_publicaciones_producto_id_fkey FOREIGN KEY (producto_id) REFERENCES public.productos(id)
);
CREATE TABLE public.ventas_ml_finanzas (
  venta_id bigint NOT NULL,
  comision_marketplace_total numeric NOT NULL DEFAULT 0,
  costo_envio_real numeric NOT NULL DEFAULT 0,
  neto_recibido numeric,
  settled_at timestamp with time zone,
  updated_at timestamp with time zone DEFAULT now(),
  CONSTRAINT ventas_ml_finanzas_pkey PRIMARY KEY (venta_id),
  CONSTRAINT ventas_ml_finanzas_venta_fkey FOREIGN KEY (venta_id) REFERENCES public.ventas(id)
);