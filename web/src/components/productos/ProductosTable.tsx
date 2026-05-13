import Link from "next/link";
import { AlertTriangle, ArrowUpRight, TrendingDown, TrendingUp, Minus } from "lucide-react";
import { Card } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { MiniSparkline } from "@/components/productos/MiniSparkline";
import { fmtMXN, fmtNumber } from "@/lib/format";
import type { ProductRow } from "@/lib/queries/products";

const STATUS_BADGE: Record<
  "star" | "risk" | "dormant" | "normal",
  { className: string; label: string }
> = {
  star: {
    className: "bg-amber-100 text-amber-700 hover:bg-amber-100",
    label: "⭐ estrella",
  },
  risk: {
    className: "bg-rose-100 text-rose-700 hover:bg-rose-100",
    label: "quiebre",
  },
  dormant: {
    className: "bg-muted text-muted-foreground hover:bg-muted",
    label: "dormido",
  },
  normal: {
    className: "bg-emerald-50 text-emerald-700 hover:bg-emerald-50",
    label: "activo",
  },
};

export type ProductosTableProps = {
  rows: Array<ProductRow & { status: "star" | "risk" | "dormant" | "normal"; trend: number | null; penetration: number }>;
  totalStores: number;
};

function weeklyTrend(weekly: ProductRow["weekly"]): number | null {
  if (weekly.length < 2) return null;
  const last = weekly[weekly.length - 1].units;
  const prev = weekly[weekly.length - 2].units;
  if (prev === 0) return last > 0 ? 100 : null;
  return ((last - prev) / prev) * 100;
}

export function ProductosTable({ rows, totalStores }: ProductosTableProps) {
  if (rows.length === 0) {
    return (
      <Card className="px-6 py-16 text-center">
        <div className="text-sm text-muted-foreground">
          Sin productos con esos filtros.
        </div>
      </Card>
    );
  }
  return (
    <Card className="p-0 gap-0 overflow-hidden">
      <Table>
        <TableHeader>
          <TableRow className="bg-muted/30 hover:bg-muted/30">
            <TableHead className="pl-6">Producto</TableHead>
            <TableHead>Estado</TableHead>
            <TableHead>UPC</TableHead>
            <TableHead className="text-right">Penetración</TableHead>
            <TableHead className="text-right">Quiebres</TableHead>
            <TableHead className="text-right">Inv.</TableHead>
            <TableHead className="text-right">Un. 30d</TableHead>
            <TableHead className="text-right">Venta 30d</TableHead>
            <TableHead className="text-right">Trend sem</TableHead>
            <TableHead className="pr-6">8 sem</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {rows.map((p) => {
            const sb = STATUS_BADGE[p.status];
            const tone =
              p.status === "risk"
                ? "danger"
                : p.status === "star"
                ? "success"
                : p.status === "dormant"
                ? "muted"
                : "default";
            const trend = weeklyTrend(p.weekly);
            const sparkData = p.weekly.map((w) => ({ x: w.weekStart, y: w.units }));

            return (
              <TableRow key={p.id} className="group">
                <TableCell className="pl-6">
                  <Link
                    href={`/productos/${p.id}`}
                    className="block hover:text-foreground/80 transition-colors"
                  >
                    <div className="flex items-center gap-2">
                      <span className="font-medium">{p.name}</span>
                      <ArrowUpRight
                        className="size-3 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity"
                        strokeWidth={2}
                      />
                    </div>
                    {p.category && (
                      <div className="text-[11px] text-muted-foreground capitalize">
                        {p.category}
                        {p.sizeGrams ? ` · ${p.sizeGrams}gr` : ""} ·{" "}
                        {fmtMXN(p.unitPrice)}
                      </div>
                    )}
                  </Link>
                </TableCell>
                <TableCell>
                  <Badge variant="secondary" className={sb.className}>
                    {sb.label}
                  </Badge>
                </TableCell>
                <TableCell>
                  <span className="font-mono tabular-nums text-[11px] text-muted-foreground">
                    {p.upc ?? "—"}
                  </span>
                </TableCell>
                <TableCell className="text-right">
                  <div className="font-mono tabular-nums">
                    {fmtNumber(p.storesWithInventory)}/{fmtNumber(totalStores)}
                  </div>
                  <div className="text-[11px] text-muted-foreground font-mono tabular-nums">
                    {p.penetration.toFixed(0)}%
                  </div>
                </TableCell>
                <TableCell className="text-right">
                  {p.storesWithStockout > 0 ? (
                    <span className="inline-flex items-center gap-1 text-rose-700 font-mono tabular-nums font-semibold justify-end">
                      <AlertTriangle className="size-3" strokeWidth={2} />
                      {fmtNumber(p.storesWithStockout)}
                    </span>
                  ) : (
                    <span className="font-mono tabular-nums text-muted-foreground">0</span>
                  )}
                </TableCell>
                <TableCell className="text-right font-mono tabular-nums text-muted-foreground">
                  {fmtNumber(p.inventoryUnits)}
                </TableCell>
                <TableCell className="text-right font-mono tabular-nums text-muted-foreground">
                  {fmtNumber(p.units30d)}
                </TableCell>
                <TableCell className="text-right font-mono tabular-nums font-semibold">
                  {fmtMXN(p.revenue30d)}
                </TableCell>
                <TableCell className="text-right">
                  <TrendCell value={trend} />
                </TableCell>
                <TableCell className="pr-6">
                  <MiniSparkline data={sparkData} tone={tone} height={26} width={100} />
                </TableCell>
              </TableRow>
            );
          })}
        </TableBody>
      </Table>
    </Card>
  );
}

function TrendCell({ value }: { value: number | null }) {
  if (value == null) {
    return (
      <span className="inline-flex items-center gap-0.5 text-[11px] text-muted-foreground">
        <Minus className="size-3" strokeWidth={2} />
      </span>
    );
  }
  if (Math.abs(value) < 2) {
    return (
      <span className="inline-flex items-center gap-0.5 text-[11px] text-muted-foreground font-mono tabular-nums">
        <Minus className="size-3" strokeWidth={2} />
        {value.toFixed(0)}%
      </span>
    );
  }
  const positive = value > 0;
  return (
    <span
      className={`inline-flex items-center gap-0.5 text-[11px] font-medium font-mono tabular-nums ${
        positive ? "text-emerald-600" : "text-rose-600"
      }`}
    >
      {positive ? (
        <TrendingUp className="size-3" strokeWidth={2} />
      ) : (
        <TrendingDown className="size-3" strokeWidth={2} />
      )}
      {positive ? "+" : ""}
      {value.toFixed(0)}%
    </span>
  );
}
