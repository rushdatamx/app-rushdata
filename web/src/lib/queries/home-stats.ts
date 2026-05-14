import "server-only";
import { supabaseServer } from "@/lib/supabase/ssr";
import { verifySession } from "@/lib/dal";

export type HomeStats = {
  avgDdi: number | null;
  activeStores: number;
  activeProducts: number;
  storesWithStockout: number;
  productsWithStockout: number;
  coverageWeeks: number | null;
};

function toNum(v: unknown): number {
  if (v == null) return 0;
  const n = typeof v === "string" ? parseFloat(v) : (v as number);
  return Number.isFinite(n) ? n : 0;
}

export async function loadHomeStats(): Promise<HomeStats> {
  const { orgId } = await verifySession();
  const db = await supabaseServer();

  const since30 = new Date(Date.now() - 30 * 24 * 3600 * 1000)
    .toISOString()
    .slice(0, 10);

  const [storesRes, productsRes, inventoryRes, alertsRes, salesRes, kpiRes] =
    await Promise.all([
      db
        .from("stores")
        .select("id", { count: "exact", head: true })
        .eq("org_id", orgId)
        .eq("active", true)
        .eq("is_cedis", false),
      db
        .from("products")
        .select("id", { count: "exact", head: true })
        .eq("org_id", orgId)
        .eq("active", true),
      db
        .from("inventory_snapshots")
        .select("days_of_inventory,snapshot_date")
        .eq("org_id", orgId)
        .order("snapshot_date", { ascending: false })
        .limit(500),
      db
        .from("stockout_alerts")
        .select("store_id,product_id")
        .eq("org_id", orgId)
        .eq("resolved", false),
      db
        .from("sales")
        .select("revenue_no_tax")
        .eq("org_id", orgId)
        .gte("sale_date", since30),
      db
        .from("daily_kpis")
        .select("total_inventory_value")
        .eq("org_id", orgId)
        .order("kpi_date", { ascending: false })
        .limit(1)
        .maybeSingle(),
    ]);

  // DDI promedio
  const invRows = (inventoryRes.data ?? []) as Array<{
    days_of_inventory: unknown;
  }>;
  const validDdi = invRows
    .map((r) => toNum(r.days_of_inventory))
    .filter((d) => d > 0 && d < 365);
  const avgDdi =
    validDdi.length === 0
      ? null
      : validDdi.reduce((a, b) => a + b, 0) / validDdi.length;

  // Tiendas y productos únicos con stockout activo
  const alerts = (alertsRes.data ?? []) as Array<{
    store_id: string;
    product_id: string;
  }>;
  const uniqueStores = new Set<string>();
  const uniqueProducts = new Set<string>();
  for (const a of alerts) {
    if (a.store_id) uniqueStores.add(a.store_id);
    if (a.product_id) uniqueProducts.add(a.product_id);
  }

  // Cobertura en semanas: inventario_valor / (venta semana promedio últimos 30d)
  const sales30 = ((salesRes.data ?? []) as Array<{ revenue_no_tax: unknown }>)
    .reduce((a, r) => a + toNum(r.revenue_no_tax), 0);
  const inventoryValue = toNum(kpiRes.data?.total_inventory_value);
  const weeklyAvg = sales30 / (30 / 7);
  const coverageWeeks =
    weeklyAvg > 0 ? inventoryValue / weeklyAvg : null;

  return {
    avgDdi,
    activeStores: storesRes.count ?? 0,
    activeProducts: productsRes.count ?? 0,
    storesWithStockout: uniqueStores.size,
    productsWithStockout: uniqueProducts.size,
    coverageWeeks,
  };
}
