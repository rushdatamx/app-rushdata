import "server-only";
import { supabaseServer } from "@/lib/supabase/ssr";
import { verifySession } from "@/lib/dal";

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
  };
  monthly: MonthPoint[];
  topStores: TopStore[];
  topProducts: TopProduct[];
  recent: RecentPO[];
};

function toNum(v: unknown): number {
  if (v == null) return 0;
  const n = typeof v === "string" ? parseFloat(v) : (v as number);
  return Number.isFinite(n) ? n : 0;
}

export async function loadPOOverview(): Promise<POOverview> {
  const { orgId } = await verifySession();
  const db = await supabaseServer();

  const [monthlyRes, topStoresRes, topProductsRes, recentRes] = await Promise.all([
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
      .limit(15),
  ]);

  if (monthlyRes.error) throw new Error(`fn_po_monthly: ${monthlyRes.error.message}`);
  if (topStoresRes.error) throw new Error(`fn_po_top_stores: ${topStoresRes.error.message}`);
  if (topProductsRes.error) throw new Error(`fn_po_top_products: ${topProductsRes.error.message}`);
  if (recentRes.error) throw new Error(`recent POs: ${recentRes.error.message}`);

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

  const recent: RecentPO[] = (
    (recentRes.data as Array<Record<string, unknown>>) ?? []
  ).map((r) => {
    const ordered = toNum(r.total_units_ordered);
    const received = toNum(r.total_units_received);
    return {
      id: String(r.id),
      poNumber: (r.po_number as string) ?? null,
      orderDate: (r.order_date as string) ?? "",
      expectedDelivery: (r.expected_delivery_date as string) ?? null,
      status: (r.status as string) ?? "—",
      unitsOrdered: ordered,
      unitsReceived: received,
      fillRate: ordered > 0 ? received / ordered : null,
      value: toNum(r.total_value),
      lineCount: 0,
    };
  });

  // line counts per recent PO (one extra query, small batch)
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

  // totals
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

  // last-30d value/count: sum monthly buckets that fall within last 30 days proxy
  // (más preciso usar fechas individuales, hacemos query corta)
  const last30Res = await db
    .from("purchase_orders")
    .select("total_value,id", { count: "exact" })
    .eq("org_id", orgId)
    .gte(
      "order_date",
      new Date(Date.now() - 30 * 24 * 3600 * 1000).toISOString().slice(0, 10)
    );

  const last30dValue = (last30Res.data ?? []).reduce(
    (acc, r) => acc + toNum((r as Record<string, unknown>).total_value),
    0
  );
  const last30dCount = last30Res.count ?? (last30Res.data?.length ?? 0);

  return {
    totals: {
      ...totalsAcc,
      avgFillRate,
      last30dValue,
      last30dCount,
    },
    monthly,
    topStores,
    topProducts,
    recent,
  };
}
