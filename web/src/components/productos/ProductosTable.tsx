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
import { CsvExportButton } from "@/components/shared/CsvExportButton";

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
      <div className="flex items-center justify-between px-6 py-3 border-b bg-muted/10">
        <div className="text-xs text-muted-foreground">
          {fmtNumber(rows.length)} producto{rows.length === 1 ? "" : "s"}
        </div>
        <CsvExportButton
          rows={rows}
          filename="productos"
          columns={[
            { header: "Producto", accessor: (r) => r.name },
            { header: "UPC", accessor: (r) => r.upc ?? "" },
            { header: "Categoría", accessor: (r) => r.category ?? "" },
            { header: "Subcategoría", accessor: (r) => r.subcategory ?? "" },
            { header: "Gramaje", accessor: (r) => r.sizeGrams },
            { header: "Precio MXN", accessor: (r) => r.unitPrice },
            { header: "Costo MXN", accessor: (r) => r.unitCost },
            { header: "Estado", accessor: (r) => r.status },
            { header: "Tiendas con stock", accessor: (r) => r.storesWithInventory },
            { header: "Penetración %", accessor: (r) => r.penetration },
            { header: "Stockouts", accessor: (r) => r.storesWithStockout },
            { header: "Inventario un.", accessor: (r) => r.inventoryUnits },
            { header: "Un. 30d", accessor: (r) => r.units30d },
            { header: "Venta 30d MXN", accessor: (r) => r.revenue30d },
            { header: "ASP MXN", accessor: (r) => r.asp },
            { header: "ASP delta %WoW", accessor: (r) => r.aspDeltaPct },
            { header: "Trend %", accessor: (r) => r.trend },
          ]}
        />
      </div>
      <Table>
        <TableHeader>
          <TableRow className="bg-muted/30 hover:bg-muted/30">
            <TableHead className="pl-6">Producto</TableHead>
            <TableHead>Estado</TableHead>
            <TableHead className="text-right">Penetración</TableHead>
            <TableHead className="text-right">Quiebres</TableHead>
            <TableHead className="text-right">Un. 30d</TableHead>
            <TableHead className="text-right">Venta 30d</TableHead>
            <TableHead className="text-right">ASP</TableHead>
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
                  {fmtNumber(p.units30d)}
                </TableCell>
                <TableCell className="text-right font-mono tabular-nums font-semibold">
                  {fmtMXN(p.revenue30d)}
                </TableCell>
                <TableCell className="text-right">
                  <AspCell asp={p.asp} unitPrice={p.unitPrice} delta={p.aspDeltaPct} />
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

function AspCell({
  asp,
  unitPrice,
  delta,
}: {
  asp: number | null;
  unitPrice: number;
  delta: number | null;
}) {
  if (asp == null) {
    return <span className="text-muted-foreground/50">—</span>;
  }
  // Discount % vs precio de lista
  const discount = unitPrice > 0 ? ((unitPrice - asp) / unitPrice) * 100 : 0;
  const hasBigDiscount = discount > 5; // > 5% por debajo del precio de lista
  const aspDropping = delta != null && delta < -2; // ASP cayó >2% w-o-w
  return (
    <div className="flex flex-col items-end leading-tight">
      <span
        className={`font-mono tabular-nums font-medium ${
          aspDropping || hasBigDiscount ? "text-rose-700" : ""
        }`}
      >
        {fmtMXN(asp)}
      </span>
      {(aspDropping || hasBigDiscount) && (
        <span className="text-[10px] font-mono tabular-nums text-rose-600">
          {hasBigDiscount && `-${discount.toFixed(0)}% vs lista`}
          {hasBigDiscount && aspDropping && " · "}
          {aspDropping && delta != null && `${delta.toFixed(0)}% wow`}
        </span>
      )}
    </div>
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
