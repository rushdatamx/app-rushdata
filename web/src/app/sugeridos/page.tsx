import { loadSuggestions, type ReasonCode } from "@/lib/queries/suggestions";
import {
  loadSuggestionsTrend,
  loadAvailableClusters,
} from "@/lib/queries/suggestions-timeseries";
import { SugeridosHero } from "@/components/sugeridos/SugeridosHero";
import { SugeridosFilters } from "@/components/sugeridos/SugeridosFilters";
import { SugeridosTable } from "@/components/sugeridos/SugeridosTable";
import { fmtNumber } from "@/lib/format";

export const dynamic = "force-dynamic";

type SearchParams = Promise<{
  reason?: string;
  severity?: string;
  cluster?: string;
  q?: string;
}>;

const REASONS = new Set<ReasonCode>([
  "stockout_risk",
  "low_ddi",
  "velocity_up",
  "periodic_replenish",
]);

function ddiSeverity(ddi: number | null): "critical" | "high" | "medium" | "low" {
  if (ddi == null) return "medium";
  if (ddi <= 1) return "critical";
  if (ddi <= 3) return "high";
  if (ddi <= 7) return "medium";
  return "low";
}

export default async function SugeridosPage({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  const sp = await searchParams;
  const reason = sp.reason && REASONS.has(sp.reason as ReasonCode) ? sp.reason : "all";
  const severity = sp.severity === "critical" ? "critical" : "all";
  const cluster = sp.cluster ?? "";
  const search = sp.q ?? "";

  const [{ rows, totals }, trend, clusters] = await Promise.all([
    loadSuggestions({
      reason: reason === "all" ? undefined : (reason as ReasonCode),
      onlyCritical: severity === "critical",
      cluster: cluster || undefined,
      search: search || undefined,
    }),
    loadSuggestionsTrend(14),
    loadAvailableClusters(),
  ]);

  // breakdown por severidad
  const sevCount = { critical: 0, high: 0, medium: 0, low: 0 };
  for (const r of rows) {
    sevCount[ddiSeverity(r.ddi)] += 1;
  }

  return (
    <div className="flex flex-col gap-6">
      {/* Header */}
      <div className="flex items-end justify-between gap-4">
        <div>
          <h1 className="text-3xl lg:text-4xl font-semibold tracking-tight">
            Sugeridos
          </h1>
          <p className="text-sm text-muted-foreground mt-2">
            Pedidos sugeridos pendientes · ordenados por venta perdida estimada
          </p>
        </div>
      </div>

      {/* Hero */}
      <SugeridosHero
        count={totals.count}
        lostSale={totals.lostSale}
        cases={totals.cases}
        trend={trend}
        severity={sevCount}
      />

      {/* Filters */}
      <div className="flex flex-col gap-2">
        <SugeridosFilters
          reason={reason}
          severity={severity}
          cluster={cluster}
          search={search}
          clusters={clusters}
        />
        <div className="text-xs text-muted-foreground">
          Mostrando{" "}
          <span className="font-medium text-foreground">{fmtNumber(rows.length)}</span>{" "}
          de {fmtNumber(rows.length)} sugeridos
        </div>
      </div>

      {/* Table */}
      <SugeridosTable rows={rows} />
    </div>
  );
}
