import Link from "next/link";
import { notFound } from "next/navigation";
import { ChevronLeft } from "lucide-react";
import { loadStoreDetail } from "@/lib/queries/store-detail";
import { Card, CardHeader } from "@/components/ui/Card";
import { KPICard } from "@/components/ui/KPICard";
import { SeverityBadge } from "@/components/ui/SeverityBadge";
import { ReasonBadge } from "@/components/ui/ReasonBadge";
import { Sparkline } from "@/components/ui/Sparkline";
import { fmtMXN, fmtNumber, fmtDecimal } from "@/lib/utils";
import { REASON_META, type ReasonCode } from "@/lib/queries/suggestions";

export const dynamic = "force-dynamic";

function ddiSeverity(ddi: number | null): "critical" | "high" | "medium" | "low" {
  if (ddi == null) return "medium";
  if (ddi <= 1) return "critical";
  if (ddi <= 3) return "high";
  if (ddi <= 7) return "medium";
  return "low";
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

type Params = Promise<{ id: string }>;

export default async function StoreDetailPage({ params }: { params: Params }) {
  const { id } = await params;
  const data = await loadStoreDetail(id);
  if (!data) notFound();

  const { store, skus, suggestions, recentPOs, totals } = data;

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-2">
        <Link
          href="/tiendas"
          className="inline-flex items-center gap-1 text-[12px] text-muted hover:text-foreground transition-colors w-fit"
        >
          <ChevronLeft className="size-3.5" strokeWidth={1.5} />
          Tiendas
        </Link>
        <div className="flex items-end justify-between gap-6">
          <div>
            <h1 className="text-[24px] leading-tight font-semibold text-foreground tracking-tight">
              {store.name}
              {store.isCedis && (
                <span className="ml-2 inline-flex items-center px-1.5 py-0.5 rounded bg-accent-soft text-accent text-[11px] font-medium align-middle">
                  CEDIS
                </span>
              )}
            </h1>
            <p className="text-[13px] text-muted mt-1">
              {store.externalCode && <span className="font-mono tabular-nums">#{store.externalCode} · </span>}
              {store.city && `${store.city}, `}{store.state ?? ""}
              {store.region && ` · ${store.region}`}
              {store.cluster && ` · Cluster ${store.cluster}`}
            </p>
          </div>
        </div>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <KPICard
          label="SKUs en stock"
          value={`${fmtNumber(totals.skusInStock)} / ${fmtNumber(totals.skusActive)}`}
          variant="default"
        />
        <KPICard
          label="Quiebres activos"
          value={fmtNumber(totals.stockouts)}
          variant={totals.stockouts > 0 ? "danger" : "success"}
        />
        <KPICard
          label="Sugeridos pend."
          value={fmtNumber(totals.pendingSuggestions)}
          subtitle={`${fmtNumber(totals.inventoryUnits)} uds inv.`}
          variant={totals.pendingSuggestions > 0 ? "warning" : "default"}
        />
        <KPICard
          label="Venta 30 días"
          value={fmtMXN(totals.revenue30d)}
          variant="default"
        />
      </div>

      {/* Sugeridos pendientes para esta tienda */}
      {suggestions.length > 0 && (
        <Card>
          <CardHeader>
            <h2 className="text-[15px] font-semibold text-foreground">
              Sugeridos pendientes
            </h2>
            <p className="text-[12px] text-muted mt-0.5">
              {fmtNumber(suggestions.length)} accionable{suggestions.length === 1 ? "" : "s"} · {fmtMXN(suggestions.reduce((a, s) => a + s.lostSale, 0))} en riesgo
            </p>
          </CardHeader>
          <div className="overflow-x-auto">
            <table className="w-full text-[13px]">
              <thead>
                <tr className="text-[11px] uppercase tracking-wider text-subtle border-b border-border">
                  <th className="text-left font-medium px-5 py-2.5">Producto</th>
                  <th className="text-left font-medium px-3 py-2.5">Razón</th>
                  <th className="text-right font-medium px-3 py-2.5">DDI</th>
                  <th className="text-right font-medium px-3 py-2.5">Sugerido</th>
                  <th className="text-right font-medium px-3 py-2.5">Cajas</th>
                  <th className="text-right font-medium px-5 py-2.5">$ Riesgo</th>
                </tr>
              </thead>
              <tbody>
                {suggestions.map((s) => {
                  const meta = s.reasonCode ? REASON_META[s.reasonCode as ReasonCode] : null;
                  return (
                    <tr key={s.id} className="border-b border-border last:border-b-0 hover:bg-surface-hover transition-colors">
                      <td className="px-5 py-3 text-foreground">{s.productName}</td>
                      <td className="px-3 py-3">
                        {meta && <ReasonBadge label={meta.label} tone={meta.tone} />}
                      </td>
                      <td className="px-3 py-3 text-right">
                        <span className="inline-flex items-center gap-2 justify-end">
                          <span className="font-mono tabular-nums text-foreground">{fmtDecimal(s.ddi)}</span>
                          <SeverityBadge level={ddiSeverity(s.ddi)} label="" />
                        </span>
                      </td>
                      <td className="px-3 py-3 text-right font-mono tabular-nums text-foreground">{fmtNumber(s.suggestedUnits)}</td>
                      <td className="px-3 py-3 text-right font-mono tabular-nums text-muted">{fmtNumber(s.suggestedCases)}</td>
                      <td className="px-5 py-3 text-right font-mono tabular-nums text-foreground font-medium">{fmtMXN(s.lostSale)}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </Card>
      )}

      {/* SKUs en la tienda */}
      <Card>
        <CardHeader>
          <h2 className="text-[15px] font-semibold text-foreground">SKUs en esta tienda</h2>
          <p className="text-[12px] text-muted mt-0.5">Ordenado por venta de los últimos 30 días</p>
        </CardHeader>
        <div className="overflow-x-auto">
          <table className="w-full text-[13px]">
            <thead>
              <tr className="text-[11px] uppercase tracking-wider text-subtle border-b border-border">
                <th className="text-left font-medium px-5 py-2.5">Producto</th>
                <th className="text-right font-medium px-3 py-2.5">Stock</th>
                <th className="text-right font-medium px-3 py-2.5">Vel/día</th>
                <th className="text-right font-medium px-3 py-2.5">DDI</th>
                <th className="text-right font-medium px-3 py-2.5">Unid. 30d</th>
                <th className="text-right font-medium px-3 py-2.5">Venta 30d</th>
                <th className="text-left font-medium px-5 py-2.5 w-[120px]">8 sem.</th>
              </tr>
            </thead>
            <tbody>
              {skus.map((k) => {
                const sparkData = k.weekly.map((w) => ({ x: w.weekStart, y: w.units }));
                const tone = k.hasStockout ? "danger" : k.revenue30d > 0 ? "accent" : "muted";
                return (
                  <tr key={k.productId} className="border-b border-border last:border-b-0 hover:bg-surface-hover transition-colors">
                    <td className="px-5 py-3 text-foreground">
                      <Link href={`/productos/${k.productId}`} className="hover:text-accent transition-colors">
                        <div className="flex flex-col">
                          <span className="font-medium">{k.name}</span>
                          {k.category && (
                            <span className="text-[11px] text-subtle">
                              {k.category}{k.sizeGrams ? ` · ${k.sizeGrams}gr` : ""}
                            </span>
                          )}
                        </div>
                      </Link>
                    </td>
                    <td className="px-3 py-3 text-right">
                      <span className={`font-mono tabular-nums ${k.hasStockout ? "text-danger font-medium" : "text-foreground"}`}>
                        {fmtNumber(k.inventory)}
                      </span>
                    </td>
                    <td className="px-3 py-3 text-right font-mono tabular-nums text-muted">{fmtDecimal(k.velocity)}</td>
                    <td className="px-3 py-3 text-right">
                      <span className="inline-flex items-center gap-2 justify-end">
                        <span className="font-mono tabular-nums text-foreground">{fmtDecimal(k.ddi)}</span>
                        {k.ddi != null && <SeverityBadge level={ddiSeverity(k.ddi)} label="" />}
                      </span>
                    </td>
                    <td className="px-3 py-3 text-right font-mono tabular-nums text-muted">{fmtNumber(k.units30d)}</td>
                    <td className="px-3 py-3 text-right font-mono tabular-nums text-foreground font-medium">{fmtMXN(k.revenue30d)}</td>
                    <td className="px-5 py-3">
                      <Sparkline data={sparkData} tone={tone} height={22} width={100} />
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </Card>

      {/* OCs recientes a esta tienda */}
      {recentPOs.length > 0 && (
        <Card>
          <CardHeader>
            <h2 className="text-[15px] font-semibold text-foreground">OCs recientes</h2>
            <p className="text-[12px] text-muted mt-0.5">Últimas 10 órdenes hacia esta tienda</p>
          </CardHeader>
          <div className="overflow-x-auto">
            <table className="w-full text-[13px]">
              <thead>
                <tr className="text-[11px] uppercase tracking-wider text-subtle border-b border-border">
                  <th className="text-left font-medium px-5 py-2.5">OC</th>
                  <th className="text-left font-medium px-3 py-2.5">Fecha</th>
                  <th className="text-left font-medium px-3 py-2.5">Estado</th>
                  <th className="text-right font-medium px-3 py-2.5">Pedido</th>
                  <th className="text-right font-medium px-3 py-2.5">Recibido</th>
                  <th className="text-right font-medium px-5 py-2.5">Valor OC</th>
                </tr>
              </thead>
              <tbody>
                {recentPOs.map((po) => (
                  <tr key={po.id} className="border-b border-border last:border-b-0 hover:bg-surface-hover transition-colors">
                    <td className="px-5 py-3 font-mono tabular-nums text-foreground">{po.poNumber ?? po.id.slice(0, 8)}</td>
                    <td className="px-3 py-3 text-muted">{fmtOrderDate(po.orderDate)}</td>
                    <td className="px-3 py-3">
                      <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[11px] font-medium bg-success-soft text-success">
                        {STATUS_LABEL[po.status] ?? po.status}
                      </span>
                    </td>
                    <td className="px-3 py-3 text-right font-mono tabular-nums text-muted">{fmtNumber(po.unitsOrdered)}</td>
                    <td className="px-3 py-3 text-right font-mono tabular-nums text-muted">{fmtNumber(po.unitsReceived)}</td>
                    <td className="px-5 py-3 text-right font-mono tabular-nums text-foreground font-medium">{fmtMXN(po.value)}</td>
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
