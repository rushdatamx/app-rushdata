import "server-only";
import { supabaseServer } from "@/lib/supabase/ssr";
import { verifySession } from "@/lib/dal";

export type HomeStats = {
  avgDdi: number | null;
  activeStores: number;
  activeProducts: number;
};

function toNum(v: unknown): number {
  if (v == null) return 0;
  const n = typeof v === "string" ? parseFloat(v) : (v as number);
  return Number.isFinite(n) ? n : 0;
}

export async function loadHomeStats(): Promise<HomeStats> {
  const { orgId } = await verifySession();
  const db = await supabaseServer();

  const [storesRes, productsRes, inventoryRes] = await Promise.all([
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
  ]);

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

  return {
    avgDdi,
    activeStores: storesRes.count ?? 0,
    activeProducts: productsRes.count ?? 0,
  };
}
