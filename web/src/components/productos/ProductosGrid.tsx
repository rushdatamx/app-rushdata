import Link from "next/link";
import { AlertTriangle, ArrowUpRight, TrendingDown, TrendingUp, Minus } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { MiniSparkline } from "@/components/productos/MiniSparkline";
import { fmtMXN, fmtNumber } from "@/lib/format";
import type { ProductRow } from "@/lib/queries/products";

const STATUS_STYLES: Record<
  "star" | "risk" | "dormant" | "normal",
  { dot: string; badge: string; label: string }
> = {
  star: {
    dot: "bg-amber-500",
    badge: "bg-amber-100 text-amber-700 hover:bg-amber-100",
    label: "⭐ estrella",
  },
  risk: {
    dot: "bg-rose-500",
    badge: "bg-rose-100 text-rose-700 hover:bg-rose-100",
    label: "quiebre",
  },
  dormant: {
    dot: "bg-muted-foreground/50",
    badge: "bg-muted text-muted-foreground hover:bg-muted",
    label: "dormido",
  },
  normal: {
    dot: "bg-emerald-500",
    badge: "bg-emerald-100 text-emerald-700 hover:bg-emerald-100",
    label: "activo",
  },
};

function weeklyTrend(weekly: ProductRow["weekly"]): number | null {
  if (weekly.length < 2) return null;
  const last = weekly[weekly.length - 1].units;
  const prev = weekly[weekly.length - 2].units;
  if (prev === 0) return last > 0 ? 100 : null;
  return ((last - prev) / prev) * 100;
}

export type ProductosGridProps = {
  rows: Array<ProductRow & { status: "star" | "risk" | "dormant" | "normal"; trend: number | null; penetration: number }>;
  totalStores: number;
};

export function ProductosGrid({ rows, totalStores }: ProductosGridProps) {
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
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
      {rows.map((p) => {
        const styles = STATUS_STYLES[p.status];
        const trend = weeklyTrend(p.weekly);
        const sparkData = p.weekly.map((w) => ({ x: w.weekStart, y: w.units }));
        const sparkTone =
          p.status === "risk"
            ? "danger"
            : p.status === "star"
            ? "success"
            : p.status === "dormant"
            ? "muted"
            : "default";
        return (
          <Link
            key={p.id}
            href={`/productos/${p.id}`}
            className="group block focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 rounded-xl"
          >
            <Card className="p-0 gap-0 overflow-hidden hover:border-foreground/20 transition-colors h-full">
              {/* Header */}
              <div className="px-4 py-3 border-b flex items-start justify-between gap-2">
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <span className={`size-2 rounded-full shrink-0 ${styles.dot}`} />
                    <div className="text-sm font-medium truncate">{p.name}</div>
                  </div>
                  <div className="text-[11px] text-muted-foreground mt-1 capitalize truncate">
                    {p.category ?? "—"}
                    {p.sizeGrams ? ` · ${p.sizeGrams}gr` : ""} · {fmtMXN(p.unitPrice)}
                  </div>
                </div>
                <ArrowUpRight
                  className="size-3.5 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity shrink-0"
                  strokeWidth={2}
                />
              </div>

              {/* Body */}
              <div className="px-4 py-3 grid grid-cols-2 gap-3">
                <Metric label="Venta 30d" value={fmtMXN(p.revenue30d)} highlight />
                <MetricWithTrend
                  label="Tendencia"
                  value={trend}
                />
                <Metric
                  label="Penetración"
                  value={`${fmtNumber(p.storesWithInventory)}/${fmtNumber(totalStores)}`}
                  sub={`${p.penetration.toFixed(0)}%`}
                />
                <Metric
                  label="Quiebres"
                  value={fmtNumber(p.storesWithStockout)}
                  tone={p.storesWithStockout > 0 ? "danger" : "default"}
                  icon={p.storesWithStockout > 0}
                />
              </div>

              {/* Spark + Status footer */}
              <div className="px-4 py-2 border-t bg-muted/20 flex items-center justify-between gap-2">
                <Badge variant="secondary" className={styles.badge}>
                  {styles.label}
                </Badge>
                <MiniSparkline data={sparkData} tone={sparkTone} height={22} width={90} />
              </div>
            </Card>
          </Link>
        );
      })}
    </div>
  );
}

function Metric({
  label,
  value,
  sub,
  tone = "default",
  highlight = false,
  icon = false,
}: {
  label: string;
  value: string;
  sub?: string;
  tone?: "default" | "danger";
  highlight?: boolean;
  icon?: boolean;
}) {
  return (
    <div className="flex flex-col gap-0.5 min-w-0">
      <div className="text-[10px] uppercase tracking-wider text-muted-foreground font-medium">
        {label}
      </div>
      <div
        className={`font-mono tabular-nums leading-tight truncate inline-flex items-center gap-1 ${
          tone === "danger"
            ? "text-rose-700 font-semibold"
            : highlight
            ? "text-foreground font-semibold"
            : "text-foreground"
        } ${highlight ? "text-sm" : "text-[13px]"}`}
      >
        {icon && <AlertTriangle className="size-3" strokeWidth={2} />}
        {value}
      </div>
      {sub && (
        <div className="text-[10px] text-muted-foreground font-mono tabular-nums">
          {sub}
        </div>
      )}
    </div>
  );
}

function MetricWithTrend({ label, value }: { label: string; value: number | null }) {
  return (
    <div className="flex flex-col gap-0.5 min-w-0">
      <div className="text-[10px] uppercase tracking-wider text-muted-foreground font-medium">
        {label}
      </div>
      {value == null ? (
        <div className="inline-flex items-center gap-0.5 text-[13px] text-muted-foreground">
          <Minus className="size-3" strokeWidth={2} />
        </div>
      ) : Math.abs(value) < 2 ? (
        <div className="inline-flex items-center gap-0.5 text-[13px] text-muted-foreground font-mono tabular-nums">
          <Minus className="size-3" strokeWidth={2} />
          {value.toFixed(0)}%
        </div>
      ) : (
        <div
          className={`inline-flex items-center gap-0.5 text-[13px] font-mono tabular-nums font-medium ${
            value > 0 ? "text-emerald-600" : "text-rose-600"
          }`}
        >
          {value > 0 ? (
            <TrendingUp className="size-3" strokeWidth={2} />
          ) : (
            <TrendingDown className="size-3" strokeWidth={2} />
          )}
          {value > 0 ? "+" : ""}
          {value.toFixed(0)}%
        </div>
      )}
      <div className="text-[10px] text-muted-foreground">vs semana anterior</div>
    </div>
  );
}
