import type {
  MovementType,
  Product,
  ProductCategory,
  ProductStatus,
} from '../../context/InventoryContext';

export type ProductForm = {
  sku: string;
  nombre: string;
  categoria: ProductCategory;
  proveedor: string;
  costoCompra: string;
  precioML: string;
  precioSitioWeb: string;
  precioEstado: string;
  stockActual: string;
  stockMinimo: string;
  unidadMedida: string;
  estado: ProductStatus;
};

export type MovementForm = {
  productId: string;
  tipo: MovementType;
  cantidad: string;
  canal: string;
  fecha: string;
};

export type SupplierForm = {
  nombre: string;
  rut: string;
  contacto: string;
  telefono: string;
  ciudad: string;
};

export type ImportPreview = {
  rows: Product[];
  rawName: string;
};

export type CatalogTab = 'catalogo' | 'movimientos' | 'proveedores';
export type SortColumn = 'nombre' | 'sku' | 'stock' | 'precio_ml' | 'categoria';
export type SortDir = 'asc' | 'desc';
export type FilterCategoria = ProductCategory | 'todas';
export type FilterEstado = ProductStatus | 'todos' | 'bajo_stock';
