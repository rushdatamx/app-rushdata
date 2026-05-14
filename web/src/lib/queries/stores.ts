import "server-only";
import { supabaseServer } from "@/lib/supabase/ssr";
import { verifySession } from "@/lib/dal";

export type StoreRow = {
  id: string;
  externalCode: string | null;
  name: string;
  city: string | null;
  state: string | null;
  region: string | null;
  cluster: string | null;
  isCedis: boolean;
  skusActive: number;
  skusWithStock: number;
  inventoryUnits: number;
  inventoryValue: number;
  stockouts: number;
  units30d: number;
  revenue30d: number;
  avgDdi: number | null;
};

function toNum(v: unknown): number {
  if (v == null) return 0;
  const n = typeof v === "string" ? parseFloat(v) : (v as number);
  return Number.isFinite(n) ? n : 0;
}

export async function loadStores(opts: { cluster?: string; region?: string } = {}): Promise<{
  rows: StoreRow[];
  clusters: string[];
  regions: string[];
  totals: { count: number; stockouts: number; revenue30d: number; inventoryValue: number };
}> {
  const { orgId } = await verifySession();
  const db = await supabaseServer();

  const [storesRes, kpisRes] = await Promise.all([
    db
      .from("stores")
      .select("id,external_code,name,city,state,region,cluster,is_cedis,active")
      .eq("org_id", orgId)
      .eq("active", true)
      .order("name"),
    db.rpc("fn_store_kpis", { p_org_id: orgId }),
  ]);

  if (storesRes.error) throw new Error(`stores: ${storesRes.error.message}`);
  if (kpisRes.error) throw new Error(`fn_store_kpis: ${kpisRes.error.message}`);

  const kpiMap = new Map<string, Record<string, unknown>>();
  for (const k of (kpisRes.data as Array<Record<string, unknown>>) ?? []) {
    kpiMap.set(String(k.store_id), k);
  }

  const clusters = new Set<string>();
  const regions = new Set<string>();

  const all: StoreRow[] = ((storesRes.data ?? []) as Array<Record<string, unknown>>).map((s) => {
    const k = kpiMap.get(String(s.id));
    if (s.cluster) clusters.add(s.cluster as string);
    if (s.region) regions.add(s.region as string);
    const inventoryUnits = k ? toNum(k.total_inventory_units) : 0;
    const units30d = k ? toNum(k.units_last_30d) : 0;
    const dailyVel = units30d / 30;
    const avgDdi = dailyVel > 0 ? inventoryUnits / dailyVel : null;
    return {
      id: String(s.id),
      externalCode: (s.external_code as string) ?? null,
      name: (s.name as string) ?? "—",
      city: (s.city as string) ?? null,
      state: (s.state as string) ?? null,
      region: (s.region as string) ?? null,
      cluster: (s.cluster as string) ?? null,
      isCedis: Boolean(s.is_cedis),
      skusActive: k ? toNum(k.skus_active) : 0,
      skusWithStock: k ? toNum(k.skus_with_stock) : 0,
      inventoryUnits,
      inventoryValue: k ? toNum(k.total_inventory_value_cost) : 0,
      stockouts: k ? toNum(k.active_stockouts) : 0,
      units30d,
      revenue30d: k ? toNum(k.revenue_last_30d) : 0,
      avgDdi,
    };
  });

  const filtered = all.filter((s) => {
    if (opts.cluster && s.cluster !== opts.cluster) return false;
    if (opts.region && s.region !== opts.region) return false;
    return true;
  });

  const totals = filtered.reduce(
    (acc, s) => {
      acc.count += 1;
      acc.stockouts += s.stockouts;
      acc.revenue30d += s.revenue30d;
      acc.inventoryValue += s.inventoryValue;
      return acc;
    },
    { count: 0, stockouts: 0, revenue30d: 0, inventoryValue: 0 }
  );

  return {
    rows: filtered,
    clusters: Array.from(clusters).sort(),
    regions: Array.from(regions).sort(),
    totals,
  };
}
