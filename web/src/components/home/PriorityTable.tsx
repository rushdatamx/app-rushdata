import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { Card, CardHeader, CardTitle, CardDescription, CardAction } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { fmtMXN, fmtNumber, fmtDecimal } from "@/lib/format";
import type { TopSuggestion } from "@/lib/queries/home";

function ddiSeverity(ddi: number | null): "critical" | "high" | "medium" | "low" {
  if (ddi == null) return "medium";
  if (ddi <= 1) return "critical";
  if (ddi <= 3) return "high";
  if (ddi <= 7) return "medium";
  return "low";
}

const SEV_BADGE: Record<string, { className: string; label: string }> = {
  critical: { className: "bg-rose-100 text-rose-700 hover:bg-rose-100", label: "crítico" },
  high: { className: "bg-amber-100 text-amber-800 hover:bg-amber-100", label: "alto" },
  medium: { className: "bg-amber-50 text-amber-700 hover:bg-amber-50", label: "medio" },
  low: { className: "bg-emerald-50 text-emerald-700 hover:bg-emerald-50", label: "ok" },
};

export type PriorityTableProps = {
  rows: TopSuggestion[];
  totalCount: number;
};

export function PriorityTable({ rows, totalCount }: PriorityTableProps) {
  return (
    <Card className="p-0 gap-0 overflow-hidden">
      <CardHeader className="px-6 py-4 border-b">
        <CardTitle className="text-base">Accionables prioritarios</CardTitle>
        <CardDescription>
          Sugeridos pendientes ordenados por venta perdida estimada
        </CardDescription>
        <CardAction>
          <Link
            href="/sugeridos"
            className="text-xs text-foreground hover:text-foreground/80 inline-flex items-center gap-1 font-medium"
          >
            Ver los {totalCount}
            <ArrowRight className="size-3.5" strokeWidth={2} />
          </Link>
        </CardAction>
      </CardHeader>

      {rows.length === 0 ? (
        <div className="px-6 py-12 text-center text-sm text-muted-foreground">
          No hay sugeridos pendientes. Corre el motor para generar la siguiente tanda.
        </div>
      ) : (
        <Table>
          <TableHeader>
            <TableRow className="bg-muted/30">
              <TableHead className="w-12 pl-6">#</TableHead>
              <TableHead>Tienda</TableHead>
              <TableHead>Producto</TableHead>
              <TableHead className="text-right">DDI</TableHead>
              <TableHead className="text-right">Sugerido</TableHead>
              <TableHead className="text-right">Cajas</TableHead>
              <TableHead className="text-right">$ Riesgo</TableHead>
              <TableHead className="text-right pr-6">Confianza</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {rows.slice(0, 5).map((r, i) => {
              const sev = ddiSeverity(r.ddi);
              const sevStyles = SEV_BADGE[sev];
              return (
                <TableRow key={r.id}>
                  <TableCell className="pl-6 text-muted-foreground font-mono tabular-nums">
                    {i + 1}
                  </TableCell>
                  <TableCell className="font-medium">{r.store}</TableCell>
                  <TableCell>{r.product}</TableCell>
                  <TableCell className="text-right">
                    <div className="inline-flex items-center gap-2 justify-end">
                      <span className="font-mono tabular-nums">
                        {fmtDecimal(r.ddi)}
                      </span>
                      <Badge variant="secondary" className={sevStyles.className}>
                        {sevStyles.label}
                      </Badge>
                    </div>
                  </TableCell>
                  <TableCell className="text-right font-mono tabular-nums">
                    {fmtNumber(r.suggestedUnits)}
                  </TableCell>
                  <TableCell className="text-right font-mono tabular-nums text-muted-foreground">
                    {fmtNumber(r.suggestedCases)}
                  </TableCell>
                  <TableCell className="text-right font-mono tabular-nums font-semibold">
                    {fmtMXN(r.lostSale)}
                  </TableCell>
                  <TableCell className="text-right pr-6 font-mono tabular-nums text-muted-foreground">
                    {r.confidence == null ? "—" : `${Math.round(r.confidence * 100)}%`}
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
