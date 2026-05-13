import Link from "next/link";
import { notFound } from "next/navigation";
import { ChevronLeft, AlertTriangle, ArrowUpRight } from "lucide-react";

import { loadProductDetail } from "@/lib/queries/product-detail";
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
import {
  ProductDetailHero,
  type MonthlyPoint,
} from "@/components/productos/ProductDetailHero";
import { fmtMXN, fmtNumber, fmtDecimal } from "@/lib/format";

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

function ddiSeverity(ddi: number | null): "critical" | "high" | "medium" | "low" {
  if (ddi == null) return "medium";
  if (ddi <= 1) return "critical";
  if (ddi <= 3) return "high";
  if (ddi <= 7) return "medium";
  return "low";
}

function weeklyToMonthly(
  weekly: Array<{ weekStart: string; revenue: number; units: number }>
): MonthlyPoint[] {
  const map = new Map<string, { revenue: number; units: number }>();
  for (const w of weekly) {
    const d = new Date(w.weekStart + "T00:00:00");
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-01`;
    const existing = map.get(key);
    if (existing) {
      existing.revenue += w.revenue;
      existing.units += w.units;
    } else {
      map.set(key, { revenue: w.revenue, units: w.units });
    }
  }
  return Array.from(map.entries())
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([monthStart, v]) => ({ monthStart, revenue: v.revenue, units: v.units }));
}

type Params = Promise<{ id: string }>;

export default async function ProductDetailPage({ params }: { params: Params }) {
  const { id } = await params;
  const data = await loadProductDetail(id);
  if (!data) notFound();

  const { product, weekly, stores, suggestions, totals } = data;
  const monthly = weeklyToMonthly(weekly);
  const margin =
    product.unitPrice > 0
      ? (product.unitPrice - product.unitCost) / product.unitPrice
      : null;

  const stockoutStores = stores.filter((s) => s.hasStockout);
  const sortedStores = [...stores].sort((a, b) => b.revenue30d - a.revenue30d);

  return (
    <div className="flex flex-col gap-6">
      {/* Breadcrumb back */}
      <div>
        <Link
          href="/productos"
          className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors w-fit"
        >
          <ChevronLeft className="size-3.5" strokeWidth={1.5} />
          Volver a productos
        </Link>
        <div className="flex items-end justify-between gap-6 mt-2">
          <div>
            <h1 className="text-3xl lg:text-4xl font-semibold tracking-tight">
              {product.name}
            </h1>
            <p className="text-sm text-muted-foreground mt-2">
              {product.upc && (
                <span className="font-mono tabular-nums">UPC {product.upc}</span>
              )}
              {product.category && (
                <span className="capitalize">
                  {product.upc ? " · " : ""}
                  {product.category}
                </span>
              )}
              {product.sizeGrams ? ` · ${product.sizeGrams}gr` : ""}
              {` · ${fmtMXN(product.unitPrice)}`}
              {margin != null && ` · margen ${Math.round(margin * 100)}%`}
            </p>
          </div>
        </div>
      </div>

      {/* Hero */}
      <ProductDetailHero
        monthly={monthly}
        storesWithInventory={totals.storesWithInventory}
        storesTotal={stores.length}
        stockouts={totals.storesWithStockout}
        inventoryUnits={totals.inventoryUnits}
        pendingSuggestions={totals.pendingSuggestions}
        revenue30d={totals.revenue30d}
      />

      {/* Sugeridos pendientes */}
      {suggestions.length > 0 && (
        <Card className="p-0 gap-0 overflow-hidden">
          <CardHeader className="px-6 py-4 border-b">
            <CardTitle className="text-base">Sugeridos pendientes para este SKU</CardTitle>
            <CardDescription>
              {fmtNumber(suggestions.length)} tienda
              {suggestions.length === 1 ? "" : "s"} ·{" "}
              <span className="text-rose-700 font-medium">
                {fmtMXN(suggestions.reduce((a, s) => a + s.lostSale, 0))}
              </span>{" "}
              en riesgo
            </CardDescription>
          </CardHeader>
          <Table>
            <TableHeader>
              <TableRow className="bg-muted/30 hover:bg-muted/30">
                <TableHead className="pl-6">Tienda</TableHead>
                <TableHead>Razón</TableHead>
                <TableHead className="text-right">DDI</TableHead>
                <TableHead className="text-right">Sugerido</TableHead>
                <TableHead className="text-right">Cajas</TableHead>
                <TableHead className="text-right pr-6">$ Riesgo</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {suggestions.map((s) => {
                const reason = s.reasonCode ? REASON_BADGE[s.reasonCode] : null;
                const sev = ddiSeverity(s.ddi);
                const sevStyles = SEV_BADGE[sev];
                return (
                  <TableRow key={s.id}>
                    <TableCell className="pl-6">
                      <div className="font-medium">{s.storeName}</div>
                      {s.storeCluster && (
                        <div className="text-[11px] text-muted-foreground">
                          Cluster {s.storeCluster}
                        </div>
                      )}
                    </TableCell>
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

      {/* Tiendas en quiebre destacadas */}
      {stockoutStores.length > 0 && (
        <Card className="p-0 gap-0 overflow-hidden border-rose-200">
          <CardHeader className="px-6 py-4 border-b bg-rose-50/50">
            <CardTitle className="text-base inline-flex items-center gap-2">
              <AlertTriangle className="size-4 text-rose-600" strokeWidth={2} />
              Tiendas en quiebre de este SKU
            </CardTitle>
            <CardDescription>
              {fmtNumber(stockoutStores.length)} tienda
              {stockoutStores.length === 1 ? "" : "s"} sin stock — clientes buscando, no encuentran
            </CardDescription>
          </CardHeader>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-px bg-border">
            {stockoutStores.map((s) => (
              <Link
                key={s.storeId}
                href={`/tiendas/${s.storeId}`}
                className="group bg-background p-4 hover:bg-muted/40 transition-colors"
              >
                <div className="flex items-center justify-between gap-2">
                  <div className="font-medium text-sm truncate">{s.name}</div>
                  <ArrowUpRight
                    className="size-3 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity shrink-0"
                    strokeWidth={2}
                  />
                </div>
                <div className="text-[11px] text-muted-foreground mt-0.5">
                  {s.cluster && `Cluster ${s.cluster}`}
                  {s.city ? ` · ${s.city}` : ""}
                </div>
                <div className="mt-2 text-[11px] text-muted-foreground">
                  Vendía{" "}
                  <span className="font-mono tabular-nums text-foreground font-medium">
                    {fmtDecimal(s.velocity)}
                  </span>{" "}
                  un/día
                </div>
              </Link>
            ))}
          </div>
        </Card>
      )}

      {/* Tiendas con este SKU */}
      <Card className="p-0 gap-0 overflow-hidden">
        <CardHeader className="px-6 py-4 border-b">
          <CardTitle className="text-base">Tiendas con este SKU</CardTitle>
          <CardDescription>
            {fmtNumber(stores.length)} tiendas · ordenado por venta 30d
          </CardDescription>
        </CardHeader>
        <Table>
          <TableHeader>
            <TableRow className="bg-muted/30 hover:bg-muted/30">
              <TableHead className="pl-6">Tienda</TableHead>
              <TableHead>Cluster</TableHead>
              <TableHead className="text-right">Stock</TableHead>
              <TableHead className="text-right">Vel/día</TableHead>
              <TableHead className="text-right">DDI</TableHead>
              <TableHead className="text-right">Un. 30d</TableHead>
              <TableHead className="text-right pr-6">Venta 30d</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {sortedStores.map((s) => {
              const sev = ddiSeverity(s.ddi);
              const sevStyles = SEV_BADGE[sev];
              return (
                <TableRow key={s.storeId} className="group">
                  <TableCell className="pl-6">
                    <Link
                      href={`/tiendas/${s.storeId}`}
                      className="block hover:text-foreground/80 transition-colors"
                    >
                      <div className="flex items-center gap-2">
                        <span className="font-medium">{s.name}</span>
                        <ArrowUpRight
                          className="size-3 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity"
                          strokeWidth={2}
                        />
                      </div>
                      {s.city && (
                        <div className="text-[11px] text-muted-foreground">{s.city}</div>
                      )}
                    </Link>
                  </TableCell>
                  <TableCell>
                    {s.cluster ? (
                      <span className="inline-flex items-center px-1.5 py-0.5 rounded bg-muted text-[11px] text-muted-foreground font-mono tabular-nums">
                        C{s.cluster}
                      </span>
                    ) : (
                      <span className="text-muted-foreground/50">—</span>
                    )}
                  </TableCell>
                  <TableCell
                    className={`text-right font-mono tabular-nums ${
                      s.hasStockout ? "text-rose-700 font-semibold" : ""
                    }`}
                  >
                    {fmtNumber(s.inventory)}
                  </TableCell>
                  <TableCell className="text-right font-mono tabular-nums text-muted-foreground">
                    {fmtDecimal(s.velocity)}
                  </TableCell>
                  <TableCell className="text-right">
                    {s.ddi != null ? (
                      <div className="inline-flex items-center gap-2 justify-end">
                        <span className="font-mono tabular-nums">{fmtDecimal(s.ddi)}</span>
                        <Badge variant="secondary" className={sevStyles.className}>
                          {sevStyles.label}
                        </Badge>
                      </div>
                    ) : (
                      <span className="text-muted-foreground/50">—</span>
                    )}
                  </TableCell>
                  <TableCell className="text-right font-mono tabular-nums text-muted-foreground">
                    {fmtNumber(s.units30d)}
                  </TableCell>
                  <TableCell className="text-right pr-6 font-mono tabular-nums font-semibold">
                    {fmtMXN(s.revenue30d)}
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </Card>
    </div>
  );
}
