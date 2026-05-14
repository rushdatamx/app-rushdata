import "server-only";
import { supabaseServer } from "@/lib/supabase/ssr";
import { verifySession } from "@/lib/dal";

export type POStatus = "pending" | "partial" | "fulfilled" | "cancelled";

export type MonthPoint = {
  monthStart: string;
  poCount: number;
  unitsOrdered: number;
  unitsReceived: number;
  value: number;
};

export type TopStore = {
  id: string;
  name: string;
  cluster: string | null;
  poCount: number;
  units: number;
  value: number;
};

export type TopProduct = {
  id: string;
  name: string;
  category: string | null;
  poCount: number;
  units: number;
  value: number;
};

export type RecentPO = {
  id: string;
  poNumber: string | null;
  orderDate: string;
  expectedDelivery: string | null;
  status: string;
  unitsOrdered: number;
  unitsReceived: number;
  fillRate: number | null;
  value: number;
  pendingValue: number;
  leadTimeDays: number | null;
  lineCount: number;
};

export type POOverview = {
  totals: {
    poCount: number;
    unitsOrdered: number;
    unitsReceived: number;
    value: number;
    avgFillRate: number | null;
    last30dValue: number;
    last30dCount: number;
    pendingValue: number;
    avgLeadTimeDays: number | null;
    activePOs: number;
    underFillCount: number;
  };
  monthly: MonthPoint[];
  topStores: TopStore[];
  topProducts: TopProduct[];
  recent: RecentPO[];
  recentFilteredCount: number;
  recentTotalCount: number;
  statusCounts: Record<"all" | POStatus, number>;
};

export type POFilters = {
  status?: POStatus;
  periodDays?: number;
  search?: string;
};

function toNum(v: unknown): number {
  if (v == null) return 0;
  const n = typeof v === "string" ? parseFloat(v) : (v as number);
  return Number.isFinite(n) ? n : 0;
}

function daysBetween(a: string, b: string): number | null {
  const ta = new Date(a + "T00:00:00").getTime();
  const tb = new Date(b + "T00:00:00").getTime();
  if (Number.isNaN(ta) || Number.isNaN(tb)) return null;
  return Math.round((tb - ta) / (24 * 3600 * 1000));
}

export async function loadPOOverview(filters: POFilters = {}): Promise<POOverview> {
  const { orgId } = await verifySession();
  const db = await supabaseServer();

  const [monthlyRes, topStoresRes, topProductsRes, allRecentRes] = await Promise.all([
    db.rpc("fn_po_monthly", { p_org_id: orgId }),
    db.rpc("fn_po_top_stores", { p_org_id: orgId, p_limit: 8 }),
    db.rpc("fn_po_top_products", { p_org_id: orgId, p_limit: 10 }),
    db
      .from("purchase_orders")
      .select(
        "id,po_number,order_date,expected_delivery_date,status,total_units_ordered,total_units_received,total_value"
      )
      .eq("org_id", orgId)
      .order("order_date", { ascending: false })
      .limit(200),
  ]);

  if (monthlyRes.error) throw new Error(`fn_po_monthly: ${monthlyRes.error.message}`);
  if (topStoresRes.error) throw new Error(`fn_po_top_stores: ${topStoresRes.error.message}`);
  if (topProductsRes.error) throw new Error(`fn_po_top_products: ${topProductsRes.error.message}`);
  if (allRecentRes.error) throw new Error(`recent POs: ${allRecentRes.error.message}`);

  const monthly: MonthPoint[] = (
    (monthlyRes.data as Array<Record<string, unknown>>) ?? []
  ).map((r) => ({
    monthStart: String(r.month_start),
    poCount: toNum(r.po_count),
    unitsOrdered: toNum(r.units_ordered),
    unitsReceived: toNum(r.units_received),
    value: toNum(r.value),
  }));

  const topStores: TopStore[] = (
    (topStoresRes.data as Array<Record<string, unknown>>) ?? []
  ).map((r) => ({
    id: String(r.store_id),
    name: (r.store_name as string) ?? "—",
    cluster: (r.store_cluster as string) ?? null,
    poCount: toNum(r.po_count),
    units: toNum(r.units),
    value: toNum(r.value),
  }));

  const topProducts: TopProduct[] = (
    (topProductsRes.data as Array<Record<string, unknown>>) ?? []
  ).map((r) => ({
    id: String(r.product_id),
    name: (r.product_name as string) ?? "—",
    category: (r.product_category as string) ?? null,
    poCount: toNum(r.po_count),
    units: toNum(r.units),
    value: toNum(r.value),
  }));

  const allRecent: RecentPO[] = (
    (allRecentRes.data as Array<Record<string, unknown>>) ?? []
  ).map((r) => {
    const ordered = toNum(r.total_units_ordered);
    const received = toNum(r.total_units_received);
    const orderDate = (r.order_date as string) ?? "";
    const expected = (r.expected_delivery_date as string) ?? null;
    const value = toNum(r.total_value);
    return {
      id: String(r.id),
      poNumber: (r.po_number as string) ?? null,
      orderDate,
      expectedDelivery: expected,
      status: (r.status as string) ?? "—",
      unitsOrdered: ordered,
      unitsReceived: received,
      fillRate: ordered > 0 ? received / ordered : null,
      value,
      pendingValue: ordered > 0 ? (value * (ordered - received)) / ordered : 0,
      leadTimeDays: expected ? daysBetween(orderDate, expected) : null,
      lineCount: 0,
    };
  });

  // apply filters in memory (small N) to derive `recent` view
  const searchLower = filters.search?.trim().toLowerCase() ?? "";
  const periodCutoff =
    filters.periodDays != null
      ? new Date(Date.now() - filters.periodDays * 24 * 3600 * 1000)
          .toISOString()
          .slice(0, 10)
      : null;

  const recentFiltered = allRecent.filter((r) => {
    if (filters.status && r.status !== filters.status) return false;
    if (periodCutoff && r.orderDate && r.orderDate < periodCutoff) return false;
    if (searchLower) {
      const hay = `${r.poNumber ?? ""} ${r.id}`.toLowerCase();
      if (!hay.includes(searchLower)) return false;
    }
    return true;
  });

  const recent = recentFiltered.slice(0, 20);

  // line counts for the recent view
  if (recent.length > 0) {
    const ids = recent.map((r) => r.id);
    const linesRes = await db
      .from("purchase_order_lines")
      .select("po_id", { count: "exact", head: false })
      .in("po_id", ids);
    if (!linesRes.error && linesRes.data) {
      const counts = new Map<string, number>();
      for (const row of linesRes.data as Array<{ po_id: string }>) {
        counts.set(String(row.po_id), (counts.get(String(row.po_id)) ?? 0) + 1);
      }
      for (const r of recent) r.lineCount = counts.get(r.id) ?? 0;
    }
  }

  // totals from monthly (histórico completo)
  const totalsAcc = monthly.reduce(
    (acc, m) => {
      acc.poCount += m.poCount;
      acc.unitsOrdered += m.unitsOrdered;
      acc.unitsReceived += m.unitsReceived;
      acc.value += m.value;
      return acc;
    },
    { poCount: 0, unitsOrdered: 0, unitsReceived: 0, value: 0 }
  );

  const avgFillRate =
    totalsAcc.unitsOrdered > 0 ? totalsAcc.unitsReceived / totalsAcc.unitsOrdered : null;

  // pending value (lo que debe el retailer) — sobre todo el universo allRecent
  const pendingValue = allRecent.reduce((a, r) => a + r.pendingValue, 0);
  const activePOs = allRecent.filter(
    (r) => r.status === "pending" || r.status === "partial"
  ).length;

  // OCs con under-fill (fill rate < 90%) sobre OCs cerradas (no pending)
  const underFillCount = allRecent.filter(
    (r) =>
      r.fillRate != null &&
      r.fillRate < 0.9 &&
      r.status !== "pending" &&
      r.status !== "cancelled"
  ).length;

  // Conteo por status para chips
  const statusCounts: Record<"all" | POStatus, number> = {
    all: allRecent.length,
    pending: 0,
    partial: 0,
    fulfilled: 0,
    cancelled: 0,
  };
  for (const r of allRecent) {
    if (r.status in statusCounts) {
      statusCounts[r.status as POStatus] += 1;
    }
  }

  // lead time promedio sobre OCs que tienen expected
  const leadTimes = allRecent
    .map((r) => r.leadTimeDays)
    .filter((d): d is number => d != null && d >= 0 && d <= 90);
  const avgLeadTimeDays =
    leadTimes.length === 0
      ? null
      : leadTimes.reduce((a, b) => a + b, 0) / leadTimes.length;

  // last-30d value/count
  const cutoff30 = new Date(Date.now() - 30 * 24 * 3600 * 1000)
    .toISOString()
    .slice(0, 10);
  const recent30 = allRecent.filter((r) => r.orderDate >= cutoff30);
  const last30dValue = recent30.reduce((a, r) => a + r.value, 0);
  const last30dCount = recent30.length;

  return {
    totals: {
      ...totalsAcc,
      avgFillRate,
      last30dValue,
      last30dCount,
      pendingValue,
      avgLeadTimeDays,
      activePOs,
      underFillCount,
    },
    monthly,
    topStores,
    topProducts,
    recent,
    recentFilteredCount: recentFiltered.length,
    recentTotalCount: allRecent.length,
    statusCounts,
  };
}
