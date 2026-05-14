import "server-only";
import { supabaseServer } from "@/lib/supabase/ssr";
import { verifySession } from "@/lib/dal";
import { loadAnchorDate } from "@/lib/period";

export type SuggestionsTrendPoint = {
  date: string;
  lostSale: number;
  count: number;
};

function toNum(v: unknown): number {
  if (v == null) return 0;
  const n = typeof v === "string" ? parseFloat(v) : (v as number);
  return Number.isFinite(n) ? n : 0;
}

function buildDateRangeEnding(endIso: string, days: number): string[] {
  const out: string[] = [];
  const end = new Date(endIso + "T00:00:00Z");
  for (let i = days - 1; i >= 0; i--) {
    const d = new Date(end);
    d.setUTCDate(end.getUTCDate() - i);
    out.push(d.toISOString().slice(0, 10));
  }
  return out;
}

/**
 * Trend de venta perdida acumulada por día (últimos N días).
 * Anclada al anchor (max(sale_date)) para que demos con mock estáticos
 * no muestren ventana vacía.
 */
export async function loadSuggestionsTrend(days = 14): Promise<SuggestionsTrendPoint[]> {
  const { orgId } = await verifySession();
  const db = await supabaseServer();
  const anchor = await loadAnchorDate();
  const range = buildDateRangeEnding(anchor, days);
  const since = range[0];

  const { data } = await db
    .from("stockout_alerts")
    .select("alert_date,lost_sale_estimate")
    .eq("org_id", orgId)
    .gte("alert_date", since)
    .lte("alert_date", anchor);

  const lostByDate = new Map<string, number>();
  const countByDate = new Map<string, number>();
  for (const r of (data ?? []) as Array<{
    alert_date: string;
    lost_sale_estimate: unknown;
  }>) {
    lostByDate.set(
      r.alert_date,
      (lostByDate.get(r.alert_date) ?? 0) + toNum(r.lost_sale_estimate)
    );
    countByDate.set(r.alert_date, (countByDate.get(r.alert_date) ?? 0) + 1);
  }

  return range.map((date) => ({
    date,
    lostSale: lostByDate.get(date) ?? 0,
    count: countByDate.get(date) ?? 0,
  }));
}

export async function loadAvailableClusters(): Promise<string[]> {
  const { orgId } = await verifySession();
  const db = await supabaseServer();
  const { data } = await db
    .from("stores")
    .select("cluster")
    .eq("org_id", orgId)
    .eq("active", true)
    .not("cluster", "is", null);
  const set = new Set<string>();
  for (const r of (data ?? []) as Array<{ cluster: string | null }>) {
    if (r.cluster) set.add(r.cluster);
  }
  return Array.from(set).sort();
}
