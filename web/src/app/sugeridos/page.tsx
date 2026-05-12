import Link from "next/link";
import { loadSuggestions, REASON_META, type ReasonCode } from "@/lib/queries/suggestions";
import { Card, CardHeader } from "@/components/ui/Card";
import { SeverityBadge } from "@/components/ui/SeverityBadge";
import { ReasonBadge } from "@/components/ui/ReasonBadge";
import { fmtMXN, fmtNumber, fmtDecimal, cn } from "@/lib/utils";

export const dynamic = "force-dynamic";

function ddiSeverity(ddi: number | null): "critical" | "high" | "medium" | "low" {
  if (ddi == null) return "medium";
  if (ddi <= 1) return "critical";
  if (ddi <= 3) return "high";
  if (ddi <= 7) return "medium";
  return "low";
}

type SearchParams = Promise<{ reason?: string; severity?: string }>;

const REASON_FILTERS: Array<{ value: ReasonCode | "all"; label: string }> = [
  { value: "all", label: "Todas las razones" },
  { value: "stockout_risk", label: "Riesgo quiebre" },
  { value: "low_ddi", label: "DDI bajo" },
  { value: "velocity_up", label: "Velocity ↑" },
  { value: "periodic_replenish", label: "Reposición" },
];

function buildHref(current: { reason: string; severity: string }, patch: Partial<{ reason: string; severity: string }>) {
  const next = { ...current, ...patch };
  const params = new URLSearchParams();
  if (next.reason && next.reason !== "all") params.set("reason", next.reason);
  if (next.severity && next.severity !== "all") params.set("severity", next.severity);
  const qs = params.toString();
  return qs ? `/sugeridos?${qs}` : "/sugeridos";
}

export default async function SugeridosPage({ searchParams }: { searchParams: SearchParams }) {
  const params = await searchParams;
  const reason = (params.reason ?? "all") as ReasonCode | "all";
  const severity = params.severity === "critical" ? "critical" : "all";

  const { rows, totals } = await loadSuggestions({
    reason: reason === "all" ? undefined : reason,
    onlyCritical: severity === "critical",
  });

  const current = { reason, severity };

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-end justify-between gap-6">
        <div>
          <h1 className="text-[24px] leading-tight font-semibold text-foreground tracking-tight">
            Sugeridos
          </h1>
          <p className="text-[13px] text-muted mt-1">
            {fmtNumber(totals.count)} pedidos sugeridos · {fmtMXN(totals.lostSale)} en venta perdida potencial · {fmtNumber(totals.cases)} cajas totales
          </p>
        </div>
      </div>

      {/* Filtros */}
      <Card>
        <div className="px-5 py-3 flex flex-wrap items-center gap-x-6 gap-y-3">
          <div className="flex items-center gap-2">
            <span className="text-[11px] uppercase tracking-wider text-subtle font-medium">Razón</span>
            <div className="flex items-center gap-1">
              {REASON_FILTERS.map((f) => (
                <Link
                  key={f.value}
                  href={buildHref(current, { reason: f.value })}
                  className={cn(
                    "px-2.5 py-1 rounded-md text-[12px] transition-colors",
                    reason === f.value
                      ? "bg-foreground text-background"
                      : "text-muted hover:bg-surface-hover hover:text-foreground"
                  )}
                >
                  {f.label}
                </Link>
              ))}
            </div>
          </div>

          <div className="flex items-center gap-2">
            <span className="text-[11px] uppercase tracking-wider text-subtle font-medium">DDI</span>
            <div className="flex items-center gap-1">
              <Link
                href={buildHref(current, { severity: "all" })}
                className={cn(
                  "px-2.5 py-1 rounded-md text-[12px] transition-colors",
                  severity === "all"
                    ? "bg-foreground text-background"
                    : "text-muted hover:bg-surface-hover hover:text-foreground"
                )}
              >
                Todos
              </Link>
              <Link
                href={buildHref(current, { severity: "critical" })}
                className={cn(
                  "px-2.5 py-1 rounded-md text-[12px] transition-colors",
                  severity === "critical"
                    ? "bg-foreground text-background"
                    : "text-muted hover:bg-surface-hover hover:text-foreground"
                )}
              >
                Solo críticos (DDI ≤ 3)
              </Link>
            </div>
          </div>
        </div>
      </Card>

      {/* Tabla */}
      <Card>
        <CardHeader>
          <h2 className="text-[15px] font-semibold text-foreground">
            {fmtNumber(rows.length)} resultado{rows.length === 1 ? "" : "s"}
          </h2>
          <p className="text-[12px] text-muted mt-0.5">Ordenado por venta perdida estimada</p>
        </CardHeader>

        {rows.length === 0 ? (
          <div className="px-5 py-12 text-center text-[13px] text-muted">
            Sin sugeridos con esos filtros.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-[13px]">
              <thead>
                <tr className="text-[11px] uppercase tracking-wider text-subtle border-b border-border">
                  <th className="text-left font-medium px-5 py-2.5">Tienda</th>
                  <th className="text-left font-medium px-3 py-2.5">Producto</th>
                  <th className="text-left font-medium px-3 py-2.5">Razón</th>
                  <th className="text-right font-medium px-3 py-2.5">DDI</th>
                  <th className="text-right font-medium px-3 py-2.5">Stock</th>
                  <th className="text-right font-medium px-3 py-2.5">Vel/día</th>
                  <th className="text-right font-medium px-3 py-2.5">Sugerido</th>
                  <th className="text-right font-medium px-3 py-2.5">Cajas</th>
                  <th className="text-right font-medium px-3 py-2.5">$ Riesgo</th>
                  <th className="text-right font-medium px-5 py-2.5">Conf.</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((s) => {
                  const reasonMeta = s.reasonCode ? REASON_META[s.reasonCode] : null;
                  return (
                    <tr
                      key={s.id}
                      className="border-b border-border last:border-b-0 hover:bg-surface-hover transition-colors"
                    >
                      <td className="px-5 py-3 text-foreground">
                        <Link href={`/tiendas/${s.storeId}`} className="hover:text-accent transition-colors block">
                          <div className="flex flex-col">
                            <span>{s.store}</span>
                            {s.storeCluster && (
                              <span className="text-[11px] text-subtle">Cluster {s.storeCluster}</span>
                            )}
                          </div>
                        </Link>
                      </td>
                      <td className="px-3 py-3 text-foreground">
                        <Link href={`/productos/${s.productId}`} className="hover:text-accent transition-colors">
                          {s.product}
                        </Link>
                      </td>
                      <td className="px-3 py-3">
                        {reasonMeta && <ReasonBadge label={reasonMeta.label} tone={reasonMeta.tone} />}
                      </td>
                      <td className="px-3 py-3 text-right">
                        <span className="inline-flex items-center gap-2 justify-end">
                          <span className="font-mono tabular-nums text-foreground">
                            {fmtDecimal(s.ddi)}
                          </span>
                          <SeverityBadge level={ddiSeverity(s.ddi)} label="" />
                        </span>
                      </td>
                      <td className="px-3 py-3 text-right font-mono tabular-nums text-muted">
                        {fmtNumber(s.inventory)}
                      </td>
                      <td className="px-3 py-3 text-right font-mono tabular-nums text-muted">
                        {fmtDecimal(s.velocity)}
                      </td>
                      <td className="px-3 py-3 text-right font-mono tabular-nums text-foreground">
                        {fmtNumber(s.suggestedUnits)}
                      </td>
                      <td className="px-3 py-3 text-right font-mono tabular-nums text-muted">
                        {fmtNumber(s.suggestedCases)}
                      </td>
                      <td className="px-3 py-3 text-right font-mono tabular-nums text-foreground font-medium">
                        {fmtMXN(s.lostSale)}
                      </td>
                      <td className="px-5 py-3 text-right font-mono tabular-nums text-muted">
                        {s.confidence == null ? "—" : `${Math.round(s.confidence * 100)}%`}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </Card>
    </div>
  );
}
