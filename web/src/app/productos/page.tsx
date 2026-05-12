import Link from "next/link";
import { loadProducts } from "@/lib/queries/products";
import { Card, CardHeader } from "@/components/ui/Card";
import { Sparkline } from "@/components/ui/Sparkline";
import { fmtMXN, fmtNumber } from "@/lib/utils";
import { AlertTriangle } from "lucide-react";

export const dynamic = "force-dynamic";

export default async function ProductosPage() {
  const { rows, totals } = await loadProducts();

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-end justify-between gap-6">
        <div>
          <h1 className="text-[24px] leading-tight font-semibold text-foreground tracking-tight">
            Productos
          </h1>
          <p className="text-[13px] text-muted mt-1">
            {fmtNumber(totals.count)} SKUs activos · {fmtMXN(totals.revenue30d)} venta 30d · {fmtNumber(totals.inventoryUnits)} unidades en inventario
          </p>
        </div>
      </div>

      <Card>
        <CardHeader>
          <h2 className="text-[15px] font-semibold text-foreground">Catálogo</h2>
          <p className="text-[12px] text-muted mt-0.5">Ordenado por venta de los últimos 30 días</p>
        </CardHeader>

        <div className="overflow-x-auto">
          <table className="w-full text-[13px]">
            <thead>
              <tr className="text-[11px] uppercase tracking-wider text-subtle border-b border-border">
                <th className="text-left font-medium px-5 py-2.5">Producto</th>
                <th className="text-left font-medium px-3 py-2.5">UPC</th>
                <th className="text-right font-medium px-3 py-2.5">Tiendas</th>
                <th className="text-right font-medium px-3 py-2.5">Quiebres</th>
                <th className="text-right font-medium px-3 py-2.5">Inventario</th>
                <th className="text-right font-medium px-3 py-2.5">Unidades 30d</th>
                <th className="text-right font-medium px-3 py-2.5">Venta 30d</th>
                <th className="text-left font-medium px-5 py-2.5 w-[140px]">Tendencia 8 sem.</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((p) => {
                const sparkData = p.weekly.map((w) => ({ x: w.weekStart, y: w.units }));
                const sparkTone =
                  p.storesWithStockout > 0 ? "danger" : p.revenue30d > 0 ? "accent" : "muted";
                return (
                  <tr
                    key={p.id}
                    className="border-b border-border last:border-b-0 hover:bg-surface-hover transition-colors"
                  >
                    <td className="px-5 py-3 text-foreground">
                      <Link href={`/productos/${p.id}`} className="hover:text-accent transition-colors block">
                        <div className="flex flex-col">
                          <span className="font-medium">{p.name}</span>
                          {p.category && (
                            <span className="text-[11px] text-subtle">
                              {p.category}
                              {p.sizeGrams ? ` · ${p.sizeGrams}gr` : ""} · {fmtMXN(p.unitPrice)}
                            </span>
                          )}
                        </div>
                      </Link>
                    </td>
                    <td className="px-3 py-3 font-mono tabular-nums text-[11px] text-subtle">
                      {p.upc ?? "—"}
                    </td>
                    <td className="px-3 py-3 text-right font-mono tabular-nums text-muted">
                      {fmtNumber(p.storesWithInventory)}
                    </td>
                    <td className="px-3 py-3 text-right">
                      {p.storesWithStockout > 0 ? (
                        <span className="inline-flex items-center gap-1 text-danger font-medium font-mono tabular-nums">
                          <AlertTriangle className="size-3" strokeWidth={2} />
                          {fmtNumber(p.storesWithStockout)}
                        </span>
                      ) : (
                        <span className="font-mono tabular-nums text-subtle">0</span>
                      )}
                    </td>
                    <td className="px-3 py-3 text-right font-mono tabular-nums text-muted">
                      {fmtNumber(p.inventoryUnits)}
                    </td>
                    <td className="px-3 py-3 text-right font-mono tabular-nums text-muted">
                      {fmtNumber(p.units30d)}
                    </td>
                    <td className="px-3 py-3 text-right font-mono tabular-nums text-foreground font-medium">
                      {fmtMXN(p.revenue30d)}
                    </td>
                    <td className="px-5 py-3">
                      <Sparkline data={sparkData} tone={sparkTone} height={24} />
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}
