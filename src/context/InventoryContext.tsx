import React, { createContext, useContext, useMemo, useState, useEffect } from 'react';
import { fetchProductos, fetchProveedores, fetchMovimientos, addProducto as addProductoSupabase, addMovimiento as addMovimientoSupabase } from '../lib/supabase-queries';

export type ProductCategory = 'barras' | 'rieles' | 'soportes' | 'tornillería' | 'otros';
export type ProductStatus = 'activo' | 'inactivo' | 'descontinuado';
export type MovementType =
  | 'entrada por compra'
  | 'salida ML Full/Flex/Envíos'
  | 'salida sitio web'
  | 'salida WhatsApp'
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
  error: string | null;
  addMovement: (movement: Omit<Movement, 'id'>) => void;
  addProducts: (items: Product[]) => void;
  updateProduct: (id: number, patch: Partial<Product>) => void;
  deleteProduct: (id: number) => void;
  findSupplierByProduct: (product: Product) => Supplier | undefined;
};

const initialProducts: Product[] = [
  {
    id: 1,
    sku: 'CLZ-BAR-001',
    nombre: 'Barra de closet 3 m blanca',
    categoria: 'barras',
    proveedor: 'ClosetPro SpA',
    costoCompra: 4200,
    precioML: 10990,
    precioSitioWeb: 9990,
    precioEstado: 11990,
    stockActual: 18,
    stockMinimo: 10,
    unidadMedida: 'unidad',
    estado: 'activo',
  },
  {
    id: 2,
    sku: 'CLZ-BAR-002',
    nombre: 'Barra ovalada cromada 2,5 m',
    categoria: 'barras',
    proveedor: 'MetalFer Ltda.',
    costoCompra: 5600,
    precioML: 13990,
    precioSitioWeb: 12990,
    precioEstado: 14990,
    stockActual: 7,
    stockMinimo: 12,
    unidadMedida: 'unidad',
    estado: 'activo',
  },
  {
    id: 3,
    sku: 'CLZ-RIE-001',
    nombre: 'Riel superior aluminio 3 m',
    categoria: 'rieles',
    proveedor: 'Alumarket',
    costoCompra: 6800,
    precioML: 15990,
    precioSitioWeb: 14990,
    precioEstado: 16990,
    stockActual: 5,
    stockMinimo: 8,
    unidadMedida: 'unidad',
    estado: 'activo',
  },
  {
    id: 4,
    sku: 'CLZ-RIE-002',
    nombre: 'Riel inferior guiado 3 m',
    categoria: 'rieles',
    proveedor: 'Alumarket',
    costoCompra: 5100,
    precioML: 12990,
    precioSitioWeb: 11990,
    precioEstado: 13990,
    stockActual: 14,
    stockMinimo: 10,
    unidadMedida: 'unidad',
    estado: 'activo',
  },
  {
    id: 5,
    sku: 'CLZ-SOP-001',
    nombre: 'Soporte lateral reforzado',
    categoria: 'soportes',
    proveedor: 'Ferretería del Centro',
    costoCompra: 950,
    precioML: 2990,
    precioSitioWeb: 2790,
    precioEstado: 3190,
    stockActual: 42,
    stockMinimo: 20,
    unidadMedida: 'par',
    estado: 'activo',
  },
  {
    id: 6,
    sku: 'CLZ-SOP-002',
    nombre: 'Soporte de repisa oculto',
    categoria: 'soportes',
    proveedor: 'Ferretería del Centro',
    costoCompra: 1250,
    precioML: 3490,
    precioSitioWeb: 3290,
    precioEstado: 3790,
    stockActual: 9,
    stockMinimo: 15,
    unidadMedida: 'par',
    estado: 'activo',
  },
  {
    id: 7,
    sku: 'CLZ-TOR-001',
    nombre: 'Tornillo autorroscante 1"',
    categoria: 'tornillería',
    proveedor: 'Suministros del Norte',
    costoCompra: 120,
    precioML: 490,
    precioSitioWeb: 450,
    precioEstado: 520,
    stockActual: 240,
    stockMinimo: 100,
    unidadMedida: 'unidad',
    estado: 'activo',
  },
  {
    id: 8,
    sku: 'CLZ-OTR-001',
    nombre: 'Kit organizador de closet',
    categoria: 'otros',
    proveedor: 'ClosetPro SpA',
    costoCompra: 7800,
    precioML: 18990,
    precioSitioWeb: 17990,
    precioEstado: 19990,
    stockActual: 3,
    stockMinimo: 6,
    unidadMedida: 'kit',
    estado: 'activo',
  },
];

const InventoryContext = createContext<InventoryContextType | undefined>(undefined);

export const InventoryProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [products, setProducts] = useState<Product[]>([]);
  const [movements, setMovements] = useState<Movement[]>([]);
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [loading, setLoading] = useState(true);
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
        proveedor: row.proveedor,
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
        tiempoEntregaPromedio: '3-5 días',
        productos: mappedProducts.filter(p => p.proveedor === row.nombre).map(p => p.nombre),
      }));
      setSuppliers(mappedSuppliers);

      // Cargar movimientos desde Supabase
      const movimientosData = await fetchMovimientos();
      const mappedMovements: Movement[] = movimientosData.map((row: any) => ({
        id: row.id,
        productId: row.producto_id,
        fecha: row.fecha,
        tipo: row.tipo as MovementType,
        cantidad: row.cantidad,
        canal: row.referencia,
      }));
      setMovements(mappedMovements);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Error al cargar datos';
      setError(message);
      console.error('Error loading inventory data:', err);
    } finally {
      setLoading(false);
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
      // Guardar en Supabase
      const newMovement = await addMovimientoSupabase({
        producto_id: movement.productId,
        tipo: movement.tipo,
        cantidad: movement.cantidad,
        referencia: movement.canal,
        fecha: movement.fecha,
      });

      // Actualizar estado local
      const mappedMovement: Movement = {
        id: newMovement.id,
        productId: newMovement.producto_id,
        fecha: newMovement.fecha,
        tipo: newMovement.tipo as MovementType,
        cantidad: newMovement.cantidad,
        canal: newMovement.referencia,
      };

      setMovements(current => [mappedMovement, ...current]);

      // Actualizar stock del producto
      setProducts(current =>
        current.map(product => {
          if (product.id !== movement.productId) return product;

          const signedQuantity =
            movement.tipo.startsWith('salida') || movement.tipo === 'merma'
              ? -movement.cantidad
              : movement.cantidad;
          const adjustedStock = Math.max(0, product.stockActual + signedQuantity);
          return { ...product, stockActual: adjustedStock };
        })
      );
    } catch (err) {
      console.error('Error adding movement:', err);
      throw err;
    }
  };

  const addProducts = async (items: Product[]) => {
    try {
      for (const item of items) {
        const result = await addProductoSupabase({
          sku: item.sku,
          nombre: item.nombre,
          codigo: item.sku,
          categoria: item.categoria,
          proveedor: item.proveedor,
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
          proveedor: result.proveedor,
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

  const updateProduct = (id: number, patch: Partial<Product>) => {
    setProducts(current =>
      current.map(product => (product.id === id ? { ...product, ...patch } : product))
    );
  };

  const deleteProduct = (id: number) => {
    setProducts(current => current.filter(product => product.id !== id));
    setMovements(current => current.filter(movement => movement.productId !== id));
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
    error,
    addMovement,
    addProducts,
    updateProduct,
    deleteProduct,
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
