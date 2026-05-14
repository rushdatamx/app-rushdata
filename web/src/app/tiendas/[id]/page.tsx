import Link from "next/link";
import { notFound } from "next/navigation";
import { ChevronLeft, AlertTriangle, ArrowUpRight } from "lucide-react";

import { loadStoreDetail } from "@/lib/queries/store-detail";
import { Card, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { StoreDetailHero } from "@/components/tiendas/StoreDetailHero";
import { StoreSkusCsvButton } from "@/components/tiendas/StoreSkusCsvButton";
import { StorePOsCsvButton } from "@/components/tiendas/StorePOsCsvButton";
import { MiniSparkline } from "@/components/productos/MiniSparkline";
import { fmtMXN, fmtNumber, fmtDecimal } from "@/lib/format";
import { REASON_META, type ReasonCode } from "@/lib/queries/suggestions";

export const dynamic = "force-dynamic";

const REASON_BADGE: Record<string, { className: string; label: string }> = {
  stockout_risk: {
    className: "bg-rose-100 text-rose-700 hover:bg-rose-100",
    label: "Riesgo quiebre",
  },
  low_ddi: {
    className: "bg-amber-100 text-amber-700 hover:bg-amber-100",
    label: "DDI bajo",
  },
  velocity_up: {
    className: "bg-emerald-100 text-emerald-700 hover:bg-emerald-100",
    label: "Velocity ↑",
  },
  periodic_replenish: {
    className: "bg-muted text-muted-foreground hover:bg-muted",
    label: "Reposición",
  },
  multi_flavor_restock: {
    className: "bg-violet-100 text-violet-700 hover:bg-violet-100",
    label: "PDQ",
  },
};

const SEV_BADGE: Record<string, { className: string; label: string }> = {
  critical: { className: "bg-rose-100 text-rose-700 hover:bg-rose-100", label: "crítico" },
  high: { className: "bg-amber-100 text-amber-800 hover:bg-amber-100", label: "alto" },
  medium: { className: "bg-amber-50 text-amber-700 hover:bg-amber-50", label: "medio" },
  low: { className: "bg-emerald-50 text-emerald-700 hover:bg-emerald-50", label: "ok" },
};

const PO_STATUS: Record<string, { className: string; label: string }> = {
  fulfilled: {
    className: "bg-emerald-100 text-emerald-700 hover:bg-emerald-100",
    label: "Recibida",
  },
  pending: {
    className: "bg-amber-100 text-amber-700 hover:bg-amber-100",
    label: "Pendiente",
  },
  partial: {
    className: "bg-orange-100 text-orange-700 hover:bg-orange-100",
    label: "Parcial",
  },
  cancelled: {
    className: "bg-muted text-muted-foreground hover:bg-muted",
    label: "Cancelada",
  },
};

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
  return d.toLocaleDateString("es-MX", {
    day: "2-digit",
    month: "short",
    year: "2-digit",
  });
}

type Params = Promise<{ id: string }>;

export default async function StoreDetailPage({ params }: { params: Params }) {
  const { id } = await params;
  const data = await loadStoreDetail(id);
  if (!data) notFound();

  const { store, skus, suggestions, recentPOs, totals } = data;

  // Aggregate weekly revenue across all SKUs (each sku has weekly: units only)
  // Use unitPrice to estimate revenue per week per sku
  const weeklyMap = new Map<string, number>();
  for (const k of skus) {
    for (const w of k.weekly) {
      weeklyMap.set(
        w.weekStart,
        (weeklyMap.get(w.weekStart) ?? 0) + w.units * k.unitPrice
      );
    }
  }
  const weeklyRevenue = Array.from(weeklyMap.entries())
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([weekStart, revenue]) => ({ weekStart, revenue }));

  const stockoutSkus = skus.filter((k) => k.hasStockout);

  return (
    <div className="flex flex-col gap-6">
      {/* Breadcrumb back */}
      <div>
        <Link
          href="/tiendas"
          className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors w-fit"
        >
          <ChevronLeft className="size-3.5" strokeWidth={1.5} />
          Volver a tiendas
        </Link>
        <div className="flex items-end justify-between gap-6 mt-2">
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-3xl lg:text-4xl font-semibold tracking-tight">
                {store.name}
              </h1>
              {store.isCedis && (
                <Badge
                  variant="secondary"
                  className="bg-violet-100 text-violet-700 hover:bg-violet-100"
                >
                  CEDIS
                </Badge>
              )}
            </div>
            <p className="text-sm text-muted-foreground mt-2">
              {store.externalCode && (
                <span className="font-mono tabular-nums">#{store.externalCode}</span>
              )}
              {store.city && ` · ${store.city}`}
              {store.state ? `, ${store.state}` : ""}
              {store.region && ` · ${store.region}`}
              {store.cluster && ` · Cluster ${store.cluster}`}
            </p>
          </div>
        </div>
      </div>

      {/* Hero */}
      <StoreDetailHero
        weeklyRevenue={weeklyRevenue}
        skusInStock={totals.skusInStock}
        skusActive={totals.skusActive}
        stockouts={totals.stockouts}
        inventoryUnits={totals.inventoryUnits}
        inventoryValue={totals.inventoryValue}
        revenue30d={totals.revenue30d}
        avgFillRate={totals.avgFillRate}
        avgLeadTimeDays={totals.avgLeadTimeDays}
      />

      {/* Sugeridos pendientes — CTA principal */}
      {suggestions.length > 0 && (
        <Card className="p-0 gap-0 overflow-hidden">
          <CardHeader className="px-6 py-4 border-b">
            <CardTitle className="text-base">
              Sugeridos pendientes para esta tienda
            </CardTitle>
            <CardDescription>
              {fmtNumber(suggestions.length)} accionables ·{" "}
              <span className="text-rose-700 font-medium">
                {fmtMXN(suggestions.reduce((a, s) => a + s.lostSale, 0))}
              </span>{" "}
              en riesgo · ordenado por venta perdida
            </CardDescription>
          </CardHeader>
          <Table>
            <TableHeader>
              <TableRow className="bg-muted/30 hover:bg-muted/30">
                <TableHead className="pl-6">Producto</TableHead>
                <TableHead>Razón</TableHead>
                <TableHead className="text-right">DDI</TableHead>
                <TableHead className="text-right">Sugerido</TableHead>
                <TableHead className="text-right">Cajas</TableHead>
                <TableHead className="text-right pr-6">$ Riesgo</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {suggestions.map((s) => {
                const reason =
                  s.reasonCode ? REASON_BADGE[s.reasonCode] : null;
                const sev = ddiSeverity(s.ddi);
                const sevStyles = SEV_BADGE[sev];
                return (
                  <TableRow key={s.id}>
                    <TableCell className="pl-6 font-medium">{s.productName}</TableCell>
                    <TableCell>
                      {reason && (
                        <Badge variant="secondary" className={reason.className}>
                          {reason.label}
                        </Badge>
                      )}
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="inline-flex items-center gap-2 justify-end">
                        <span className="font-mono tabular-nums">
                          {fmtDecimal(s.ddi)}
                        </span>
                        <Badge variant="secondary" className={sevStyles.className}>
                          {sevStyles.label}
                        </Badge>
                      </div>
                    </TableCell>
                    <TableCell className="text-right font-mono tabular-nums">
                      {fmtNumber(s.suggestedUnits)}
                    </TableCell>
                    <TableCell className="text-right font-mono tabular-nums text-muted-foreground">
                      {fmtNumber(s.suggestedCases)}
                    </TableCell>
                    <TableCell className="text-right pr-6 font-mono tabular-nums font-semibold">
                      {fmtMXN(s.lostSale)}
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </Card>
      )}

      {/* Quiebres destacados */}
      {stockoutSkus.length > 0 && (
        <Card className="p-0 gap-0 overflow-hidden border-rose-200">
          <CardHeader className="px-6 py-4 border-b bg-rose-50/50">
            <CardTitle className="text-base inline-flex items-center gap-2">
              <AlertTriangle className="size-4 text-rose-600" strokeWidth={2} />
              SKUs en quiebre ahora
            </CardTitle>
            <CardDescription>
              {fmtNumber(stockoutSkus.length)} producto{stockoutSkus.length === 1 ? "" : "s"}{" "}
              sin stock — venta perdida activa
            </CardDescription>
          </CardHeader>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-px bg-border">
            {stockoutSkus.map((k) => (
              <Link
                key={k.productId}
                href={`/productos/${k.productId}`}
                className="group bg-background p-4 hover:bg-muted/40 transition-colors"
              >
                <div className="flex items-center justify-between gap-2">
                  <div className="font-medium text-sm truncate">{k.name}</div>
                  <ArrowUpRight
                    className="size-3 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity shrink-0"
                    strokeWidth={2}
                  />
                </div>
                {k.category && (
                  <div className="text-[11px] text-muted-foreground capitalize mt-0.5">
                    {k.category}
                    {k.sizeGrams ? ` · ${k.sizeGrams}gr` : ""}
                  </div>
                )}
                <div className="mt-2 text-[11px] text-muted-foreground">
                  Vendía{" "}
                  <span className="font-mono tabular-nums text-foreground font-medium">
                    {fmtDecimal(k.velocity)}
                  </span>{" "}
                  un/día
                </div>
              </Link>
            ))}
          </div>
        </Card>
      )}

      {/* Tabla completa de SKUs */}
      <Card className="p-0 gap-0 overflow-hidden">
        <CardHeader className="px-6 py-4 border-b flex flex-row items-start justify-between gap-4 space-y-0">
          <div>
            <CardTitle className="text-base">SKUs en esta tienda</CardTitle>
            <CardDescription>
              {fmtNumber(skus.length)} SKUs · ordenado por venta 30 días
            </CardDescription>
          </div>
          <StoreSkusCsvButton
            rows={skus.map((k) => ({
              productId: k.productId,
              name: k.name,
              category: k.category,
              sizeGrams: k.sizeGrams,
              inventory: k.inventory,
              velocity: k.velocity,
              ddi: k.ddi,
              units30d: k.units30d,
              revenue30d: k.revenue30d,
              hasStockout: k.hasStockout,
            }))}
            filename={`skus_${store.externalCode ?? store.id}`}
          />
        </CardHeader>
        <Table>
          <TableHeader>
            <TableRow className="bg-muted/30 hover:bg-muted/30">
              <TableHead className="pl-6">Producto</TableHead>
              <TableHead className="text-right">Stock</TableHead>
              <TableHead className="text-right">Vel/día</TableHead>
              <TableHead className="text-right">DDI</TableHead>
              <TableHead className="text-right">Un. 30d</TableHead>
              <TableHead className="text-right">Venta 30d</TableHead>
              <TableHead className="pr-6">8 sem</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {skus.map((k) => {
              const sev = ddiSeverity(k.ddi);
              const sevStyles = SEV_BADGE[sev];
              const tone = k.hasStockout ? "danger" : k.revenue30d > 0 ? "success" : "muted";
              const sparkData = k.weekly.map((w) => ({ x: w.weekStart, y: w.units }));
              return (
                <TableRow key={k.productId} className="group">
                  <TableCell className="pl-6">
                    <Link
                      href={`/productos/${k.productId}`}
                      className="block hover:text-foreground/80 transition-colors"
                    >
                      <div className="flex items-center gap-2">
                        <span className="font-medium">{k.name}</span>
                        <ArrowUpRight
                          className="size-3 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity"
                          strokeWidth={2}
                        />
                      </div>
                      {k.category && (
                        <div className="text-[11px] text-muted-foreground capitalize">
                          {k.category}
                          {k.sizeGrams ? ` · ${k.sizeGrams}gr` : ""}
                        </div>
                      )}
                    </Link>
                  </TableCell>
                  <TableCell
                    className={`text-right font-mono tabular-nums ${
                      k.hasStockout ? "text-rose-700 font-semibold" : ""
                    }`}
                  >
                    {fmtNumber(k.inventory)}
                  </TableCell>
                  <TableCell className="text-right font-mono tabular-nums text-muted-foreground">
                    {fmtDecimal(k.velocity)}
                  </TableCell>
                  <TableCell className="text-right">
                    {k.ddi != null ? (
                      <div className="inline-flex items-center gap-2 justify-end">
                        <span className="font-mono tabular-nums">{fmtDecimal(k.ddi)}</span>
                        <Badge variant="secondary" className={sevStyles.className}>
                          {sevStyles.label}
                        </Badge>
                      </div>
                    ) : (
                      <span className="text-muted-foreground/50">—</span>
                    )}
                  </TableCell>
                  <TableCell className="text-right font-mono tabular-nums text-muted-foreground">
                    {fmtNumber(k.units30d)}
                  </TableCell>
                  <TableCell className="text-right font-mono tabular-nums font-semibold">
                    {fmtMXN(k.revenue30d)}
                  </TableCell>
                  <TableCell className="pr-6">
                    <MiniSparkline data={sparkData} tone={tone} height={24} width={90} />
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </Card>

      {/* OCs recientes */}
      {recentPOs.length > 0 && (
        <Card className="p-0 gap-0 overflow-hidden">
          <CardHeader className="px-6 py-4 border-b flex flex-row items-start justify-between gap-4 space-y-0">
            <div>
              <CardTitle className="text-base">OCs recientes a esta tienda</CardTitle>
              <CardDescription>Últimas 10 órdenes</CardDescription>
            </div>
            <StorePOsCsvButton
              rows={recentPOs.map((po) => ({
                id: po.id,
                poNumber: po.poNumber,
                orderDate: po.orderDate,
                status: po.status,
                unitsOrdered: po.unitsOrdered,
                unitsReceived: po.unitsReceived,
                value: po.value,
              }))}
              filename={`ocs_${store.externalCode ?? store.id}`}
            />
          </CardHeader>
          <Table>
            <TableHeader>
              <TableRow className="bg-muted/30 hover:bg-muted/30">
                <TableHead className="pl-6">OC</TableHead>
                <TableHead>Fecha</TableHead>
                <TableHead>Estado</TableHead>
                <TableHead className="text-right">Pedido</TableHead>
                <TableHead className="text-right">Recibido</TableHead>
                <TableHead className="text-right">Fill</TableHead>
                <TableHead className="text-right pr-6">Valor</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {recentPOs.map((po) => {
                const sb = PO_STATUS[po.status] ?? {
                  className: "bg-muted text-muted-foreground hover:bg-muted",
                  label: po.status,
                };
                const fill =
                  po.unitsOrdered > 0 ? po.unitsReceived / po.unitsOrdered : null;
                const lowFill = fill != null && fill < 0.9;
                return (
                  <TableRow key={po.id}>
                    <TableCell className="pl-6 font-mono tabular-nums">
                      {po.poNumber ?? po.id.slice(0, 8)}
                    </TableCell>
                    <TableCell className="text-muted-foreground text-xs">
                      {fmtOrderDate(po.orderDate)}
                    </TableCell>
                    <TableCell>
                      <Badge variant="secondary" className={sb.className}>
                        {sb.label}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right font-mono tabular-nums text-muted-foreground">
                      {fmtNumber(po.unitsOrdered)}
                    </TableCell>
                    <TableCell className="text-right font-mono tabular-nums text-muted-foreground">
                      {fmtNumber(po.unitsReceived)}
                    </TableCell>
                    <TableCell className="text-right">
                      <span
                        className={`inline-flex items-center gap-1 font-mono tabular-nums justify-end ${
                          lowFill
                            ? "text-rose-700 font-semibold"
                            : fill != null && fill >= 1
                            ? "text-emerald-700"
                            : ""
                        }`}
                      >
                        {lowFill && (
                          <AlertTriangle className="size-3" strokeWidth={2} />
                        )}
                        {fill == null ? "—" : `${(fill * 100).toFixed(0)}%`}
                      </span>
                    </TableCell>
                    <TableCell className="text-right pr-6 font-mono tabular-nums font-semibold">
                      {fmtMXN(po.value)}
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </Card>
      )}
    </div>
  );
}
