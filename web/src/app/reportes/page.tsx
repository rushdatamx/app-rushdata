import { loadReports } from "@/lib/queries/reports";
import { PivotBuilder } from "@/components/reportes/PivotBuilder";
import { ReportesFilters } from "@/components/reportes/ReportesFilters";
import { PeriodSelector } from "@/components/shared/PeriodSelector";
import {
  loadFiscalPeriods,
  resolvePeriod,
  buildPeriodOptions,
  loadAnchorDate,
} from "@/lib/period";

export const dynamic = "force-dynamic";

type SearchParams = Promise<{
  period?: string;
  cat?: string;
  cluster?: string;
  region?: string;
}>;

export default async function ReportesPage({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  const sp = await searchParams;
  const category = sp.cat ?? "";
  const cluster = sp.cluster ?? "";
  const region = sp.region ?? "";

  const [fiscalPeriods, anchor] = await Promise.all([
    loadFiscalPeriods("heb"),
    loadAnchorDate(),
  ]);
  const period = resolvePeriod(sp.period, fiscalPeriods, anchor);
  const periodOptions = buildPeriodOptions(fiscalPeriods, anchor);

  const { facts, filters } = await loadReports({
    start: period.start,
    end: period.end,
    categoryFilter: category || undefined,
    clusterFilter: cluster || undefined,
    regionFilter: region || undefined,
  });

  return (
    <div className="flex flex-col gap-6">
      {/* Header */}
      <div className="flex items-end justify-between gap-4">
        <div>
          <h1 className="text-3xl lg:text-4xl font-semibold tracking-tight">
            Reportes
          </h1>
          <p className="text-sm text-muted-foreground mt-2">
            Builder de reportes ad-hoc · elige una dimensión + métricas + filtros
            y obtén tu cruce en segundos
          </p>
        </div>
        <PeriodSelector
          value={period.raw}
          resolvedLabel={period.label}
          resolvedShortLabel={period.shortLabel}
          rolling={periodOptions.rolling}
          calendar={periodOptions.calendar}
          fiscal={periodOptions.fiscal}
        />
      </div>

      {/* Filtros globales (categoría, cluster, región) */}
      <ReportesFilters
        category={category}
        cluster={cluster}
        region={region}
        categories={filters.categories}
        clusters={filters.clusters}
        regions={filters.regions}
      />

      <PivotBuilder facts={facts} periodLabel={period.label} />
    </div>
  );
}
