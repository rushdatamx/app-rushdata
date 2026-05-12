import "server-only";
import { supabaseServer } from "@/lib/supabase/ssr";
import { verifySession } from "@/lib/dal";

export type ProductDetail = {
  product: {
    id: string;
    upc: string | null;
    name: string;
    category: string | null;
    subcategory: string | null;
    sizeGrams: number | null;
    unitPrice: number;
    unitCost: number;
  };
  weekly: Array<{ weekStart: string; units: number; revenue: number }>;
  stores: Array<{
    storeId: string;
    name: string;
    cluster: string | null;
    city: string | null;
    inventory: number;
    velocity: number;
    ddi: number | null;
    units30d: number;
    revenue30d: number;
    hasStockout: boolean;
    hasPendingSuggestion: boolean;
  }>;
  suggestions: Array<{
    id: string;
    storeName: string;
    storeCluster: string | null;
    suggestedUnits: number;
    suggestedCases: number;
    ddi: number | null;
    lostSale: number;
    reasonCode: string | null;
  }>;
  totals: {
    storesWithInventory: number;
    storesWithStockout: number;
    pendingSuggestions: number;
    inventoryUnits: number;
    units30d: number;
    revenue30d: number;
  };
};

function toNum(v: unknown): number {
  if (v == null) return 0;
  const n = typeof v === "string" ? parseFloat(v) : (v as number);
  return Number.isFinite(n) ? n : 0;
}

export async function loadProductDetail(productId: string): Promise<ProductDetail | null> {
  const { orgId } = await verifySession();
  const db = await supabaseServer();

  const productRes = await db
    .from("products")
    .select("id,upc,name,category,subcategory,size_grams,unit_price,unit_cost,active")
    .eq("org_id", orgId)
    .eq("id", productId)
    .maybeSingle();

  if (productRes.error) throw new Error(`product: ${productRes.error.message}`);
  if (!productRes.data) return null;

  const p = productRes.data;

  const [storesRes, weeklyRes, sugsRes] = await Promise.all([
    db.rpc("fn_product_detail_stores", { p_org_id: orgId, p_product_id: productId }),
    // Reusamos la weekly global y filtramos por producto en memoria — alternativa más correcta sería una fn dedicada,
    // pero 17 meses × 1 producto cabe sin problema
    db.rpc("fn_product_weekly_sales", { p_org_id: orgId, p_weeks: 72 }),
    db
      .from("suggested_orders")
      .select(
        "id,suggested_units,suggested_cases,current_ddi,estimated_lost_sale,reason_code,stores(name,cluster)"
      )
      .eq("org_id", orgId)
      .eq("product_id", productId)
      .eq("status", "new")
      .order("estimated_lost_sale", { ascending: false, nullsFirst: false }),
  ]);

  if (storesRes.error) throw new Error(`fn_product_detail_stores: ${storesRes.error.message}`);
  if (weeklyRes.error) throw new Error(`fn_product_weekly_sales: ${weeklyRes.error.message}`);
  if (sugsRes.error) throw new Error(`suggestions: ${sugsRes.error.message}`);

  const weekly = ((weeklyRes.data ?? []) as Array<Record<string, unknown>>)
    .filter((r) => String(r.product_id) === productId)
    .map((r) => ({
      weekStart: String(r.week_start),
      units: toNum(r.units),
      revenue: toNum(r.revenue),
    }));

  const stores = ((storesRes.data ?? []) as Array<Record<string, unknown>>).map((r) => ({
    storeId: String(r.store_id),
    name: (r.store_name as string) ?? "—",
    cluster: (r.store_cluster as string) ?? null,
    city: (r.store_city as string) ?? null,
    inventory: toNum(r.current_inventory),
    velocity: toNum(r.velocity_daily),
    ddi: r.ddi == null ? null : toNum(r.ddi),
    units30d: toNum(r.units_30d),
    revenue30d: toNum(r.revenue_30d),
    hasStockout: Boolean(r.has_stockout),
    hasPendingSuggestion: Boolean(r.has_pending_suggestion),
  }));

  const suggestions = ((sugsRes.data ?? []) as Array<Record<string, unknown>>).map((r) => {
    const store = (r.stores as { name?: string; cluster?: string | null } | null) ?? null;
    return {
      id: String(r.id),
      storeName: store?.name ?? "—",
      storeCluster: store?.cluster ?? null,
      suggestedUnits: toNum(r.suggested_units),
      suggestedCases: toNum(r.suggested_cases),
      ddi: r.current_ddi == null ? null : toNum(r.current_ddi),
      lostSale: toNum(r.estimated_lost_sale),
      reasonCode: (r.reason_code as string) ?? null,
    };
  });

  const totals = {
    storesWithInventory: stores.filter((s) => s.inventory > 0).length,
    storesWithStockout: stores.filter((s) => s.hasStockout).length,
    pendingSuggestions: suggestions.length,
    inventoryUnits: stores.reduce((a, s) => a + s.inventory, 0),
    units30d: stores.reduce((a, s) => a + s.units30d, 0),
    revenue30d: stores.reduce((a, s) => a + s.revenue30d, 0),
  };

  return {
    product: {
      id: String(p.id),
      upc: (p.upc as string) ?? null,
      name: (p.name as string) ?? "—",
      category: (p.category as string) ?? null,
      subcategory: (p.subcategory as string) ?? null,
      sizeGrams: p.size_grams == null ? null : toNum(p.size_grams),
      unitPrice: toNum(p.unit_price),
      unitCost: toNum(p.unit_cost),
    },
    weekly,
    stores,
    suggestions,
    totals,
  };
}
