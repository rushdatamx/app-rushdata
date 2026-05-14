import { AlertTriangle } from "lucide-react";
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { fmtMXN, fmtNumber } from "@/lib/format";
import type { RecentPO } from "@/lib/queries/po";
import { CsvExportButton } from "@/components/shared/CsvExportButton";

const STATUS_BADGE: Record<string, { className: string; label: string }> = {
  fulfilled: {
    className: "bg-emerald-100 text-emerald-700 hover:bg-emerald-100",
    label: "Recibida",
  },
  pending: {
    className: "bg-amber-100 text-amber-700 hover:bg-amber-100",
    label: "Pendiente",
  },
  partial: {
    className: "bg-orange-100 text-orange-700 hover:bg-orange-100",
    label: "Parcial",
  },
  cancelled: {
    className: "bg-muted text-muted-foreground hover:bg-muted",
    label: "Cancelada",
  },
};

function fmtOrderDate(iso: string): string {
  if (!iso) return "—";
  const d = new Date(iso + "T00:00:00");
  return d.toLocaleDateString("es-MX", { day: "2-digit", month: "short", year: "2-digit" });
}

function fmtFillPct(n: number | null): string {
  if (n == null) return "—";
  return `${(n * 100).toFixed(1)}%`;
}

export function OCRecentTable({
  rows,
  filteredCount,
  totalCount,
}: {
  rows: RecentPO[];
  filteredCount: number;
  totalCount: number;
}) {
  return (
    <Card className="p-0 gap-0 overflow-hidden">
      <CardHeader className="px-6 py-4 border-b flex flex-row items-start justify-between gap-3">
        <div className="space-y-1.5">
          <CardTitle className="text-base">OCs registradas</CardTitle>
          <CardDescription>
            Mostrando {fmtNumber(rows.length)} de {fmtNumber(filteredCount)} OCs filtradas
            {filteredCount < totalCount && ` (${fmtNumber(totalCount)} en total)`}
          </CardDescription>
        </div>
        {rows.length > 0 && (
          <CsvExportButton
            rows={rows}
            filename="oc-recientes"
            columns={[
              { header: "# OC", accessor: (r) => r.poNumber ?? r.id },
              { header: "Fecha orden", accessor: (r) => r.orderDate },
              { header: "Fecha esperada", accessor: (r) => r.expectedDelivery ?? "" },
              { header: "Estado", accessor: (r) => r.status },
              { header: "Un. pedidas", accessor: (r) => r.unitsOrdered },
              { header: "Un. recibidas", accessor: (r) => r.unitsReceived },
              { header: "Fill rate", accessor: (r) => r.fillRate },
              { header: "Valor MXN", accessor: (r) => r.value },
              { header: "Pendiente MXN", accessor: (r) => r.pendingValue },
              { header: "Lead time (d)", accessor: (r) => r.leadTimeDays },
              { header: "# líneas", accessor: (r) => r.lineCount },
            ]}
          />
        )}
      </CardHeader>

      {rows.length === 0 ? (
        <div className="px-6 py-16 text-center text-sm text-muted-foreground">
          Sin OCs con esos filtros.
        </div>
      ) : (
        <Table>
          <TableHeader>
            <TableRow className="bg-muted/30 hover:bg-muted/30">
              <TableHead className="pl-6">OC</TableHead>
              <TableHead>Fecha</TableHead>
              <TableHead>Estado</TableHead>
              <TableHead className="text-right">Líneas</TableHead>
              <TableHead className="text-right">Pedido</TableHead>
              <TableHead className="text-right">Recibido</TableHead>
              <TableHead className="text-right">Fill rate</TableHead>
              <TableHead className="text-right">Por recibir</TableHead>
              <TableHead className="text-right pr-6">Valor</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {rows.map((po) => {
              const sb = STATUS_BADGE[po.status] ?? {
                className: "bg-muted text-muted-foreground hover:bg-muted",
                label: po.status,
              };
              const lowFill = po.fillRate != null && po.fillRate < 0.9;
              return (
                <TableRow key={po.id}>
                  <TableCell className="pl-6 font-mono tabular-nums text-foreground">
                    {po.poNumber ?? po.id.slice(0, 8)}
                  </TableCell>
                  <TableCell className="text-muted-foreground text-xs">
                    {fmtOrderDate(po.orderDate)}
                  </TableCell>
                  <TableCell>
                    <Badge variant="secondary" className={sb.className}>
                      {sb.label}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right font-mono tabular-nums text-muted-foreground">
                    {fmtNumber(po.lineCount)}
                  </TableCell>
                  <TableCell className="text-right font-mono tabular-nums text-muted-foreground">
                    {fmtNumber(po.unitsOrdered)}
                  </TableCell>
                  <TableCell className="text-right font-mono tabular-nums text-muted-foreground">
                    {fmtNumber(po.unitsReceived)}
                  </TableCell>
                  <TableCell className="text-right">
                    <div
                      className={`inline-flex items-center gap-1 font-mono tabular-nums justify-end ${
                        lowFill
                          ? "text-rose-700 font-semibold"
                          : po.fillRate != null && po.fillRate >= 1
                          ? "text-emerald-700"
                          : "text-foreground"
                      }`}
                    >
                      {lowFill && <AlertTriangle className="size-3" strokeWidth={2} />}
                      {fmtFillPct(po.fillRate)}
                    </div>
                  </TableCell>
                  <TableCell
                    className={`text-right font-mono tabular-nums ${
                      po.pendingValue > 0 ? "text-amber-700" : "text-muted-foreground"
                    }`}
                  >
                    {po.pendingValue > 0 ? fmtMXN(po.pendingValue) : "—"}
                  </TableCell>
                  <TableCell className="text-right pr-6 font-mono tabular-nums font-semibold">
                    {fmtMXN(po.value)}
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      )}
    </Card>
  );
}
