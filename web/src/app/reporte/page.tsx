import Image from "next/image";
import { loadHomeData } from "@/lib/queries/home";
import { loadHomeStats } from "@/lib/queries/home-stats";
import { loadLostSaleLedger } from "@/lib/queries/lost-sale-ledger";
import { verifySession } from "@/lib/dal";
import { fmtMXN, fmtNumber, fmtDecimal, fmtPct } from "@/lib/format";
import { PrintActions } from "@/components/reporte/PrintActions";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";

export const dynamic = "force-dynamic";

const REASON_LABEL: Record<string, string> = {
  stockout_risk: "Riesgo quiebre",
  low_ddi: "DDI bajo",
  velocity_up: "Velocity ↑",
  periodic_replenish: "Reposición",
  multi_flavor_restock: "PDQ",
};

function fmtFecha(iso: string): string {
  const d = new Date(iso + (iso.length === 10 ? "T00:00:00" : ""));
  return d.toLocaleDateString("es-MX", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });
}

function ddiSeverity(ddi: number | null): "critical" | "high" | "medium" | "low" {
  if (ddi == null) return "medium";
  if (ddi <= 1) return "critical";
  if (ddi <= 3) return "high";
  if (ddi <= 7) return "medium";
  return "low";
}

const SEV_LABEL: Record<string, string> = {
  critical: "crítico",
  high: "alto",
  medium: "medio",
  low: "ok",
};

export default async function ReportePage() {
  const today = new Date().toISOString().slice(0, 10);

  const [session, data, stats, ledger] = await Promise.all([
    verifySession(),
    loadHomeData(),
    loadHomeStats(),
    loadLostSaleLedger(),
  ]);

  const { kpi, suggestedCount, suggestedValue, topSuggestions, alerts } = data;
  const topPick = topSuggestions[0] ?? null;

  return (
    <div className="reporte-page bg-white text-foreground max-w-[800px] mx-auto print:max-w-none print:mx-0">
      <PrintActions />

      {/* Header del reporte */}
      <header className="border-b-2 border-foreground pb-4 mb-6 print:mb-4">
        <div className="flex items-start justify-between gap-6">
          <div>
            <div className="flex items-center gap-3">
              <Image
                src="/rushdata-logo.png"
                alt="RushData"
                width={1200}
                height={1200}
                className="size-10 shrink-0 rounded-md object-contain"
              />
              <div>
                <div className="text-xl font-semibold tracking-tight">
                  RushData
                </div>
                <div className="text-[10px] uppercase tracking-wider text-muted-foreground font-medium">
                  Reporte ejecutivo
                </div>
              </div>
            </div>
          </div>
          <div className="text-right">
            <div className="text-sm font-medium">{session.orgName}</div>
            <div className="text-xs text-muted-foreground">
              {fmtFecha(kpi.date ?? today)}
            </div>
          </div>
        </div>
      </header>

      {/* Resumen ejecutivo — bloque destacado */}
      <section className="mb-6 print:mb-4 break-inside-avoid">
        <h2 className="text-[10px] uppercase tracking-wider text-muted-foreground font-medium mb-2">
          Resumen ejecutivo
        </h2>
        <div className="grid grid-cols-4 gap-px bg-border rounded-md overflow-hidden border">
          <KpiBlock
            label="Quiebres activos"
            value={fmtNumber(kpi.stockouts)}
            sub="tienda × SKU"
            tone={kpi.stockouts === 0 ? "success" : kpi.stockouts >= 5 ? "danger" : "warning"}
          />
          <KpiBlock
            label="$ en riesgo"
            value={fmtMXN(suggestedValue)}
            sub="venta perdida estimada"
            tone={suggestedValue > 0 ? "danger" : "default"}
          />
          <KpiBlock
            label="Sugeridos pendientes"
            value={fmtNumber(suggestedCount)}
            sub="acciones por tomar"
            tone={suggestedCount > 0 ? "warning" : "success"}
          />
          <KpiBlock
            label="Fill rate"
            value={kpi.fillRate == null ? "—" : fmtPct(kpi.fillRate)}
            sub="promedio 30d"
            tone={
              kpi.fillRate == null
                ? "default"
                : kpi.fillRate >= 0.95
                ? "success"
                : kpi.fillRate >= 0.9
                ? "warning"
                : "danger"
            }
          />
        </div>
      </section>

      {/* 1er movimiento */}
      {topPick && (
        <section className="mb-6 print:mb-4 break-inside-avoid">
          <h2 className="text-[10px] uppercase tracking-wider text-muted-foreground font-medium mb-2">
            Primer movimiento sugerido
          </h2>
          <div className="border rounded-md p-4 bg-muted/10">
            <div className="flex items-baseline justify-between gap-4">
              <div className="min-w-0 flex-1">
                <div className="text-base font-semibold">{topPick.store}</div>
                <div className="text-sm text-muted-foreground">
                  {topPick.product}
                  {topPick.storeCluster && ` · Cluster ${topPick.storeCluster}`}
                </div>
              </div>
              <div className="text-right shrink-0">
                <div className="font-mono tabular-nums text-2xl font-semibold text-rose-700">
                  {fmtMXN(topPick.lostSale)}
                </div>
                <div className="text-[11px] text-muted-foreground">venta en riesgo</div>
              </div>
            </div>
            <div className="grid grid-cols-3 gap-4 mt-3 pt-3 border-t text-xs">
              <div>
                <span className="text-muted-foreground">DDI: </span>
                <span className="font-mono tabular-nums font-medium">
                  {fmtDecimal(topPick.ddi)}
                </span>
              </div>
              <div>
                <span className="text-muted-foreground">Sugerido: </span>
                <span className="font-mono tabular-nums font-medium">
                  {fmtNumber(topPick.suggestedUnits)} un · {fmtNumber(topPick.suggestedCases)}{" "}
                  cajas
                </span>
              </div>
              <div>
                <span className="text-muted-foreground">Confianza: </span>
                <span className="font-mono tabular-nums font-medium">
                  {topPick.confidence == null
                    ? "—"
                    : `${Math.round(topPick.confidence * 100)}%`}
                </span>
              </div>
            </div>
          </div>
        </section>
      )}

      {/* Top 10 sugeridos */}
      {topSuggestions.length > 0 && (
        <section className="mb-6 print:mb-4 break-inside-avoid">
          <h2 className="text-[10px] uppercase tracking-wider text-muted-foreground font-medium mb-2">
            Top 10 sugeridos por venta perdida
          </h2>
          <div className="border rounded-md overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow className="bg-muted/30 hover:bg-muted/30">
                  <TableHead className="pl-4 text-xs">#</TableHead>
                  <TableHead className="text-xs">Tienda</TableHead>
                  <TableHead className="text-xs">Producto</TableHead>
                  <TableHead className="text-xs">Razón</TableHead>
                  <TableHead className="text-right text-xs">DDI</TableHead>
                  <TableHead className="text-right text-xs">Cajas</TableHead>
                  <TableHead className="text-right pr-4 text-xs">$ Riesgo</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {topSuggestions.map((s, idx) => {
                  const sev = ddiSeverity(s.ddi);
                  return (
                    <TableRow key={s.id} className="text-xs">
                      <TableCell className="pl-4 text-muted-foreground font-mono tabular-nums">
                        {idx + 1}
                      </TableCell>
                      <TableCell className="font-medium">{s.store}</TableCell>
                      <TableCell>{s.product}</TableCell>
                      <TableCell className="text-muted-foreground">
                        {s.reasonCode ? REASON_LABEL[s.reasonCode] ?? s.reasonCode : "—"}
                      </TableCell>
                      <TableCell className="text-right font-mono tabular-nums">
                        {fmtDecimal(s.ddi)}{" "}
                        <span className="text-[10px] text-muted-foreground">
                          {SEV_LABEL[sev]}
                        </span>
                      </TableCell>
                      <TableCell className="text-right font-mono tabular-nums">
                        {fmtNumber(s.suggestedCases)}
                      </TableCell>
                      <TableCell className="text-right pr-4 font-mono tabular-nums font-semibold text-rose-700">
                        {fmtMXN(s.lostSale)}
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>
        </section>
      )}

      {/* Alerts críticas */}
      {alerts.length > 0 && (
        <section className="mb-6 print:mb-4 break-inside-avoid">
          <h2 className="text-[10px] uppercase tracking-wider text-muted-foreground font-medium mb-2">
            Alertas de quiebre recientes
          </h2>
          <div className="border rounded-md overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow className="bg-muted/30 hover:bg-muted/30">
                  <TableHead className="pl-4 text-xs">Tienda</TableHead>
                  <TableHead className="text-xs">Producto</TableHead>
                  <TableHead className="text-xs">Severidad</TableHead>
                  <TableHead className="text-right text-xs">Días</TableHead>
                  <TableHead className="text-right pr-4 text-xs">$ Perdido</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {alerts.map((a) => (
                  <TableRow key={a.id} className="text-xs">
                    <TableCell className="pl-4 font-medium">{a.store}</TableCell>
                    <TableCell>{a.product}</TableCell>
                    <TableCell>
                      <Badge variant="secondary" className="text-[10px]">
                        {SEV_LABEL[a.severity] ?? a.severity}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right font-mono tabular-nums">
                      {a.daysIn}
                    </TableCell>
                    <TableCell className="text-right pr-4 font-mono tabular-nums text-rose-700">
                      {fmtMXN(a.lostSale)}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </section>
      )}

      {/* Stats de inventario / cobertura */}
      <section className="mb-6 print:mb-4 break-inside-avoid">
        <h2 className="text-[10px] uppercase tracking-wider text-muted-foreground font-medium mb-2">
          Estado del catálogo
        </h2>
        <div className="grid grid-cols-2 gap-px bg-border rounded-md overflow-hidden border">
          <StatRow
            label="Tiendas con quiebre"
            value={`${fmtNumber(stats.storesWithStockout)} de ${fmtNumber(stats.activeStores)}`}
          />
          <StatRow
            label="SKUs con quiebre"
            value={`${fmtNumber(stats.productsWithStockout)} de ${fmtNumber(stats.activeProducts)}`}
          />
          <StatRow
            label="DDI promedio"
            value={stats.avgDdi == null ? "—" : `${fmtDecimal(stats.avgDdi)} días`}
          />
          <StatRow
            label="Cobertura del catálogo"
            value={
              stats.coverageWeeks == null
                ? "—"
                : `${fmtDecimal(stats.coverageWeeks)} semanas`
            }
          />
          <StatRow
            label="OCs activas"
            value={`${fmtNumber(kpi.activePOs)}`}
          />
          <StatRow
            label="Inventario valorizado"
            value={fmtMXN(kpi.inventoryValue)}
          />
        </div>
      </section>

      {/* Lost Sale Ledger YTD */}
      <section className="mb-6 print:mb-4 break-inside-avoid">
        <h2 className="text-[10px] uppercase tracking-wider text-muted-foreground font-medium mb-2">
          Venta perdida acumulada (YTD desde {fmtFecha(ledger.ytdSince)})
        </h2>
        <div className="border rounded-md p-4 bg-muted/10">
          <div className="flex items-baseline justify-between gap-4">
            <div>
              <div className="font-mono tabular-nums text-3xl font-semibold text-rose-700">
                {fmtMXN(ledger.ytdLostSale)}
              </div>
              <div className="text-xs text-muted-foreground mt-0.5">
                en {fmtNumber(ledger.ytdStockouts)} eventos de quiebre · acumulado
                año a la fecha
              </div>
            </div>
            <div className="text-right text-xs space-y-1">
              <div>
                <span className="text-muted-foreground">Mes pasado: </span>
                <span className="font-mono tabular-nums font-medium">
                  {fmtMXN(ledger.lastMonthLostSale)}
                </span>
              </div>
              <div>
                <span className="text-muted-foreground">Mes previo: </span>
                <span className="font-mono tabular-nums font-medium">
                  {fmtMXN(ledger.prevMonthLostSale)}
                </span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t pt-3 mt-8 text-[10px] text-muted-foreground/70 flex items-center justify-between">
        <div>
          RushData · {session.orgName} · {fmtFecha(today)}
        </div>
        <div>
          Generado a las{" "}
          {new Date().toLocaleTimeString("es-MX", {
            hour: "2-digit",
            minute: "2-digit",
          })}
        </div>
      </footer>
    </div>
  );
}

type Tone = "default" | "danger" | "success" | "warning";
const TONE: Record<Tone, string> = {
  default: "text-foreground",
  danger: "text-rose-700",
  success: "text-emerald-700",
  warning: "text-amber-700",
};

function KpiBlock({
  label,
  value,
  sub,
  tone = "default",
}: {
  label: string;
  value: string;
  sub: string;
  tone?: Tone;
}) {
  return (
    <div className="bg-white p-3">
      <div className="text-[9px] uppercase tracking-wider text-muted-foreground font-medium">
        {label}
      </div>
      <div
        className={`mt-1 font-mono tabular-nums text-xl font-semibold tracking-tight ${
          tone === "default" ? "text-foreground" : TONE[tone]
        }`}
      >
        {value}
      </div>
      <div className="text-[10px] text-muted-foreground mt-0.5 truncate">{sub}</div>
    </div>
  );
}

function StatRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="bg-white px-4 py-2.5 flex items-center justify-between text-xs">
      <span className="text-muted-foreground">{label}</span>
      <span className="font-mono tabular-nums font-medium">{value}</span>
    </div>
  );
}
