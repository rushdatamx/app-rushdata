import "server-only";
import { supabaseServer } from "@/lib/supabase/ssr";
import { verifySession } from "@/lib/dal";

export type DailyPoint = {
  date: string;
  capturedSale: number;
  lostSale: number;
};

function toNum(v: unknown): number {
  if (v == null) return 0;
  const n = typeof v === "string" ? parseFloat(v) : (v as number);
  return Number.isFinite(n) ? n : 0;
}

function buildDateRangeBetween(startIso: string, endIso: string): string[] {
  const out: string[] = [];
  const start = new Date(startIso + "T00:00:00Z");
  const end = new Date(endIso + "T00:00:00Z");
  for (let d = new Date(start); d <= end; d.setUTCDate(d.getUTCDate() + 1)) {
    out.push(d.toISOString().slice(0, 10));
  }
  return out;
}

/**
 * Carga la serie diaria de captured vs lost sale entre dos fechas (inclusive).
 */
export async function loadHomeTimeSeries(
  startIso: string,
  endIso: string
): Promise<DailyPoint[]> {
  const { orgId } = await verifySession();
  const db = await supabaseServer();

  const [salesRes, alertsRes] = await Promise.all([
    db
      .from("sales")
      .select("sale_date,revenue_no_tax")
      .eq("org_id", orgId)
      .gte("sale_date", startIso)
      .lte("sale_date", endIso),
    db
      .from("stockout_alerts")
      .select("alert_date,lost_sale_estimate")
      .eq("org_id", orgId)
      .gte("alert_date", startIso)
      .lte("alert_date", endIso),
  ]);

  const captured = new Map<string, number>();
  for (const r of (salesRes.data ?? []) as Array<{
    sale_date: string;
    revenue_no_tax: unknown;
  }>) {
    captured.set(
      r.sale_date,
      (captured.get(r.sale_date) ?? 0) + toNum(r.revenue_no_tax)
    );
  }

  const lost = new Map<string, number>();
  for (const r of (alertsRes.data ?? []) as Array<{
    alert_date: string;
    lost_sale_estimate: unknown;
  }>) {
    lost.set(
      r.alert_date,
      (lost.get(r.alert_date) ?? 0) + toNum(r.lost_sale_estimate)
    );
  }

  return buildDateRangeBetween(startIso, endIso).map((date) => ({
    date,
    capturedSale: captured.get(date) ?? 0,
    lostSale: lost.get(date) ?? 0,
  }));
}
