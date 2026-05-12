import Link from "next/link";
import { notFound } from "next/navigation";
import { ChevronLeft } from "lucide-react";
import { loadProductDetail } from "@/lib/queries/product-detail";
import { Card, CardHeader } from "@/components/ui/Card";
import { KPICard } from "@/components/ui/KPICard";
import { SeverityBadge } from "@/components/ui/SeverityBadge";
import { ReasonBadge } from "@/components/ui/ReasonBadge";
import { BarChart } from "@/components/ui/BarChart";
import { fmtMXN, fmtNumber, fmtDecimal } from "@/lib/utils";
import { REASON_META, type ReasonCode } from "@/lib/queries/suggestions";

export const dynamic = "force-dynamic";

const MES = ["ene", "feb", "mar", "abr", "may", "jun", "jul", "ago", "sep", "oct", "nov", "dic"];

function ddiSeverity(ddi: number | null): "critical" | "high" | "medium" | "low" {
  if (ddi == null) return "medium";
  if (ddi <= 1) return "critical";
  if (ddi <= 3) return "high";
  if (ddi <= 7) return "medium";
  return "low";
}

function fmtMonthLabel(iso: string): string {
  const d = new Date(iso + "T00:00:00");
  return `${MES[d.getMonth()]} ${String(d.getFullYear()).slice(2)}`;
}

// Agrupa semanas en meses para el BarChart
function weeklyToMonthly(weekly: Array<{ weekStart: string; revenue: number; units: number }>) {
  const map = new Map<string, { label: string; value: number; units: number }>();
  for (const w of weekly) {
    const d = new Date(w.weekStart + "T00:00:00");
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-01`;
    const existing = map.get(key);
    if (existing) {
      existing.value += w.revenue;
      existing.units += w.units;
    } else {
      map.set(key, { label: fmtMonthLabel(key), value: w.revenue, units: w.units });
    }
  }
  return Array.from(map.values());
}

type Params = Promise<{ id: string }>;

export default async function ProductDetailPage({ params }: { params: Params }) {
  const { id } = await params;
  const data = await loadProductDetail(id);
  if (!data) notFound();

  const { product, weekly, stores, suggestions, totals } = data;
  const monthly = weeklyToMonthly(weekly);
  const margin = product.unitPrice > 0 ? (product.unitPrice - product.unitCost) / product.unitPrice : null;

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-2">
        <Link
          href="/productos"
          className="inline-flex items-center gap-1 text-[12px] text-muted hover:text-foreground transition-colors w-fit"
        >
          <ChevronLeft className="size-3.5" strokeWidth={1.5} />
          Productos
        </Link>
        <div className="flex items-end justify-between gap-6">
          <div>
            <h1 className="text-[24px] leading-tight font-semibold text-foreground tracking-tight">
              {product.name}
            </h1>
            <p className="text-[13px] text-muted mt-1">
              {product.upc && <span className="font-mono tabular-nums">UPC {product.upc} · </span>}
              {product.category}
              {product.sizeGrams ? ` · ${product.sizeGrams}gr` : ""}
              {` · ${fmtMXN(product.unitPrice)}`}
              {margin != null && ` · margen ${Math.round(margin * 100)}%`}
            </p>
          </div>
        </div>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <KPICard
          label="Tiendas activas"
          value={fmtNumber(totals.storesWithInventory)}
          subtitle={`de ${fmtNumber(stores.length)} totales`}
          variant="default"
        />
        <KPICard
          label="Quiebres"
          value={fmtNumber(totals.storesWithStockout)}
          variant={totals.storesWithStockout > 0 ? "danger" : "success"}
        />
        <KPICard
          label="Inventario"
          value={fmtNumber(totals.inventoryUnits)}
          subtitle="unidades en red"
          variant="default"
        />
        <KPICard
          label="Venta 30 días"
          value={fmtMXN(totals.revenue30d)}
          subtitle={`${fmtNumber(totals.units30d)} unidades`}
          variant="default"
        />
      </div>

      {/* Tendencia mensual */}
      {monthly.length > 0 && (
        <Card>
          <CardHeader>
            <h2 className="text-[15px] font-semibold text-foreground">Venta mensual</h2>
            <p className="text-[12px] text-muted mt-0.5">
              {monthly.length} meses de histórico
            </p>
          </CardHeader>
          <div className="px-5 py-5">
            <BarChart
              data={monthly}
              height={160}
              format={(n) => fmtMXN(n)}
            />
          </div>
        </Card>
      )}

      {/* Sugeridos pendientes para este SKU */}
      {suggestions.length > 0 && (
        <Card>
          <CardHeader>
            <h2 className="text-[15px] font-semibold text-foreground">Sugeridos pendientes</h2>
            <p className="text-[12px] text-muted mt-0.5">
              {fmtNumber(suggestions.length)} tienda{suggestions.length === 1 ? "" : "s"} con sugerido activo
            </p>
          </CardHeader>
          <div className="overflow-x-auto">
            <table className="w-full text-[13px]">
              <thead>
                <tr className="text-[11px] uppercase tracking-wider text-subtle border-b border-border">
                  <th className="text-left font-medium px-5 py-2.5">Tienda</th>
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
                      <td className="px-5 py-3 text-foreground">
                        <div className="flex flex-col">
                          <span>{s.storeName}</span>
                          {s.storeCluster && (
                            <span className="text-[11px] text-subtle">Cluster {s.storeCluster}</span>
                          )}
                        </div>
                      </td>
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

      {/* Tiendas con este producto */}
      <Card>
        <CardHeader>
          <h2 className="text-[15px] font-semibold text-foreground">Tiendas con este SKU</h2>
          <p className="text-[12px] text-muted mt-0.5">Ordenado por venta 30 días</p>
        </CardHeader>
        <div className="overflow-x-auto">
          <table className="w-full text-[13px]">
            <thead>
              <tr className="text-[11px] uppercase tracking-wider text-subtle border-b border-border">
                <th className="text-left font-medium px-5 py-2.5">Tienda</th>
                <th className="text-left font-medium px-3 py-2.5">Cluster</th>
                <th className="text-right font-medium px-3 py-2.5">Stock</th>
                <th className="text-right font-medium px-3 py-2.5">Vel/día</th>
                <th className="text-right font-medium px-3 py-2.5">DDI</th>
                <th className="text-right font-medium px-3 py-2.5">Unid. 30d</th>
                <th className="text-right font-medium px-5 py-2.5">Venta 30d</th>
              </tr>
            </thead>
            <tbody>
              {stores.map((s) => (
                <tr key={s.storeId} className="border-b border-border last:border-b-0 hover:bg-surface-hover transition-colors">
                  <td className="px-5 py-3 text-foreground">
                    <Link href={`/tiendas/${s.storeId}`} className="hover:text-accent transition-colors">
                      <div className="flex flex-col">
                        <span className="font-medium">{s.name}</span>
                        {s.city && <span className="text-[11px] text-subtle">{s.city}</span>}
                      </div>
                    </Link>
                  </td>
                  <td className="px-3 py-3 font-mono tabular-nums text-[11px] text-muted">{s.cluster ?? "—"}</td>
                  <td className="px-3 py-3 text-right">
                    <span className={`font-mono tabular-nums ${s.hasStockout ? "text-danger font-medium" : "text-foreground"}`}>
                      {fmtNumber(s.inventory)}
                    </span>
                  </td>
                  <td className="px-3 py-3 text-right font-mono tabular-nums text-muted">{fmtDecimal(s.velocity)}</td>
                  <td className="px-3 py-3 text-right">
                    <span className="inline-flex items-center gap-2 justify-end">
                      <span className="font-mono tabular-nums text-foreground">{fmtDecimal(s.ddi)}</span>
                      {s.ddi != null && <SeverityBadge level={ddiSeverity(s.ddi)} label="" />}
                    </span>
                  </td>
                  <td className="px-3 py-3 text-right font-mono tabular-nums text-muted">{fmtNumber(s.units30d)}</td>
                  <td className="px-5 py-3 text-right font-mono tabular-nums text-foreground font-medium">{fmtMXN(s.revenue30d)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}
