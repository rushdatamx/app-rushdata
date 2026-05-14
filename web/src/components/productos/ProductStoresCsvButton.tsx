"use client";

import { CsvExportButton } from "@/components/shared/CsvExportButton";

export type ProductStoreRow = {
  storeId: string;
  name: string;
  city: string | null;
  cluster: string | null;
  inventory: number;
  velocity: number | null;
  ddi: number | null;
  units30d: number;
  revenue30d: number;
  hasStockout: boolean;
};

export function ProductStoresCsvButton({
  rows,
  filename,
}: {
  rows: ProductStoreRow[];
  filename: string;
}) {
  return (
    <CsvExportButton
      rows={rows}
      filename={filename}
      columns={[
        { header: "Tienda", accessor: (r) => r.name },
        { header: "Ciudad", accessor: (r) => r.city ?? "" },
        { header: "Cluster", accessor: (r) => r.cluster ?? "" },
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
