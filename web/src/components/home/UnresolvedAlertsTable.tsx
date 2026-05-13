import { Card, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
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
import type { AlertRow } from "@/lib/queries/home";

const SEV: Record<AlertRow["severity"], { className: string; label: string }> = {
  critical: { className: "bg-rose-100 text-rose-700 hover:bg-rose-100", label: "crítico" },
  high: { className: "bg-amber-100 text-amber-800 hover:bg-amber-100", label: "alto" },
  medium: { className: "bg-amber-50 text-amber-700 hover:bg-amber-50", label: "medio" },
  low: { className: "bg-emerald-50 text-emerald-700 hover:bg-emerald-50", label: "ok" },
};

export function UnresolvedAlertsTable({ rows }: { rows: AlertRow[] }) {
  if (rows.length === 0) return null;

  return (
    <Card className="p-0 gap-0 overflow-hidden">
      <CardHeader className="px-6 py-4 border-b">
        <CardTitle className="text-base">Quiebres sin resolver</CardTitle>
        <CardDescription>
          Combinaciones tienda × SKU con stockout confirmado
        </CardDescription>
      </CardHeader>

      <Table>
        <TableHeader>
          <TableRow className="bg-muted/30">
            <TableHead className="pl-6">Tienda</TableHead>
            <TableHead>Producto</TableHead>
            <TableHead>Severidad</TableHead>
            <TableHead className="text-right">Días</TableHead>
            <TableHead className="text-right pr-6">$ Estimado</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {rows.map((a) => {
            const sev = SEV[a.severity];
            return (
              <TableRow key={a.id}>
                <TableCell className="pl-6 font-medium">{a.store}</TableCell>
                <TableCell>{a.product}</TableCell>
                <TableCell>
                  <Badge variant="secondary" className={sev.className}>
                    {sev.label}
                  </Badge>
                </TableCell>
                <TableCell className="text-right font-mono tabular-nums">
                  {fmtNumber(a.daysIn)}
                </TableCell>
                <TableCell className="text-right pr-6 font-mono tabular-nums font-semibold">
                  {fmtMXN(a.lostSale)}
                </TableCell>
              </TableRow>
            );
          })}
        </TableBody>
      </Table>
    </Card>
  );
}
