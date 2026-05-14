import { loadCoverageMatrix } from "@/lib/queries/coverage";
import { CoverageMatrix } from "@/components/cobertura/CoverageMatrix";
import { Card } from "@/components/ui/card";
import { fmtNumber, fmtPct } from "@/lib/format";
import { Grid3x3, AlertTriangle, Store, Package } from "lucide-react";

export const dynamic = "force-dynamic";

export default async function CoberturaPage() {
  const data = await loadCoverageMatrix();
  const { stores, products, cells, clusters, regions, categories, totals } = data;

  return (
    <div className="flex flex-col gap-6">
      {/* Header */}
      <div className="flex items-end justify-between gap-4">
        <div>
          <h1 className="text-3xl lg:text-4xl font-semibold tracking-tight">
            Cobertura
          </h1>
          <p className="text-sm text-muted-foreground mt-2">
            Matriz tienda × SKU · una celda por cada combinación · cobertura, inventario,
            velocidad y quiebres
          </p>
        </div>
      </div>

      {/* KPIs strip */}
      <Card className="p-0 gap-0 overflow-hidden">
        <div className="grid grid-cols-2 lg:grid-cols-4 divide-x divide-y lg:divide-y-0">
          <KpiBlock
            icon={Store}
            label="Tiendas activas"
            value={fmtNumber(totals.storeCount)}
            sub="con distribución hoy"
          />
          <KpiBlock
            icon={Package}
            label="SKUs activos"
            value={fmtNumber(totals.productCount)}
            sub="en catálogo"
          />
          <KpiBlock
            icon={Grid3x3}
            label="Cobertura"
            value={fmtPct(totals.coverageRate)}
            sub={`${fmtNumber(Math.round(totals.coverageRate * totals.storeCount * totals.productCount))} de ${fmtNumber(totals.storeCount * totals.productCount)} celdas con stock`}
            tone={
              totals.coverageRate >= 0.7
                ? "success"
                : totals.coverageRate >= 0.4
                ? "warning"
                : "danger"
            }
          />
          <KpiBlock
            icon={AlertTriangle}
            label="Celdas en quiebre"
            value={fmtNumber(totals.stockoutCount)}
            sub={`${fmtPct(totals.stockoutRate)} del total`}
            tone={
              totals.stockoutCount === 0
                ? "success"
                : totals.stockoutRate < 0.05
                ? "warning"
                : "danger"
            }
          />
        </div>
      </Card>

      <CoverageMatrix
        stores={stores}
        products={products}
        cells={cells}
        clusters={clusters}
        regions={regions}
        categories={categories}
      />
    </div>
  );
}

type Tone = "default" | "danger" | "success" | "warning";
const TONE: Record<Tone, { value: string; chip: string }> = {
  default: { value: "text-foreground", chip: "bg-muted text-muted-foreground" },
  danger: { value: "text-rose-700", chip: "bg-rose-100 text-rose-700" },
  success: { value: "text-emerald-700", chip: "bg-emerald-100 text-emerald-700" },
  warning: { value: "text-amber-700", chip: "bg-amber-100 text-amber-700" },
};

function KpiBlock({
  icon: Icon,
  label,
  value,
  sub,
  tone = "default",
}: {
  icon: React.ComponentType<{ className?: string; strokeWidth?: number }>;
  label: string;
  value: string;
  sub: string;
  tone?: Tone;
}) {
  const t = TONE[tone];
  return (
    <div className="flex flex-col justify-center px-5 py-5">
      <div className="flex items-center justify-between">
        <span className="text-[10px] uppercase tracking-wider text-muted-foreground font-medium">
          {label}
        </span>
        <span
          className={`inline-flex size-6 items-center justify-center rounded-md ${t.chip}`}
        >
          <Icon className="size-3" strokeWidth={2} />
        </span>
      </div>
      <div
        className={`mt-2 font-mono tabular-nums text-2xl font-semibold tracking-tight ${
          tone === "default" ? "text-foreground" : t.value
        }`}
      >
        {value}
      </div>
      <div className="text-[11px] text-muted-foreground mt-0.5 truncate">{sub}</div>
    </div>
  );
}
