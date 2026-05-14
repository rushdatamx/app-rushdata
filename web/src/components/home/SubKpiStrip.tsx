import Link from "next/link";
import { ArrowUpRight, Store, Package, Target, Layers } from "lucide-react";
import { Card } from "@/components/ui/card";
import { fmtNumber, fmtDecimal } from "@/lib/format";

export type SubKpiStripProps = {
  storesWithStockout: number;
  activeStores: number;
  productsWithStockout: number;
  activeProducts: number;
  fillRate: number | null;
  avgDdi: number | null;
  coverageWeeks: number | null;
  activePOs: number;
};

type Tone = "default" | "danger" | "warning" | "success";

const TONE: Record<Tone, { value: string; chip: string }> = {
  default: { value: "text-foreground", chip: "bg-muted text-muted-foreground" },
  danger: { value: "text-rose-700", chip: "bg-rose-100 text-rose-700" },
  warning: { value: "text-amber-700", chip: "bg-amber-100 text-amber-700" },
  success: { value: "text-emerald-700", chip: "bg-emerald-100 text-emerald-700" },
};

export function SubKpiStrip({
  storesWithStockout,
  activeStores,
  productsWithStockout,
  activeProducts,
  fillRate,
  avgDdi,
  coverageWeeks,
  activePOs,
}: SubKpiStripProps) {
  const storesShare =
    activeStores > 0
      ? Math.round((storesWithStockout / activeStores) * 100)
      : 0;
  const productsShare =
    activeProducts > 0
      ? Math.round((productsWithStockout / activeProducts) * 100)
      : 0;

  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
      <KpiCard
        href="/tiendas?status=critical"
        label="Tiendas en riesgo"
        value={fmtNumber(storesWithStockout)}
        sub={
          activeStores > 0
            ? `de ${fmtNumber(activeStores)} activas · ${storesShare}%`
            : "sin tiendas activas"
        }
        tone={
          storesWithStockout === 0
            ? "success"
            : storesShare >= 25
            ? "danger"
            : "warning"
        }
        icon={Store}
      />

      <KpiCard
        href="/productos?status=risk"
        label="SKUs con quiebre"
        value={fmtNumber(productsWithStockout)}
        sub={
          activeProducts > 0
            ? `de ${fmtNumber(activeProducts)} activos · ${productsShare}%`
            : "sin SKUs activos"
        }
        tone={
          productsWithStockout === 0
            ? "success"
            : productsShare >= 15
            ? "danger"
            : "warning"
        }
        icon={Package}
      />

      <KpiCard
        href="/oc"
        label="Fill rate vigente"
        value={fillRate == null ? "—" : `${fillRate.toFixed(1)}%`}
        sub={
          activePOs > 0
            ? `${fmtNumber(activePOs)} OCs activas`
            : "sin OCs en tránsito"
        }
        tone={
          fillRate == null
            ? "default"
            : fillRate >= 95
            ? "success"
            : fillRate >= 90
            ? "warning"
            : "danger"
        }
        icon={Target}
      />

      <KpiCard
        href="/productos"
        label="Cobertura"
        value={
          coverageWeeks == null ? "—" : `${fmtDecimal(coverageWeeks)} sem`
        }
        sub={
          avgDdi == null
            ? "sin datos de inventario"
            : `${fmtDecimal(avgDdi)} días promedio por SKU`
        }
        tone={
          coverageWeeks == null
            ? "default"
            : coverageWeeks < 1
            ? "danger"
            : coverageWeeks < 2
            ? "warning"
            : "success"
        }
        icon={Layers}
      />
    </div>
  );
}

function KpiCard({
  href,
  label,
  value,
  sub,
  tone,
  icon: Icon,
}: {
  href: string;
  label: string;
  value: string;
  sub: string;
  tone: Tone;
  icon: React.ComponentType<{ className?: string; strokeWidth?: number }>;
}) {
  const styles = TONE[tone];
  return (
    <Link
      href={href}
      className="group focus:outline-none focus:ring-2 focus:ring-ring rounded-lg"
    >
      <Card className="p-5 gap-1 hover:border-foreground/20 transition-colors h-full">
        <div className="flex items-center justify-between">
          <span className="text-[10px] uppercase tracking-wider text-muted-foreground font-medium">
            {label}
          </span>
          <span
            className={`inline-flex size-6 items-center justify-center rounded-md ${styles.chip}`}
          >
            <Icon className="size-3" strokeWidth={2} />
          </span>
        </div>
        <div
          className={`mt-1 font-mono tabular-nums text-2xl font-semibold tracking-tight ${styles.value}`}
        >
          {value}
        </div>
        <div className="flex items-center justify-between gap-2">
          <div className="text-[11px] text-muted-foreground truncate">{sub}</div>
          <ArrowUpRight
            className="size-3 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity shrink-0"
            strokeWidth={2}
          />
        </div>
      </Card>
    </Link>
  );
}
