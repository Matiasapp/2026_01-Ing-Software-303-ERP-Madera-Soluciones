import React, { createContext, useContext, useMemo, useState, useEffect } from 'react';
import {
  fetchProductos, fetchProveedores, fetchMovimientos,
  addProducto as addProductoSupabase, updateProducto as updateProductoSupabase,
  deleteProducto as deleteProductoSupabase, addMovimiento as addMovimientoSupabase,
  fetchProductoStockActual,
  addProveedor as addProveedorSupabase, updateProveedor as updateProveedorSupabase,
  deleteProveedor as deleteProveedorSupabase,
} from '../lib/supabase-queries';
import type { Database } from '../lib/supabase';

export type ProductCategory = 'barras' | 'rieles' | 'soportes' | 'tornillería' | 'otros';
export type ProductStatus = 'activo' | 'inactivo' | 'descontinuado';
export type MovementType =
  | 'entrada por compra'
  | 'salida ML Full/Flex/Envíos'
  | 'salida Apanio'
  | 'salida directa'
  | 'salida Estado'
  | 'ajuste de inventario'
  | 'merma';

export type Product = {
  id: number;
  sku: string;
  nombre: string;
  categoria: ProductCategory;
  proveedor: string;
  costoCompra: number;
  precioML: number;
  precioSitioWeb: number;
  precioEstado: number;
  stockActual: number;
  stockMinimo: number;
  unidadMedida: string;
  estado: ProductStatus;
};

export type Movement = {
  id: number;
  productId: number;
  fecha: string;
  tipo: MovementType;
  cantidad: number;
  canal: string;
};

export type Supplier = {
  id: number;
  nombre: string;
  rut: string;
  contacto: string;
  telefono: string;
  ciudad: string;
  tiempoEntregaPromedio: string;
  productos: string[];
};

type InventoryContextType = {
  products: Product[];
  movements: Movement[];
  suppliers: Supplier[];
  lowStockProducts: Product[];
  lowStockCount: number;
  isLoading: boolean;
  isLoadingMovements: boolean;
  error: string | null;
  reloadMovimientos: (desde?: string, hasta?: string) => Promise<void>;
  addMovement: (movement: Omit<Movement, 'id'>) => Promise<void>;
  addProducts: (items: Product[]) => Promise<void>;
  updateProduct: (id: number, patch: Partial<Product>) => Promise<void>;
  deleteProduct: (id: number) => Promise<void>;
  addSupplier: (supplier: Omit<Supplier, 'id' | 'productos'>) => Promise<void>;
  updateSupplier: (id: number, patch: Partial<Omit<Supplier, 'id' | 'productos'>>) => Promise<void>;
  deleteSupplier: (id: number) => Promise<void>;
  findSupplierByProduct: (product: Product) => Supplier | undefined;
};

const InventoryContext = createContext<InventoryContextType | undefined>(undefined);

export const InventoryProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [products, setProducts] = useState<Product[]>([]);
  const [movements, setMovements] = useState<Movement[]>([]);
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingMovements, setLoadingMovements] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Cargar datos desde Supabase al montar el componente
  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      setError(null);

      // Cargar productos desde Supabase
      const productosData = await fetchProductos();
      const mappedProducts: Product[] = productosData.map((row: any) => ({
        id: row.id,
        sku: row.sku,
        nombre: row.nombre,
        categoria: row.categoria as ProductCategory,
        proveedor: row.proveedores?.nombre ?? '',
        costoCompra: Number(row.costo_compra),
        precioML: Number(row.precio_ml),
        precioSitioWeb: Number(row.precio_sitio_web),
        precioEstado: Number(row.precio_estado),
        stockActual: row.stock_actual,
        stockMinimo: row.stock_minimo,
        unidadMedida: row.unidad_medida,
        estado: row.estado as ProductStatus,
      }));
      setProducts(mappedProducts);

      // Cargar proveedores desde Supabase
      const proveedoresData = await fetchProveedores();
      const mappedSuppliers: Supplier[] = proveedoresData.map((row: any) => ({
        id: row.id,
        nombre: row.nombre,
        rut: row.rut,
        contacto: row.correo,
        telefono: row.telefono ?? '',
        ciudad: row.ciudad ?? '',
        tiempoEntregaPromedio: '3-5 días',
        productos: mappedProducts.filter(p => p.proveedor === row.nombre).map(p => p.nombre),
      }));
      setSuppliers(mappedSuppliers);

      // Cargar los 100 movimientos más recientes
      const movimientosData = await fetchMovimientos();
      setMovements(movimientosData.map((row: any) => ({
        id: row.id,
        productId: row.producto_id,
        fecha: row.fecha,
        tipo: row.tipo as MovementType,
        cantidad: row.cantidad,
        canal: row.referencia,
      })));
    } catch (err) {
      const message =
        err instanceof Error
          ? err.message
          : typeof (err as any)?.message === 'string'
          ? `${(err as any).message}${(err as any).code ? ` [${(err as any).code}]` : ''}`
          : JSON.stringify(err);
      setError(message);
      console.error('Error loading inventory data:', err);
    } finally {
      setLoading(false);
    }
  };

  const reloadMovimientos = async (desde?: string, hasta?: string) => {
    try {
      setLoadingMovements(true);
      const data = await fetchMovimientos(desde, hasta);
      setMovements(data.map((row: any) => ({
        id: row.id,
        productId: row.producto_id,
        fecha: row.fecha,
        tipo: row.tipo as MovementType,
        cantidad: row.cantidad,
        canal: row.referencia,
      })));
    } catch (err) {
      console.error('Error recargando movimientos:', err);
    } finally {
      setLoadingMovements(false);
    }
  };

  const lowStockProducts = useMemo(
    () =>
      products.filter(
        product => product.estado === 'activo' && product.stockActual <= product.stockMinimo
      ),
    [products]
  );

  const addMovement = async (movement: Omit<Movement, 'id'>) => {
    try {
      // RPC atómica: actualiza stock_actual en productos e inserta el movimiento
      // en la misma transacción. Si alguno falla, Postgres revierte ambos.
      const newMovement = await addMovimientoSupabase({
        producto_id: movement.productId,
        tipo: movement.tipo,
        cantidad: movement.cantidad,
        referencia: movement.canal,
        fecha: movement.fecha,
      });

      setMovements(current => [{
        id: newMovement.id,
        productId: newMovement.producto_id,
        fecha: newMovement.fecha,
        tipo: newMovement.tipo as MovementType,
        cantidad: newMovement.cantidad,
        canal: newMovement.referencia,
      }, ...current]);

      // Leer el stock real desde BD (ya actualizado por la RPC)
      const stockActual = await fetchProductoStockActual(movement.productId);
      setProducts(current =>
        current.map(p => p.id === movement.productId ? { ...p, stockActual } : p)
      );
    } catch (err) {
      console.error('Error adding movement:', err);
      throw err;
    }
  };

  const addProducts = async (items: Product[]) => {
    try {
      for (const item of items) {
        const matchedSupplier = suppliers.find(s => s.nombre === item.proveedor);
        const result = await addProductoSupabase({
          sku: item.sku,
          nombre: item.nombre,
          proveedor_id: matchedSupplier?.id ?? null,
          categoria: item.categoria,
          costo_compra: item.costoCompra,
          precio_ml: item.precioML,
          precio_sitio_web: item.precioSitioWeb,
          precio_estado: item.precioEstado,
          stock_actual: item.stockActual,
          stock_minimo: item.stockMinimo,
          unidad_medida: item.unidadMedida,
          estado: item.estado,
        });
        setProducts(current => [{
          id: result.id,
          sku: result.sku,
          nombre: result.nombre,
          categoria: result.categoria as ProductCategory,
          proveedor: (result as any).proveedores?.nombre ?? item.proveedor,
          costoCompra: Number(result.costo_compra),
          precioML: Number(result.precio_ml),
          precioSitioWeb: Number(result.precio_sitio_web),
          precioEstado: Number(result.precio_estado),
          stockActual: result.stock_actual,
          stockMinimo: result.stock_minimo,
          unidadMedida: result.unidad_medida,
          estado: result.estado as ProductStatus,
        }, ...current]);
      }
    } catch (err) {
      console.error('Error adding products:', err);
      throw err;
    }
  };

  const updateProduct = async (id: number, patch: Partial<Product>) => {
    const dbPatch: Database['public']['Tables']['productos']['Update'] = {};
    if (patch.nombre !== undefined)         dbPatch.nombre = patch.nombre;
    if (patch.sku !== undefined)            dbPatch.sku = patch.sku;
    if (patch.categoria !== undefined)      dbPatch.categoria = patch.categoria;
    if (patch.costoCompra !== undefined)    dbPatch.costo_compra = patch.costoCompra;
    if (patch.precioML !== undefined)       dbPatch.precio_ml = patch.precioML;
    if (patch.precioSitioWeb !== undefined) dbPatch.precio_sitio_web = patch.precioSitioWeb;
    if (patch.precioEstado !== undefined)   dbPatch.precio_estado = patch.precioEstado;
    if (patch.stockMinimo !== undefined)    dbPatch.stock_minimo = patch.stockMinimo;
    if (patch.unidadMedida !== undefined)   dbPatch.unidad_medida = patch.unidadMedida;
    if (patch.estado !== undefined)         dbPatch.estado = patch.estado;
    if (patch.proveedor !== undefined) {
      const supplier = suppliers.find(s => s.nombre === patch.proveedor);
      dbPatch.proveedor_id = supplier?.id ?? null;
    }

    await updateProductoSupabase(id, dbPatch);
    setProducts(current =>
      current.map(p => (p.id === id ? { ...p, ...patch } : p))
    );
  };

  const deleteProduct = async (id: number) => {
    await deleteProductoSupabase(id);
    setProducts(current => current.filter(p => p.id !== id));
    setMovements(current => current.filter(m => m.productId !== id));
  };

  const addSupplier = async (supplier: Omit<Supplier, 'id' | 'productos'>) => {
    const result = await addProveedorSupabase({
      nombre: supplier.nombre,
      rut: supplier.rut,
      correo: supplier.contacto,
      telefono: supplier.telefono,
      ciudad: supplier.ciudad || null,
    });
    setSuppliers(current => [
      ...current,
      {
        id: result.id,
        nombre: result.nombre,
        rut: result.rut,
        contacto: result.correo,
        telefono: result.telefono ?? '',
        ciudad: result.ciudad ?? '',
        tiempoEntregaPromedio: supplier.tiempoEntregaPromedio,
        productos: [],
      },
    ]);
  };

  const updateSupplier = async (id: number, patch: Partial<Omit<Supplier, 'id' | 'productos'>>) => {
    const updates: Record<string, unknown> = {};
    if (patch.nombre !== undefined) updates.nombre = patch.nombre;
    if (patch.rut !== undefined) updates.rut = patch.rut;
    if (patch.contacto !== undefined) updates.correo = patch.contacto;
    if (patch.telefono !== undefined) updates.telefono = patch.telefono;
    if (patch.ciudad !== undefined) updates.ciudad = patch.ciudad;
    await updateProveedorSupabase(id, updates);
    setSuppliers(current =>
      current.map(s => (s.id === id ? { ...s, ...patch } : s))
    );
  };

  const deleteSupplier = async (id: number) => {
    await deleteProveedorSupabase(id);
    setSuppliers(current => current.filter(s => s.id !== id));
  };

  const findSupplierByProduct = (product: Product) =>
    suppliers.find(
      supplier =>
        supplier.productos.includes(product.nombre) || supplier.nombre === product.proveedor
    );

  const lowStockCount = lowStockProducts.length;

  const value: InventoryContextType = {
    products,
    movements,
    suppliers,
    lowStockProducts,
    lowStockCount,
    isLoading: loading,
    isLoadingMovements: loadingMovements,
    error,
    reloadMovimientos,
    addMovement,
    addProducts,
    updateProduct,
    deleteProduct,
    addSupplier,
    updateSupplier,
    deleteSupplier,
    findSupplierByProduct,
  };

  return <InventoryContext.Provider value={value}>{children}</InventoryContext.Provider>;
};

export const useInventory = () => {
  const context = useContext(InventoryContext);
  if (!context) {
    throw new Error('useInventory debe usarse dentro de InventoryProvider');
  }
  return context;
};

export type { InventoryContextType };
