// Utilidades compartidas de CSV y saneo para exportación a Excel/CSV.

const splitCsvLine = (line: string, delimiter: string) => {
  const result: string[] = [];
  let current = '';
  let inQuotes = false;

  for (let index = 0; index < line.length; index += 1) {
    const char = line[index];
    if (char === '"') {
      inQuotes = !inQuotes;
      continue;
    }

    if (char === delimiter && !inQuotes) {
      result.push(current.trim());
      current = '';
      continue;
    }

    current += char;
  }

  result.push(current.trim());
  return result;
};

// Parsea un CSV (delimitador `,` o `;`) a una lista de objetos por encabezado.
export const parseCsv = (content: string) => {
  const lines = content
    .split(/\r?\n/)
    .map(line => line.trim())
    .filter(Boolean);

  if (lines.length === 0) return [];

  const delimiter = lines[0].includes(';') ? ';' : ',';
  const headers = splitCsvLine(lines[0], delimiter).map(header => header.trim());

  return lines.slice(1).map(line => {
    const values = splitCsvLine(line, delimiter);
    return headers.reduce<Record<string, string>>((acc, header, index) => {
      acc[header] = values[index] ?? '';
      return acc;
    }, {});
  });
};

// Prefija un apóstrofo a celdas que empiezan con caracteres de fórmula para
// evitar inyección de fórmulas al exportar a Excel/CSV.
export const sanitizeCell = (v: unknown): unknown =>
  typeof v === 'string' && /^[=+\-@\t\r]/.test(v) ? `'${v}` : v;

export const sanitizeRow = <T extends Record<string, unknown>>(row: T): T =>
  Object.fromEntries(Object.entries(row).map(([k, v]) => [k, sanitizeCell(v)])) as T;
