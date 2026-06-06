-- Tabla Proveedores
CREATE TABLE proveedores (
  id BIGSERIAL PRIMARY KEY,
  nombre TEXT NOT NULL,
  correo TEXT NOT NULL,
  telefono TEXT NOT NULL,
  rut TEXT NOT NULL UNIQUE,
  ciudad TEXT NOT NULL,
  created_at TIMESTAMP DEFAULT NOW()
);

-- Tabla Productos
CREATE TABLE productos (
  id BIGSERIAL PRIMARY KEY,
  sku TEXT NOT NULL UNIQUE,
  nombre TEXT NOT NULL,
  codigo TEXT NOT NULL UNIQUE,
  categoria TEXT NOT NULL,
  proveedor TEXT NOT NULL,
  costo_compra DECIMAL(12, 2) NOT NULL DEFAULT 0,
  precio_ml DECIMAL(12, 2) NOT NULL DEFAULT 0,
  precio_sitio_web DECIMAL(12, 2) NOT NULL DEFAULT 0,
  precio_estado DECIMAL(12, 2) NOT NULL DEFAULT 0,
  stock_actual INT NOT NULL DEFAULT 0,
  stock_minimo INT NOT NULL DEFAULT 5,
  unidad_medida TEXT NOT NULL DEFAULT 'unidad',
  estado TEXT NOT NULL DEFAULT 'activo',
  created_at TIMESTAMP DEFAULT NOW()
);

-- Tabla Facturas (Cobranza)
CREATE TABLE facturas (
  id BIGSERIAL PRIMARY KEY,
  folio TEXT NOT NULL UNIQUE,
  organismo TEXT NOT NULL,
  rut TEXT NOT NULL,
  monto_neto DECIMAL(15, 2) NOT NULL,
  iva DECIMAL(15, 2) NOT NULL,
  monto_total DECIMAL(15, 2) NOT NULL,
  estado TEXT NOT NULL DEFAULT 'por_recibir',
  fecha_emision DATE NOT NULL,
  fecha_recepcion DATE NOT NULL,
  fecha_recepcion_conforme DATE,
  fecha_pago_esperado DATE,
  fecha_primera_alerta DATE,
  fecha_alerta_urgente DATE,
  descripcion TEXT DEFAULT '',
  orden_compra TEXT DEFAULT '',
  notas TEXT DEFAULT '',
  created_at TIMESTAMP DEFAULT NOW()
);

-- Tabla Clientes
CREATE TABLE clientes (
  id BIGSERIAL PRIMARY KEY,
  nombre TEXT NOT NULL,
  correo TEXT NOT NULL,
  telefono TEXT NOT NULL,
  canal_compra TEXT NOT NULL,
  historial_pedidos INT DEFAULT 0,
  monto_total_historico DECIMAL(15, 2) DEFAULT 0,
  created_at TIMESTAMP DEFAULT NOW()
);

-- Tabla Movimientos Stock
CREATE TABLE movimientos_stock (
  id BIGSERIAL PRIMARY KEY,
  producto_id BIGINT NOT NULL REFERENCES productos(id) ON DELETE CASCADE,
  tipo TEXT NOT NULL,
  cantidad INT NOT NULL,
  referencia TEXT NOT NULL,
  fecha DATE NOT NULL,
  created_at TIMESTAMP DEFAULT NOW()
);

-- Tabla Ventas
CREATE TABLE ventas (
  id BIGSERIAL PRIMARY KEY,
  fecha DATE NOT NULL,
  canal TEXT NOT NULL,
  referencia TEXT NOT NULL UNIQUE,
  cliente TEXT NOT NULL,
  monto DECIMAL(15, 2) NOT NULL,
  productos_json TEXT NOT NULL,
  origen TEXT NOT NULL,
  created_at TIMESTAMP DEFAULT NOW()
);

-- Índices para mejorar performance
CREATE INDEX idx_facturas_estado ON facturas(estado);
CREATE INDEX idx_facturas_fecha_recepcion ON facturas(fecha_recepcion);
CREATE INDEX idx_productos_categoria ON productos(categoria);
CREATE INDEX idx_productos_stock ON productos(stock_actual);
CREATE INDEX idx_ventas_canal ON ventas(canal);
CREATE INDEX idx_ventas_fecha ON ventas(fecha);
CREATE INDEX idx_movimientos_producto ON movimientos_stock(producto_id);
CREATE INDEX idx_clientes_canal ON clientes(canal_compra);
