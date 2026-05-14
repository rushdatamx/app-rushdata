import { loadFlow } from "@/lib/queries/flow";
import { FlowChart } from "@/components/flow/FlowChart";
import { Card } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { fmtMXN, fmtNumber, fmtPct } from "@/lib/format";
import { ArrowDown, ArrowUp, TrendingUp, Wallet, Package, Activity } from "lucide-react";

export const dynamic = "force-dynamic";

function fmtMonthLong(iso: string): string {
  const d = new Date(iso + "T00:00:00");
  return d.toLocaleDateString("es-MX", { month: "long", year: "numeric" });
}

export default async function FlowPage() {
  const { monthly, totals } = await loadFlow();

  // Insight automático: ¿qué está pasando con el gap?
  const last3 = monthly.slice(-3);
  const gapTrend =
    last3.length >= 2
      ? last3[last3.length - 1].cumulativeNetUnits -
        last3[0].cumulativeNetUnits
      : 0;
  const insight =
    monthly.length < 3
      ? null
      : gapTrend > 1000
      ? {
          tone: "warning" as const,
          title: "Overstock acumulándose en cadena",
          detail:
            "El sell-in viene siendo mayor que el sell-out los últimos meses. La cadena está acumulando inventario.",
        }
      : gapTrend < -1000
      ? {
          tone: "danger" as const,
          title: "Cadena vaciándose",
          detail:
            "El sell-out viene siendo mayor que el sell-in. La cadena consume más rápido de lo que reabastece — riesgo de quiebres si no se acelera el sell-in.",
        }
      : {
          tone: "success" as const,
          title: "Flujo equilibrado",
          detail:
            "Sell-in y sell-out están razonablemente alineados en los últimos meses.",
        };

  return (
    <div className="flex flex-col gap-6">
      {/* Header */}
      <div className="flex items-end justify-between gap-4">
        <div>
          <h1 className="text-3xl lg:text-4xl font-semibold tracking-tight">
            Flujo sell-in / sell-out
          </h1>
          <p className="text-sm text-muted-foreground mt-2">
            Comparativo entre lo que entregas al retailer y lo que el retailer
            vende al consumidor · el gap es tu inventario en cadena
          </p>
        </div>
      </div>

      {/* KPI strip */}
      <Card className="p-0 gap-0 overflow-hidden">
        <div className="grid grid-cols-2 lg:grid-cols-4 divide-x divide-y lg:divide-y-0">
          <KpiBlock
            icon={ArrowDown}
            label="Sell-in total"
            value={fmtNumber(totals.sellInUnits)}
            sub={`${fmtMXN(totals.sellInRevenue)} entregado a cadena`}
          />
          <KpiBlock
            icon={ArrowUp}
            label="Sell-out total"
            value={fmtNumber(totals.sellOutUnits)}
            sub={`${fmtMXN(totals.sellOutRevenue)} vendido a consumidor`}
            tone="success"
          />
          <KpiBlock
            icon={Activity}
            label="Sell-through"
            value={totals.sellThroughPct == null ? "—" : fmtPct(totals.sellThroughPct)}
            sub="% que se vende del que entras"
            tone={
              totals.sellThroughPct == null
                ? "default"
                : totals.sellThroughPct >= 0.9
                ? "success"
                : totals.sellThroughPct >= 0.7
                ? "warning"
                : "danger"
            }
          />
          <KpiBlock
            icon={Package}
            label="Inventario en cadena"
            value={fmtNumber(totals.currentGapUnits)}
            sub={`unidades acumuladas · ${totals.monthsCovered} meses`}
            tone={
              totals.currentGapUnits > 5000
                ? "warning"
                : totals.currentGapUnits < 0
                ? "danger"
                : "default"
            }
          />
        </div>
      </Card>

      {/* Insight automático */}
      {insight && (
        <Card
          className={`p-4 border-l-4 ${
            insight.tone === "warning"
              ? "border-l-amber-500 bg-amber-50/30"
              : insight.tone === "danger"
              ? "border-l-rose-500 bg-rose-50/30"
              : "border-l-emerald-500 bg-emerald-50/30"
          }`}
        >
          <div className="flex items-start gap-3">
            <TrendingUp
              className={`size-4 mt-0.5 ${
                insight.tone === "warning"
                  ? "text-amber-700"
                  : insight.tone === "danger"
                  ? "text-rose-700"
                  : "text-emerald-700"
              }`}
              strokeWidth={2}
            />
            <div>
              <div className="text-sm font-semibold">{insight.title}</div>
              <div className="text-xs text-muted-foreground mt-0.5">{insight.detail}</div>
            </div>
          </div>
        </Card>
      )}

      {/* Chart */}
      <FlowChart monthly={monthly} />

      {/* Tabla mensual */}
      <Card className="p-0 gap-0 overflow-hidden">
        <div className="px-6 py-4 border-b">
          <div className="text-base font-semibold">Detalle mensual</div>
          <div className="text-xs text-muted-foreground mt-0.5">
            {fmtNumber(monthly.length)} meses · ordenado cronológicamente
          </div>
        </div>
        <Table>
          <TableHeader>
            <TableRow className="bg-muted/30 hover:bg-muted/30">
              <TableHead className="pl-6">Mes</TableHead>
              <TableHead className="text-right">Sell-in (un)</TableHead>
              <TableHead className="text-right">Sell-in ($)</TableHead>
              <TableHead className="text-right">Sell-out (un)</TableHead>
              <TableHead className="text-right">Sell-out ($)</TableHead>
              <TableHead className="text-right">Neto mes</TableHead>
              <TableHead className="text-right pr-6">Acumulado</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {monthly.map((m) => (
              <TableRow key={m.month}>
                <TableCell className="pl-6 capitalize">{fmtMonthLong(m.month)}</TableCell>
                <TableCell className="text-right font-mono tabular-nums text-sky-700">
                  {fmtNumber(m.sellInUnits)}
                </TableCell>
                <TableCell className="text-right font-mono tabular-nums text-muted-foreground">
                  {fmtMXN(m.sellInRevenue)}
                </TableCell>
                <TableCell className="text-right font-mono tabular-nums text-emerald-700">
                  {fmtNumber(m.sellOutUnits)}
                </TableCell>
                <TableCell className="text-right font-mono tabular-nums text-muted-foreground">
                  {fmtMXN(m.sellOutRevenue)}
                </TableCell>
                <TableCell
                  className={`text-right font-mono tabular-nums ${
                    m.netUnits > 0
                      ? "text-amber-700"
                      : m.netUnits < 0
                      ? "text-rose-700"
                      : "text-muted-foreground"
                  }`}
                >
                  {m.netUnits > 0 ? "+" : ""}
                  {fmtNumber(m.netUnits)}
                </TableCell>
                <TableCell className="text-right pr-6 font-mono tabular-nums font-semibold">
                  {fmtNumber(m.cumulativeNetUnits)}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </Card>
    </div>
  );
}

type Tone = "default" | "danger" | "success" | "warning";
const TONE: Record<Tone, { value: string; chip: string }> = {
  default: { value: "text-foreground", chip: "bg-muted text-muted-foreground" },
  danger: { value: "text-rose-700", chip: "bg-rose-100 text-rose-700" },
  success: { value: "text-emerald-700", chip: "bg-emerald-100 text-emerald-700" },
  warning: { value: "text-amber-700", chip: "bg-amber-100 text-amber-700" },
};

function KpiBlock({
  icon: Icon,
  label,
  value,
  sub,
  tone = "default",
}: {
  icon: React.ComponentType<{ className?: string; strokeWidth?: number }>;
  label: string;
  value: string;
  sub: string;
  tone?: Tone;
}) {
  const t = TONE[tone];
  return (
    <div className="flex flex-col justify-center px-5 py-5">
      <div className="flex items-center justify-between">
        <span className="text-[10px] uppercase tracking-wider text-muted-foreground font-medium">
          {label}
        </span>
        <span
          className={`inline-flex size-6 items-center justify-center rounded-md ${t.chip}`}
        >
          <Icon className="size-3" strokeWidth={2} />
        </span>
      </div>
      <div
        className={`mt-2 font-mono tabular-nums text-2xl font-semibold tracking-tight ${
          tone === "default" ? "text-foreground" : t.value
        }`}
      >
        {value}
      </div>
      <div className="text-[11px] text-muted-foreground mt-0.5 truncate">{sub}</div>
    </div>
  );
}
