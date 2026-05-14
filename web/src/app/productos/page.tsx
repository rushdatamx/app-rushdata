import { loadProducts, type ProductRow } from "@/lib/queries/products";
import { loadHomeStats } from "@/lib/queries/home-stats";
import {
  ProductosHero,
  type TopProductPoint,
} from "@/components/productos/ProductosHero";
import { ProductosFilters } from "@/components/productos/ProductosFilters";
import { ProductosGrid } from "@/components/productos/ProductosGrid";
import { ProductosTable } from "@/components/productos/ProductosTable";
import { PeriodSelector } from "@/components/shared/PeriodSelector";
import { fmtNumber } from "@/lib/format";
import { loadFiscalPeriods, resolvePeriod, buildPeriodOptions } from "@/lib/period";

export const dynamic = "force-dynamic";

type SearchParams = Promise<{
  cat?: string;
  status?: string;
  q?: string;
  view?: string;
  period?: string;
}>;

type ProductStatus = "star" | "risk" | "dormant" | "normal";

type EnrichedRow = ProductRow & {
  status: ProductStatus;
  trend: number | null;
  penetration: number;
};

function shortName(name: string): string {
  // "Sabritas Original 45gr" -> "Original 45gr"
  const parts = name.split(/\s+/);
  if (parts.length > 3) return parts.slice(-3).join(" ");
  return name;
}

function statusOf(
  p: ProductRow,
  starRevenueCutoff: number
): ProductStatus {
  if (p.storesWithStockout > 0) return "risk";
  if (p.units30d === 0 && p.revenue30d === 0) return "dormant";
  if (p.revenue30d >= starRevenueCutoff && starRevenueCutoff > 0) return "star";
  return "normal";
}

function weeklyTrend(weekly: ProductRow["weekly"]): number | null {
  if (weekly.length < 2) return null;
  const last = weekly[weekly.length - 1].units;
  const prev = weekly[weekly.length - 2].units;
  if (prev === 0) return last > 0 ? 100 : null;
  return ((last - prev) / prev) * 100;
}

export default async function ProductosPage({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  const sp = await searchParams;
  const category = sp.cat ?? "";
  const status = sp.status ?? "all";
  const search = sp.q ?? "";
  const view = sp.view === "grid" ? "grid" : "table";

  const fiscalPeriods = await loadFiscalPeriods("heb");
  const period = resolvePeriod(sp.period, fiscalPeriods);
  const periodOptions = buildPeriodOptions(fiscalPeriods);

  const [{ rows: allRows, totals }, homeStats] = await Promise.all([
    loadProducts({ start: period.start, end: period.end }),
    loadHomeStats(),
  ]);
  const totalStores = homeStats.activeStores;

  // Compute "estrella" cutoff = revenue del producto en posición 20% (top 20)
  const sortedByRev = [...allRows].sort((a, b) => b.revenue30d - a.revenue30d);
  const starIdx = Math.max(0, Math.floor(sortedByRev.length * 0.2) - 1);
  const starRevenueCutoff = sortedByRev[starIdx]?.revenue30d ?? 0;

  // Enrich + categorías disponibles
  const categories = new Set<string>();
  const enriched: EnrichedRow[] = allRows.map((p) => {
    if (p.category) categories.add(p.category);
    const penetration =
      totalStores === 0 ? 0 : (p.storesWithInventory / totalStores) * 100;
    return {
      ...p,
      status: statusOf(p, starRevenueCutoff),
      trend: weeklyTrend(p.weekly),
      penetration,
    };
  });

  // Filtros en memoria
  const searchLower = search.trim().toLowerCase();
  const rows = enriched.filter((p) => {
    if (category && p.category !== category) return false;
    if (status !== "all" && p.status !== status) return false;
    if (searchLower) {
      const hay = `${p.name} ${p.upc ?? ""} ${p.category ?? ""}`.toLowerCase();
      if (!hay.includes(searchLower)) return false;
    }
    return true;
  });

  // Stats agregados sobre lo filtrado
  const totalRevenue = rows.reduce((a, p) => a + p.revenue30d, 0);
  const top3Revenue = rows
    .slice(0, 3)
    .reduce((a, p) => a + p.revenue30d, 0);
  const topConcentration = totalRevenue === 0 ? 0 : (top3Revenue / totalRevenue) * 100;

  // Margen estimado 30d (revenue - cost*units) sobre lo filtrado
  const totalMargin = rows.reduce(
    (a, p) => a + (p.revenue30d - p.unitCost * p.units30d),
    0
  );
  const marginPct = totalRevenue > 0 ? (totalMargin / totalRevenue) * 100 : 0;

  // Conteo por status sobre el universo (sin filtro de status, sí con cat/search)
  // Para los chips: aplico cat/search igual que `rows` pero NO el filtro status
  const beforeStatus = enriched.filter((p) => {
    if (category && p.category !== category) return false;
    if (searchLower) {
      const hay = `${p.name} ${p.upc ?? ""} ${p.category ?? ""}`.toLowerCase();
      if (!hay.includes(searchLower)) return false;
    }
    return true;
  });
  const statusCounts = {
    all: beforeStatus.length,
    star: 0,
    risk: 0,
    dormant: 0,
  };
  for (const p of beforeStatus) {
    if (p.status === "star") statusCounts.star += 1;
    else if (p.status === "risk") statusCounts.risk += 1;
    else if (p.status === "dormant") statusCounts.dormant += 1;
  }

  const topProducts: TopProductPoint[] = rows.slice(0, 10).map((p) => ({
    id: p.id,
    fullName: p.name,
    shortName: shortName(p.name),
    revenue: p.revenue30d,
    units: p.units30d,
  }));

  const starProduct = rows[0]
    ? { id: rows[0].id, name: rows[0].name, revenue: rows[0].revenue30d }
    : null;

  const riskProduct = rows.reduce<EnrichedRow | null>(
    (worst, p) =>
      worst == null || p.storesWithStockout > worst.storesWithStockout ? p : worst,
    null
  );

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-end justify-between gap-4">
        <div>
          <h1 className="text-3xl lg:text-4xl font-semibold tracking-tight">
            Productos
          </h1>
          <p className="text-sm text-muted-foreground mt-2">
            {fmtNumber(totals.count)} SKUs activos · {fmtNumber(totalStores)} tiendas activas ·
            ventas en <span className="font-medium text-foreground">{period.label}</span>
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

      <ProductosHero
        totalSkus={rows.length}
        totalRevenue={totalRevenue}
        totalMargin={totalMargin}
        marginPct={marginPct}
        topConcentration={topConcentration}
        topProducts={topProducts}
        starProduct={starProduct}
        riskProduct={
          riskProduct
            ? {
                id: riskProduct.id,
                name: riskProduct.name,
                stockouts: riskProduct.storesWithStockout,
              }
            : null
        }
      />

      <div className="flex flex-col gap-2">
        <ProductosFilters
          category={category}
          status={status}
          search={search}
          view={view}
          categories={Array.from(categories).sort()}
          statusCounts={statusCounts}
        />
        <div className="text-xs text-muted-foreground">
          Mostrando{" "}
          <span className="font-medium text-foreground">{fmtNumber(rows.length)}</span> de{" "}
          {fmtNumber(allRows.length)} SKUs
        </div>
      </div>

      {view === "grid" ? (
        <ProductosGrid rows={rows} totalStores={totalStores} />
      ) : (
        <ProductosTable rows={rows} totalStores={totalStores} />
      )}
    </div>
  );
}
