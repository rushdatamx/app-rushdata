import { loadPOOverview, type POStatus } from "@/lib/queries/po";
import { OCHero } from "@/components/oc/OCHero";
import { OCFilters } from "@/components/oc/OCFilters";
import { OCTopLists } from "@/components/oc/OCTopLists";
import { OCRecentTable } from "@/components/oc/OCRecentTable";
import { fmtNumber } from "@/lib/format";
import { loadFiscalPeriods, resolvePeriod, buildPeriodOptions } from "@/lib/period";

export const dynamic = "force-dynamic";

type SearchParams = Promise<{
  status?: string;
  period?: string;
  q?: string;
}>;

const VALID_STATUS = new Set<POStatus>(["pending", "partial", "fulfilled", "cancelled"]);

export default async function OCPage({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  const sp = await searchParams;
  const status = sp.status ?? "all";
  const rawPeriod = sp.period ?? "all";
  const search = sp.q ?? "";

  // El selector dual de OC permite "all" además de los modos del helper.
  // Si period === "all" no aplicamos ventana de fecha.
  const fiscalPeriods = await loadFiscalPeriods("heb");
  const periodOptions = buildPeriodOptions(fiscalPeriods);
  const resolved = rawPeriod === "all" ? null : resolvePeriod(rawPeriod, fiscalPeriods);

  const data = await loadPOOverview({
    status:
      status !== "all" && VALID_STATUS.has(status as POStatus)
        ? (status as POStatus)
        : undefined,
    periodStart: resolved?.start,
    periodEnd: resolved?.end,
    search: search || undefined,
  });

  const {
    totals,
    monthly,
    topStores,
    topProducts,
    recent,
    recentFilteredCount,
    recentTotalCount,
    statusCounts,
  } = data;

  return (
    <div className="flex flex-col gap-6">
      {/* Header */}
      <div className="flex items-end justify-between gap-4">
        <div>
          <h1 className="text-3xl lg:text-4xl font-semibold tracking-tight">
            Órdenes de compra
          </h1>
          <p className="text-sm text-muted-foreground mt-2">
            {fmtNumber(totals.poCount)} OCs históricas · {fmtNumber(totals.unitsOrdered)}{" "}
            unidades ordenadas
          </p>
        </div>
      </div>

      {/* Hero */}
      <OCHero
        monthly={monthly.map((m) => ({
          monthStart: m.monthStart,
          ordered: m.unitsOrdered,
          received: m.unitsReceived,
        }))}
        totalValue={totals.value}
        avgFillRate={totals.avgFillRate}
        activePOs={totals.activePOs}
        pendingValue={totals.pendingValue}
        avgLeadTimeDays={totals.avgLeadTimeDays}
        underFillCount={totals.underFillCount}
        unitsOrdered={totals.unitsOrdered}
        unitsReceived={totals.unitsReceived}
      />

      {/* Top lists */}
      <OCTopLists topStores={topStores} topProducts={topProducts} />

      {/* Filters + Recent */}
      <div className="flex flex-col gap-2">
        <OCFilters
          status={status}
          search={search}
          statusCounts={statusCounts}
          periodValue={rawPeriod}
          periodLabel={
            rawPeriod === "all" ? "Todo el histórico" : resolved?.label ?? "—"
          }
          periodShortLabel={
            rawPeriod === "all" ? "Todo" : resolved?.shortLabel ?? "—"
          }
          rollingOptions={periodOptions.rolling}
          calendarOptions={periodOptions.calendar}
          fiscalOptions={periodOptions.fiscal}
        />
      </div>

      <OCRecentTable
        rows={recent}
        filteredCount={recentFilteredCount}
        totalCount={recentTotalCount}
      />
    </div>
  );
}
