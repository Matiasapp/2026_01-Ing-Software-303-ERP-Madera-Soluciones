# ✅ Integración Supabase - Guía de Activación

**Estado:** Todos los contextos están listos para conectar con Supabase. El código compila sin errores.

## Lo que se ha hecho

1. **Schema SQL actualizado** — [sql/schema.sql](sql/schema.sql)
   - 6 tablas con todos los campos necesarios
   - Índices de rendimiento
   - Compatible con tipos TypeScript

2. **Datos de prueba listos** — [sql/seed_data.sql](sql/seed_data.sql)
   - 5 proveedores
   - 8 productos con precios por canal
   - 5 facturas con alertas
   - 5 clientes
   - 8 movimientos de stock
   - 10 ventas

3. **Contextos conectados a Supabase** ✅
   - [src/context/InventoryContext.tsx](src/context/InventoryContext.tsx) — Usa `fetchProductos()`, `fetchProveedores()`, `fetchMovimientos()`
   - [src/context/SalesContext.tsx](src/context/SalesContext.tsx) — Usa `fetchVentas()`, `fetchClientes()`
   - [src/context/BillingContext.tsx](src/context/BillingContext.tsx) — Usa `fetchFacturas()`

4. **Funciones helper de Supabase** — [src/lib/supabase-queries.ts](src/lib/supabase-queries.ts)
   - CRUD completo para todas las tablas
   - Manejo de errores integrado

## Pasos para activar Supabase

### 1. Ejecutar el schema en Supabase (5 minutos)

1. Ve a [Supabase Dashboard](https://app.supabase.com)
2. Selecciona tu proyecto
3. Abre **SQL Editor** (en la barra lateral izquierda)
4. Crea una nueva query y copia el contenido de:
   ```bash
   cat sql/schema.sql
   ```
5. Haz clic en **Run** para ejecutar

**Resultado esperado:** 6 tablas aparecerán en la sección "Tables"

### 2. Cargar los datos de prueba (2 minutos)

1. En el **SQL Editor**, crea una nueva query
2. Copia el contenido de:
   ```bash
   cat sql/seed_data.sql
   ```
3. Haz clic en **Run**

**Resultado esperado:** Verás inserciones exitosas en cada tabla

### 3. Verificar conexión desde la app (1 minuto)

1. En tu terminal, ejecuta:
   ```bash
   npm run dev
   ```
2. Abre la app en `http://localhost:5173`
3. Inicia sesión (admin@cercotec.cl / admin123)
4. Navega a cualquier módulo (Inventario, Ventas, Cobranza)
5. **Deberías ver los datos cargados desde Supabase** (no datos hardcodeados)

## ¿Qué cambió en el código?

### Antes (hardcodeado)
```typescript
const [products, setProducts] = useState<Product[]>(initialProducts);
```

### Después (Supabase)
```typescript
const [products, setProducts] = useState<Product[]>([]);

useEffect(() => {
  const loadData = async () => {
    const data = await fetchProductos();
    const mapped = data.map(row => ({ /* mapeo */ }));
    setProducts(mapped);
  };
  loadData();
}, []);
```

## Estructura de datos

### Productos (productos)
```typescript
{
  id, sku, nombre, codigo, categoria, proveedor,
  costo_compra, precio_ml, precio_sitio_web, precio_estado,
  stock_actual, stock_minimo, unidad_medida, estado
}
```

### Facturas (facturas)
```typescript
{
  id, folio, organismo, rut,
  monto_neto, iva, monto_total, estado,
  fecha_emision, fecha_recepcion, fecha_recepcion_conforme,
  fecha_pago_esperado, fecha_primera_alerta, fecha_alerta_urgente,
  descripcion, orden_compra, notas
}
```

### Ventas (ventas)
```typescript
{
  id, fecha, canal, referencia, cliente, monto,
  productos_json (JSON guardado como TEXT), origen
}
```

### Clientes (clientes)
```typescript
{
  id, nombre, correo, telefono, canal_compra,
  historial_pedidos, monto_total_historico
}
```

### Movimientos Stock (movimientos_stock)
```typescript
{
  id, producto_id, tipo, cantidad, referencia, fecha
}
```

### Proveedores (proveedores)
```typescript
{
  id, nombre, correo, telefono, rut, ciudad
}
```

## Troubleshooting

### Error: "Supabase URL and Anon Key must be defined"
✅ **Ya configurado:** Tu `.env` ya tiene:
```
VITE_SUPABASE_URL=...
VITE_SUPABASE_ANON_KEY=...
```

### Los datos no cargan en la app
1. Verifica que las tablas existen en Supabase Dashboard → Tables
2. Verifica que la seed data se insertó (debería haber 5+ registros por tabla)
3. Abre la consola del navegador (F12) y busca errores de red
4. Verifica que las variables de entorno son correctas

### Error de CORS
En Supabase Dashboard → Project Settings → API → asegúrate de que tu dominio está en la lista de hosts permitidos (localhost:5173 para desarrollo)

## Características de la integración

✅ **Carga automática** — Los datos se cargan al montar cada proveedor de contexto
✅ **Manejo de errores** — Estados de error en cada contexto
✅ **Estados de carga** — Puedes mostrar spinners mientras se cargan datos
✅ **Mutaciones** — `addProducto()`, `addVenta()`, etc. guardan en Supabase
✅ **Tipo seguro** — Todas las operaciones usan TypeScript

## Próximos pasos opcionales

1. **Row Level Security (RLS)** — Configurar políticas de acceso por usuario
2. **Realtime** — Usar `supabase.on('*', ...)` para actualizaciones en tiempo real
3. **Backups** — Configurar backups automáticos en Supabase
4. **Optimizaciones** — Implementar caché con SWR o React Query
5. **Análisis** — Usar RLS con auth para separar datos por tenant

## Archivos clave

| Archivo | Propósito |
|---------|-----------|
| `sql/schema.sql` | Definición de tablas e índices |
| `sql/seed_data.sql` | Datos de prueba |
| `src/lib/supabase.ts` | Cliente Supabase + tipos |
| `src/lib/supabase-queries.ts` | Funciones helper CRUD |
| `src/context/InventoryContext.tsx` | Contexto integrado |
| `src/context/SalesContext.tsx` | Contexto integrado |
| `src/context/BillingContext.tsx` | Contexto integrado |

**¿Listo? Ejecuta los pasos 1-3 arriba y tendrás Cercotec ERP conectado a Supabase ✨**
