import Link from "next/link";
import { ArrowRight, AlertTriangle, Wallet, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Download } from "lucide-react";
import { fmtMXN, fmtNumber, fmtDecimal } from "@/lib/format";
import type { TopSuggestion } from "@/lib/queries/home";

function fmtFecha(iso: string): string {
  const d = new Date(iso + (iso.length === 10 ? "T00:00:00" : ""));
  return d.toLocaleDateString("es-MX", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });
}

function saludoPorHora(): string {
  const h = new Date().getHours();
  if (h < 12) return "Buenos días";
  if (h < 19) return "Buenas tardes";
  return "Buenas noches";
}

export type HomeHeaderProps = {
  firstName: string;
  orgName: string;
  kpiDate: string | null;
  stockoutsHoy: number;
  lostSaleHoy: number;
  firstMove: TopSuggestion | null;
};

export function HomeHeader({
  firstName,
  orgName,
  kpiDate,
  stockoutsHoy,
  lostSaleHoy,
  firstMove,
}: HomeHeaderProps) {
  const today = new Date().toISOString().slice(0, 10);
  const hayPrioridad = stockoutsHoy > 0 || lostSaleHoy > 0 || firstMove != null;
  const stockoutsTone =
    stockoutsHoy === 0
      ? "text-emerald-700"
      : stockoutsHoy >= 5
      ? "text-rose-700"
      : "text-amber-700";

  return (
    <div className="flex flex-col gap-4">
      {/* Top row: greeting + export */}
      <div className="flex items-end justify-between gap-4">
        <div>
          <h1 className="text-3xl lg:text-4xl font-semibold tracking-tight text-foreground">
            {saludoPorHora()}, {firstName}
          </h1>
          <p className="text-sm text-muted-foreground mt-2">
            {orgName} · vista del {fmtFecha(kpiDate ?? today)}
          </p>
        </div>
        <Button variant="outline" size="sm" className="hidden sm:inline-flex" asChild>
          <Link href="/sugeridos">
            <Download className="size-3.5" strokeWidth={1.75} />
            Exportar sugeridos
          </Link>
        </Button>
      </div>

      {/* Resumen del día — franja densa accionable */}
      {hayPrioridad && (
        <div className="grid grid-cols-1 md:grid-cols-3 rounded-lg border bg-card overflow-hidden divide-y md:divide-y-0 md:divide-x">
          {/* Quiebres */}
          <Link
            href="/sugeridos?severity=critical"
            className="group flex items-start gap-3 px-5 py-4 hover:bg-muted/40 transition-colors"
          >
            <span
              className={`inline-flex size-8 items-center justify-center rounded-md shrink-0 ${
                stockoutsHoy === 0
                  ? "bg-emerald-100 text-emerald-700"
                  : stockoutsHoy >= 5
                  ? "bg-rose-100 text-rose-700"
                  : "bg-amber-100 text-amber-700"
              }`}
            >
              <AlertTriangle className="size-4" strokeWidth={2} />
            </span>
            <div className="min-w-0 flex-1">
              <div className="text-[10px] uppercase tracking-wider text-muted-foreground font-medium">
                Quiebres activos
              </div>
              <div className="flex items-baseline gap-2 mt-0.5">
                <span
                  className={`font-mono tabular-nums text-2xl font-semibold tracking-tight ${stockoutsTone}`}
                >
                  {fmtNumber(stockoutsHoy)}
                </span>
                <span className="text-xs text-muted-foreground truncate">
                  {stockoutsHoy === 0
                    ? "todo bajo control"
                    : stockoutsHoy === 1
                    ? "tienda × SKU"
                    : "tiendas × SKUs"}
                </span>
              </div>
            </div>
            <ArrowRight className="size-3.5 mt-1.5 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
          </Link>

          {/* $ en riesgo */}
          <Link
            href="/sugeridos"
            className="group flex items-start gap-3 px-5 py-4 hover:bg-muted/40 transition-colors"
          >
            <span className="inline-flex size-8 items-center justify-center rounded-md shrink-0 bg-rose-100 text-rose-700">
              <Wallet className="size-4" strokeWidth={2} />
            </span>
            <div className="min-w-0 flex-1">
              <div className="text-[10px] uppercase tracking-wider text-muted-foreground font-medium">
                En riesgo hoy
              </div>
              <div className="flex items-baseline gap-2 mt-0.5">
                <span className="font-mono tabular-nums text-2xl font-semibold tracking-tight text-rose-700">
                  {fmtMXN(lostSaleHoy)}
                </span>
                <span className="text-xs text-muted-foreground truncate">
                  venta perdida estimada
                </span>
              </div>
            </div>
            <ArrowRight className="size-3.5 mt-1.5 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
          </Link>

          {/* 1er movimiento */}
          {firstMove ? (
            <Link
              href={`/sugeridos`}
              className="group flex items-start gap-3 px-5 py-4 hover:bg-muted/40 transition-colors"
            >
              <span className="inline-flex size-8 items-center justify-center rounded-md shrink-0 bg-foreground text-background">
                <Sparkles className="size-4" strokeWidth={2} />
              </span>
              <div className="min-w-0 flex-1">
                <div className="text-[10px] uppercase tracking-wider text-muted-foreground font-medium">
                  1.er movimiento del día
                </div>
                <div className="text-sm font-medium mt-0.5 truncate">
                  {firstMove.store}
                </div>
                <div className="text-xs text-muted-foreground truncate">
                  {firstMove.product}
                  {firstMove.ddi != null && (
                    <>
                      {" · "}DDI{" "}
                      <span className="font-mono tabular-nums">
                        {fmtDecimal(firstMove.ddi)}
                      </span>
                    </>
                  )}
                  {firstMove.lostSale > 0 && (
                    <>
                      {" · "}
                      <span className="font-mono tabular-nums text-rose-700">
                        {fmtMXN(firstMove.lostSale)}
                      </span>
                    </>
                  )}
                </div>
              </div>
              <ArrowRight className="size-3.5 mt-1.5 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
            </Link>
          ) : (
            <div className="flex items-start gap-3 px-5 py-4">
              <span className="inline-flex size-8 items-center justify-center rounded-md shrink-0 bg-muted text-muted-foreground">
                <Sparkles className="size-4" strokeWidth={2} />
              </span>
              <div className="min-w-0 flex-1">
                <div className="text-[10px] uppercase tracking-wider text-muted-foreground font-medium">
                  1.er movimiento del día
                </div>
                <div className="text-sm text-muted-foreground mt-0.5">
                  Sin sugeridos pendientes
                </div>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
