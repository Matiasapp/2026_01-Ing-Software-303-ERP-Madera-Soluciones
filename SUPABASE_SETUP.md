# Configuración de Supabase para Cercotec ERP

## Requisitos previos

1. Cuenta de Supabase (https://supabase.com)
2. Variables de entorno configuradas en `.env`:
   ```
   VITE_SUPABASE_URL=https://tu-proyecto.supabase.co
   VITE_SUPABASE_ANON_KEY=tu-anon-key
   ```

## Pasos de configuración

### 1. Crear las tablas en Supabase

1. Ve a tu proyecto en Supabase Dashboard
2. Abre el **SQL Editor** (tab en la izquierda)
3. Crea una nueva query y copia el contenido de `sql/schema.sql`
4. Ejecuta la query para crear todas las tablas

```bash
# O desde la línea de comandos si usas supabase-cli:
supabase db push
```

### 2. Cargar datos de prueba

1. En el SQL Editor de Supabase, crea una nueva query
2. Copia el contenido de `sql/seed_data.sql`
3. Ejecuta la query para cargar los datos de prueba

### 3. Verificar la conexión

1. El proyecto ya tiene el cliente Supabase configurado en `src/lib/supabase.ts`
2. Los contextos están preparados para integrar Supabase (ver instrucciones de migración más abajo)

## Archivos clave

- `src/lib/supabase.ts` - Cliente Supabase y tipos TypeScript
- `src/lib/supabase-queries.ts` - Funciones helper para consultas CRUD
- `sql/schema.sql` - Definición de tablas e índices
- `sql/seed_data.sql` - Datos de prueba

## Migración de contextos (próxima fase)

Los contextos actualmente usan datos hardcodeados. Para migrar a Supabase:

1. **SalesContext** → Reemplazar `initialOrders` con `fetchVentas()`
2. **BillingContext** → Reemplazar `initialInvoices` con `fetchFacturas()`
3. **InventoryContext** → Reemplazar `initialProducts` con `fetchProductos()`
4. Usar `useEffect` para cargar datos al montar el componente
5. Usar `addVenta()`, `addFactura()`, `addProducto()`, etc. para crear/actualizar

### Ejemplo de patrón:

```typescript
const [products, setProducts] = useState<Product[]>([]);
const [loading, setLoading] = useState(true);

useEffect(() => {
  loadProducts();
}, []);

const loadProducts = async () => {
  try {
    const data = await fetchProductos();
    setProducts(data.map(row => ({
      id: row.id,
      nombre: row.nombre,
      // ... mapear campos
    })));
  } catch (error) {
    console.error('Error loading products:', error);
  } finally {
    setLoading(false);
  }
};
```

## Configuración de Row Level Security (RLS)

Para mayor seguridad en producción, configura RLS:

1. En Supabase, ve a **Authentication** → **Policies**
2. Habilita RLS en cada tabla
3. Crea policies para controlar acceso

Ejemplo basic (permitir lectura pública, escritura solo autenticados):
```sql
ALTER TABLE productos ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Lectura pública" ON productos FOR SELECT USING (true);
CREATE POLICY "Solo autenticados pueden escribir" ON productos FOR INSERT WITH CHECK (auth.role() = 'authenticated');
```

## Troubleshooting

### Error: "Supabase URL and Anon Key must be defined"
- Verifica que `.env` tenga las variables `VITE_SUPABASE_URL` y `VITE_SUPABASE_ANON_KEY`
- En Vite, las variables de entorno deben comenzar con `VITE_`

### Error de CORS
- En Supabase Dashboard, ve a **Project Settings** → **API**
- Asegúrate de que tu dominio está en la lista de hosts permitidos

### Las tablas no aparecen
- Recarga la página del SQL Editor
- Verifica que no haya errores en las queries ejecutadas
- Comprueba que estés en la base de datos correcta (public schema)
