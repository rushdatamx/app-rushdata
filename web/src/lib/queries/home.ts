import "server-only";
import { supabaseServer } from "@/lib/supabase/ssr";
import { verifySession } from "@/lib/dal";

export type HomeData = {
  kpi: {
    date: string | null;
    lostSale: number;
    stockouts: number;
    fillRate: number | null;
    activePOs: number;
    inventoryValue: number;
  };
  suggestedCount: number;
  suggestedValue: number;
  topSuggestions: TopSuggestion[];
  alerts: AlertRow[];
};

export type TopSuggestion = {
  id: string;
  store: string;
  storeCluster: string | null;
  product: string;
  ddi: number | null;
  suggestedUnits: number;
  suggestedCases: number;
  lostSale: number;
  confidence: number | null;
  reasonCode: string | null;
};

export type AlertRow = {
  id: string;
  store: string;
  product: string;
  severity: "critical" | "high" | "medium" | "low";
  daysIn: number;
  lostSale: number;
  alertDate: string;
};

function toNum(v: unknown): number {
  if (v == null) return 0;
  const n = typeof v === "string" ? parseFloat(v) : (v as number);
  return Number.isFinite(n) ? n : 0;
}

function toSeverity(s: string | null | undefined): AlertRow["severity"] {
  if (s === "critical" || s === "high" || s === "medium" || s === "low") return s;
  return "medium";
}

export async function loadHomeData(): Promise<HomeData> {
  const { orgId } = await verifySession();
  const db = await supabaseServer();

  const [kpiRes, suggestedAggRes, topRes, alertsRes] = await Promise.all([
    db
      .from("daily_kpis")
      .select(
        "kpi_date,total_lost_sale_estimate,total_stockouts,avg_fill_rate,total_active_pos,total_inventory_value"
      )
      .eq("org_id", orgId)
      .order("kpi_date", { ascending: false })
      .limit(1)
      .maybeSingle(),
    db
      .from("suggested_orders")
      .select("suggested_units,velocity_daily,current_inventory,estimated_lost_sale", {
        count: "exact",
      })
      .eq("org_id", orgId)
      .eq("status", "new"),
    db
      .from("suggested_orders")
      .select(
        "id,suggested_units,suggested_cases,current_ddi,estimated_lost_sale,confidence,reason_code,stores(name,cluster),products(name)"
      )
      .eq("org_id", orgId)
      .eq("status", "new")
      .order("estimated_lost_sale", { ascending: false, nullsFirst: false })
      .limit(10),
    db
      .from("stockout_alerts")
      .select(
        "id,severity,days_in_stockout,lost_sale_estimate,alert_date,stores(name),products(name)"
      )
      .eq("org_id", orgId)
      .eq("resolved", false)
      .order("alert_date", { ascending: false })
      .limit(5),
  ]);

  const kpiRow = kpiRes.data;
  const suggestedRows = (suggestedAggRes.data ?? []) as Array<{
    suggested_units: string | number | null;
    estimated_lost_sale: string | number | null;
    velocity_daily: string | number | null;
  }>;

  // suggestedValue ≈ suma del riesgo estimado de sugeridos pendientes (proxy de "valor a accionar")
  const suggestedValue = suggestedRows.reduce(
    (acc, r) => acc + toNum(r.estimated_lost_sale),
    0
  );

  const topSuggestions: TopSuggestion[] = (topRes.data ?? []).map(
    (r: Record<string, unknown>) => {
      const store = (r.stores ?? null) as { name?: string; cluster?: string | null } | null;
      return {
        id: String(r.id),
        store: store?.name ?? "—",
        storeCluster: store?.cluster ?? null,
        product: (r.products as { name?: string } | null)?.name ?? "—",
        ddi: r.current_ddi == null ? null : toNum(r.current_ddi),
        suggestedUnits: toNum(r.suggested_units),
        suggestedCases: toNum(r.suggested_cases),
        lostSale: toNum(r.estimated_lost_sale),
        confidence: r.confidence == null ? null : toNum(r.confidence),
        reasonCode: (r.reason_code as string) ?? null,
      };
    }
  );

  const alerts: AlertRow[] = (alertsRes.data ?? []).map((r: Record<string, unknown>) => ({
    id: String(r.id),
    store: (r.stores as { name?: string } | null)?.name ?? "—",
    product: (r.products as { name?: string } | null)?.name ?? "—",
    severity: toSeverity(r.severity as string | null),
    daysIn: toNum(r.days_in_stockout),
    lostSale: toNum(r.lost_sale_estimate),
    alertDate: (r.alert_date as string) ?? "",
  }));

  return {
    kpi: {
      date: (kpiRow?.kpi_date as string) ?? null,
      lostSale: toNum(kpiRow?.total_lost_sale_estimate),
      stockouts: toNum(kpiRow?.total_stockouts),
      fillRate: kpiRow?.avg_fill_rate == null ? null : toNum(kpiRow.avg_fill_rate),
      activePOs: toNum(kpiRow?.total_active_pos),
      inventoryValue: toNum(kpiRow?.total_inventory_value),
    },
    suggestedCount: suggestedAggRes.count ?? suggestedRows.length,
    suggestedValue,
    topSuggestions,
    alerts,
  };
}
