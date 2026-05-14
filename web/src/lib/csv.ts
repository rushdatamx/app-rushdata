/**
 * Helper minimal de CSV.
 *
 * - Escapa correctamente: comillas dobles, comas, saltos de línea
 * - BOM UTF-8 por defecto → Excel español/MX lo abre con acentos correctos
 * - Acepta cualquier valor (string, number, Date, null, undefined)
 *
 * NO usar para datasets >100k filas (todo es síncrono client-side). Para eso
 * mejor stream desde server. Para el portal hoy (todas las tablas <500 filas
 * después de filtros) es perfecto.
 */

export type CsvColumn<T> = {
  /** Encabezado a mostrar (e.g. "Tienda", "DDI") */
  header: string;
  /** Cómo obtener el valor de la fila */
  accessor: (row: T) => unknown;
  /** Formateador opcional. Si no se pasa, se usa formatScalar. */
  format?: (value: unknown) => string;
};

function formatScalar(v: unknown): string {
  if (v == null) return "";
  if (typeof v === "number") {
    if (!Number.isFinite(v)) return "";
    return String(v);
  }
  if (v instanceof Date) {
    return v.toISOString().slice(0, 10);
  }
  if (typeof v === "boolean") return v ? "Sí" : "No";
  return String(v);
}

function escapeCsvCell(raw: string): string {
  const needsQuoting = /[",\n\r;]/.test(raw);
  if (!needsQuoting) return raw;
  return `"${raw.replace(/"/g, '""')}"`;
}

export function rowsToCsv<T>(rows: T[], columns: CsvColumn<T>[]): string {
  const headerLine = columns.map((c) => escapeCsvCell(c.header)).join(",");
  const lines = rows.map((row) =>
    columns
      .map((c) => {
        const raw = c.accessor(row);
        const formatted = c.format ? c.format(raw) : formatScalar(raw);
        return escapeCsvCell(formatted);
      })
      .join(",")
  );
  return [headerLine, ...lines].join("\r\n");
}

/**
 * Dispara la descarga de un CSV en el navegador.
 * Agrega BOM UTF-8 para que Excel detecte acentos.
 */
export function downloadCsv(filename: string, csvBody: string): void {
  const bom = "﻿";
  const blob = new Blob([bom + csvBody], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename.endsWith(".csv") ? filename : `${filename}.csv`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

/**
 * Genera un sufijo de fecha para nombres de archivo: "2026-05-14".
 */
export function todayStamp(): string {
  return new Date().toISOString().slice(0, 10);
}
