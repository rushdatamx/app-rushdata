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
import { MiniSparkline } from "@/components/productos/MiniSparkline";
import { fmtMXN, fmtNumber } from "@/lib/format";
import { cn } from "@/lib/utils";
import type { ForecastSkuRow } from "@/lib/queries/forecast";

function DeltaCell({ value }: { value: number | null }) {
  if (value == null)
    return (
      <span className="inline-flex items-center gap-0.5 text-xs text-muted-foreground/60">
        <Minus className="size-3" strokeWidth={2} />
      </span>
    );
  if (Math.abs(value) < 2) {
    return (
      <span className="inline-flex items-center gap-0.5 text-xs text-muted-foreground font-mono tabular-nums">
        <Minus className="size-3" strokeWidth={2} />
        {value.toFixed(0)}%
      </span>
    );
  }
  return (
    <span
      className={cn(
        "inline-flex items-center gap-0.5 text-xs font-mono tabular-nums font-medium",
        value > 0 ? "text-emerald-600" : "text-rose-600"
      )}
    >
      {value > 0 ? (
        <TrendingUp className="size-3" strokeWidth={2} />
      ) : (
        <TrendingDown className="size-3" strokeWidth={2} />
      )}
      {value > 0 ? "+" : ""}
      {value.toFixed(0)}%
    </span>
  );
}

export function ForecastTable({ rows }: { rows: ForecastSkuRow[] }) {
  if (rows.length === 0) {
    return (
      <Card className="px-6 py-16 text-center">
        <div className="text-sm text-muted-foreground">
          Sin SKUs con venta reciente para pronosticar.
        </div>
      </Card>
    );
  }

  const totalForecast = rows.reduce((a, r) => a + r.forecastRevenue, 0);
  const totalCurrent = rows.reduce((a, r) => a + r.revenue30d, 0);

  return (
    <Card className="p-0 gap-0 overflow-hidden">
      <CardHeader className="px-6 py-4 border-b">
        <CardTitle className="text-base">Top SKUs · Real vs Pronóstico</CardTitle>
        <CardDescription>
          {fmtNumber(rows.length)} SKUs · ordenado por venta últimos 30d ·
          pronóstico ajustado por tendencia y estacionalidad YoY
        </CardDescription>
      </CardHeader>
      <Table>
        <TableHeader>
          <TableRow className="bg-muted/30 hover:bg-muted/30">
            <TableHead className="pl-6">SKU</TableHead>
            <TableHead className="text-right">30d real</TableHead>
            <TableHead className="text-right">Mes anterior</TableHead>
            <TableHead className="text-right">Año anterior</TableHead>
            <TableHead className="text-right">vs MoM</TableHead>
            <TableHead className="text-right">vs YoY</TableHead>
            <TableHead className="text-right">Pronóstico 30d</TableHead>
            <TableHead className="pr-6">8 sem</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {rows.map((r) => {
            const sparkData = r.weekly.map((w) => ({
              x: w.weekStart,
              y: w.units,
            }));
            const sparkTone =
              r.trendSlope == null
                ? "default"
                : r.trendSlope > 1
                ? "success"
                : r.trendSlope < -1
                ? "danger"
                : "default";
            return (
              <TableRow key={r.productId} className="group">
                <TableCell className="pl-6">
                  <Link
                    href={`/productos/${r.productId}`}
                    className="block hover:text-foreground/80 transition-colors"
                  >
                    <div className="flex items-center gap-2">
                      <span className="font-medium truncate">{r.name}</span>
                      <ArrowUpRight
                        className="size-3 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity shrink-0"
                        strokeWidth={2}
                      />
                    </div>
                    {r.category && (
                      <div className="text-[11px] text-muted-foreground capitalize">
                        {r.category}
                      </div>
                    )}
                  </Link>
                </TableCell>
                <TableCell className="text-right font-mono tabular-nums font-semibold">
                  {fmtMXN(r.revenue30d)}
                </TableCell>
                <TableCell className="text-right font-mono tabular-nums text-muted-foreground">
                  {r.unitsPrev30d > 0
                    ? fmtNumber(r.unitsPrev30d) + " un"
                    : "—"}
                </TableCell>
                <TableCell className="text-right font-mono tabular-nums text-muted-foreground">
                  {r.unitsYoy30d > 0 ? fmtNumber(r.unitsYoy30d) + " un" : "—"}
                </TableCell>
                <TableCell className="text-right">
                  <div className="inline-flex justify-end">
                    <DeltaCell value={r.momDelta} />
                  </div>
                </TableCell>
                <TableCell className="text-right">
                  <div className="inline-flex justify-end">
                    <DeltaCell value={r.yoyDelta} />
                  </div>
                </TableCell>
                <TableCell className="text-right font-mono tabular-nums font-semibold text-foreground">
                  {fmtMXN(r.forecastRevenue)}
                </TableCell>
                <TableCell className="pr-6">
                  <MiniSparkline
                    data={sparkData}
                    tone={sparkTone}
                    height={24}
                    width={90}
                  />
                </TableCell>
              </TableRow>
            );
          })}
        </TableBody>
      </Table>
      <div className="px-6 py-3 border-t bg-muted/20 flex items-center justify-between text-xs">
        <span className="text-muted-foreground">
          Top {rows.length} SKUs por venta reciente
        </span>
        <span className="text-muted-foreground">
          Total real:{" "}
          <span className="font-mono tabular-nums font-semibold text-foreground">
            {fmtMXN(totalCurrent)}
          </span>{" "}
          · Pronóstico:{" "}
          <span className="font-mono tabular-nums font-semibold text-foreground">
            {fmtMXN(totalForecast)}
          </span>
        </span>
      </div>
    </Card>
  );
}
