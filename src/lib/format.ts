// Helpers de formato compartidos por todas las páginas (CLP y fechas es-CL).

export const formatCurrency = (value: number) =>
  new Intl.NumberFormat('es-CL', {
    style: 'currency',
    currency: 'CLP',
    maximumFractionDigits: 0,
  }).format(value);

// Normaliza un folio a mayúsculas (los folios se manejan siempre en mayúsculas).
export const formatFolio = (value: string) => value.toUpperCase();

// Formatea un RUT chileno como 'XX.XXX.XXX-D' mientras se escribe.
// Toma el último caracter como dígito verificador (dígito o K) y separa el
// cuerpo con puntos de miles. Ignora cualquier caracter no válido.
export const formatRut = (value: string) => {
  const clean = value.replace(/[^0-9kK]/g, '').toUpperCase();
  if (clean.length === 0) return '';
  const body = clean.slice(0, -1).replace(/\D/g, '');
  const dv = clean.slice(-1);
  if (body.length === 0) return dv;
  const withDots = body.replace(/\B(?=(\d{3})+(?!\d))/g, '.');
  return `${withDots}-${dv}`;
};

// Valida el dígito verificador de un RUT chileno (módulo 11). Sirve igual para
// personas y empresas. Acepta el RUT con o sin puntos/guion.
export const validarRut = (value: string): boolean => {
  const clean = value.replace(/[^0-9kK]/g, '').toUpperCase();
  if (clean.length < 2) return false;
  const body = clean.slice(0, -1);
  const dv = clean.slice(-1);
  if (!/^\d+$/.test(body)) return false;

  let sum = 0;
  let factor = 2;
  for (let i = body.length - 1; i >= 0; i -= 1) {
    sum += Number(body[i]) * factor;
    factor = factor === 7 ? 2 : factor + 1;
  }
  const resto = 11 - (sum % 11);
  const esperado = resto === 11 ? '0' : resto === 10 ? 'K' : String(resto);
  return dv === esperado;
};

export const PHONE_PREFIX = '+56 ';

// Devuelve los 9 dígitos nacionales de un teléfono chileno (quita el prefijo 56).
const telefonoDigitos = (value: string) => {
  let digits = value.replace(/\D/g, '');
  if (digits.startsWith('56')) digits = digits.slice(2);
  return digits.slice(0, 9);
};

// true si el teléfono no tiene dígitos nacionales (solo el prefijo '+56 ' o vacío).
export const telefonoVacio = (value: string): boolean => telefonoDigitos(value).length === 0;

// Formatea un teléfono chileno como '+56 9 XXXX XXXX'. Conserva el prefijo aunque
// no haya dígitos, para que el campo siempre muestre '+56 ' al abrirse.
export const formatPhone = (value: string) => {
  const digits = telefonoDigitos(value);
  const partes = [digits.slice(0, 1), digits.slice(1, 5), digits.slice(5, 9)].filter(Boolean);
  return partes.length ? `${PHONE_PREFIX}${partes.join(' ')}` : PHONE_PREFIX;
};

// Valida que sea un número chileno plausible: 9 dígitos nacionales.
export const validarTelefono = (value: string): boolean => telefonoDigitos(value).length === 9;

// Recibe una fecha en formato 'YYYY-MM-DD' y la muestra como dd-mm-aaaa.
export const formatDate = (value: string) =>
  new Intl.DateTimeFormat('es-CL', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  }).format(new Date(`${value}T00:00:00`));
