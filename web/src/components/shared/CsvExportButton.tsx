"use client";

import { Download } from "lucide-react";
import { rowsToCsv, downloadCsv, todayStamp, type CsvColumn } from "@/lib/csv";
import { cn } from "@/lib/utils";

export type CsvExportButtonProps<T> = {
  /** Filas en el momento del click. Se acepta thunk para lazy-eval (filtros). */
  rows: T[] | (() => T[]);
  columns: CsvColumn<T>[];
  /** Nombre base. Se le agrega fecha YYYY-MM-DD y extensión .csv. */
  filename: string;
  /** Label opcional. Default: "CSV". */
  label?: string;
  /** Tamaño visual. Default: "sm". */
  size?: "sm" | "md";
  className?: string;
  disabled?: boolean;
};

export function CsvExportButton<T>({
  rows,
  columns,
  filename,
  label = "CSV",
  size = "sm",
  className,
  disabled,
}: CsvExportButtonProps<T>) {
  const handleClick = () => {
    const data = typeof rows === "function" ? rows() : rows;
    if (!data || data.length === 0) return;
    const csv = rowsToCsv(data, columns);
    downloadCsv(`${filename}_${todayStamp()}.csv`, csv);
  };

  return (
    <button
      type="button"
      onClick={handleClick}
      disabled={disabled}
      className={cn(
        "inline-flex items-center gap-1.5 rounded-md border bg-background text-xs font-medium transition-colors hover:bg-muted",
        "disabled:opacity-50 disabled:cursor-not-allowed",
        size === "sm" ? "h-8 px-2.5" : "h-9 px-3",
        className
      )}
      title="Exportar a CSV"
    >
      <Download className="size-3.5 text-muted-foreground" strokeWidth={1.75} />
      <span>{label}</span>
    </button>
  );
}
