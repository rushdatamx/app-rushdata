import "server-only";
import { supabaseServer } from "@/lib/supabase/ssr";
import { verifySession } from "@/lib/dal";

const HORIZON_DAYS = 30;
const HISTORY_DAYS_DEFAULT = 90; // default: 90 días en el chart

export type ForecastSeriesPoint = {
  date: string;
  actual: number | null; // venta real (null para días futuros)
  forecast: number | null; // proyección (null para días pasados sin proyección retro)
  yoy: number | null; // mismo día año anterior (para banda de comparación)
};

export type ForecastSkuRow = {
  productId: string;
  name: string;
  category: string | null;
  units30d: number;
  revenue30d: number;
  unitsPrev30d: number; // mes anterior (días -60 a -30)
  unitsYoy30d: number; // mismo periodo año anterior
  forecastUnits: number; // proyección próximos 30d
  forecastRevenue: number;
  yoyDelta: number | null; // % vs año anterior
  momDelta: number | null; // % vs mes anterior
  trendSlope: number | null; // pendiente de últimas 8 semanas, % por semana
  weekly: Array<{ weekStart: string; units: number }>;
};

export type ForecastData = {
  series: ForecastSeriesPoint[];
  /** Fecha ancla (último día con ventas). Para datos mock estáticos no es "hoy". */
  anchor: string;
  totals: {
    last30dRevenue: number;
    last30dUnits: number;
    prev30dRevenue: number;
    prev30dUnits: number;
    yoy30dRevenue: number;
    yoy30dUnits: number;
    forecast30dRevenue: number;
    forecast30dUnits: number;
    yoyDeltaPct: number | null;
    momDeltaPct: number | null;
    forecastDeltaPct: number | null; // pronóstico vs último mes
    mape: number | null; // back-test sobre últimos 30d
    trendSlopeWeekly: number | null;
  };
  topSkus: ForecastSkuRow[];
};

function toNum(v: unknown): number {
  if (v == null) return 0;
  const n = typeof v === "string" ? parseFloat(v) : (v as number);
  return Number.isFinite(n) ? n : 0;
}

function isoDay(d: Date): string {
  return d.toISOString().slice(0, 10);
}

/**
 * Para demos con datos mock estáticos, "hoy" = max(sale_date), no la fecha
 * real. Esto evita que el chart se vea vacío cuando los datos no llegan al
 * día actual.
 */
async function loadAnchor(orgId: string): Promise<Date> {
  const db = await supabaseServer();
  const { data } = await db
    .from("sales")
    .select("sale_date")
    .eq("org_id", orgId)
    .order("sale_date", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (data?.sale_date) {
    const d = new Date((data.sale_date as string) + "T00:00:00Z");
    return d;
  }
  const d = new Date();
  d.setUTCHours(0, 0, 0, 0);
  return d;
}

/**
 * Forecast simple por SKU:
 *   1. baseline = promedio diario últimos 28 días (suaviza ruido)
 *   2. seasonality_yoy = ventas mismos 30d año pasado / ventas (mismos 30d - 30) año pasado
 *   3. trend_factor = slope semanal últimas 8 semanas, normalizado
 *
 *   forecast_diario = baseline * seasonality * (1 + trend_factor)
 *
 * MAPE back-test: aplicamos el mismo modelo con datos cortados hace 30d, comparamos
 * vs lo que realmente pasó esos 30d. Para MVP, hacemos un MAPE más simple: comparamos
 * baseline (avg 28d antes del corte) vs real 30d siguientes.
 */
export type LoadForecastOptions = {
  /** Horizonte histórico en días para el chart. Default 90. El modelo siempre
   *  necesita ≥420d (YoY) — esto solo controla cuánto se muestra en el chart. */
  historyDays?: number;
};

export async function loadForecast(opts: LoadForecastOptions = {}): Promise<ForecastData> {
  const { orgId } = await verifySession();
  const db = await supabaseServer();

  const historyDays = Math.max(7, opts.historyDays ?? HISTORY_DAYS_DEFAULT);

  // Anchor = max(sale_date), no hoy. Para demos estáticas.
  const anchor = await loadAnchor(orgId);

  function daysFromAnchor(offset: number): Date {
    const d = new Date(anchor);
    d.setUTCDate(d.getUTCDate() + offset);
    return d;
  }

  // Necesitamos histórico de al menos 14 meses para YoY, o lo que pida el chart si es mayor
  const yoyMinDays = 420;
  const fetchStartDays = Math.max(yoyMinDays, historyDays + 30);
  const yoyStart = isoDay(daysFromAnchor(-fetchStartDays));

  const salesRes = await db
    .from("sales")
    .select("sale_date,units,revenue_no_tax,product_id")
    .eq("org_id", orgId)
    .gte("sale_date", yoyStart);

  if (salesRes.error) {
    throw new Error(`loadForecast sales: ${salesRes.error.message}`);
  }

  const productsRes = await db
    .from("products")
    .select("id,name,category,unit_price")
    .eq("org_id", orgId)
    .eq("active", true);

  if (productsRes.error) {
    throw new Error(`loadForecast products: ${productsRes.error.message}`);
  }

  const productMap = new Map<
    string,
    { name: string; category: string | null; unitPrice: number }
  >();
  for (const p of (productsRes.data ?? []) as Array<Record<string, unknown>>) {
    productMap.set(String(p.id), {
      name: (p.name as string) ?? "—",
      category: (p.category as string) ?? null,
      unitPrice: toNum(p.unit_price),
    });
  }

  // Agregar ventas por (día, producto) y por día total
  const dailyTotal = new Map<string, { units: number; revenue: number }>();
  const dailyByProduct = new Map<string, Map<string, number>>(); // productId -> day -> units

  for (const r of (salesRes.data ?? []) as Array<{
    sale_date: string;
    units: unknown;
    revenue_no_tax: unknown;
    product_id: string;
  }>) {
    const day = r.sale_date;
    const u = toNum(r.units);
    const rev = toNum(r.revenue_no_tax);
    const cur = dailyTotal.get(day) ?? { units: 0, revenue: 0 };
    cur.units += u;
    cur.revenue += rev;
    dailyTotal.set(day, cur);

    if (r.product_id) {
      let byDay = dailyByProduct.get(r.product_id);
      if (!byDay) {
        byDay = new Map();
        dailyByProduct.set(r.product_id, byDay);
      }
      byDay.set(day, (byDay.get(day) ?? 0) + u);
    }
  }

  // Helper: rango de fechas inclusive
  function dayRange(startOffset: number, endOffset: number): string[] {
    const out: string[] = [];
    for (let i = startOffset; i <= endOffset; i++) {
      out.push(isoDay(daysFromAnchor(i)));
    }
    return out;
  }

  // Sumar para una ventana
  function sumWindow(startOffset: number, endOffset: number) {
    let units = 0;
    let revenue = 0;
    for (const d of dayRange(startOffset, endOffset)) {
      const c = dailyTotal.get(d);
      if (c) {
        units += c.units;
        revenue += c.revenue;
      }
    }
    return { units, revenue };
  }

  function sumProductWindow(productId: string, startOffset: number, endOffset: number): number {
    const byDay = dailyByProduct.get(productId);
    if (!byDay) return 0;
    let units = 0;
    for (const d of dayRange(startOffset, endOffset)) {
      units += byDay.get(d) ?? 0;
    }
    return units;
  }

  // Ventanas globales
  const last30 = sumWindow(-29, 0); // últimos 30 días
  const prev30 = sumWindow(-59, -30); // mes anterior
  const yoy30 = sumWindow(-394, -365); // mismo periodo año pasado (30 días alrededor de -365)

  // Trend semanal: pendiente lineal sobre últimas 8 semanas en unidades
  const weeklyUnits: number[] = [];
  for (let w = 7; w >= 0; w--) {
    const start = -7 - 7 * w; // semana w atrás
    const end = -1 - 7 * w;
    weeklyUnits.push(sumWindow(start, end).units);
  }
  // Slope vía mínimos cuadrados (x = 0..n-1, y = weeklyUnits)
  function linearSlope(ys: number[]): number | null {
    const n = ys.length;
    if (n < 2) return null;
    let sumX = 0;
    let sumY = 0;
    let sumXY = 0;
    let sumX2 = 0;
    for (let i = 0; i < n; i++) {
      sumX += i;
      sumY += ys[i];
      sumXY += i * ys[i];
      sumX2 += i * i;
    }
    const denom = n * sumX2 - sumX * sumX;
    if (denom === 0) return null;
    return (n * sumXY - sumX * sumY) / denom;
  }

  const slopeUnitsPerWeek = linearSlope(weeklyUnits);
  const avgWeeklyUnits =
    weeklyUnits.reduce((a, b) => a + b, 0) / Math.max(1, weeklyUnits.length);
  const trendSlopeWeekly =
    slopeUnitsPerWeek != null && avgWeeklyUnits > 0
      ? (slopeUnitsPerWeek / avgWeeklyUnits) * 100
      : null;

  // YoY seasonality: factor multiplicador
  // Si YoY hace -395 a -365 vendió X y los 30 días previos a eso (-425 a -396) vendió Y,
  // el factor "Y siempre sube en este mes" = X / avg(X, Y)
  const yoyPrev = sumWindow(-424, -395); // mes previo al YoY
  const seasonality =
    yoyPrev.units > 0 && yoy30.units > 0 ? yoy30.units / yoyPrev.units : 1;

  // Construir serie diaria: 90d históricos + 30d forecast
  const series: ForecastSeriesPoint[] = [];

  // YoY map para overlay
  function yoyValueFor(offset: number): number {
    const yoyDate = isoDay(daysFromAnchor(offset - 365));
    return dailyTotal.get(yoyDate)?.revenue ?? 0;
  }

  // Histórico
  for (let off = -historyDays + 1; off <= 0; off++) {
    const day = isoDay(daysFromAnchor(off));
    const cur = dailyTotal.get(day);
    series.push({
      date: day,
      actual: cur?.revenue ?? 0,
      forecast: null,
      yoy: yoyValueFor(off),
    });
  }

  // Forecast: baseline diario × seasonality × (1 + trend/100)
  // Trend semanal -> diario: multiplicar por días/7
  const baselineRevenuePerDay = last30.revenue / 30;
  const trendFactor =
    trendSlopeWeekly != null ? 1 + (trendSlopeWeekly / 100) * 0.5 : 1;
  // 0.5 dampening — no extrapolar al 100% del trend reciente, solo medio camino

  for (let off = 1; off <= HORIZON_DAYS; off++) {
    const day = isoDay(daysFromAnchor(off));
    const yoy = yoyValueFor(off);
    const forecast = Math.max(
      0,
      baselineRevenuePerDay * seasonality * trendFactor
    );
    series.push({
      date: day,
      actual: null,
      forecast,
      yoy,
    });
  }

  // Totals
  const forecast30dRevenue = baselineRevenuePerDay * 30 * seasonality * trendFactor;
  // Forecast units: usar mismo escalado sobre baseline en unidades
  const baselineUnitsPerDay = last30.units / 30;
  const forecast30dUnits = baselineUnitsPerDay * 30 * seasonality * trendFactor;

  const yoyDeltaPct =
    yoy30.revenue > 0 ? ((last30.revenue - yoy30.revenue) / yoy30.revenue) * 100 : null;
  const momDeltaPct =
    prev30.revenue > 0 ? ((last30.revenue - prev30.revenue) / prev30.revenue) * 100 : null;
  const forecastDeltaPct =
    last30.revenue > 0
      ? ((forecast30dRevenue - last30.revenue) / last30.revenue) * 100
      : null;

  // MAPE simple: comparar baseline (avg días -58 a -31) vs real (días -29 a -0)
  // Backtest: si hubieras pronosticado hace 30d con esa lógica, qué tan lejos estuviste
  const backtestBaseline = sumWindow(-58, -31).revenue / 28;
  const backtestForecast30d = backtestBaseline * 30 * seasonality * trendFactor;
  const realLast30 = last30.revenue;
  const mape =
    realLast30 > 0
      ? Math.abs((backtestForecast30d - realLast30) / realLast30) * 100
      : null;

  // Top SKUs por revenue 30d
  const skuRows: ForecastSkuRow[] = [];
  for (const [pid, info] of productMap.entries()) {
    const u30 = sumProductWindow(pid, -29, 0);
    if (u30 === 0) continue; // skip productos sin venta reciente
    const uPrev30 = sumProductWindow(pid, -59, -30);
    const uYoy30 = sumProductWindow(pid, -394, -365);
    const uYoyPrev30 = sumProductWindow(pid, -424, -395);

    const skuSeasonality =
      uYoyPrev30 > 0 && uYoy30 > 0 ? uYoy30 / uYoyPrev30 : 1;

    // Slope semanal del SKU
    const skuWeekly: number[] = [];
    for (let w = 7; w >= 0; w--) {
      skuWeekly.push(sumProductWindow(pid, -7 - 7 * w, -1 - 7 * w));
    }
    const skuSlopeUnits = linearSlope(skuWeekly);
    const skuAvgWeek = skuWeekly.reduce((a, b) => a + b, 0) / Math.max(1, skuWeekly.length);
    const skuTrendPct =
      skuSlopeUnits != null && skuAvgWeek > 0
        ? (skuSlopeUnits / skuAvgWeek) * 100
        : null;
    const skuTrendFactor =
      skuTrendPct != null ? 1 + (skuTrendPct / 100) * 0.5 : 1;

    const forecastUnits = (u30 / 30) * 30 * skuSeasonality * skuTrendFactor;
    const forecastRevenue = forecastUnits * info.unitPrice;

    const yoyDelta =
      uYoy30 > 0 ? ((u30 - uYoy30) / uYoy30) * 100 : null;
    const momDelta =
      uPrev30 > 0 ? ((u30 - uPrev30) / uPrev30) * 100 : null;

    // Weekly array para sparkline (últimas 8 semanas, en orden cronológico)
    const weekly = skuWeekly.map((units, idx) => {
      const weeksAgo = 7 - idx;
      const weekStart = isoDay(daysFromAnchor(-7 - 7 * weeksAgo));
      return { weekStart, units };
    });

    skuRows.push({
      productId: pid,
      name: info.name,
      category: info.category,
      units30d: u30,
      revenue30d: u30 * info.unitPrice,
      unitsPrev30d: uPrev30,
      unitsYoy30d: uYoy30,
      forecastUnits,
      forecastRevenue,
      yoyDelta,
      momDelta,
      trendSlope: skuTrendPct,
      weekly,
    });
  }

  skuRows.sort((a, b) => b.revenue30d - a.revenue30d);
  const topSkus = skuRows.slice(0, 15);

  return {
    series,
    anchor: isoDay(anchor),
    totals: {
      last30dRevenue: last30.revenue,
      last30dUnits: last30.units,
      prev30dRevenue: prev30.revenue,
      prev30dUnits: prev30.units,
      yoy30dRevenue: yoy30.revenue,
      yoy30dUnits: yoy30.units,
      forecast30dRevenue,
      forecast30dUnits,
      yoyDeltaPct,
      momDeltaPct,
      forecastDeltaPct,
      mape,
      trendSlopeWeekly,
    },
    topSkus,
  };
}
