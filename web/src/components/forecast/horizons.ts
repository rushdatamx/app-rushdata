/**
 * Helper compartible entre server y client para el horizonte de /forecast.
 * Mantener este archivo SIN "use client" para que ForecastPage pueda usar
 * `horizonToDays` desde server.
 */

export const HORIZONS = [
  { value: "90d", label: "90d", days: 90 },
  { value: "1y", label: "1 año", days: 365 },
  { value: "2y", label: "2 años", days: 730 },
  { value: "5y", label: "5 años", days: 1825 },
] as const;

export type HorizonValue = (typeof HORIZONS)[number]["value"];

export function horizonToDays(v: string | undefined): number {
  const found = HORIZONS.find((h) => h.value === v);
  return found?.days ?? 90;
}
