import "server-only";
import { supabaseServer } from "@/lib/supabase/ssr";
import { verifySession } from "@/lib/dal";

export type PivotGroupBy = "store" | "product" | "region" | "category" | "month";

export type PivotRow = {
  groupKey: string;
  groupLabel: string;
  unitsCurrent: number;
  unitsPrevious: number;
  revenueCurrent: number;
  revenuePrevious: number;
  unitsDeltaPct: number | null;
  revenueDeltaPct: number | null;
  shareOfTotalPct: number;
};

export type PivotTotals = {
  unitsCurrent: number;
  unitsPrevious: number;
  revenueCurrent: number;
  revenuePrevious: number;
  unitsDeltaPct: number | null;
  revenueDeltaPct: number | null;
};

export type LoadPivotOptions = {
  start: string;
  end: string;
  groupBy: PivotGroupBy;
  storeId?: string;
  productId?: string;
  region?: string;
  category?: string;
};

function toNum(v: unknown): number {
  if (v == null) return 0;
  const n = typeof v === "string" ? parseFloat(v) : (v as number);
  return Number.isFinite(n) ? n : 0;
}

function toNullableNum(v: unknown): number | null {
  if (v == null) return null;
  const n = typeof v === "string" ? parseFloat(v) : (v as number);
  return Number.isFinite(n) ? n : null;
}

function pctDelta(curr: number, prev: number): number | null {
  if (prev === 0) return null;
  return ((curr - prev) / prev) * 100;
}

export async function loadPivotDetail(
  opts: LoadPivotOptions
): Promise<{ rows: PivotRow[]; totals: PivotTotals }> {
  const { orgId } = await verifySession();
  const db = await supabaseServer();

  const res = await db.rpc("fn_sales_pivot_yoy", {
    p_org_id: orgId,
    p_start: opts.start,
    p_end: opts.end,
    p_group_by: opts.groupBy,
    p_store_id: opts.storeId ?? null,
    p_product_id: opts.productId ?? null,
    p_region: opts.region ?? null,
    p_category: opts.category ?? null,
  });

  if (res.error) {
    throw new Error(`fn_sales_pivot_yoy: ${res.error.message}`);
  }

  const raw = (res.data ?? []) as Array<Record<string, unknown>>;

  const totalRevenue = raw.reduce((a, r) => a + toNum(r.revenue_current), 0);

  const rows: PivotRow[] = raw.map((r) => {
    const revenueCurrent = toNum(r.revenue_current);
    return {
      groupKey: String(r.group_key ?? ""),
      groupLabel: String(r.group_label ?? "—"),
      unitsCurrent: toNum(r.units_current),
      unitsPrevious: toNum(r.units_previous),
      revenueCurrent,
      revenuePrevious: toNum(r.revenue_previous),
      unitsDeltaPct: toNullableNum(r.units_delta_pct),
      revenueDeltaPct: toNullableNum(r.revenue_delta_pct),
      shareOfTotalPct:
        totalRevenue > 0 ? (revenueCurrent / totalRevenue) * 100 : 0,
    };
  });

  const totals: PivotTotals = {
    unitsCurrent: rows.reduce((a, r) => a + r.unitsCurrent, 0),
    unitsPrevious: rows.reduce((a, r) => a + r.unitsPrevious, 0),
    revenueCurrent: totalRevenue,
    revenuePrevious: rows.reduce((a, r) => a + r.revenuePrevious, 0),
    unitsDeltaPct: null,
    revenueDeltaPct: null,
  };
  totals.unitsDeltaPct = pctDelta(totals.unitsCurrent, totals.unitsPrevious);
  totals.revenueDeltaPct = pctDelta(totals.revenueCurrent, totals.revenuePrevious);

  return { rows, totals };
}
