import "server-only";
import { supabaseServer } from "@/lib/supabase/ssr";
import { verifySession } from "@/lib/dal";

/**
 * Período = ventana de fechas con etiqueta. Tres modos:
 *  - rolling: "7d" | "30d" | "90d" → últimos N días desde el anchor
 *  - calendar: "cal:YYYY-MM" (mes) | "cal:YYYY" (año) | "cal:ytd" (YTD)
 *  - fiscal:   "fis:P##-YYYY" (período HEB) | "fis:YYYY" (año fiscal) | "fis:ytd"
 *
 * Default: "30d". Si la cadena no es fiscal o el período no existe, fallback a 30d.
 *
 * El "anchor" es la fecha de referencia desde la que se calcula rolling y se
 * recortan futuros. Por defecto es `max(sale_date)` de la org (no `new Date()`),
 * para que demos con datos mock estáticos no muestren ventanas vacías.
 */

export type PeriodMode = "rolling" | "calendar" | "fiscal";

export type ResolvedPeriod = {
  raw: string;            // valor original del query param
  mode: PeriodMode;
  start: string;          // ISO YYYY-MM-DD (inclusive)
  end: string;            // ISO YYYY-MM-DD (inclusive)
  days: number;           // (end - start) + 1
  label: string;          // legible: "Últimos 30 días", "Mayo 2026", "P05-2026"
  shortLabel: string;     // chip-friendly: "30d", "May 26", "P05"
};

export type FiscalPeriod = {
  code: string;           // "P05-2026"
  year: number;
  number: number;
  start: string;          // ISO
  end: string;            // ISO
};

const MONTH_LABELS_ES = [
  "Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio",
  "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre",
];

const MONTH_SHORT_ES = [
  "Ene", "Feb", "Mar", "Abr", "May", "Jun",
  "Jul", "Ago", "Sep", "Oct", "Nov", "Dic",
];

function isoDay(d: Date): string {
  return d.toISOString().slice(0, 10);
}

function todayUTC(): Date {
  const d = new Date();
  d.setUTCHours(0, 0, 0, 0);
  return d;
}

function dateFromIso(iso: string): Date {
  return new Date(iso + "T00:00:00Z");
}

function daysBetween(start: string, end: string): number {
  const s = new Date(start + "T00:00:00Z").getTime();
  const e = new Date(end + "T00:00:00Z").getTime();
  return Math.floor((e - s) / 86_400_000) + 1;
}

/**
 * Devuelve la fecha "ancla" para los rangos rolling. Es el último día con
 * ventas para la org actual. Cacheado por sesión (no por request — vale tener
 * el anchor estable durante un render completo).
 *
 * Fallback: si no hay ventas o la query falla, regresa hoy UTC.
 */
export async function loadAnchorDate(): Promise<string> {
  try {
    const { orgId } = await verifySession();
    const db = await supabaseServer();
    const { data } = await db
      .from("sales")
      .select("sale_date")
      .eq("org_id", orgId)
      .order("sale_date", { ascending: false })
      .limit(1)
      .maybeSingle();
    if (data?.sale_date) return data.sale_date as string;
  } catch {
    // ignored — fallback
  }
  return isoDay(todayUTC());
}

function resolveRolling(raw: string, anchor: string): ResolvedPeriod {
  const days = raw === "7d" ? 7 : raw === "90d" ? 90 : 30;
  const end = dateFromIso(anchor);
  const start = new Date(end);
  start.setUTCDate(end.getUTCDate() - (days - 1));
  return {
    raw,
    mode: "rolling",
    start: isoDay(start),
    end: anchor,
    days,
    label: `Últimos ${days} días`,
    shortLabel: `${days}d`,
  };
}

function resolveCalendarMonth(year: number, month: number, anchor: string): ResolvedPeriod {
  // month is 1-12
  const start = new Date(Date.UTC(year, month - 1, 1));
  const end = new Date(Date.UTC(year, month, 0)); // último día del mes
  const anchorDate = dateFromIso(anchor);
  const effectiveEnd = end > anchorDate ? anchorDate : end;
  return {
    raw: `cal:${year}-${String(month).padStart(2, "0")}`,
    mode: "calendar",
    start: isoDay(start),
    end: isoDay(effectiveEnd),
    days: daysBetween(isoDay(start), isoDay(effectiveEnd)),
    label: `${MONTH_LABELS_ES[month - 1]} ${year}`,
    shortLabel: `${MONTH_SHORT_ES[month - 1]} ${String(year).slice(2)}`,
  };
}

function resolveCalendarYear(year: number, anchor: string): ResolvedPeriod {
  const start = new Date(Date.UTC(year, 0, 1));
  const end = new Date(Date.UTC(year, 11, 31));
  const anchorDate = dateFromIso(anchor);
  const effectiveEnd = end > anchorDate ? anchorDate : end;
  return {
    raw: `cal:${year}`,
    mode: "calendar",
    start: isoDay(start),
    end: isoDay(effectiveEnd),
    days: daysBetween(isoDay(start), isoDay(effectiveEnd)),
    label: `${year}`,
    shortLabel: `${year}`,
  };
}

function resolveCalendarYTD(anchor: string): ResolvedPeriod {
  const anchorDate = dateFromIso(anchor);
  const start = new Date(Date.UTC(anchorDate.getUTCFullYear(), 0, 1));
  return {
    raw: "cal:ytd",
    mode: "calendar",
    start: isoDay(start),
    end: anchor,
    days: daysBetween(isoDay(start), anchor),
    label: `${anchorDate.getUTCFullYear()} YTD`,
    shortLabel: "YTD",
  };
}

function resolveFiscalPeriod(p: FiscalPeriod, anchor: string): ResolvedPeriod {
  const anchorDate = dateFromIso(anchor);
  const endDate = dateFromIso(p.end);
  const effectiveEnd = endDate > anchorDate ? anchor : p.end;
  return {
    raw: `fis:${p.code}`,
    mode: "fiscal",
    start: p.start,
    end: effectiveEnd,
    days: daysBetween(p.start, effectiveEnd),
    label: p.code,
    shortLabel: `P${String(p.number).padStart(2, "0")}`,
  };
}

function resolveFiscalYear(year: number, periods: FiscalPeriod[], anchor: string): ResolvedPeriod | null {
  const sameYear = periods.filter((p) => p.year === year);
  if (sameYear.length === 0) return null;
  const sorted = [...sameYear].sort((a, b) => a.start.localeCompare(b.start));
  const start = sorted[0].start;
  const end = sorted[sorted.length - 1].end;
  const anchorDate = dateFromIso(anchor);
  const endDate = dateFromIso(end);
  const effectiveEnd = endDate > anchorDate ? anchor : end;
  return {
    raw: `fis:${year}`,
    mode: "fiscal",
    start,
    end: effectiveEnd,
    days: daysBetween(start, effectiveEnd),
    label: `FY ${year} (HEB)`,
    shortLabel: `FY${String(year).slice(2)}`,
  };
}

function resolveFiscalYTD(periods: FiscalPeriod[], anchor: string): ResolvedPeriod | null {
  const anchorDate = dateFromIso(anchor);
  const year = anchorDate.getUTCFullYear();
  const sameYear = periods.filter((p) => p.year === year && p.start <= anchor);
  if (sameYear.length === 0) return null;
  const sorted = [...sameYear].sort((a, b) => a.start.localeCompare(b.start));
  return {
    raw: "fis:ytd",
    mode: "fiscal",
    start: sorted[0].start,
    end: anchor,
    days: daysBetween(sorted[0].start, anchor),
    label: `FY ${year} YTD (HEB)`,
    shortLabel: "FY YTD",
  };
}

/**
 * Carga los períodos fiscales de una cadena. Devuelve [] si la cadena no tiene calendario fiscal.
 */
export async function loadFiscalPeriods(chainSlug: string): Promise<FiscalPeriod[]> {
  const db = await supabaseServer();
  const { data: chainRow } = await db
    .from("chains")
    .select("id,calendar_type")
    .eq("slug", chainSlug)
    .maybeSingle();
  if (!chainRow || chainRow.calendar_type !== "fiscal") return [];
  const { data, error } = await db
    .from("chain_calendars")
    .select("period_code,period_year,period_number,period_start,period_end")
    .eq("chain_id", chainRow.id)
    .order("period_start", { ascending: true });
  if (error || !data) return [];
  return data.map((r) => ({
    code: r.period_code as string,
    year: r.period_year as number,
    number: r.period_number as number,
    start: r.period_start as string,
    end: r.period_end as string,
  }));
}

/**
 * Resuelve un raw param de período a una ventana concreta.
 * Si el param es inválido o el calendario fiscal no aplica, hace fallback a "30d".
 *
 * `anchor` es la fecha de referencia (ISO YYYY-MM-DD) desde la que se calcula
 * rolling y se recortan futuros. Default: hoy UTC. Para demos con datos mock,
 * pasar `max(sale_date)` para que las ventanas siempre encuentren datos.
 */
export function resolvePeriod(
  raw: string | undefined | null,
  fiscalPeriods: FiscalPeriod[] = [],
  anchor?: string
): ResolvedPeriod {
  const a = anchor ?? isoDay(todayUTC());

  if (!raw) return resolveRolling("30d", a);

  // Rolling
  if (raw === "7d" || raw === "30d" || raw === "90d") {
    return resolveRolling(raw, a);
  }

  // Calendario
  if (raw.startsWith("cal:")) {
    const v = raw.slice(4);
    if (v === "ytd") return resolveCalendarYTD(a);
    const monthMatch = v.match(/^(\d{4})-(\d{2})$/);
    if (monthMatch) {
      const y = Number(monthMatch[1]);
      const m = Number(monthMatch[2]);
      if (m >= 1 && m <= 12) return resolveCalendarMonth(y, m, a);
    }
    const yearMatch = v.match(/^(\d{4})$/);
    if (yearMatch) return resolveCalendarYear(Number(yearMatch[1]), a);
    return resolveRolling("30d", a);
  }

  // Fiscal
  if (raw.startsWith("fis:")) {
    if (fiscalPeriods.length === 0) return resolveRolling("30d", a);
    const v = raw.slice(4);
    if (v === "ytd") {
      return resolveFiscalYTD(fiscalPeriods, a) ?? resolveRolling("30d", a);
    }
    const yearMatch = v.match(/^(\d{4})$/);
    if (yearMatch) {
      return (
        resolveFiscalYear(Number(yearMatch[1]), fiscalPeriods, a) ?? resolveRolling("30d", a)
      );
    }
    const found = fiscalPeriods.find((p) => p.code === v);
    if (found) return resolveFiscalPeriod(found, a);
    return resolveRolling("30d", a);
  }

  return resolveRolling("30d", a);
}

/**
 * Opciones a mostrar en el selector. Devuelve las tres listas (rolling, calendar, fiscal).
 * Calcula calendar dinámicamente (últimos 6 meses + año actual + año anterior + YTD).
 * Para fiscal usa la lista provista (los 6 más recientes <= hoy + años + YTD).
 */
export type PeriodOption = {
  value: string;        // raw
  label: string;
  shortLabel: string;
};

export function buildPeriodOptions(
  fiscalPeriods: FiscalPeriod[],
  anchor?: string
): {
  rolling: PeriodOption[];
  calendar: PeriodOption[];
  fiscal: PeriodOption[];
} {
  const anchorDate = anchor ? dateFromIso(anchor) : todayUTC();
  const year = anchorDate.getUTCFullYear();
  const month = anchorDate.getUTCMonth() + 1;

  const rolling: PeriodOption[] = [
    { value: "7d", label: "Últimos 7 días", shortLabel: "7d" },
    { value: "30d", label: "Últimos 30 días", shortLabel: "30d" },
    { value: "90d", label: "Últimos 90 días", shortLabel: "90d" },
  ];

  const calendar: PeriodOption[] = [];
  calendar.push({ value: "cal:ytd", label: `${year} YTD`, shortLabel: "YTD" });
  // últimos 6 meses (incluyendo el actual)
  for (let i = 0; i < 6; i++) {
    let m = month - i;
    let y = year;
    if (m <= 0) {
      m += 12;
      y -= 1;
    }
    calendar.push({
      value: `cal:${y}-${String(m).padStart(2, "0")}`,
      label: `${MONTH_LABELS_ES[m - 1]} ${y}`,
      shortLabel: `${MONTH_SHORT_ES[m - 1]} ${String(y).slice(2)}`,
    });
  }
  calendar.push({ value: `cal:${year - 1}`, label: `${year - 1}`, shortLabel: `${year - 1}` });

  const fiscal: PeriodOption[] = [];
  if (fiscalPeriods.length > 0) {
    const anchorIso = isoDay(anchorDate);
    const past = fiscalPeriods
      .filter((p) => p.start <= anchorIso)
      .sort((a, b) => b.start.localeCompare(a.start))
      .slice(0, 6);
    fiscal.push({ value: "fis:ytd", label: `FY ${year} YTD`, shortLabel: "FY YTD" });
    for (const p of past) {
      fiscal.push({
        value: `fis:${p.code}`,
        label: p.code,
        shortLabel: `P${String(p.number).padStart(2, "0")}-${String(p.year).slice(2)}`,
      });
    }
    // Años fiscales completos disponibles (los del año pasado y anterior si hay)
    const years = Array.from(new Set(fiscalPeriods.map((p) => p.year))).sort(
      (a, b) => b - a
    );
    for (const y of years) {
      if (y < year) {
        fiscal.push({
          value: `fis:${y}`,
          label: `FY ${y} (HEB)`,
          shortLabel: `FY${String(y).slice(2)}`,
        });
      }
    }
  }

  return { rolling, calendar, fiscal };
}
