export type CsvImportPreview = {
  fileName: string;
  rows: ImportedRow[];
};

export type ImportedRow = {
  referencia: string;
  fecha: string;
  cliente: string;
  monto: number;
  producto: string;
  cantidad: number;
  origen: string;
};

export type SaleLine = {
  productoId: string;
  cantidad: string;
  monto: string;
};

export type ManualSaleForm = {
  nombre: string;
  correo: string;
  telefono: string;
  referencia: string;
  lineas: SaleLine[];
};

export type ManualSaleErrors = {
  header?: string;
  nombre?: string;
  correo?: string;
  telefono?: string;
  lineas: (string | undefined)[];
};

export type Tab = 'todas' | 'ml' | 'apanio' | 'directa' | 'estado';

export type MlOrigin = 'ML Full' | 'ML Flex' | 'ML Envíos';

export type TopProduct = { nombre: string; cantidad: number; monto: number };
