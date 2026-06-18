import { telefonoVacio, validarTelefono } from '../../lib/format';
import type { ManualSaleErrors, ManualSaleForm } from './types';

export const validateManualSale = (form: ManualSaleForm): ManualSaleErrors => {
  const errors: ManualSaleErrors = { lineas: [] };
  if (!form.nombre.trim()) errors.nombre = 'El nombre es obligatorio.';
  if (form.correo.trim() && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.correo))
    errors.correo = 'Ingresa un correo válido.';
  // El teléfono es opcional aquí: solo se valida si se ingresaron dígitos
  // (el prefijo '+56 ' por sí solo cuenta como vacío).
  if (!telefonoVacio(form.telefono) && !validarTelefono(form.telefono))
    errors.telefono = 'Teléfono inválido (debe tener 9 dígitos).';
  if (!form.referencia.trim()) errors.header = 'La referencia es obligatoria.';
  errors.lineas = form.lineas.map(l => {
    if (!l.productoId) return 'Selecciona un producto.';
    if (!Number(l.cantidad) || Number(l.cantidad) <= 0) return 'Cantidad inválida.';
    if (!Number(l.monto) || Number(l.monto) <= 0) return 'Monto inválido.';
    return undefined;
  });
  return errors;
};
