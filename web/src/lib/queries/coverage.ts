import "server-only";
import { supabaseServer } from "@/lib/supabase/ssr";
import { verifySession } from "@/lib/dal";

export type CoverageCell = {
  storeId: string;
  productId: string;
  inventory: number;
  velocity: number;
  ddi: number | null;
  hasStockout: boolean;
};

export type CoverageStore = {
  id: string;
  name: string;
  cluster: string | null;
  region: string | null;
  city: string | null;
  isCedis: boolean;
};

export type CoverageProduct = {
  id: string;
  name: string;
  category: string | null;
  upc: string | null;
  unitPrice: number;
};

export type CoverageData = {
  stores: CoverageStore[];
  products: CoverageProduct[];
  cells: CoverageCell[];
  clusters: string[];
  regions: string[];
  categories: string[];
  totals: {
    storeCount: number;
    productCount: number;
    coverageRate: number;       // % de celdas con inventario > 0
    stockoutCount: number;
    stockoutRate: number;       // % de celdas con stockout activo
  };
};

function toNum(v: unknown): number {
  if (v == null) return 0;
  const n = typeof v === "string" ? parseFloat(v) : (v as number);
  return Number.isFinite(n) ? n : 0;
}

export async function loadCoverageMatrix(): Promise<CoverageData> {
  const { orgId } = await verifySession();
  const db = await supabaseServer();

  const [storesRes, productsRes, ivRes] = await Promise.all([
    db
      .from("stores")
      .select("id,name,cluster,region,city,is_cedis,active")
      .eq("org_id", orgId)
      .eq("active", true)
      .order("name"),
    db
      .from("products")
      .select("id,name,category,upc,unit_price,active")
      .eq("org_id", orgId)
      .eq("active", true)
      .order("name"),
    db
      .from("vw_inventory_with_velocity")
      .select("store_id,product_id,current_inventory,velocity_daily,days_of_inventory")
      .eq("org_id", orgId),
  ]);

  if (storesRes.error) throw new Error(`coverage stores: ${storesRes.error.message}`);
  if (productsRes.error) throw new Error(`coverage products: ${productsRes.error.message}`);
  if (ivRes.error) throw new Error(`coverage inventory: ${ivRes.error.message}`);

  const stores: CoverageStore[] = (
    (storesRes.data ?? []) as Array<Record<string, unknown>>
  ).map((s) => ({
    id: String(s.id),
    name: (s.name as string) ?? "—",
    cluster: (s.cluster as string) ?? null,
    region: (s.region as string) ?? null,
    city: (s.city as string) ?? null,
    isCedis: Boolean(s.is_cedis),
  }));

  const products: CoverageProduct[] = (
    (productsRes.data ?? []) as Array<Record<string, unknown>>
  ).map((p) => ({
    id: String(p.id),
    name: (p.name as string) ?? "—",
    category: (p.category as string) ?? null,
    upc: (p.upc as string) ?? null,
    unitPrice: toNum(p.unit_price),
  }));

  const cells: CoverageCell[] = (
    (ivRes.data ?? []) as Array<Record<string, unknown>>
  ).map((r) => {
    const inventory = toNum(r.current_inventory);
    const velocity = toNum(r.velocity_daily);
    const ddiRaw = r.days_of_inventory;
    const ddi = ddiRaw == null ? null : toNum(ddiRaw);
    const hasStockout = inventory <= 0 && velocity > 0;
    return {
      storeId: String(r.store_id),
      productId: String(r.product_id),
      inventory,
      velocity,
      ddi,
      hasStockout,
    };
  });

  const clusters = Array.from(
    new Set(stores.map((s) => s.cluster).filter((c): c is string => !!c))
  ).sort();
  const regions = Array.from(
    new Set(stores.map((s) => s.region).filter((r): r is string => !!r))
  ).sort();
  const categories = Array.from(
    new Set(products.map((p) => p.category).filter((c): c is string => !!c))
  ).sort();

  const totalCells = stores.length * products.length;
  const cellsWithInv = cells.filter((c) => c.inventory > 0).length;
  const stockoutCount = cells.filter((c) => c.hasStockout).length;

  return {
    stores,
    products,
    cells,
    clusters,
    regions,
    categories,
    totals: {
      storeCount: stores.length,
      productCount: products.length,
      coverageRate: totalCells > 0 ? cellsWithInv / totalCells : 0,
      stockoutCount,
      stockoutRate: totalCells > 0 ? stockoutCount / totalCells : 0,
    },
  };
}
