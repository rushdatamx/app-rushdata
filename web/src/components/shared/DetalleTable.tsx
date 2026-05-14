"use client";

import Link from "next/link";
import { ArrowUpRight, TrendingUp, TrendingDown, Minus } from "lucide-react";
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
import { CsvExportButton } from "@/components/shared/CsvExportButton";
import { fmtMXN, fmtNumber } from "@/lib/format";
import { cn } from "@/lib/utils";
import type { PivotRow, PivotTotals, PivotGroupBy } from "@/lib/queries/pivot-detail";

const MONTH_LABELS = [
  "ene", "feb", "mar", "abr", "may", "jun",
  "jul", "ago", "sep", "oct", "nov", "dic",
];

function fmtMonthLabel(iso: string): string {
  // "2026-03-01" → "mar 2026"
  const m = parseInt(iso.slice(5, 7), 10) - 1;
  const y = iso.slice(0, 4);
  return `${MONTH_LABELS[m] ?? ""} ${y}`;
}

function DeltaCell({ value, invertColor = false }: { value: number | null; invertColor?: boolean }) {
  if (value == null)
    return (
      <span className="inline-flex items-center gap-0.5 text-xs text-muted-foreground/60">
        <Minus className="size-3" strokeWidth={2} />
      </span>
    );
  if (Math.abs(value) < 0.5) {
    return (
      <span className="inline-flex items-center gap-0.5 text-xs text-muted-foreground font-mono tabular-nums">
        <Minus className="size-3" strokeWidth={2} />
        0%
      </span>
    );
  }
  const positive = invertColor ? value < 0 : value > 0;
  return (
    <span
      className={cn(
        "inline-flex items-center gap-0.5 text-xs font-mono tabular-nums font-medium",
        positive ? "text-emerald-600" : "text-rose-600"
      )}
    >
      {value > 0 ? (
        <TrendingUp className="size-3" strokeWidth={2} />
      ) : (
        <TrendingDown className="size-3" strokeWidth={2} />
      )}
      {value > 0 ? "+" : ""}
      {value.toFixed(1)}%
    </span>
  );
}

export type DetalleTableProps = {
  rows: PivotRow[];
  totals: PivotTotals;
  groupBy: PivotGroupBy;
  dimensionLabel: string;
  filenameBase: string;
};

export function DetalleTable({
  rows,
  totals,
  groupBy,
  dimensionLabel,
  filenameBase,
}: DetalleTableProps) {
  if (rows.length === 0) {
    return (
      <Card className="px-6 py-16 text-center">
        <div className="text-sm text-muted-foreground">
          Sin datos para el período y filtros seleccionados.
        </div>
      </Card>
    );
  }

  function renderLabel(r: PivotRow) {
    const label =
      groupBy === "month" ? fmtMonthLabel(r.groupLabel) : r.groupLabel;
    if (groupBy === "store") {
      return (
        <Link
          href={`/tiendas/${r.groupKey}`}
          className="group/link inline-flex items-center gap-1.5 hover:text-foreground/80 transition-colors"
        >
          <span className="font-medium">{label}</span>
          <ArrowUpRight
            className="size-3 text-muted-foreground opacity-0 group-hover/link:opacity-100 transition-opacity"
            strokeWidth={2}
          />
        </Link>
      );
    }
    if (groupBy === "product") {
      return (
        <Link
          href={`/productos/${r.groupKey}`}
          className="group/link inline-flex items-center gap-1.5 hover:text-foreground/80 transition-colors"
        >
          <span className="font-medium">{label}</span>
          <ArrowUpRight
            className="size-3 text-muted-foreground opacity-0 group-hover/link:opacity-100 transition-opacity"
            strokeWidth={2}
          />
        </Link>
      );
    }
    return <span className="font-medium capitalize">{label}</span>;
  }

  return (
    <Card className="p-0 gap-0 overflow-hidden">
      <CardHeader className="px-6 py-4 border-b flex flex-row items-start justify-between gap-3">
        <div className="space-y-1.5">
          <CardTitle className="text-base">Detalle por {dimensionLabel}</CardTitle>
          <CardDescription>
            {fmtNumber(rows.length)} filas · comparativo vs mismo período año anterior
          </CardDescription>
        </div>
        <CsvExportButton
          rows={rows}
          filename={filenameBase}
          columns={[
            { header: dimensionLabel, accessor: (r: PivotRow) => groupBy === "month" ? fmtMonthLabel(r.groupLabel) : r.groupLabel },
            { header: "Unidades actual", accessor: (r: PivotRow) => r.unitsCurrent },
            { header: "Unidades año anterior", accessor: (r: PivotRow) => r.unitsPrevious },
            { header: "Δ% unidades", accessor: (r: PivotRow) => r.unitsDeltaPct },
            { header: "Venta MXN actual", accessor: (r: PivotRow) => r.revenueCurrent },
            { header: "Venta MXN año anterior", accessor: (r: PivotRow) => r.revenuePrevious },
            { header: "Δ% venta", accessor: (r: PivotRow) => r.revenueDeltaPct },
            { header: "% del total", accessor: (r: PivotRow) => r.shareOfTotalPct },
          ]}
        />
      </CardHeader>
      <Table>
        <TableHeader>
          <TableRow className="bg-muted/30 hover:bg-muted/30">
            <TableHead className="pl-6">{dimensionLabel}</TableHead>
            <TableHead className="text-right">Un. actual</TableHead>
            <TableHead className="text-right">Un. anterior</TableHead>
            <TableHead className="text-right">Δ% un.</TableHead>
            <TableHead className="text-right">Venta actual</TableHead>
            <TableHead className="text-right">Venta anterior</TableHead>
            <TableHead className="text-right">Δ% venta</TableHead>
            <TableHead className="text-right pr-6">% total</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {rows.map((r) => (
            <TableRow key={r.groupKey} className="group">
              <TableCell className="pl-6">{renderLabel(r)}</TableCell>
              <TableCell className="text-right font-mono tabular-nums">
                {fmtNumber(r.unitsCurrent)}
              </TableCell>
              <TableCell className="text-right font-mono tabular-nums text-muted-foreground">
                {r.unitsPrevious > 0 ? fmtNumber(r.unitsPrevious) : "—"}
              </TableCell>
              <TableCell className="text-right">
                <div className="inline-flex justify-end">
                  <DeltaCell value={r.unitsDeltaPct} />
                </div>
              </TableCell>
              <TableCell className="text-right font-mono tabular-nums font-semibold">
                {fmtMXN(r.revenueCurrent)}
              </TableCell>
              <TableCell className="text-right font-mono tabular-nums text-muted-foreground">
                {r.revenuePrevious > 0 ? fmtMXN(r.revenuePrevious) : "—"}
              </TableCell>
              <TableCell className="text-right">
                <div className="inline-flex justify-end">
                  <DeltaCell value={r.revenueDeltaPct} />
                </div>
              </TableCell>
              <TableCell className="text-right pr-6 font-mono tabular-nums text-muted-foreground">
                {r.shareOfTotalPct.toFixed(1)}%
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
      <div className="px-6 py-3 border-t bg-muted/20 flex items-center justify-between text-xs">
        <span className="text-muted-foreground font-medium">Total</span>
        <div className="flex items-center gap-6 text-muted-foreground">
          <span>
            Un.{" "}
            <span className="font-mono tabular-nums font-semibold text-foreground">
              {fmtNumber(totals.unitsCurrent)}
            </span>
            {totals.unitsDeltaPct != null && (
              <span className="ml-2"><DeltaCell value={totals.unitsDeltaPct} /></span>
            )}
          </span>
          <span>
            Venta{" "}
            <span className="font-mono tabular-nums font-semibold text-foreground">
              {fmtMXN(totals.revenueCurrent)}
            </span>
            {totals.revenueDeltaPct != null && (
              <span className="ml-2"><DeltaCell value={totals.revenueDeltaPct} /></span>
            )}
          </span>
        </div>
      </div>
    </Card>
  );
}
