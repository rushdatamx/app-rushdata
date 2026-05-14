"use client";

import { Area, AreaChart, CartesianGrid, XAxis, YAxis } from "recharts";
import {
  Package,
  AlertTriangle,
  Target,
  Clock,
  TrendingUp,
  TrendingDown,
} from "lucide-react";

import { Card } from "@/components/ui/card";
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from "@/components/ui/chart";
import { fmtMXN, fmtNumber, fmtDecimal } from "@/lib/format";
import { cn } from "@/lib/utils";

const chartConfig = {
  revenue: { label: "Venta", color: "hsl(var(--chart-1))" },
} satisfies ChartConfig;

function fmtShortDate(iso: string): string {
  const d = new Date(iso + "T00:00:00");
  return d.toLocaleDateString("es-MX", { day: "numeric", month: "short" });
}

export type StoreDetailHeroProps = {
  weeklyRevenue: Array<{ weekStart: string; revenue: number }>;
  skusInStock: number;
  skusActive: number;
  stockouts: number;
  inventoryUnits: number;
  inventoryValue: number;
  revenue30d: number;
  avgFillRate: number | null;
  avgLeadTimeDays: number | null;
};

export function StoreDetailHero({
  weeklyRevenue,
  skusInStock,
  skusActive,
  stockouts,
  inventoryUnits,
  inventoryValue,
  revenue30d,
  avgFillRate,
  avgLeadTimeDays,
}: StoreDetailHeroProps) {
  const skusPct = skusActive === 0 ? 0 : (skusInStock / skusActive) * 100;

  // Delta semanal: comparar mitad reciente vs mitad previa de las semanas
  let weeklyDelta: number | null = null;
  if (weeklyRevenue.length >= 4) {
    const half = Math.floor(weeklyRevenue.length / 2);
    const prev = weeklyRevenue.slice(0, half).reduce((a, w) => a + w.revenue, 0);
    const curr = weeklyRevenue.slice(half).reduce((a, w) => a + w.revenue, 0);
    if (prev > 0) weeklyDelta = ((curr - prev) / prev) * 100;
  }

  return (
    <Card className="p-0 gap-0 overflow-hidden">
      <div className="grid grid-cols-1 lg:grid-cols-5">
        {/* Chart side */}
        <div className="lg:col-span-3 p-6 lg:border-r">
          <div className="text-[11px] tracking-wider uppercase text-muted-foreground font-medium">
            Venta semanal
          </div>
          <div className="text-xs text-muted-foreground/70 mt-0.5">
            Últimas {weeklyRevenue.length} semanas
          </div>

          <div className="mt-4 flex items-baseline gap-3">
            <span className="font-mono tabular-nums text-3xl lg:text-4xl font-semibold tracking-tight">
              {fmtMXN(revenue30d)}
            </span>
            <span className="text-xs text-muted-foreground">últimos 30 días</span>
            {weeklyDelta != null && (
              <span
                className={cn(
                  "text-xs font-medium inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded-md",
                  weeklyDelta >= 0
                    ? "bg-emerald-100 text-emerald-700"
                    : "bg-rose-100 text-rose-700"
                )}
              >
                {weeklyDelta >= 0 ? (
                  <TrendingUp className="size-3" strokeWidth={2} />
                ) : (
                  <TrendingDown className="size-3" strokeWidth={2} />
                )}
                {Math.abs(weeklyDelta).toFixed(0)}%
              </span>
            )}
          </div>

          {weeklyRevenue.length >= 2 ? (
            <ChartContainer config={chartConfig} className="h-[180px] w-full mt-4">
              <AreaChart
                data={weeklyRevenue}
                margin={{ left: 0, right: 8, top: 8, bottom: 0 }}
              >
                <defs>
                  <linearGradient id="grad-store-rev" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="var(--color-revenue)" stopOpacity={0.35} />
                    <stop offset="95%" stopColor="var(--color-revenue)" stopOpacity={0.02} />
                  </linearGradient>
                </defs>
                <CartesianGrid vertical={false} strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis
                  dataKey="weekStart"
                  tickLine={false}
                  axisLine={false}
                  tickMargin={6}
                  minTickGap={24}
                  tickFormatter={fmtShortDate}
                  fontSize={11}
                />
                <YAxis hide />
                <ChartTooltip
                  cursor={{ stroke: "hsl(var(--border))", strokeWidth: 1 }}
                  content={
                    <ChartTooltipContent
                      labelFormatter={(value) => `Sem ${fmtShortDate(String(value))}`}
                      formatter={(value) => [fmtMXN(Number(value)) + "  ", "Venta"]}
                      indicator="dot"
                    />
                  }
                />
                <Area
                  type="monotone"
                  dataKey="revenue"
                  stroke="var(--color-revenue)"
                  strokeWidth={2}
                  fill="url(#grad-store-rev)"
                />
              </AreaChart>
            </ChartContainer>
          ) : (
            <div className="h-[180px] flex items-center justify-center text-sm text-muted-foreground">
              Sin histórico suficiente
            </div>
          )}
        </div>

        {/* KPI side */}
        <div className="lg:col-span-2 grid grid-cols-1 sm:grid-cols-2 divide-x divide-y border-t lg:border-t-0">
          <KpiBlock
            icon={Package}
            label="SKUs en stock"
            value={`${fmtNumber(skusInStock)}/${fmtNumber(skusActive)}`}
            sub={`${skusPct.toFixed(0)}% del catálogo · ${fmtNumber(inventoryUnits)} un`}
            tone={skusPct >= 90 ? "success" : skusPct >= 75 ? "default" : "warning"}
          />
          <KpiBlock
            icon={AlertTriangle}
            label="Quiebres"
            value={fmtNumber(stockouts)}
            sub={stockouts === 0 ? "sin quiebres" : "SKUs sin stock"}
            tone={stockouts > 0 ? "danger" : "success"}
          />
          <KpiBlock
            icon={Target}
            label="Fill rate histórico"
            value={
              avgFillRate == null ? "—" : `${(avgFillRate * 100).toFixed(0)}%`
            }
            sub={
              avgFillRate == null
                ? "sin OCs registradas"
                : avgFillRate >= 0.95
                ? "surtido completo"
                : avgFillRate >= 0.9
                ? "surtido parcial"
                : "atención surtido"
            }
            tone={
              avgFillRate == null
                ? "default"
                : avgFillRate >= 0.95
                ? "success"
                : avgFillRate >= 0.9
                ? "warning"
                : "danger"
            }
          />
          <KpiBlock
            icon={Clock}
            label="Lead time prom."
            value={
              avgLeadTimeDays == null ? "—" : `${fmtDecimal(avgLeadTimeDays)} d`
            }
            sub={
              avgLeadTimeDays == null
                ? "sin fecha esperada"
                : `${fmtMXN(inventoryValue)} en piso`
            }
          />
        </div>
      </div>
    </Card>
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
        <span className={`inline-flex size-6 items-center justify-center rounded-md ${t.chip}`}>
          <Icon className="size-3" strokeWidth={2} />
        </span>
      </div>
      <div className={`mt-2 font-mono tabular-nums text-xl lg:text-2xl font-semibold tracking-tight truncate ${t.value}`}>
        {value}
      </div>
      <div className="text-[11px] text-muted-foreground mt-0.5 truncate">{sub}</div>
    </div>
  );
}
