import "server-only";
import { supabaseServer } from "@/lib/supabase/ssr";

/**
 * Período = ventana de fechas con etiqueta. Tres modos:
 *  - rolling: "7d" | "30d" | "90d" → últimos N días desde hoy
 *  - calendar: "cal:YYYY-MM" (mes) | "cal:YYYY" (año) | "cal:ytd" (YTD)
 *  - fiscal:   "fis:P##-YYYY" (período HEB) | "fis:YYYY" (año fiscal) | "fis:ytd"
 *
 * Default: "30d". Si la cadena no es fiscal o el período no existe, fallback a 30d.
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

function daysBetween(start: string, end: string): number {
  const s = new Date(start + "T00:00:00Z").getTime();
  const e = new Date(end + "T00:00:00Z").getTime();
  return Math.floor((e - s) / 86_400_000) + 1;
}

function resolveRolling(raw: string): ResolvedPeriod {
  const days = raw === "7d" ? 7 : raw === "90d" ? 90 : 30;
  const today = todayUTC();
  const start = new Date(today);
  start.setUTCDate(today.getUTCDate() - (days - 1));
  return {
    raw,
    mode: "rolling",
    start: isoDay(start),
    end: isoDay(today),
    days,
    label: `Últimos ${days} días`,
    shortLabel: `${days}d`,
  };
}

function resolveCalendarMonth(year: number, month: number): ResolvedPeriod {
  // month is 1-12
  const start = new Date(Date.UTC(year, month - 1, 1));
  const end = new Date(Date.UTC(year, month, 0)); // último día del mes
  // Si el mes es futuro o el actual, recortar a hoy
  const today = todayUTC();
  const effectiveEnd = end > today ? today : end;
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

function resolveCalendarYear(year: number): ResolvedPeriod {
  const start = new Date(Date.UTC(year, 0, 1));
  const end = new Date(Date.UTC(year, 11, 31));
  const today = todayUTC();
  const effectiveEnd = end > today ? today : end;
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

function resolveCalendarYTD(): ResolvedPeriod {
  const today = todayUTC();
  const start = new Date(Date.UTC(today.getUTCFullYear(), 0, 1));
  return {
    raw: "cal:ytd",
    mode: "calendar",
    start: isoDay(start),
    end: isoDay(today),
    days: daysBetween(isoDay(start), isoDay(today)),
    label: `${today.getUTCFullYear()} YTD`,
    shortLabel: "YTD",
  };
}

function resolveFiscalPeriod(p: FiscalPeriod): ResolvedPeriod {
  const today = todayUTC();
  const endDate = new Date(p.end + "T00:00:00Z");
  const effectiveEnd = endDate > today ? isoDay(today) : p.end;
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

function resolveFiscalYear(year: number, periods: FiscalPeriod[]): ResolvedPeriod | null {
  const sameYear = periods.filter((p) => p.year === year);
  if (sameYear.length === 0) return null;
  const sorted = [...sameYear].sort((a, b) => a.start.localeCompare(b.start));
  const start = sorted[0].start;
  const end = sorted[sorted.length - 1].end;
  const today = todayUTC();
  const endDate = new Date(end + "T00:00:00Z");
  const effectiveEnd = endDate > today ? isoDay(today) : end;
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

function resolveFiscalYTD(periods: FiscalPeriod[]): ResolvedPeriod | null {
  const today = todayUTC();
  const year = today.getUTCFullYear();
  const sameYear = periods.filter((p) => p.year === year && p.start <= isoDay(today));
  if (sameYear.length === 0) return null;
  const sorted = [...sameYear].sort((a, b) => a.start.localeCompare(b.start));
  return {
    raw: "fis:ytd",
    mode: "fiscal",
    start: sorted[0].start,
    end: isoDay(today),
    days: daysBetween(sorted[0].start, isoDay(today)),
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
 */
export function resolvePeriod(
  raw: string | undefined | null,
  fiscalPeriods: FiscalPeriod[] = []
): ResolvedPeriod {
  if (!raw) return resolveRolling("30d");

  // Rolling
  if (raw === "7d" || raw === "30d" || raw === "90d") {
    return resolveRolling(raw);
  }

  // Calendario
  if (raw.startsWith("cal:")) {
    const v = raw.slice(4);
    if (v === "ytd") return resolveCalendarYTD();
    const monthMatch = v.match(/^(\d{4})-(\d{2})$/);
    if (monthMatch) {
      const y = Number(monthMatch[1]);
      const m = Number(monthMatch[2]);
      if (m >= 1 && m <= 12) return resolveCalendarMonth(y, m);
    }
    const yearMatch = v.match(/^(\d{4})$/);
    if (yearMatch) return resolveCalendarYear(Number(yearMatch[1]));
    return resolveRolling("30d");
  }

  // Fiscal
  if (raw.startsWith("fis:")) {
    if (fiscalPeriods.length === 0) return resolveRolling("30d");
    const v = raw.slice(4);
    if (v === "ytd") {
      return resolveFiscalYTD(fiscalPeriods) ?? resolveRolling("30d");
    }
    const yearMatch = v.match(/^(\d{4})$/);
    if (yearMatch) {
      return (
        resolveFiscalYear(Number(yearMatch[1]), fiscalPeriods) ?? resolveRolling("30d")
      );
    }
    const found = fiscalPeriods.find((p) => p.code === v);
    if (found) return resolveFiscalPeriod(found);
    return resolveRolling("30d");
  }

  return resolveRolling("30d");
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

export function buildPeriodOptions(fiscalPeriods: FiscalPeriod[]): {
  rolling: PeriodOption[];
  calendar: PeriodOption[];
  fiscal: PeriodOption[];
} {
  const today = todayUTC();
  const year = today.getUTCFullYear();
  const month = today.getUTCMonth() + 1;

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
    const todayIso = isoDay(today);
    const past = fiscalPeriods
      .filter((p) => p.start <= todayIso)
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
