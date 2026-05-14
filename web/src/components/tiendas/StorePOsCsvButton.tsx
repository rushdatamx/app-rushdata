"use client";

import { CsvExportButton } from "@/components/shared/CsvExportButton";

export type StorePORow = {
  id: string;
  poNumber: string | null;
  orderDate: string;
  status: string;
  unitsOrdered: number;
  unitsReceived: number;
  value: number;
};

export function StorePOsCsvButton({
  rows,
  filename,
}: {
  rows: StorePORow[];
  filename: string;
}) {
  return (
    <CsvExportButton
      rows={rows}
      filename={filename}
      columns={[
        { header: "OC", accessor: (r) => r.poNumber ?? r.id },
        { header: "Fecha", accessor: (r) => r.orderDate },
        { header: "Estado", accessor: (r) => r.status },
        { header: "Pedido", accessor: (r) => r.unitsOrdered },
        { header: "Recibido", accessor: (r) => r.unitsReceived },
        {
          header: "Fill %",
          accessor: (r) =>
            r.unitsOrdered > 0
              ? Math.round((r.unitsReceived / r.unitsOrdered) * 100)
              : "",
        },
        { header: "Valor MXN", accessor: (r) => r.value },
      ]}
    />
  );
}
