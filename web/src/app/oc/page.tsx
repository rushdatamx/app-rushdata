import { loadPOOverview } from "@/lib/queries/po";
import { Card, CardHeader } from "@/components/ui/Card";
import { KPICard } from "@/components/ui/KPICard";
import { BarChart } from "@/components/ui/BarChart";
import { fmtMXN, fmtNumber, fmtDecimal } from "@/lib/utils";

export const dynamic = "force-dynamic";

const MES = [
  "ene",
  "feb",
  "mar",
  "abr",
  "may",
  "jun",
  "jul",
  "ago",
  "sep",
  "oct",
  "nov",
  "dic",
];

function fmtMonthLabel(iso: string): string {
  const d = new Date(iso + "T00:00:00");
  const m = MES[d.getMonth()];
  const y = String(d.getFullYear()).slice(2);
  return `${m} ${y}`;
}

function fmtPOFillPct(n: number | null): string {
  if (n == null) return "—";
  return `${fmtDecimal(n * 100)}%`;
}

function fmtOrderDate(iso: string): string {
  if (!iso) return "—";
  const d = new Date(iso + "T00:00:00");
  return d.toLocaleDateString("es-MX", { day: "2-digit", month: "short", year: "2-digit" });
}

const STATUS_LABEL: Record<string, string> = {
  fulfilled: "Recibida",
  pending: "Pendiente",
  partial: "Parcial",
  cancelled: "Cancelada",
};

export default async function OCPage() {
  const data = await loadPOOverview();
  const { totals, monthly, topStores, topProducts, recent } = data;

  const peakMonth = monthly.reduce(
    (best, m) => (m.value > best.value ? m : best),
    monthly[0] ?? { monthStart: "", value: 0 }
  );

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-end justify-between gap-6">
        <div>
          <h1 className="text-[24px] leading-tight font-semibold text-foreground tracking-tight">
            Órdenes de compra
          </h1>
          <p className="text-[13px] text-muted mt-1">
            {fmtNumber(totals.poCount)} OCs históricas · {fmtMXN(totals.value)} ordenado · {fmtNumber(totals.unitsOrdered)} unidades
          </p>
        </div>
      </div>

      {/* Hero */}
      <Card className="overflow-hidden">
        <div className="px-6 py-6 flex items-start justify-between gap-8">
          <div className="flex-1 min-w-0">
            <div className="text-[11px] tracking-wider uppercase text-subtle font-medium">
              Valor total movido
            </div>
            <div className="mt-3 flex items-baseline gap-3">
              <span className="font-mono tabular-nums text-[44px] leading-none font-medium text-foreground tracking-tight">
                {fmtMXN(totals.value)}
              </span>
              <span className="text-[13px] text-muted">MXN</span>
            </div>
            <div className="mt-3 text-[13px] text-muted">
              Pico: {peakMonth.monthStart ? fmtMonthLabel(peakMonth.monthStart) : "—"} con {fmtMXN(peakMonth.value)} ({fmtNumber(peakMonth.poCount)} OCs)
            </div>
          </div>
          <div className="hidden md:flex flex-col items-end gap-2 shrink-0">
            <div className="text-[11px] tracking-wider uppercase text-subtle font-medium">
              Fill rate promedio
            </div>
            <div className="font-mono tabular-nums text-[20px] text-foreground">
              {fmtPOFillPct(totals.avgFillRate)}
            </div>
          </div>
        </div>
        <div className="h-1 w-full bg-accent" />
      </Card>

      {/* KPI grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <KPICard
          label="OC últimos 30 días"
          value={fmtNumber(totals.last30dCount)}
          subtitle={`${fmtMXN(totals.last30dValue)} ordenado`}
          variant="default"
        />
        <KPICard
          label="Unidades recibidas"
          value={fmtNumber(totals.unitsReceived)}
          subtitle={`vs ${fmtNumber(totals.unitsOrdered)} ordenadas`}
          variant="success"
        />
        <KPICard
          label="Ticket promedio"
          value={
            totals.poCount > 0
              ? fmtMXN(totals.value / totals.poCount)
              : "—"
          }
          subtitle={`${fmtNumber(totals.poCount)} OCs totales`}
          variant="default"
        />
      </div>

      {/* Tendencia mensual */}
      <Card>
        <CardHeader>
          <h2 className="text-[15px] font-semibold text-foreground">
            Valor ordenado por mes
          </h2>
          <p className="text-[12px] text-muted mt-0.5">
            {monthly.length} meses · estacionalidad jul–dic visible
          </p>
        </CardHeader>
        <div className="px-5 py-5">
          <BarChart
            data={monthly.map((m) => ({
              label: fmtMonthLabel(m.monthStart),
              value: m.value,
            }))}
            height={180}
            format={(n) => fmtMXN(n)}
          />
        </div>
      </Card>

      {/* Top tiendas + top productos */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <Card>
          <CardHeader>
            <h2 className="text-[15px] font-semibold text-foreground">
              Top tiendas por valor
            </h2>
            <p className="text-[12px] text-muted mt-0.5">Histórico completo</p>
          </CardHeader>
          <div className="overflow-x-auto">
            <table className="w-full text-[13px]">
              <thead>
                <tr className="text-[11px] uppercase tracking-wider text-subtle border-b border-border">
                  <th className="text-left font-medium px-5 py-2 w-8">#</th>
                  <th className="text-left font-medium px-3 py-2">Tienda</th>
                  <th className="text-right font-medium px-3 py-2">OCs</th>
                  <th className="text-right font-medium px-3 py-2">Unidades</th>
                  <th className="text-right font-medium px-5 py-2">Valor</th>
                </tr>
              </thead>
              <tbody>
                {topStores.map((s, i) => (
                  <tr
                    key={s.id}
                    className="border-b border-border last:border-b-0 hover:bg-surface-hover transition-colors"
                  >
                    <td className="px-5 py-2.5 text-muted font-mono tabular-nums">{i + 1}</td>
                    <td className="px-3 py-2.5 text-foreground">
                      <div className="flex flex-col">
                        <span>{s.name}</span>
                        {s.cluster && (
                          <span className="text-[11px] text-subtle">Cluster {s.cluster}</span>
                        )}
                      </div>
                    </td>
                    <td className="px-3 py-2.5 text-right font-mono tabular-nums text-muted">
                      {fmtNumber(s.poCount)}
                    </td>
                    <td className="px-3 py-2.5 text-right font-mono tabular-nums text-muted">
                      {fmtNumber(s.units)}
                    </td>
                    <td className="px-5 py-2.5 text-right font-mono tabular-nums text-foreground font-medium">
                      {fmtMXN(s.value)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>

        <Card>
          <CardHeader>
            <h2 className="text-[15px] font-semibold text-foreground">
              Top productos por valor
            </h2>
            <p className="text-[12px] text-muted mt-0.5">Histórico completo</p>
          </CardHeader>
          <div className="overflow-x-auto">
            <table className="w-full text-[13px]">
              <thead>
                <tr className="text-[11px] uppercase tracking-wider text-subtle border-b border-border">
                  <th className="text-left font-medium px-5 py-2 w-8">#</th>
                  <th className="text-left font-medium px-3 py-2">Producto</th>
                  <th className="text-right font-medium px-3 py-2">OCs</th>
                  <th className="text-right font-medium px-3 py-2">Unidades</th>
                  <th className="text-right font-medium px-5 py-2">Valor</th>
                </tr>
              </thead>
              <tbody>
                {topProducts.map((p, i) => (
                  <tr
                    key={p.id}
                    className="border-b border-border last:border-b-0 hover:bg-surface-hover transition-colors"
                  >
                    <td className="px-5 py-2.5 text-muted font-mono tabular-nums">{i + 1}</td>
                    <td className="px-3 py-2.5 text-foreground">
                      <div className="flex flex-col">
                        <span>{p.name}</span>
                        {p.category && (
                          <span className="text-[11px] text-subtle capitalize">{p.category}</span>
                        )}
                      </div>
                    </td>
                    <td className="px-3 py-2.5 text-right font-mono tabular-nums text-muted">
                      {fmtNumber(p.poCount)}
                    </td>
                    <td className="px-3 py-2.5 text-right font-mono tabular-nums text-muted">
                      {fmtNumber(p.units)}
                    </td>
                    <td className="px-5 py-2.5 text-right font-mono tabular-nums text-foreground font-medium">
                      {fmtMXN(p.value)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      </div>

      {/* OCs recientes */}
      <Card>
        <CardHeader>
          <h2 className="text-[15px] font-semibold text-foreground">OCs recientes</h2>
          <p className="text-[12px] text-muted mt-0.5">Últimas 15 órdenes registradas</p>
        </CardHeader>
        <div className="overflow-x-auto">
          <table className="w-full text-[13px]">
            <thead>
              <tr className="text-[11px] uppercase tracking-wider text-subtle border-b border-border">
                <th className="text-left font-medium px-5 py-2.5">OC</th>
                <th className="text-left font-medium px-3 py-2.5">Fecha</th>
                <th className="text-left font-medium px-3 py-2.5">Estado</th>
                <th className="text-right font-medium px-3 py-2.5">Líneas</th>
                <th className="text-right font-medium px-3 py-2.5">Pedido</th>
                <th className="text-right font-medium px-3 py-2.5">Recibido</th>
                <th className="text-right font-medium px-3 py-2.5">Fill</th>
                <th className="text-right font-medium px-5 py-2.5">Valor</th>
              </tr>
            </thead>
            <tbody>
              {recent.map((po) => (
                <tr
                  key={po.id}
                  className="border-b border-border last:border-b-0 hover:bg-surface-hover transition-colors"
                >
                  <td className="px-5 py-3 font-mono tabular-nums text-foreground">
                    {po.poNumber ?? po.id.slice(0, 8)}
                  </td>
                  <td className="px-3 py-3 text-muted">{fmtOrderDate(po.orderDate)}</td>
                  <td className="px-3 py-3">
                    <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[11px] font-medium bg-success-soft text-success">
                      {STATUS_LABEL[po.status] ?? po.status}
                    </span>
                  </td>
                  <td className="px-3 py-3 text-right font-mono tabular-nums text-muted">
                    {fmtNumber(po.lineCount)}
                  </td>
                  <td className="px-3 py-3 text-right font-mono tabular-nums text-muted">
                    {fmtNumber(po.unitsOrdered)}
                  </td>
                  <td className="px-3 py-3 text-right font-mono tabular-nums text-muted">
                    {fmtNumber(po.unitsReceived)}
                  </td>
                  <td className="px-3 py-3 text-right font-mono tabular-nums text-foreground">
                    {fmtPOFillPct(po.fillRate)}
                  </td>
                  <td className="px-5 py-3 text-right font-mono tabular-nums text-foreground font-medium">
                    {fmtMXN(po.value)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}
