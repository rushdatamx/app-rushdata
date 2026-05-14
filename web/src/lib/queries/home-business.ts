import "server-only";
import { supabaseServer } from "@/lib/supabase/ssr";
import { verifySession } from "@/lib/dal";

export type MonthlyYoyPoint = {
  monthStart: string;
  revenueCurrent: number;
  revenuePrevious: number;
  unitsCurrent: number;
  unitsPrevious: number;
  deltaPct: number | null;
};

export type TopProductRow = {
  id: string;
  name: string;
  upc: string;
  category: string | null;
  units: number;
  revenue: number;
};

export type TopStoreRow = {
  id: string;
  name: string;
  code: string;
  region: string | null;
  units: number;
  revenue: number;
};

export type HomeBusinessData = {
  monthly: MonthlyYoyPoint[];
  topProducts: TopProductRow[];
  topStores: TopStoreRow[];
  totalCurrent: number;
  totalPrevious: number;
  totalDeltaPct: number | null;
};

function toNum(v: unknown): number {
  if (v == null) return 0;
  const n = typeof v === "string" ? parseFloat(v) : (v as number);
  return Number.isFinite(n) ? n : 0;
}

function pctDelta(curr: number, prev: number): number | null {
  if (prev === 0) return null;
  return ((curr - prev) / prev) * 100;
}

export async function loadHomeBusinessData(): Promise<HomeBusinessData> {
  const { orgId } = await verifySession();
  const db = await supabaseServer();

  const [monthlyRes, topProductsRes, topStoresRes] = await Promise.all([
    db.rpc("fn_sales_monthly_yoy", { p_org_id: orgId }),
    db.rpc("fn_sales_top_products", { p_org_id: orgId, p_months: 12, p_limit: 10 }),
    db.rpc("fn_sales_top_stores", { p_org_id: orgId, p_months: 12, p_limit: 10 }),
  ]);

  if (monthlyRes.error) throw new Error(`fn_sales_monthly_yoy: ${monthlyRes.error.message}`);
  if (topProductsRes.error) throw new Error(`fn_sales_top_products: ${topProductsRes.error.message}`);
  if (topStoresRes.error) throw new Error(`fn_sales_top_stores: ${topStoresRes.error.message}`);

  const monthly: MonthlyYoyPoint[] = (
    (monthlyRes.data as Array<Record<string, unknown>>) ?? []
  ).map((r) => {
    const revenueCurrent = toNum(r.revenue_current);
    const revenuePrevious = toNum(r.revenue_previous);
    return {
      monthStart: String(r.month_start),
      revenueCurrent,
      revenuePrevious,
      unitsCurrent: toNum(r.units_current),
      unitsPrevious: toNum(r.units_previous),
      deltaPct: pctDelta(revenueCurrent, revenuePrevious),
    };
  });

  const topProducts: TopProductRow[] = (
    (topProductsRes.data as Array<Record<string, unknown>>) ?? []
  ).map((r) => ({
    id: String(r.product_id),
    name: (r.product_name as string) ?? "—",
    upc: (r.product_upc as string) ?? "",
    category: (r.product_category as string) ?? null,
    units: toNum(r.units),
    revenue: toNum(r.revenue),
  }));

  const topStores: TopStoreRow[] = (
    (topStoresRes.data as Array<Record<string, unknown>>) ?? []
  ).map((r) => ({
    id: String(r.store_id),
    name: (r.store_name as string) ?? "—",
    code: (r.store_code as string) ?? "",
    region: (r.store_region as string) ?? null,
    units: toNum(r.units),
    revenue: toNum(r.revenue),
  }));

  const totalCurrent = monthly.reduce((a, m) => a + m.revenueCurrent, 0);
  const totalPrevious = monthly.reduce((a, m) => a + m.revenuePrevious, 0);
  const totalDeltaPct = pctDelta(totalCurrent, totalPrevious);

  return {
    monthly,
    topProducts,
    topStores,
    totalCurrent,
    totalPrevious,
    totalDeltaPct,
  };
}
