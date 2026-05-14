import "server-only";
import { supabaseServer } from "@/lib/supabase/ssr";
import { verifySession } from "@/lib/dal";

/**
 * Sell-in vs Sell-out — flow analysis.
 *
 * - sell-in: lo que el proveedor (org) le entregó al retailer en el período.
 *   Proxy: total_units_received de OCs con status in ('fulfilled', 'partial'),
 *   agrupado por order_date (no tenemos received_date en BD).
 * - sell-out: lo que el retailer le vendió al consumidor final en el período.
 *   Source: tabla sales.
 *
 * Gap acumulado (sell-in - sell-out) = stock teórico en cadena.
 * - Gap creciente → overstock en cadena (riesgo de devoluciones / mermas)
 * - Gap decreciente → cadena se está vaciando (riesgo de quiebres)
 */

export type FlowMonthPoint = {
  month: string;            // YYYY-MM-01
  sellInUnits: number;
  sellInRevenue: number;
  sellOutUnits: number;
  sellOutRevenue: number;
  /** Diferencia neta del mes = sell-in - sell-out (en unidades) */
  netUnits: number;
  /** Diferencia neta acumulada hasta ese mes */
  cumulativeNetUnits: number;
};

export type FlowData = {
  monthly: FlowMonthPoint[];
  totals: {
    sellInUnits: number;
    sellInRevenue: number;
    sellOutUnits: number;
    sellOutRevenue: number;
    sellThroughPct: number | null;     // sell-out / sell-in
    currentGapUnits: number;           // gap acumulado al final del período
    monthsCovered: number;
  };
};

function toNum(v: unknown): number {
  if (v == null) return 0;
  const n = typeof v === "string" ? parseFloat(v) : (v as number);
  return Number.isFinite(n) ? n : 0;
}

export type LoadFlowOptions = {
  /** Rango inclusive. Si no se pasan, usa todos los datos disponibles. */
  start?: string;
  end?: string;
};

export async function loadFlow(opts: LoadFlowOptions = {}): Promise<FlowData> {
  const { orgId } = await verifySession();
  const db = await supabaseServer();

  const salesStart = opts.start ?? "1900-01-01";
  const salesEnd = opts.end ?? "2999-12-31";

  const [salesRes, posRes] = await Promise.all([
    // Agregado server-side: el cap de 1000 filas de Supabase impide leer sales cruda.
    db.rpc("fn_sales_daily_series", {
      p_org_id: orgId,
      p_start: salesStart,
      p_end: salesEnd,
    }),
    db
      .from("purchase_orders")
      .select("order_date,status,total_units_ordered,total_units_received,total_value")
      .eq("org_id", orgId)
      .in("status", ["fulfilled", "partial"])
      .gte("order_date", opts.start ?? "1900-01-01")
      .lte("order_date", opts.end ?? "2999-12-31"),
  ]);

  if (salesRes.error) throw new Error(`flow sales: ${salesRes.error.message}`);
  if (posRes.error) throw new Error(`flow pos: ${posRes.error.message}`);

  type MonthAcc = {
    sellInUnits: number;
    sellInRevenue: number;
    sellOutUnits: number;
    sellOutRevenue: number;
  };
  const map = new Map<string, MonthAcc>();

  function bucket(iso: string): string {
    return iso.slice(0, 7) + "-01"; // YYYY-MM-01
  }
  function get(month: string): MonthAcc {
    let m = map.get(month);
    if (!m) {
      m = { sellInUnits: 0, sellInRevenue: 0, sellOutUnits: 0, sellOutRevenue: 0 };
      map.set(month, m);
    }
    return m;
  }

  for (const r of (salesRes.data ?? []) as Array<{
    sale_date: string;
    units: unknown;
    revenue: unknown;
  }>) {
    const m = get(bucket(r.sale_date));
    m.sellOutUnits += toNum(r.units);
    m.sellOutRevenue += toNum(r.revenue);
  }

  for (const r of (posRes.data ?? []) as Array<{
    order_date: string;
    total_units_ordered: unknown;
    total_units_received: unknown;
    total_value: unknown;
  }>) {
    const ordered = toNum(r.total_units_ordered);
    const received = toNum(r.total_units_received);
    const value = toNum(r.total_value);
    const m = get(bucket(r.order_date));
    m.sellInUnits += received;
    // Revenue prorateado por % recibido
    m.sellInRevenue += ordered > 0 ? (value * received) / ordered : 0;
  }

  const sortedMonths = Array.from(map.keys()).sort();
  let cumulative = 0;
  const monthly: FlowMonthPoint[] = sortedMonths.map((month) => {
    const m = map.get(month)!;
    const netUnits = m.sellInUnits - m.sellOutUnits;
    cumulative += netUnits;
    return {
      month,
      sellInUnits: m.sellInUnits,
      sellInRevenue: m.sellInRevenue,
      sellOutUnits: m.sellOutUnits,
      sellOutRevenue: m.sellOutRevenue,
      netUnits,
      cumulativeNetUnits: cumulative,
    };
  });

  const sellInUnits = monthly.reduce((a, m) => a + m.sellInUnits, 0);
  const sellOutUnits = monthly.reduce((a, m) => a + m.sellOutUnits, 0);
  const sellInRevenue = monthly.reduce((a, m) => a + m.sellInRevenue, 0);
  const sellOutRevenue = monthly.reduce((a, m) => a + m.sellOutRevenue, 0);
  const currentGapUnits =
    monthly.length > 0 ? monthly[monthly.length - 1].cumulativeNetUnits : 0;

  return {
    monthly,
    totals: {
      sellInUnits,
      sellInRevenue,
      sellOutUnits,
      sellOutRevenue,
      sellThroughPct: sellInUnits > 0 ? sellOutUnits / sellInUnits : null,
      currentGapUnits,
      monthsCovered: monthly.length,
    },
  };
}
