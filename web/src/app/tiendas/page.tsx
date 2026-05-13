import { loadStores, type StoreRow } from "@/lib/queries/stores";
import { TiendasHero, type ClusterPoint } from "@/components/tiendas/TiendasHero";
import { TiendasFilters } from "@/components/tiendas/TiendasFilters";
import { TiendasGrid, storeStatus } from "@/components/tiendas/TiendasGrid";
import { TiendasTable } from "@/components/tiendas/TiendasTable";
import { fmtNumber } from "@/lib/format";

export const dynamic = "force-dynamic";

type SearchParams = Promise<{
  cluster?: string;
  region?: string;
  status?: string;
  q?: string;
  view?: string;
}>;

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
      // numeric clusters first
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
  const cluster = sp.cluster ?? "";
  const region = sp.region ?? "";
  const status = sp.status ?? "all";
  const search = sp.q ?? "";
  const view = sp.view === "table" ? "table" : "grid";

  const { rows: serverRows, clusters, regions, totals } = await loadStores({
    cluster: cluster || undefined,
    region: region || undefined,
  });

  // Aplica filtros adicionales en memoria (status + search)
  const rows = applyClientFilters(serverRows, { status, search });

  // Stats agregados sobre lo filtrado
  const totalRevenue = rows.reduce((a, s) => a + s.revenue30d, 0);
  const storesWithStockout = rows.filter((s) => s.stockouts > 0).length;
  const byCluster = clusterAggregates(rows);
  const topStore = rows.reduce<StoreRow | null>(
    (best, s) => (best == null || s.revenue30d > best.revenue30d ? s : best),
    null
  );
  const riskStore = rows.reduce<StoreRow | null>(
    (worst, s) =>
      worst == null || s.stockouts > worst.stockouts ? s : worst,
    null
  );

  return (
    <div className="flex flex-col gap-6">
      {/* Header */}
      <div className="flex items-end justify-between gap-4">
        <div>
          <h1 className="text-3xl lg:text-4xl font-semibold tracking-tight">
            Tiendas
          </h1>
          <p className="text-sm text-muted-foreground mt-2">
            {fmtNumber(totals.count)} ubicaciones activas · {fmtNumber(totals.stockouts)}{" "}
            quiebres activos en total
          </p>
        </div>
      </div>

      {/* Hero */}
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
      />

      {/* Filters */}
      <div className="flex flex-col gap-2">
        <TiendasFilters
          cluster={cluster}
          region={region}
          status={status}
          search={search}
          view={view}
          clusters={clusters}
          regions={regions}
        />
        <div className="text-xs text-muted-foreground">
          Mostrando{" "}
          <span className="font-medium text-foreground">
            {fmtNumber(rows.length)}
          </span>{" "}
          de {fmtNumber(serverRows.length)} tiendas
        </div>
      </div>

      {/* Vista */}
      {view === "table" ? <TiendasTable rows={rows} /> : <TiendasGrid rows={rows} />}
    </div>
  );
}
