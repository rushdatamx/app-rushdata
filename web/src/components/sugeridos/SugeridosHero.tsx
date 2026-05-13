"use client";

import { Area, AreaChart, CartesianGrid, XAxis, YAxis } from "recharts";
import { TrendingUp, TrendingDown, AlertCircle, ShoppingCart, Package, Boxes } from "lucide-react";

import { Card } from "@/components/ui/card";
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from "@/components/ui/chart";
import { fmtMXN, fmtNumber } from "@/lib/format";

const chartConfig = {
  lostSale: { label: "Venta perdida", color: "hsl(var(--chart-2))" },
} satisfies ChartConfig;

export type SeverityBreakdown = {
  critical: number;
  high: number;
  medium: number;
  low: number;
};

export type SugeridosHeroProps = {
  count: number;
  lostSale: number;
  cases: number;
  trend: Array<{ date: string; lostSale: number }>;
  severity: SeverityBreakdown;
};

function fmtShortDate(iso: string): string {
  const d = new Date(iso + "T00:00:00");
  return d.toLocaleDateString("es-MX", { day: "numeric", month: "short" });
}

function pctDelta(series: SugeridosHeroProps["trend"]): number | null {
  if (series.length < 4) return null;
  const half = Math.floor(series.length / 2);
  const prev = series.slice(0, half).reduce((a, p) => a + p.lostSale, 0);
  const curr = series.slice(half).reduce((a, p) => a + p.lostSale, 0);
  if (prev === 0) return null;
  return ((curr - prev) / prev) * 100;
}

export function SugeridosHero({
  count,
  lostSale,
  cases,
  trend,
  severity,
}: SugeridosHeroProps) {
  const delta = pctDelta(trend);
  const trendTotal = trend.reduce((a, p) => a + p.lostSale, 0);

  return (
    <Card className="p-0 gap-0 overflow-hidden">
      <div className="grid grid-cols-1 lg:grid-cols-5">
        {/* Chart side */}
        <div className="lg:col-span-3 p-6 lg:border-r">
          <div className="flex items-start justify-between">
            <div>
              <div className="text-[11px] tracking-wider uppercase text-muted-foreground font-medium">
                Venta perdida en curso
              </div>
              <div className="text-xs text-muted-foreground/70 mt-0.5">
                Últimos {trend.length} días · alertas de quiebre activas
              </div>
            </div>
            {delta != null && (
              <span
                className={`text-xs font-medium inline-flex items-center gap-1 px-2 py-1 rounded-md ${
                  delta <= 0
                    ? "bg-emerald-100 text-emerald-700"
                    : "bg-rose-100 text-rose-700"
                }`}
              >
                {delta <= 0 ? (
                  <TrendingDown className="size-3" strokeWidth={2} />
                ) : (
                  <TrendingUp className="size-3" strokeWidth={2} />
                )}
                {delta >= 0 ? "+" : ""}
                {delta.toFixed(1)}%
              </span>
            )}
          </div>

          <div className="mt-4 flex items-baseline gap-3">
            <span className="font-mono tabular-nums text-3xl lg:text-4xl font-semibold tracking-tight text-rose-700">
              {fmtMXN(trendTotal)}
            </span>
            <span className="text-xs text-muted-foreground">acumulado</span>
          </div>

          <ChartContainer config={chartConfig} className="h-[140px] w-full mt-4">
            <AreaChart data={trend} margin={{ left: 0, right: 8, top: 8, bottom: 0 }}>
              <defs>
                <linearGradient id="grad-sug-lost" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="var(--color-lostSale)" stopOpacity={0.35} />
                  <stop offset="95%" stopColor="var(--color-lostSale)" stopOpacity={0.02} />
                </linearGradient>
              </defs>
              <CartesianGrid vertical={false} strokeDasharray="3 3" stroke="hsl(var(--border))" />
              <XAxis
                dataKey="date"
                tickLine={false}
                axisLine={false}
                tickMargin={6}
                minTickGap={24}
                tickFormatter={fmtShortDate}
                fontSize={10}
              />
              <YAxis hide />
              <ChartTooltip
                cursor={{ stroke: "hsl(var(--border))", strokeWidth: 1 }}
                content={
                  <ChartTooltipContent
                    labelFormatter={(value) => fmtShortDate(String(value))}
                    formatter={(value) => [fmtMXN(Number(value)) + "  ", "Venta perdida"]}
                    indicator="dot"
                  />
                }
              />
              <Area
                type="monotone"
                dataKey="lostSale"
                stroke="var(--color-lostSale)"
                strokeWidth={2}
                fill="url(#grad-sug-lost)"
              />
            </AreaChart>
          </ChartContainer>
        </div>

        {/* KPI grid side */}
        <div className="lg:col-span-2 grid grid-cols-1 sm:grid-cols-2 divide-x divide-y">
          <KpiBlock
            icon={ShoppingCart}
            label="Sugeridos"
            value={fmtNumber(count)}
            sub="pendientes de enviar"
          />
          <KpiBlock
            icon={Package}
            label="En riesgo"
            value={fmtMXN(lostSale)}
            sub="venta perdida est."
            tone="danger"
          />
          <KpiBlock
            icon={Boxes}
            label="Cajas"
            value={fmtNumber(cases)}
            sub="totales a pedir"
          />
          <KpiBlock
            icon={AlertCircle}
            label="Críticos"
            value={fmtNumber(severity.critical + severity.high)}
            sub={`${severity.critical} críticos · ${severity.high} altos`}
            tone={severity.critical > 0 ? "danger" : "default"}
          />
        </div>
      </div>
    </Card>
  );
}

type Tone = "default" | "danger";

const TONE: Record<Tone, { value: string; chip: string }> = {
  default: { value: "text-foreground", chip: "bg-muted text-muted-foreground" },
  danger: { value: "text-rose-700", chip: "bg-rose-100 text-rose-700" },
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
      <div className={`mt-2 font-mono tabular-nums text-2xl font-semibold tracking-tight ${t.value}`}>
        {value}
      </div>
      <div className="text-[11px] text-muted-foreground mt-0.5">{sub}</div>
    </div>
  );
}
