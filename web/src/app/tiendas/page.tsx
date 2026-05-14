import { loadStores, type StoreRow } from "@/lib/queries/stores";
import { TiendasHero, type ClusterPoint } from "@/components/tiendas/TiendasHero";
import { TiendasFilters } from "@/components/tiendas/TiendasFilters";
import { TiendasGrid, storeStatus } from "@/components/tiendas/TiendasGrid";
import { TiendasTable } from "@/components/tiendas/TiendasTable";
import { TiendasDetalle } from "@/components/tiendas/TiendasDetalle";
import { PeriodSelector } from "@/components/shared/PeriodSelector";
import { SubTabs } from "@/components/shared/SubTabs";
import { fmtNumber } from "@/lib/format";
import {
  loadFiscalPeriods,
  resolvePeriod,
  buildPeriodOptions,
  loadAnchorDate,
} from "@/lib/period";

export const dynamic = "force-dynamic";

type SearchParams = Promise<{
  // resumen
  cluster?: string;
  region?: string;
  status?: string;
  q?: string;
  view?: string;
  period?: string;
  // detalle
  tab?: string;
  groupBy?: string;
  storeId?: string;
  productId?: string;
}>;

const SUB_TABS = [
  { value: "resumen", label: "Resumen" },
  { value: "detalle", label: "Detalle por tienda" },
];

function applyClientFilters(
  all: StoreRow[],
  filters: { status: string; search: string }
): StoreRow[] {
  const search = filters.search.trim().toLowerCase();
  return all.filter((s) => {
    if (filters.status !== "all" && storeStatus(s) !== filters.status) return false;
    if (search) {
      const hay = `${s.name} ${s.city ?? ""} ${s.state ?? ""}`.toLowerCase();
      if (!hay.includes(search)) return false;
    }
    return true;
  });
}

function clusterAggregates(rows: StoreRow[]): ClusterPoint[] {
  const map = new Map<string, { revenue: number; stores: number }>();
  for (const s of rows) {
    const key = s.cluster ?? "—";
    const cur = map.get(key) ?? { revenue: 0, stores: 0 };
    cur.revenue += s.revenue30d;
    cur.stores += 1;
    map.set(key, cur);
  }
  return Array.from(map.entries())
    .map(([cluster, v]) => ({ cluster, revenue: v.revenue, stores: v.stores }))
    .sort((a, b) => {
      const na = Number(a.cluster);
      const nb = Number(b.cluster);
      if (!Number.isNaN(na) && !Number.isNaN(nb)) return na - nb;
      return a.cluster.localeCompare(b.cluster);
    });
}

export default async function TiendasPage({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  const sp = await searchParams;
  const tab = sp.tab === "detalle" ? "detalle" : "resumen";

  const [fiscalPeriods, anchor] = await Promise.all([
    loadFiscalPeriods("heb"),
    loadAnchorDate(),
  ]);
  const defaultPeriodRaw = tab === "detalle" ? "12m" : undefined;
  const period = resolvePeriod(sp.period ?? defaultPeriodRaw, fiscalPeriods, anchor);
  const periodOptions = buildPeriodOptions(fiscalPeriods, anchor);

  // Header común
  const Header = (
    <div className="flex items-end justify-between gap-4">
      <div>
        <h1 className="text-3xl lg:text-4xl font-semibold tracking-tight">
          Tiendas
        </h1>
        <p className="text-sm text-muted-foreground mt-2">
          {tab === "resumen"
            ? "Resumen operativo de tiendas activas"
            : "Detalle de venta sell-out por dimensión con comparativo año anterior"}
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
  );

  if (tab === "detalle") {
    return (
      <div className="flex flex-col gap-6">
        {Header}
        <SubTabs tabs={SUB_TABS} current={tab} />
        <TiendasDetalle
          period={{ start: period.start, end: period.end, label: period.label }}
          groupBy={sp.groupBy}
          storeId={sp.storeId}
          productId={sp.productId}
          region={sp.region}
        />
      </div>
    );
  }

  // Resumen
  const cluster = sp.cluster ?? "";
  const region = sp.region ?? "";
  const status = sp.status ?? "all";
  const search = sp.q ?? "";
  const view = sp.view === "table" ? "table" : "grid";

  const { rows: serverRows, clusters, regions, totals } = await loadStores({
    cluster: cluster || undefined,
    region: region || undefined,
    start: period.start,
    end: period.end,
  });

  const rows = applyClientFilters(serverRows, { status, search });

  const statusCounts = {
    all: serverRows.length,
    critical: 0,
    warning: 0,
    healthy: 0,
  };
  for (const s of serverRows) {
    statusCounts[storeStatus(s)] += 1;
  }

  const totalRevenue = rows.reduce((a, s) => a + s.revenue30d, 0);
  const storesWithStockout = rows.filter((s) => s.stockouts > 0).length;
  const byCluster = clusterAggregates(rows);
  const topStore = rows.reduce<StoreRow | null>(
    (best, s) => (best == null || s.revenue30d > best.revenue30d ? s : best),
    null
  );
  const riskStore = rows.reduce<StoreRow | null>(
    (worst, s) => (worst == null || s.stockouts > worst.stockouts ? s : worst),
    null
  );
  const sortedByRev = [...rows].sort((a, b) => b.revenue30d - a.revenue30d);
  const top5Revenue = sortedByRev.slice(0, 5).reduce((a, s) => a + s.revenue30d, 0);
  const top5Concentration = totalRevenue === 0 ? 0 : (top5Revenue / totalRevenue) * 100;

  return (
    <div className="flex flex-col gap-6">
      {Header}
      <SubTabs tabs={SUB_TABS} current={tab} />

      <div className="text-sm text-muted-foreground -mt-2">
        {fmtNumber(totals.count)} ubicaciones activas · {fmtNumber(totals.stockouts)}{" "}
        quiebres activos · ventas en{" "}
        <span className="font-medium text-foreground">{period.label}</span>
      </div>

      <TiendasHero
        totalStores={rows.length}
        totalStockouts={rows.reduce((a, s) => a + s.stockouts, 0)}
        totalRevenue={totalRevenue}
        storesWithStockout={storesWithStockout}
        byCluster={byCluster}
        topStore={
          topStore ? { id: topStore.id, name: topStore.name, revenue: topStore.revenue30d } : null
        }
        riskStore={
          riskStore
            ? { id: riskStore.id, name: riskStore.name, stockouts: riskStore.stockouts }
            : null
        }
        top5Concentration={top5Concentration}
      />

      <div className="flex flex-col gap-2">
        <TiendasFilters
          cluster={cluster}
          region={region}
          status={status}
          search={search}
          view={view}
          clusters={clusters}
          regions={regions}
          statusCounts={statusCounts}
        />
        <div className="text-xs text-muted-foreground">
          Mostrando{" "}
          <span className="font-medium text-foreground">{fmtNumber(rows.length)}</span>{" "}
          de {fmtNumber(serverRows.length)} tiendas
        </div>
      </div>

      {view === "table" ? <TiendasTable rows={rows} /> : <TiendasGrid rows={rows} />}
    </div>
  );
}
