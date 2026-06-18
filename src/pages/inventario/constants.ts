import type {
  MovementType,
  ProductCategory,
  ProductStatus,
} from '../../context/InventoryContext';
import { PHONE_PREFIX } from '../../lib/format';
import type { MovementForm, ProductForm, SupplierForm } from './types';

export const categoryOptions: ProductCategory[] = [
  'barras',
  'rieles',
  'soportes',
  'tornillería',
  'otros',
];

export const SKU_PREFIX: Record<ProductCategory, string> = {
  barras: 'BAR',
  rieles: 'RIE',
  soportes: 'SOP',
  tornillería: 'TOR',
  otros: 'OTR',
};

export const statusOptions: ProductStatus[] = ['activo', 'inactivo', 'descontinuado'];

export const unidadOptions = [
  'unidad',
  'metro',
  'metro lineal',
  'kilogramo',
  'caja',
  'paquete',
  'rollo',
  'par',
  'otro',
];

export const movementOptions: MovementType[] = [
  'entrada por compra',
  'salida ML Full/Flex/Envíos',
  'salida Apanio',
  'salida directa',
  'salida Estado',
  'ajuste de inventario',
  'merma',
];

export const initialProductForm: ProductForm = {
  sku: '',
  nombre: '',
  categoria: '' as ProductCategory,
  proveedor: '',
  costoCompra: '',
  precioML: '',
  precioSitioWeb: '',
  precioEstado: '',
  stockActual: '',
  stockMinimo: '',
  unidadMedida: '',
  estado: 'activo',
};

export const initialMovementForm: MovementForm = {
  productId: '',
  tipo: 'entrada por compra',
  cantidad: '',
  canal: 'Bodega',
  fecha: new Date().toISOString().slice(0, 10),
};

export const initialSupplierForm: SupplierForm = {
  nombre: '',
  rut: '',
  contacto: '',
  telefono: PHONE_PREFIX,
  ciudad: '',
};
