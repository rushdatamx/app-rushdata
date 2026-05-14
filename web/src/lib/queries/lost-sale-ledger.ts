import "server-only";
import { supabaseServer } from "@/lib/supabase/ssr";
import { verifySession } from "@/lib/dal";
import { loadAnchorDate } from "@/lib/period";

export type LostSaleLedger = {
  ytdLostSale: number;
  ytdStockouts: number;
  ytdSince: string;
  monthlySeries: Array<{ monthStart: string; lostSale: number; stockouts: number }>;
  lastMonthLostSale: number;
  prevMonthLostSale: number;
};

function toNum(v: unknown): number {
  if (v == null) return 0;
  const n = typeof v === "string" ? parseFloat(v) : (v as number);
  return Number.isFinite(n) ? n : 0;
}

function isoMonthStart(iso: string): string {
  // "2026-05-13" -> "2026-05-01"
  return iso.slice(0, 7) + "-01";
}

export async function loadLostSaleLedger(): Promise<LostSaleLedger> {
  const { orgId } = await verifySession();
  const db = await supabaseServer();

  // YTD anclado al año del último día con ventas, no al año real del sysclock.
  // Mantiene consistencia con el resto del portal cuando demos usan datos mock.
  const anchor = await loadAnchorDate();
  const anchorYear = Number(anchor.slice(0, 4));
  const yearStart = `${anchorYear}-01-01`;

  const { data, error } = await db
    .from("daily_kpis")
    .select("kpi_date,total_lost_sale_estimate,total_stockouts")
    .eq("org_id", orgId)
    .gte("kpi_date", yearStart)
    .lte("kpi_date", anchor)
    .order("kpi_date", { ascending: true });

  if (error) {
    throw new Error(`loadLostSaleLedger: ${error.message}`);
  }

  const rows = (data ?? []) as Array<{
    kpi_date: string;
    total_lost_sale_estimate: unknown;
    total_stockouts: unknown;
  }>;

  let ytdLostSale = 0;
  let ytdStockouts = 0;
  const monthlyMap = new Map<string, { lostSale: number; stockouts: number }>();

  for (const r of rows) {
    const lost = toNum(r.total_lost_sale_estimate);
    const sto = toNum(r.total_stockouts);
    ytdLostSale += lost;
    ytdStockouts += sto;
    const m = isoMonthStart(r.kpi_date);
    const cur = monthlyMap.get(m) ?? { lostSale: 0, stockouts: 0 };
    cur.lostSale += lost;
    cur.stockouts += sto;
    monthlyMap.set(m, cur);
  }

  const monthlySeries = Array.from(monthlyMap.entries())
    .map(([monthStart, v]) => ({ monthStart, ...v }))
    .sort((a, b) => a.monthStart.localeCompare(b.monthStart));

  const lastMonthLostSale =
    monthlySeries.length > 0 ? monthlySeries[monthlySeries.length - 1].lostSale : 0;
  const prevMonthLostSale =
    monthlySeries.length > 1 ? monthlySeries[monthlySeries.length - 2].lostSale : 0;

  return {
    ytdLostSale,
    ytdStockouts,
    ytdSince: yearStart,
    monthlySeries,
    lastMonthLostSale,
    prevMonthLostSale,
  };
}
