import "server-only";
import { supabaseServer } from "@/lib/supabase/ssr";
import { verifySession } from "@/lib/dal";

/**
 * Pivot builder data source.
 *
 * Devuelve un dataset normalizado de hechos (sales + inventario) joinado con
 * dimensiones (producto, tienda) en memoria. El cliente decide cómo agruparlo
 * y qué métricas calcular.
 *
 * Dataset máximo: ~30 productos × ~70 tiendas × ~30 meses = ~63k filas si se
 * piden TODOS los productos × tiendas × meses. Realistic: ≤ 5k filas
 * después de filtros. Manejable client-side.
 */

export type ReportFact = {
  productId: string;
  productName: string;
  productCategory: string | null;
  storeId: string;
  storeName: string;
  storeCluster: string | null;
  storeRegion: string | null;
  month: string; // YYYY-MM-01
  units: number;
  revenue: number;
  /** Inventario al snapshot más reciente (no respeta período, es estado actual). */
  currentInventory: number;
};

export type ReportFilterValues = {
  categories: string[];
  clusters: string[];
  regions: string[];
};

export type LoadReportsOptions = {
  start?: string;
  end?: string;
  categoryFilter?: string;
  clusterFilter?: string;
  regionFilter?: string;
};

function toNum(v: unknown): number {
  if (v == null) return 0;
  const n = typeof v === "string" ? parseFloat(v) : (v as number);
  return Number.isFinite(n) ? n : 0;
}

function monthBucket(iso: string): string {
  return iso.slice(0, 7) + "-01";
}

export async function loadReports(
  opts: LoadReportsOptions = {}
): Promise<{ facts: ReportFact[]; filters: ReportFilterValues }> {
  const { orgId } = await verifySession();
  const db = await supabaseServer();

  const [productsRes, storesRes, salesRes, invRes] = await Promise.all([
    db
      .from("products")
      .select("id,name,category")
      .eq("org_id", orgId)
      .eq("active", true),
    db
      .from("stores")
      .select("id,name,cluster,region,is_cedis,active")
      .eq("org_id", orgId)
      .eq("active", true),
    db
      .from("sales")
      .select("sale_date,store_id,product_id,units,revenue_no_tax")
      .eq("org_id", orgId)
      .gte("sale_date", opts.start ?? "1900-01-01")
      .lte("sale_date", opts.end ?? "2999-12-31"),
    db
      .from("vw_latest_inventory")
      .select("store_id,product_id,current_inventory")
      .eq("org_id", orgId),
  ]);

  if (productsRes.error) throw new Error(`reports products: ${productsRes.error.message}`);
  if (storesRes.error) throw new Error(`reports stores: ${storesRes.error.message}`);
  if (salesRes.error) throw new Error(`reports sales: ${salesRes.error.message}`);
  if (invRes.error) throw new Error(`reports inv: ${invRes.error.message}`);

  type ProductLite = { id: string; name: string; category: string | null };
  type StoreLite = {
    id: string;
    name: string;
    cluster: string | null;
    region: string | null;
    isCedis: boolean;
  };

  const productMap = new Map<string, ProductLite>();
  const categories = new Set<string>();
  for (const p of (productsRes.data ?? []) as Array<Record<string, unknown>>) {
    const cat = (p.category as string) ?? null;
    if (cat) categories.add(cat);
    if (opts.categoryFilter && cat !== opts.categoryFilter) continue;
    productMap.set(String(p.id), {
      id: String(p.id),
      name: (p.name as string) ?? "—",
      category: cat,
    });
  }

  const storeMap = new Map<string, StoreLite>();
  const clusters = new Set<string>();
  const regions = new Set<string>();
  for (const s of (storesRes.data ?? []) as Array<Record<string, unknown>>) {
    const cluster = (s.cluster as string) ?? null;
    const region = (s.region as string) ?? null;
    if (cluster) clusters.add(cluster);
    if (region) regions.add(region);
    if (s.is_cedis) continue;
    if (opts.clusterFilter && cluster !== opts.clusterFilter) continue;
    if (opts.regionFilter && region !== opts.regionFilter) continue;
    storeMap.set(String(s.id), {
      id: String(s.id),
      name: (s.name as string) ?? "—",
      cluster,
      region,
      isCedis: false,
    });
  }

  // Agregar (productId, storeId, month) → units/revenue
  type FactAcc = { units: number; revenue: number };
  const factMap = new Map<string, FactAcc>();

  for (const r of (salesRes.data ?? []) as Array<{
    sale_date: string;
    store_id: string;
    product_id: string;
    units: unknown;
    revenue_no_tax: unknown;
  }>) {
    if (!productMap.has(r.product_id)) continue;
    if (!storeMap.has(r.store_id)) continue;
    const key = `${r.product_id}::${r.store_id}::${monthBucket(r.sale_date)}`;
    let acc = factMap.get(key);
    if (!acc) {
      acc = { units: 0, revenue: 0 };
      factMap.set(key, acc);
    }
    acc.units += toNum(r.units);
    acc.revenue += toNum(r.revenue_no_tax);
  }

  // Inventory map: por (product, store) latest
  const invMap = new Map<string, number>();
  for (const r of (invRes.data ?? []) as Array<{
    store_id: string;
    product_id: string;
    current_inventory: unknown;
  }>) {
    invMap.set(`${r.product_id}::${r.store_id}`, toNum(r.current_inventory));
  }

  const facts: ReportFact[] = [];
  for (const [key, acc] of factMap.entries()) {
    const [productId, storeId, month] = key.split("::");
    const product = productMap.get(productId);
    const store = storeMap.get(storeId);
    if (!product || !store) continue;
    facts.push({
      productId,
      productName: product.name,
      productCategory: product.category,
      storeId,
      storeName: store.name,
      storeCluster: store.cluster,
      storeRegion: store.region,
      month,
      units: acc.units,
      revenue: acc.revenue,
      currentInventory: invMap.get(`${productId}::${storeId}`) ?? 0,
    });
  }

  return {
    facts,
    filters: {
      categories: Array.from(categories).sort(),
      clusters: Array.from(clusters).sort(),
      regions: Array.from(regions).sort(),
    },
  };
}
