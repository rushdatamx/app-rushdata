import "server-only";
import { supabaseServer } from "@/lib/supabase/ssr";
import { verifySession } from "@/lib/dal";

export type ReasonCode = "stockout_risk" | "low_ddi" | "velocity_up" | "periodic_replenish";

export type Suggestion = {
  id: string;
  storeId: string;
  store: string;
  storeCluster: string | null;
  productId: string;
  product: string;
  productCategory: string | null;
  ddi: number | null;
  inventory: number;
  velocity: number | null;
  suggestedUnits: number;
  suggestedCases: number;
  lostSale: number;
  confidence: number | null;
  reasonCode: ReasonCode | null;
  reasonDetail: string | null;
  forPeriod: string | null;
};

export type SuggestionFilters = {
  reason?: ReasonCode;
  onlyCritical?: boolean;
  cluster?: string;
  search?: string;
};

function toNum(v: unknown): number {
  if (v == null) return 0;
  const n = typeof v === "string" ? parseFloat(v) : (v as number);
  return Number.isFinite(n) ? n : 0;
}

export type ReasonCounts = Record<ReasonCode | "all", number>;

export async function loadSuggestions(
  filters: SuggestionFilters = {}
): Promise<{
  rows: Suggestion[];
  totals: { count: number; lostSale: number; cases: number };
  unfilteredCount: number;
  reasonCounts: ReasonCounts;
}> {
  const { orgId } = await verifySession();
  const db = await supabaseServer();

  // Query principal (filtrada por razón + DDI crítico si aplican)
  let q = db
    .from("suggested_orders")
    .select(
      "id,store_id,product_id,suggested_units,suggested_cases,current_inventory,current_ddi,velocity_daily,estimated_lost_sale,confidence,reason_code,reason_detail,for_period,stores(name,cluster),products(name,category)"
    )
    .eq("org_id", orgId)
    .eq("status", "new")
    .order("estimated_lost_sale", { ascending: false, nullsFirst: false });

  if (filters.reason) q = q.eq("reason_code", filters.reason);
  if (filters.onlyCritical) q = q.lte("current_ddi", 3);

  // Para los chips de razón: contar TODOS los sugeridos pendientes por reason_code
  // (sin aplicar el filtro de razón, pero respetando cluster/search se calcula client-side)
  const reasonCountsQuery = db
    .from("suggested_orders")
    .select("reason_code", { count: "exact" })
    .eq("org_id", orgId)
    .eq("status", "new");

  const [{ data, error }, { data: allReasonRows, error: errAll, count: totalAll }] =
    await Promise.all([q.limit(200), reasonCountsQuery]);

  if (error) throw new Error(`loadSuggestions: ${error.message}`);
  if (errAll) throw new Error(`loadSuggestions reasonCounts: ${errAll.message}`);

  const search = filters.search?.trim().toLowerCase() ?? "";
  const cluster = filters.cluster?.trim() ?? "";

  const rows: Suggestion[] = (data ?? []).map((r: Record<string, unknown>) => {
    const store = (r.stores ?? null) as { name?: string; cluster?: string | null } | null;
    const product = (r.products ?? null) as { name?: string; category?: string | null } | null;
    return {
      id: String(r.id),
      storeId: String(r.store_id),
      store: store?.name ?? "—",
      storeCluster: store?.cluster ?? null,
      productId: String(r.product_id),
      product: product?.name ?? "—",
      productCategory: product?.category ?? null,
      ddi: r.current_ddi == null ? null : toNum(r.current_ddi),
      inventory: toNum(r.current_inventory),
      velocity: r.velocity_daily == null ? null : toNum(r.velocity_daily),
      suggestedUnits: toNum(r.suggested_units),
      suggestedCases: toNum(r.suggested_cases),
      lostSale: toNum(r.estimated_lost_sale),
      confidence: r.confidence == null ? null : toNum(r.confidence),
      reasonCode: (r.reason_code as ReasonCode) ?? null,
      reasonDetail: (r.reason_detail as string) ?? null,
      forPeriod: (r.for_period as string) ?? null,
    };
  });

  const filtered = rows.filter((r) => {
    if (cluster && r.storeCluster !== cluster) return false;
    if (search) {
      const hay = `${r.store} ${r.product}`.toLowerCase();
      if (!hay.includes(search)) return false;
    }
    return true;
  });

  const totals = filtered.reduce(
    (acc, r) => {
      acc.count += 1;
      acc.lostSale += r.lostSale;
      acc.cases += r.suggestedCases;
      return acc;
    },
    { count: 0, lostSale: 0, cases: 0 }
  );

  // Contadores por razón (universo completo de sugeridos pendientes, sin filtro de razón)
  const reasonCounts: ReasonCounts = {
    all: totalAll ?? 0,
    stockout_risk: 0,
    low_ddi: 0,
    velocity_up: 0,
    periodic_replenish: 0,
  };
  for (const r of (allReasonRows ?? []) as Array<{ reason_code: string | null }>) {
    const code = r.reason_code as ReasonCode | null;
    if (code && code in reasonCounts) reasonCounts[code] += 1;
  }

  return {
    rows: filtered,
    totals,
    unfilteredCount: totalAll ?? 0,
    reasonCounts,
  };
}

export const REASON_META: Record<ReasonCode, { label: string; tone: "danger" | "warning" | "accent" | "muted" }> = {
  stockout_risk: { label: "Riesgo quiebre", tone: "danger" },
  low_ddi: { label: "DDI bajo", tone: "warning" },
  velocity_up: { label: "Velocity ↑", tone: "accent" },
  periodic_replenish: { label: "Reposición", tone: "muted" },
};
