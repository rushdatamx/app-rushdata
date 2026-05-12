import "server-only";
import { supabaseServer } from "@/lib/supabase/ssr";
import { verifySession } from "@/lib/dal";

export type ProductRow = {
  id: string;
  upc: string | null;
  name: string;
  category: string | null;
  subcategory: string | null;
  sizeGrams: number | null;
  unitPrice: number;
  unitCost: number;
  storesWithInventory: number;
  storesWithStockout: number;
  inventoryUnits: number;
  units30d: number;
  revenue30d: number;
  weekly: Array<{ weekStart: string; units: number; revenue: number }>;
};

function toNum(v: unknown): number {
  if (v == null) return 0;
  const n = typeof v === "string" ? parseFloat(v) : (v as number);
  return Number.isFinite(n) ? n : 0;
}

export async function loadProducts(): Promise<{
  rows: ProductRow[];
  totals: { count: number; revenue30d: number; stockouts: number; inventoryUnits: number };
}> {
  const { orgId } = await verifySession();
  const db = await supabaseServer();

  const [productsRes, kpisRes, weeklyRes] = await Promise.all([
    db
      .from("products")
      .select("id,upc,name,category,subcategory,size_grams,unit_price,unit_cost")
      .eq("org_id", orgId)
      .eq("active", true)
      .order("name"),
    db.rpc("fn_product_kpis", { p_org_id: orgId }),
    db.rpc("fn_product_weekly_sales", { p_org_id: orgId, p_weeks: 8 }),
  ]);

  if (productsRes.error) throw new Error(`products: ${productsRes.error.message}`);
  if (kpisRes.error) throw new Error(`fn_product_kpis: ${kpisRes.error.message}`);
  if (weeklyRes.error) throw new Error(`fn_product_weekly_sales: ${weeklyRes.error.message}`);

  const productsRows = (productsRes.data ?? []) as Array<Record<string, unknown>>;

  const kpiMap = new Map<string, Record<string, unknown>>();
  for (const k of (kpisRes.data as Array<Record<string, unknown>>) ?? []) {
    kpiMap.set(String(k.product_id), k);
  }

  const weeklyMap = new Map<string, Array<{ weekStart: string; units: number; revenue: number }>>();
  for (const w of (weeklyRes.data as Array<Record<string, unknown>>) ?? []) {
    const pid = String(w.product_id);
    const arr = weeklyMap.get(pid) ?? [];
    arr.push({
      weekStart: String(w.week_start),
      units: toNum(w.units),
      revenue: toNum(w.revenue),
    });
    weeklyMap.set(pid, arr);
  }

  const rows: ProductRow[] = productsRows.map((p) => {
    const k = kpiMap.get(String(p.id));
    return {
      id: String(p.id),
      upc: (p.upc as string) ?? null,
      name: (p.name as string) ?? "—",
      category: (p.category as string) ?? null,
      subcategory: (p.subcategory as string) ?? null,
      sizeGrams: p.size_grams == null ? null : toNum(p.size_grams),
      unitPrice: toNum(p.unit_price),
      unitCost: toNum(p.unit_cost),
      storesWithInventory: k ? toNum(k.stores_with_inventory) : 0,
      storesWithStockout: k ? toNum(k.stores_with_stockout) : 0,
      inventoryUnits: k ? toNum(k.inventory_units) : 0,
      units30d: k ? toNum(k.units_last_30d) : 0,
      revenue30d: k ? toNum(k.revenue_last_30d) : 0,
      weekly: weeklyMap.get(String(p.id)) ?? [],
    };
  });

  rows.sort((a, b) => b.revenue30d - a.revenue30d);

  const totals = rows.reduce(
    (acc, p) => {
      acc.count += 1;
      acc.revenue30d += p.revenue30d;
      acc.stockouts += p.storesWithStockout;
      acc.inventoryUnits += p.inventoryUnits;
      return acc;
    },
    { count: 0, revenue30d: 0, stockouts: 0, inventoryUnits: 0 }
  );

  return { rows, totals };
}
