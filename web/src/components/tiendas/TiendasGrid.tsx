import Link from "next/link";
import { ArrowUpRight, MapPin } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { fmtMXN, fmtNumber } from "@/lib/format";
import type { StoreRow } from "@/lib/queries/stores";

export type StoreStatus = "critical" | "warning" | "healthy";

export function storeStatus(s: StoreRow): StoreStatus {
  if (s.stockouts >= 3) return "critical";
  if (s.stockouts >= 1) return "warning";
  return "healthy";
}

const STATUS_STYLES: Record<
  StoreStatus,
  { dot: string; badge: string; label: string }
> = {
  critical: {
    dot: "bg-rose-500",
    badge: "bg-rose-100 text-rose-700 hover:bg-rose-100",
    label: "crítico",
  },
  warning: {
    dot: "bg-amber-500",
    badge: "bg-amber-100 text-amber-700 hover:bg-amber-100",
    label: "atención",
  },
  healthy: {
    dot: "bg-emerald-500",
    badge: "bg-emerald-100 text-emerald-700 hover:bg-emerald-100",
    label: "sano",
  },
};

export function TiendasGrid({ rows }: { rows: StoreRow[] }) {
  if (rows.length === 0) {
    return (
      <Card className="px-6 py-16 text-center">
        <div className="text-sm text-muted-foreground">
          Sin tiendas con esos filtros.
        </div>
      </Card>
    );
  }
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
      {rows.map((s) => (
        <StoreCard key={s.id} store={s} />
      ))}
    </div>
  );
}

function StoreCard({ store: s }: { store: StoreRow }) {
  const status = storeStatus(s);
  const styles = STATUS_STYLES[status];
  const skusPct = s.skusActive === 0 ? 0 : (s.skusWithStock / s.skusActive) * 100;

  return (
    <Link
      href={`/tiendas/${s.id}`}
      className="group block focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 rounded-xl"
    >
      <Card className="p-0 gap-0 overflow-hidden hover:border-foreground/20 transition-colors h-full">
        {/* Header */}
        <div className="px-4 py-3 border-b flex items-start justify-between gap-2">
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2">
              <span className={`size-2 rounded-full shrink-0 ${styles.dot}`} />
              <div className="text-sm font-medium truncate">{s.name}</div>
            </div>
            <div className="text-[11px] text-muted-foreground mt-1 flex items-center gap-1.5 truncate">
              {s.externalCode && (
                <span className="font-mono tabular-nums">#{s.externalCode}</span>
              )}
              {s.city && (
                <>
                  <MapPin className="size-2.5" strokeWidth={2} />
                  <span className="truncate">
                    {s.city}
                    {s.state ? `, ${s.state}` : ""}
                  </span>
                </>
              )}
            </div>
          </div>
          <div className="flex flex-col items-end gap-1 shrink-0">
            {s.cluster && (
              <span className="inline-flex items-center px-1.5 py-0.5 rounded bg-muted text-[10px] text-muted-foreground font-mono tabular-nums">
                C{s.cluster}
              </span>
            )}
            <ArrowUpRight
              className="size-3.5 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity"
              strokeWidth={2}
            />
          </div>
        </div>

        {/* Body */}
        <div className="px-4 py-3 grid grid-cols-2 gap-3">
          <Metric
            label="Venta 30d"
            value={fmtMXN(s.revenue30d)}
            highlight
          />
          <Metric
            label="Quiebres"
            value={fmtNumber(s.stockouts)}
            tone={s.stockouts > 0 ? "danger" : "default"}
          />
          <Metric
            label="SKUs en stock"
            value={`${fmtNumber(s.skusWithStock)}/${fmtNumber(s.skusActive)}`}
            sub={`${skusPct.toFixed(0)}%`}
          />
          <Metric label="Inv. valuado" value={fmtMXN(s.inventoryValue)} />
        </div>

        {/* Status footer */}
        <div className="px-4 py-2 border-t bg-muted/20 flex items-center justify-between">
          <Badge variant="secondary" className={styles.badge}>
            {styles.label}
          </Badge>
          <span className="text-[10px] text-muted-foreground font-mono tabular-nums">
            {fmtNumber(s.units30d)} un · 30d
          </span>
        </div>
      </Card>
    </Link>
  );
}

function Metric({
  label,
  value,
  sub,
  tone = "default",
  highlight = false,
}: {
  label: string;
  value: string;
  sub?: string;
  tone?: "default" | "danger";
  highlight?: boolean;
}) {
  return (
    <div className="flex flex-col gap-0.5 min-w-0">
      <div className="text-[10px] uppercase tracking-wider text-muted-foreground font-medium">
        {label}
      </div>
      <div
        className={`font-mono tabular-nums leading-tight truncate ${
          tone === "danger"
            ? "text-rose-700 font-semibold"
            : highlight
            ? "text-foreground font-semibold"
            : "text-foreground"
        } ${highlight ? "text-sm" : "text-[13px]"}`}
      >
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
