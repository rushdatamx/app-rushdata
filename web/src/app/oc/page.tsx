import { loadPOOverview, type POStatus } from "@/lib/queries/po";
import { OCHero } from "@/components/oc/OCHero";
import { OCFilters } from "@/components/oc/OCFilters";
import { OCTopLists } from "@/components/oc/OCTopLists";
import { OCRecentTable } from "@/components/oc/OCRecentTable";
import { fmtNumber } from "@/lib/format";

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
  const period = sp.period ?? "all";
  const search = sp.q ?? "";

  const periodDays =
    period === "30" ? 30 : period === "90" ? 90 : period === "365" ? 365 : undefined;

  const data = await loadPOOverview({
    status:
      status !== "all" && VALID_STATUS.has(status as POStatus)
        ? (status as POStatus)
        : undefined,
    periodDays,
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
          period={period}
          search={search}
          statusCounts={statusCounts}
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
