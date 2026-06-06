-- Seed Data para Cercotec ERP

-- Proveedores
INSERT INTO proveedores (nombre, correo, telefono, rut, ciudad) VALUES
('ClosetPro SpA', 'compras@closetpro.cl', '+56 2 2123 4567', '76.123.456-7', 'Santiago'),
('MetalFer Ltda.', 'ventas@metalfer.cl', '+56 9 8123 4567', '77.234.567-8', 'Santiago'),
('Alumarket', 'ventas@alumarket.cl', '+56 2 2567 8901', '78.345.678-9', 'Valparaíso'),
('Ferretería del Centro', 'contacto@ferreteriacentro.cl', '+56 2 2345 6789', '79.456.789-0', 'Santiago'),
('Suministros del Norte', 'logistica@suministrosnorte.cl', '+56 51 2456 7890', '80.567.890-1', 'Puerto Varas');

-- Productos (Mapeados desde InventoryContext)
INSERT INTO productos (sku, nombre, codigo, categoria, proveedor, costo_compra, precio_ml, precio_sitio_web, precio_estado, stock_actual, stock_minimo, unidad_medida, estado) VALUES
('CLZ-BAR-001', 'Barra de closet 3 m blanca', 'BAR-001', 'barras', 'ClosetPro SpA', 4200, 10990, 9990, 11990, 24, 10, 'unidad', 'activo'),
('CLZ-BAR-002', 'Barra ovalada cromada 2,5 m', 'BAR-002', 'barras', 'MetalFer Ltda.', 5600, 13990, 12990, 14990, 14, 12, 'unidad', 'activo'),
('CLZ-RIE-001', 'Riel superior aluminio 3 m', 'RIE-001', 'rieles', 'Alumarket', 6800, 15990, 14990, 16990, 18, 8, 'unidad', 'activo'),
('CLZ-RIE-002', 'Riel inferior guiado 3 m', 'RIE-002', 'rieles', 'Alumarket', 5100, 12990, 11990, 13990, 12, 10, 'unidad', 'activo'),
('CLZ-SOP-001', 'Soporte lateral reforzado', 'SOP-001', 'soportes', 'Ferretería del Centro', 950, 2990, 2790, 3190, 45, 20, 'par', 'activo'),
('CLZ-SOP-002', 'Soporte de repisa oculto', 'SOP-002', 'soportes', 'Ferretería del Centro', 1250, 3490, 3290, 3790, 28, 15, 'par', 'activo'),
('CLZ-TOR-001', 'Tornillo autorroscante 1"', 'TOR-001', 'tornillería', 'Suministros del Norte', 120, 490, 450, 520, 200, 100, 'unidad', 'activo'),
('CLZ-OTR-001', 'Kit organizador de closet', 'OTR-001', 'otros', 'ClosetPro SpA', 7800, 18990, 17990, 19990, 8, 6, 'kit', 'activo');

-- Facturas (Cobranza - datos de prueba)
INSERT INTO facturas (folio, organismo, rut, monto_neto, iva, monto_total, estado, fecha_emision, fecha_recepcion, fecha_recepcion_conforme, fecha_pago_esperado, fecha_primera_alerta, fecha_alerta_urgente, descripcion, orden_compra, notas) VALUES
('F-1001', 'Municipalidad de Santiago', '60.010.000-1', 2500000, 475000, 2975000, 'Pendiente', '2026-04-01', '2026-04-01', '2026-04-13', '2026-05-13', '2026-05-06', '2026-05-11', 'Suministro de herramientas para mantención', 'OC-55678', 'Factura enviada al organismo y en seguimiento.'),
('F-1002', 'Gobierno Regional Metropolitano', '61.000.000-0', 1800000, 342000, 2142000, 'En revisión SII', '2026-03-20', '2026-03-20', '2026-04-01', '2026-05-01', '2026-04-24', '2026-04-29', 'Compra de insumos para bodegas', 'OC-55120', 'Revisión tributaria en curso.'),
('F-1003', 'Hospital Regional de Valparaíso', '61.704.000-5', 5200000, 988000, 6188000, 'Aprobada', '2026-03-05', '2026-03-05', '2026-03-17', '2026-04-16', '2026-04-09', '2026-04-14', 'Equipamiento para área de mantenimiento', 'OC-54790', 'Aprobada por compras, pendiente instrucción de pago.'),
('F-1004', 'Seremi de Vivienda', '61.979.000-2', 990000, 188100, 1178100, 'Cobrada', '2026-02-10', '2026-02-10', '2026-02-20', '2026-03-22', '2026-03-15', '2026-03-20', 'Ferretería general para proyectos habitacionales', 'OC-53318', 'Documento cobrado, falta confirmar conciliación.'),
('F-1005', 'Municipalidad de Concepción', '69.170.100-6', 1500000, 285000, 1785000, 'Vencida', '2026-01-15', '2026-01-15', '2026-01-27', '2026-02-26', '2026-02-19', '2026-02-24', 'Pedido de cerraduras y pernos especiales', 'OC-52100', 'Sin respuesta de pago. Escalada a gestión comercial.');

-- Clientes
INSERT INTO clientes (nombre, correo, telefono, canal_compra, historial_pedidos, monto_total_historico) VALUES
('Carlos Rojas', 'carlos.rojas@mail.cl', '+56 9 7642 2211', 'WhatsApp', 4, 214980),
('Andrea Sepúlveda', 'andreasep@gmail.com', '+56 9 6112 8400', 'Sitio web', 2, 118980),
('Paola Espinoza', 'paolaespinoza@gmail.com', '+56 9 7890 3312', 'WhatsApp', 3, 198470),
('Melina Torres', 'melina.torres@mail.cl', '+56 9 5567 2210', 'Apanio', 1, 89990),
('Hogar y Diseño SPA', 'hogar.diseno@mail.cl', '+56 2 2345 6677', 'Mercado Libre', 2, 143900);

-- Movimientos Stock
INSERT INTO movimientos_stock (producto_id, tipo, cantidad, referencia, fecha) VALUES
(1, 'entrada', 50, 'ORD-2026-001', '2026-04-01'),
(1, 'salida', 10, 'VTA-2026-0001', '2026-04-05'),
(2, 'entrada', 30, 'ORD-2026-002', '2026-04-02'),
(2, 'salida', 6, 'VTA-2026-0002', '2026-04-10'),
(3, 'entrada', 100, 'ORD-2026-003', '2026-03-30'),
(3, 'salida', 30, 'VTA-2026-0003', '2026-04-12'),
(4, 'entrada', 15, 'ORD-2026-004', '2026-04-05'),
(4, 'salida', 1, 'VTA-2026-0004', '2026-04-08');

-- Ventas
INSERT INTO ventas (fecha, canal, referencia, cliente, monto, productos_json, origen) VALUES
('2026-05-03', 'Mercado Libre', 'ML-98721', 'Constructora Andes Ltda.', 198500, '[{"nombre":"Barra de closet 3 m blanca","cantidad":10,"monto":109900},{"nombre":"Soporte lateral reforzado","cantidad":30,"monto":88600}]', 'ML Full'),
('2026-05-03', 'Mercado Libre', 'ML-98722', 'Hogar y Diseño SPA', 143900, '[{"nombre":"Riel superior aluminio 3 m","cantidad":6,"monto":95940},{"nombre":"Soporte de repisa oculto","cantidad":10,"monto":47960}]', 'ML Flex'),
('2026-05-02', 'Apanio', 'AP-5501', 'Melina Torres', 89990, '[{"nombre":"Kit organizador de closet","cantidad":1,"monto":89990}]', 'Apanio'),
('2026-05-02', 'WhatsApp', 'WA-2201', 'Carlos Rojas', 67980, '[{"nombre":"Barra ovalada cromada 2,5 m","cantidad":2,"monto":27980},{"nombre":"Soporte lateral reforzado","cantidad":10,"monto":39900}]', 'Venta directa'),
('2026-05-01', 'Estado', 'EST-1188', 'Gobierno Regional Metropolitano', 284000, '[{"nombre":"Riel inferior guiado 3 m","cantidad":12,"monto":143880},{"nombre":"Tornillo autorroscante 1\"","cantidad":300,"monto":140120}]', 'Compra pública'),
('2026-04-22', 'Sitio web', 'WEB-8831', 'Andrea Sepúlveda', 56990, '[{"nombre":"Soporte de repisa oculto","cantidad":2,"monto":56990}]', 'Sitio web'),
('2026-04-26', 'Mercado Libre', 'ML-98580', 'Ferretería Norte Grande', 215980, '[{"nombre":"Barra de closet 3 m blanca","cantidad":12,"monto":131880},{"nombre":"Soporte lateral reforzado","cantidad":28,"monto":84000}]', 'ML Full'),
('2026-04-30', 'Apanio', 'AP-5489', 'Fernanda Molina', 124990, '[{"nombre":"Barra ovalada cromada 2,5 m","cantidad":4,"monto":124990}]', 'Apanio'),
('2026-05-03', 'WhatsApp', 'WA-2202', 'Paola Espinoza', 48990, '[{"nombre":"Tornillo autorroscante 1\"","cantidad":100,"monto":48990}]', 'Venta directa'),
('2026-04-15', 'Estado', 'EST-1155', 'Municipalidad de Talca', 398000, '[{"nombre":"Riel superior aluminio 3 m","cantidad":15,"monto":239850},{"nombre":"Soporte lateral reforzado","cantidad":50,"monto":158150}]', 'Compra pública');
