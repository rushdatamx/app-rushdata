import "server-only";
import { supabaseServer } from "@/lib/supabase/ssr";
import { verifySession } from "@/lib/dal";

export type StoreDetail = {
  store: {
    id: string;
    externalCode: string | null;
    name: string;
    city: string | null;
    state: string | null;
    region: string | null;
    cluster: string | null;
    isCedis: boolean;
  };
  skus: Array<{
    productId: string;
    name: string;
    category: string | null;
    sizeGrams: number | null;
    unitPrice: number;
    inventory: number;
    velocity: number;
    ddi: number | null;
    units30d: number;
    revenue30d: number;
    hasStockout: boolean;
    hasPendingSuggestion: boolean;
    weekly: Array<{ weekStart: string; units: number }>;
  }>;
  suggestions: Array<{
    id: string;
    productName: string;
    suggestedUnits: number;
    suggestedCases: number;
    ddi: number | null;
    lostSale: number;
    reasonCode: string | null;
  }>;
  recentPOs: Array<{
    id: string;
    poNumber: string | null;
    orderDate: string;
    expectedDelivery: string | null;
    status: string;
    unitsOrdered: number;
    unitsReceived: number;
    value: number;
    leadTimeDays: number | null;
  }>;
  totals: {
    skusActive: number;
    skusInStock: number;
    stockouts: number;
    pendingSuggestions: number;
    inventoryUnits: number;
    inventoryValue: number;
    revenue30d: number;
    avgFillRate: number | null;
    avgLeadTimeDays: number | null;
  };
};

function toNum(v: unknown): number {
  if (v == null) return 0;
  const n = typeof v === "string" ? parseFloat(v) : (v as number);
  return Number.isFinite(n) ? n : 0;
}

export async function loadStoreDetail(storeId: string): Promise<StoreDetail | null> {
  const { orgId } = await verifySession();
  const db = await supabaseServer();

  const storeRes = await db
    .from("stores")
    .select("id,external_code,name,city,state,region,cluster,is_cedis,active")
    .eq("org_id", orgId)
    .eq("id", storeId)
    .maybeSingle();

  if (storeRes.error) throw new Error(`store: ${storeRes.error.message}`);
  if (!storeRes.data) return null;

  const s = storeRes.data;

  const [skusRes, weeklyRes, sugsRes, posRes] = await Promise.all([
    db.rpc("fn_store_detail_skus", { p_org_id: orgId, p_store_id: storeId }),
    db.rpc("fn_store_product_weekly", { p_org_id: orgId, p_store_id: storeId, p_weeks: 8 }),
    db
      .from("suggested_orders")
      .select(
        "id,suggested_units,suggested_cases,current_ddi,estimated_lost_sale,reason_code,products(name)"
      )
      .eq("org_id", orgId)
      .eq("store_id", storeId)
      .eq("status", "new")
      .order("estimated_lost_sale", { ascending: false, nullsFirst: false }),
    db
      .from("purchase_order_lines")
      .select(
        "po_id,units_ordered,units_received,purchase_orders!inner(id,po_number,order_date,expected_delivery_date,status,total_value)"
      )
      .eq("store_id", storeId)
      .order("po_id", { ascending: false })
      .limit(50),
  ]);

  if (skusRes.error) throw new Error(`fn_store_detail_skus: ${skusRes.error.message}`);
  if (weeklyRes.error) throw new Error(`fn_store_product_weekly: ${weeklyRes.error.message}`);
  if (sugsRes.error) throw new Error(`suggestions: ${sugsRes.error.message}`);
  if (posRes.error) throw new Error(`pos: ${posRes.error.message}`);

  const weeklyMap = new Map<string, Array<{ weekStart: string; units: number }>>();
  for (const w of (weeklyRes.data as Array<Record<string, unknown>>) ?? []) {
    const pid = String(w.product_id);
    const arr = weeklyMap.get(pid) ?? [];
    arr.push({ weekStart: String(w.week_start), units: toNum(w.units) });
    weeklyMap.set(pid, arr);
  }

  const skus = ((skusRes.data ?? []) as Array<Record<string, unknown>>).map((r) => ({
    productId: String(r.product_id),
    name: (r.product_name as string) ?? "—",
    category: (r.product_category as string) ?? null,
    sizeGrams: r.product_size_grams == null ? null : toNum(r.product_size_grams),
    unitPrice: toNum(r.unit_price),
    inventory: toNum(r.current_inventory),
    velocity: toNum(r.velocity_daily),
    ddi: r.ddi == null ? null : toNum(r.ddi),
    units30d: toNum(r.units_30d),
    revenue30d: toNum(r.revenue_30d),
    hasStockout: Boolean(r.has_stockout),
    hasPendingSuggestion: Boolean(r.has_pending_suggestion),
    weekly: weeklyMap.get(String(r.product_id)) ?? [],
  }));

  const suggestions = ((sugsRes.data ?? []) as Array<Record<string, unknown>>).map((r) => ({
    id: String(r.id),
    productName: (r.products as { name?: string } | null)?.name ?? "—",
    suggestedUnits: toNum(r.suggested_units),
    suggestedCases: toNum(r.suggested_cases),
    ddi: r.current_ddi == null ? null : toNum(r.current_ddi),
    lostSale: toNum(r.estimated_lost_sale),
    reasonCode: (r.reason_code as string) ?? null,
  }));

  // Agregar líneas → resumen por PO
  const poMap = new Map<
    string,
    {
      id: string;
      poNumber: string | null;
      orderDate: string;
      expectedDelivery: string | null;
      status: string;
      unitsOrdered: number;
      unitsReceived: number;
      value: number;
      leadTimeDays: number | null;
    }
  >();
  for (const row of (posRes.data ?? []) as Array<Record<string, unknown>>) {
    const po = row.purchase_orders as Record<string, unknown> | null;
    if (!po) continue;
    const pid = String(po.id);
    const existing = poMap.get(pid);
    if (existing) {
      existing.unitsOrdered += toNum(row.units_ordered);
      existing.unitsReceived += toNum(row.units_received);
    } else {
      const orderDate = (po.order_date as string) ?? "";
      const expected = (po.expected_delivery_date as string) ?? null;
      let leadTimeDays: number | null = null;
      if (orderDate && expected) {
        const ta = new Date(orderDate + "T00:00:00").getTime();
        const tb = new Date(expected + "T00:00:00").getTime();
        if (Number.isFinite(ta) && Number.isFinite(tb)) {
          const d = Math.round((tb - ta) / (24 * 3600 * 1000));
          if (d >= 0 && d <= 90) leadTimeDays = d;
        }
      }
      poMap.set(pid, {
        id: pid,
        poNumber: (po.po_number as string) ?? null,
        orderDate,
        expectedDelivery: expected,
        status: (po.status as string) ?? "—",
        unitsOrdered: toNum(row.units_ordered),
        unitsReceived: toNum(row.units_received),
        value: toNum(po.total_value),
        leadTimeDays,
      });
    }
  }
  const allPOs = Array.from(poMap.values()).sort((a, b) =>
    a.orderDate < b.orderDate ? 1 : -1
  );
  const recentPOs = allPOs.slice(0, 10);

  // Métricas agregadas de OCs históricas a esta tienda
  const totalOrdered = allPOs.reduce((a, p) => a + p.unitsOrdered, 0);
  const totalReceived = allPOs.reduce((a, p) => a + p.unitsReceived, 0);
  const avgFillRate = totalOrdered > 0 ? totalReceived / totalOrdered : null;
  const leadTimes = allPOs
    .map((p) => p.leadTimeDays)
    .filter((d): d is number => d != null);
  const avgLeadTimeDays =
    leadTimes.length > 0
      ? leadTimes.reduce((a, b) => a + b, 0) / leadTimes.length
      : null;

  // Inventario valuado: usar precio (fallback a 0) — proxy razonable a nivel tienda
  // Idealmente vendría de daily_kpis pero esa tabla no tiene granularidad por tienda.
  const inventoryValue = skus.reduce(
    (a, k) => a + k.inventory * k.unitPrice,
    0
  );

  const totals = {
    skusActive: skus.length,
    skusInStock: skus.filter((k) => k.inventory > 0).length,
    stockouts: skus.filter((k) => k.hasStockout).length,
    pendingSuggestions: suggestions.length,
    inventoryUnits: skus.reduce((a, k) => a + k.inventory, 0),
    inventoryValue,
    revenue30d: skus.reduce((a, k) => a + k.revenue30d, 0),
    avgFillRate,
    avgLeadTimeDays,
  };

  return {
    store: {
      id: String(s.id),
      externalCode: (s.external_code as string) ?? null,
      name: (s.name as string) ?? "—",
      city: (s.city as string) ?? null,
      state: (s.state as string) ?? null,
      region: (s.region as string) ?? null,
      cluster: (s.cluster as string) ?? null,
      isCedis: Boolean(s.is_cedis),
    },
    skus,
    suggestions,
    recentPOs,
    totals,
  };
}
