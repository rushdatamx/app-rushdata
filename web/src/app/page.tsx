import { loadHomeData } from "@/lib/queries/home";
import { KPICard } from "@/components/ui/KPICard";
import { SeverityBadge } from "@/components/ui/SeverityBadge";
import { Card, CardHeader, CardBody } from "@/components/ui/Card";
import { fmtMXN, fmtNumber, fmtDecimal } from "@/lib/utils";
import { ArrowRight } from "lucide-react";
import Link from "next/link";

export const dynamic = "force-dynamic";

function fmtKPIDate(iso: string | null): string {
  if (!iso) return "—";
  const d = new Date(iso + "T00:00:00");
  return d.toLocaleDateString("es-MX", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });
}

function fmtFillRate(n: number | null): string {
  if (n == null) return "—";
  return `${fmtDecimal(n)}%`;
}

function ddiSeverity(ddi: number | null): "critical" | "high" | "medium" | "low" {
  if (ddi == null) return "medium";
  if (ddi <= 1) return "critical";
  if (ddi <= 3) return "high";
  if (ddi <= 7) return "medium";
  return "low";
}

export default async function Home() {
  const data = await loadHomeData();
  const { kpi, suggestedCount, suggestedValue, topSuggestions, alerts } = data;

  return (
    <div className="flex flex-col gap-8">
      {/* Header */}
      <div className="flex items-end justify-between">
        <div>
          <h1 className="text-[24px] leading-tight font-semibold text-foreground tracking-tight">
            Inicio · HEB
          </h1>
          <p className="text-[13px] text-muted mt-1">
            Sazonadores Vence Real · vista del {fmtKPIDate(kpi.date)}
          </p>
        </div>
      </div>

      {/* Hero KPI: Venta perdida potencial */}
      <Card className="overflow-hidden">
        <div className="px-6 py-6 flex items-start justify-between gap-8">
          <div className="flex-1 min-w-0">
            <div className="text-[11px] tracking-wider uppercase text-subtle font-medium">
              Venta perdida potencial
            </div>
            <div className="mt-3 flex items-baseline gap-3">
              <span className="font-mono tabular-nums text-[44px] leading-none font-medium text-foreground tracking-tight">
                {fmtMXN(kpi.lostSale)}
              </span>
              <span className="text-[13px] text-muted">MXN</span>
            </div>
            <div className="mt-3 text-[13px] text-muted">
              {kpi.stockouts > 0
                ? `${kpi.stockouts} quiebre${kpi.stockouts === 1 ? "" : "s"} activo${kpi.stockouts === 1 ? "" : "s"} · ${alerts.length} alerta${alerts.length === 1 ? "" : "s"} sin resolver`
                : "Sin quiebres activos al cierre del día"}
            </div>
          </div>
          <div className="hidden md:flex flex-col items-end gap-2 shrink-0">
            <div className="text-[11px] tracking-wider uppercase text-subtle font-medium">
              Inventario valuado
            </div>
            <div className="font-mono tabular-nums text-[20px] text-foreground">
              {fmtMXN(kpi.inventoryValue)}
            </div>
          </div>
        </div>
        <div className="h-1 w-full bg-danger" />
      </Card>

      {/* KPI grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <KPICard
          label="Sugeridos pendientes"
          value={fmtNumber(suggestedCount)}
          subtitle={`${fmtMXN(suggestedValue)} en riesgo`}
          href="/sugeridos"
          variant="default"
        />
        <KPICard
          label="Quiebres activos"
          value={fmtNumber(kpi.stockouts)}
          subtitle={
            kpi.stockouts === 0 ? "Ninguno hoy" : `${alerts.length} sin resolver`
          }
          href="/sugeridos"
          variant={kpi.stockouts > 0 ? "danger" : "success"}
        />
        <KPICard
          label="Fill rate promedio"
          value={fmtFillRate(kpi.fillRate)}
          subtitle={`${fmtNumber(kpi.activePOs)} OC activas`}
          href="/oc"
          variant={
            kpi.fillRate == null ? "default" : kpi.fillRate >= 95 ? "success" : "warning"
          }
        />
      </div>

      {/* Accionables prioritarios */}
      <Card>
        <CardHeader className="flex items-center justify-between">
          <div>
            <h2 className="text-[15px] font-semibold text-foreground">
              Accionables prioritarios
            </h2>
            <p className="text-[12px] text-muted mt-0.5">
              Sugeridos pendientes ordenados por venta perdida estimada
            </p>
          </div>
          <Link
            href="/sugeridos"
            className="text-[12px] text-accent hover:text-accent-hover inline-flex items-center gap-1 font-medium"
          >
            Ver todos los {suggestedCount}
            <ArrowRight className="size-3.5" strokeWidth={2} />
          </Link>
        </CardHeader>

        {topSuggestions.length === 0 ? (
          <CardBody>
            <div className="text-[13px] text-muted py-8 text-center">
              No hay sugeridos pendientes. Corre el motor para generar la siguiente tanda.
            </div>
          </CardBody>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-[13px]">
              <thead>
                <tr className="text-[11px] uppercase tracking-wider text-subtle border-b border-border">
                  <th className="text-left font-medium px-5 py-2.5 w-10">#</th>
                  <th className="text-left font-medium px-3 py-2.5">Tienda</th>
                  <th className="text-left font-medium px-3 py-2.5">Producto</th>
                  <th className="text-right font-medium px-3 py-2.5">DDI</th>
                  <th className="text-right font-medium px-3 py-2.5">Sugerido</th>
                  <th className="text-right font-medium px-3 py-2.5">Cajas</th>
                  <th className="text-right font-medium px-3 py-2.5">$ Riesgo</th>
                  <th className="text-right font-medium px-5 py-2.5">Confianza</th>
                </tr>
              </thead>
              <tbody>
                {topSuggestions.map((s, i) => (
                  <tr
                    key={s.id}
                    className="border-b border-border last:border-b-0 hover:bg-surface-hover transition-colors"
                  >
                    <td className="px-5 py-3 text-muted font-mono tabular-nums">
                      {i + 1}
                    </td>
                    <td className="px-3 py-3 text-foreground">{s.store}</td>
                    <td className="px-3 py-3 text-foreground">{s.product}</td>
                    <td className="px-3 py-3 text-right">
                      <span className="inline-flex items-center gap-2 justify-end">
                        <span className="font-mono tabular-nums text-foreground">
                          {fmtDecimal(s.ddi)}
                        </span>
                        <SeverityBadge level={ddiSeverity(s.ddi)} />
                      </span>
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
                      {s.confidence == null
                        ? "—"
                        : `${Math.round(s.confidence * 100)}%`}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      {/* Alertas */}
      {alerts.length > 0 && (
        <Card>
          <CardHeader>
            <h2 className="text-[15px] font-semibold text-foreground">
              Quiebres sin resolver
            </h2>
            <p className="text-[12px] text-muted mt-0.5">
              Tienda × SKU con stockout confirmado
            </p>
          </CardHeader>
          <div className="overflow-x-auto">
            <table className="w-full text-[13px]">
              <thead>
                <tr className="text-[11px] uppercase tracking-wider text-subtle border-b border-border">
                  <th className="text-left font-medium px-5 py-2.5">Tienda</th>
                  <th className="text-left font-medium px-3 py-2.5">Producto</th>
                  <th className="text-left font-medium px-3 py-2.5">Severidad</th>
                  <th className="text-right font-medium px-3 py-2.5">Días</th>
                  <th className="text-right font-medium px-5 py-2.5">$ Estimado</th>
                </tr>
              </thead>
              <tbody>
                {alerts.map((a) => (
                  <tr
                    key={a.id}
                    className="border-b border-border last:border-b-0 hover:bg-surface-hover transition-colors"
                  >
                    <td className="px-5 py-3 text-foreground">{a.store}</td>
                    <td className="px-3 py-3 text-foreground">{a.product}</td>
                    <td className="px-3 py-3">
                      <SeverityBadge level={a.severity} />
                    </td>
                    <td className="px-3 py-3 text-right font-mono tabular-nums text-foreground">
                      {fmtNumber(a.daysIn)}
                    </td>
                    <td className="px-5 py-3 text-right font-mono tabular-nums text-foreground font-medium">
                      {fmtMXN(a.lostSale)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      )}
    </div>
  );
}
