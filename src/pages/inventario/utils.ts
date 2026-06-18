import type { Product, ProductCategory } from '../../context/InventoryContext';
import { SKU_PREFIX } from './constants';

// CSV/saneo viven en el módulo compartido; se re-exportan para mantener la API local.
export { parseCsv, sanitizeCell, sanitizeRow } from '../../lib/csv';

export const formatProductLabel = (product: Product) => `${product.sku} · ${product.nombre}`;

export const isAutoSku = (sku: string): boolean => /^[A-Z]+-\d{3,}$/.test(sku);

export const generateSku = (categoria: ProductCategory, products: Product[]): string => {
  const prefix = SKU_PREFIX[categoria];
  const nums = products
    .filter(p => p.sku.startsWith(`${prefix}-`))
    .map(p => parseInt(p.sku.slice(prefix.length + 1), 10))
    .filter(n => !isNaN(n));
  const next = nums.length > 0 ? Math.max(...nums) + 1 : 1;
  return `${prefix}-${String(next).padStart(3, '0')}`;
};
