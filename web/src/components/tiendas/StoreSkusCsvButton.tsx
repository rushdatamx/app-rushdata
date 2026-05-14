"use client";

import { CsvExportButton } from "@/components/shared/CsvExportButton";

export type StoreSkuRow = {
  productId: string;
  name: string;
  category: string | null;
  sizeGrams: number | null;
  inventory: number;
  velocity: number | null;
  ddi: number | null;
  units30d: number;
  revenue30d: number;
  hasStockout: boolean;
};

export function StoreSkusCsvButton({
  rows,
  filename,
}: {
  rows: StoreSkuRow[];
  filename: string;
}) {
  return (
    <CsvExportButton
      rows={rows}
      filename={filename}
      columns={[
        { header: "Producto", accessor: (r) => r.name },
        { header: "Categoría", accessor: (r) => r.category ?? "" },
        { header: "Gramaje", accessor: (r) => r.sizeGrams ?? "" },
        { header: "Stock", accessor: (r) => r.inventory },
        { header: "Vel/día", accessor: (r) => r.velocity ?? "" },
        { header: "DDI", accessor: (r) => r.ddi ?? "" },
        { header: "Un. 30d", accessor: (r) => r.units30d },
        { header: "Venta 30d MXN", accessor: (r) => r.revenue30d },
        { header: "Quiebre", accessor: (r) => (r.hasStockout ? "sí" : "no") },
      ]}
    />
  );
}
