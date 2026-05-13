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

function isoDaysAgo(days: number): string {
  const d = new Date();
  d.setUTCHours(0, 0, 0, 0);
  d.setUTCDate(d.getUTCDate() - days);
  return d.toISOString().slice(0, 10);
}

function buildDateRange(days: number): string[] {
  const out: string[] = [];
  const end = new Date();
  end.setUTCHours(0, 0, 0, 0);
  for (let i = days - 1; i >= 0; i--) {
    const d = new Date(end);
    d.setUTCDate(end.getUTCDate() - i);
    out.push(d.toISOString().slice(0, 10));
  }
  return out;
}

export async function loadHomeTimeSeries(days = 30): Promise<DailyPoint[]> {
  const { orgId } = await verifySession();
  const db = await supabaseServer();
  const since = isoDaysAgo(days - 1);

  const [salesRes, alertsRes] = await Promise.all([
    db
      .from("sales")
      .select("sale_date,revenue_no_tax")
      .eq("org_id", orgId)
      .gte("sale_date", since),
    db
      .from("stockout_alerts")
      .select("alert_date,lost_sale_estimate")
      .eq("org_id", orgId)
      .gte("alert_date", since),
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

  return buildDateRange(days).map((date) => ({
    date,
    capturedSale: captured.get(date) ?? 0,
    lostSale: lost.get(date) ?? 0,
  }));
}
