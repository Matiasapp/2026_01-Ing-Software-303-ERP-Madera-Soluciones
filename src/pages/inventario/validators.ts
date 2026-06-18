import type { Product } from '../../context/InventoryContext';
import { telefonoVacio, validarRut, validarTelefono } from '../../lib/format';
import type { MovementForm, ProductForm, SupplierForm } from './types';

const isPositiveNumber = (value: string) => Number(value) > 0 && Number.isFinite(Number(value));

const isNonNegativeInteger = (value: string) =>
  Number.isInteger(Number(value)) && Number(value) >= 0;

export const validateProductForm = (
  form: ProductForm,
  products: Product[],
  editingProductId: number | null
) => {
  const errors: Partial<Record<keyof ProductForm, string>> = {};

  if (!form.sku.trim()) errors.sku = 'El SKU es obligatorio.';
  else {
    const duplicate = products.some(
      product =>
        product.sku.toLowerCase() === form.sku.trim().toLowerCase() &&
        product.id !== editingProductId
    );
    if (duplicate) errors.sku = 'Ya existe un producto con este SKU.';
  }

  if (!form.nombre.trim()) errors.nombre = 'El nombre es obligatorio.';
  if (!form.categoria) errors.categoria = 'Selecciona una categoría.';
  if (!form.proveedor.trim()) errors.proveedor = 'El proveedor es obligatorio.';

  if (!isPositiveNumber(form.costoCompra))
    errors.costoCompra = 'Ingresa un costo de compra mayor a 0.';
  if (!isPositiveNumber(form.precioML))
    errors.precioML = 'Ingresa un precio válido para Mercado Libre.';
  if (!isPositiveNumber(form.precioSitioWeb))
    errors.precioSitioWeb = 'Ingresa un precio válido para el sitio web.';
  if (!isPositiveNumber(form.precioEstado))
    errors.precioEstado = 'Ingresa un precio válido para Estado.';
  if (!isNonNegativeInteger(form.stockActual))
    errors.stockActual = 'El stock actual debe ser un entero igual o mayor a 0.';
  if (!isNonNegativeInteger(form.stockMinimo))
    errors.stockMinimo = 'El stock mínimo debe ser un entero igual o mayor a 0.';
  if (!form.unidadMedida.trim()) errors.unidadMedida = 'La unidad de medida es obligatoria.';
  if (!form.estado) errors.estado = 'Selecciona un estado.';

  return errors;
};

export const validateMovementForm = (form: MovementForm) => {
  const errors: Partial<Record<keyof MovementForm, string>> = {};

  if (!form.productId) errors.productId = 'Selecciona un producto.';
  if (!form.tipo) errors.tipo = 'Selecciona un tipo de movimiento.';
  if (!isPositiveNumber(form.cantidad)) errors.cantidad = 'La cantidad debe ser mayor a 0.';
  const canalRequerido =
    form.tipo === 'entrada por compra' ||
    form.tipo === 'ajuste de inventario' ||
    form.tipo === 'merma';
  if (canalRequerido && !form.canal.trim()) errors.canal = 'Este campo es obligatorio.';
  if (!form.fecha) errors.fecha = 'La fecha es obligatoria.';

  return errors;
};

export const validateSupplierForm = (form: SupplierForm) => {
  const errors: Partial<Record<keyof SupplierForm, string>> = {};
  if (!form.nombre.trim()) errors.nombre = 'El nombre es obligatorio.';
  if (!form.rut.trim()) errors.rut = 'El RUT es obligatorio.';
  else if (!validarRut(form.rut)) errors.rut = 'RUT inválido (revisa el dígito verificador).';
  if (!form.contacto.trim()) errors.contacto = 'El correo es obligatorio.';
  else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.contacto))
    errors.contacto = 'Ingresa un correo válido.';
  if (telefonoVacio(form.telefono)) errors.telefono = 'El teléfono es obligatorio.';
  else if (!validarTelefono(form.telefono)) errors.telefono = 'Teléfono inválido (debe tener 9 dígitos).';
  return errors;
};
