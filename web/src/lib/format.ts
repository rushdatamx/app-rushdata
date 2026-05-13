const MXN = new Intl.NumberFormat("es-MX", {
  style: "currency",
  currency: "MXN",
  maximumFractionDigits: 0,
});

const NUM = new Intl.NumberFormat("es-MX", {
  maximumFractionDigits: 0,
});

const NUM1 = new Intl.NumberFormat("es-MX", {
  maximumFractionDigits: 1,
});

export function fmtMXN(n: number | null | undefined): string {
  if (n == null || Number.isNaN(n)) return "—";
  return MXN.format(n);
}

export function fmtNumber(n: number | null | undefined): string {
  if (n == null || Number.isNaN(n)) return "—";
  return NUM.format(n);
}

export function fmtDecimal(n: number | null | undefined): string {
  if (n == null || Number.isNaN(n)) return "—";
  return NUM1.format(n);
}

export function fmtPct(n: number | null | undefined): string {
  if (n == null || Number.isNaN(n)) return "—";
  return `${NUM1.format(n * 100)}%`;
}
