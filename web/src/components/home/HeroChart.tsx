"use client";

import * as React from "react";
import Link from "next/link";
import {
  Area,
  AreaChart,
  CartesianGrid,
  XAxis,
  YAxis,
} from "recharts";
import { TrendingDown, TrendingUp, AlertTriangle, ShoppingCart, Target } from "lucide-react";

import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from "@/components/ui/chart";
import { Card } from "@/components/ui/card";
import { fmtMXN, fmtNumber } from "@/lib/format";

const chartConfig = {
  capturedSale: {
    label: "Capturada",
    color: "hsl(var(--chart-1))",
  },
  lostSale: {
    label: "Perdida",
    color: "hsl(var(--chart-2))",
  },
} satisfies ChartConfig;

export type HeroChartProps = {
  series: Array<{ date: string; capturedSale: number; lostSale: number }>;
  stockouts: number;
  suggestedCount: number;
  suggestedValue: number;
  fillRate: number | null;
  periodLabel: string;
};

function pctDelta(series: HeroChartProps["series"], key: "capturedSale" | "lostSale"): number | null {
  if (series.length < 4) return null;
  const half = Math.floor(series.length / 2);
  const prev = series.slice(0, half).reduce((a, p) => a + p[key], 0);
  const curr = series.slice(half).reduce((a, p) => a + p[key], 0);
  if (prev === 0) return null;
  return ((curr - prev) / prev) * 100;
}

function fmtShortDate(iso: string): string {
  const d = new Date(iso + "T00:00:00");
  return d.toLocaleDateString("es-MX", { day: "numeric", month: "short" });
}

export function HeroChart({
  series,
  stockouts,
  suggestedCount,
  suggestedValue,
  fillRate,
  periodLabel,
}: HeroChartProps) {
  const totalCaptured = series.reduce((a, p) => a + p.capturedSale, 0);
  const totalLost = series.reduce((a, p) => a + p.lostSale, 0);
  const lostDelta = pctDelta(series, "lostSale");
  const capturedDelta = pctDelta(series, "capturedSale");

  return (
    <Card className="overflow-hidden p-0 gap-0">
      <div className="grid grid-cols-1 lg:grid-cols-5">
        {/* Chart side */}
        <div className="lg:col-span-3 p-6 lg:border-r">
          <div className="flex items-start justify-between gap-4 mb-1">
            <div>
              <div className="text-[11px] tracking-wider uppercase text-muted-foreground font-medium">
                Venta capturada vs perdida
              </div>
              <div className="text-xs text-muted-foreground/70 mt-0.5">
                {periodLabel}
              </div>
            </div>
          </div>

          <div className="mt-4 flex items-baseline gap-6">
            <div>
              <div className="text-[10px] uppercase tracking-wider text-muted-foreground">
                Capturada
              </div>
              <div className="flex items-baseline gap-2 mt-1">
                <span className="font-mono tabular-nums text-2xl lg:text-3xl font-semibold tracking-tight">
                  {fmtMXN(totalCaptured)}
                </span>
                {capturedDelta != null && (
                  <span
                    className={`text-xs font-medium inline-flex items-center gap-0.5 ${
                      capturedDelta >= 0 ? "text-emerald-600" : "text-rose-600"
                    }`}
                  >
                    {capturedDelta >= 0 ? (
                      <TrendingUp className="size-3" strokeWidth={2} />
                    ) : (
                      <TrendingDown className="size-3" strokeWidth={2} />
                    )}
                    {Math.abs(capturedDelta).toFixed(1)}%
                  </span>
                )}
              </div>
            </div>
            <div>
              <div className="text-[10px] uppercase tracking-wider text-muted-foreground">
                Perdida
              </div>
              <div className="flex items-baseline gap-2 mt-1">
                <span className="font-mono tabular-nums text-xl lg:text-2xl font-semibold tracking-tight text-rose-700">
                  {fmtMXN(totalLost)}
                </span>
                {lostDelta != null && (
                  <span
                    className={`text-xs font-medium inline-flex items-center gap-0.5 ${
                      lostDelta <= 0 ? "text-emerald-600" : "text-rose-600"
                    }`}
                  >
                    {lostDelta <= 0 ? (
                      <TrendingDown className="size-3" strokeWidth={2} />
                    ) : (
                      <TrendingUp className="size-3" strokeWidth={2} />
                    )}
                    {Math.abs(lostDelta).toFixed(1)}%
                  </span>
                )}
              </div>
            </div>
          </div>

          <ChartContainer config={chartConfig} className="h-[260px] w-full mt-6">
            <AreaChart data={series} margin={{ left: 0, right: 8, top: 8, bottom: 0 }}>
              <defs>
                <linearGradient id="grad-captured" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="var(--color-capturedSale)" stopOpacity={0.35} />
                  <stop offset="95%" stopColor="var(--color-capturedSale)" stopOpacity={0.02} />
                </linearGradient>
                <linearGradient id="grad-lost" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="var(--color-lostSale)" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="var(--color-lostSale)" stopOpacity={0.02} />
                </linearGradient>
              </defs>
              <CartesianGrid vertical={false} strokeDasharray="3 3" stroke="hsl(var(--border))" />
              <XAxis
                dataKey="date"
                tickLine={false}
                axisLine={false}
                tickMargin={8}
                minTickGap={32}
                tickFormatter={fmtShortDate}
                fontSize={11}
              />
              <YAxis
                tickLine={false}
                axisLine={false}
                tickMargin={8}
                tickFormatter={(v) => (v >= 1000 ? `${Math.round(v / 1000)}k` : String(v))}
                fontSize={11}
                width={48}
              />
              <ChartTooltip
                cursor={{ stroke: "hsl(var(--border))", strokeWidth: 1 }}
                content={
                  <ChartTooltipContent
                    labelFormatter={(value) => fmtShortDate(String(value))}
                    formatter={(value, name) => [
                      fmtMXN(Number(value)) + "  ",
                      chartConfig[name as keyof typeof chartConfig]?.label ?? name,
                    ]}
                    indicator="dot"
                  />
                }
              />
              <Area
                type="monotone"
                dataKey="capturedSale"
                stroke="var(--color-capturedSale)"
                strokeWidth={2}
                fill="url(#grad-captured)"
              />
              <Area
                type="monotone"
                dataKey="lostSale"
                stroke="var(--color-lostSale)"
                strokeWidth={2}
                fill="url(#grad-lost)"
              />
            </AreaChart>
          </ChartContainer>
        </div>

        {/* KPI side */}
        <div className="lg:col-span-2 flex flex-col divide-y border-t lg:border-t-0">
          <MiniKpi
            label="En quiebre hoy"
            value={fmtNumber(stockouts)}
            sub={
              stockouts === 0
                ? "Sin quiebres activos"
                : `${stockouts === 1 ? "tienda × SKU" : "tiendas × SKUs"} sin stock`
            }
            tone={stockouts > 0 ? "danger" : "success"}
            icon={AlertTriangle}
            href="/sugeridos?severity=critical"
          />
          <MiniKpi
            label="Por reabastecer"
            value={fmtNumber(suggestedCount)}
            sub={`${fmtMXN(suggestedValue)} en riesgo`}
            tone="default"
            icon={ShoppingCart}
            href="/sugeridos"
          />
          <MiniKpi
            label="Fill rate"
            value={fillRate == null ? "—" : `${fillRate.toFixed(1)}%`}
            sub={periodLabel}
            tone={fillRate != null && fillRate >= 95 ? "success" : "warning"}
            icon={Target}
            href="/oc"
          />
        </div>
      </div>
    </Card>
  );
}

type Tone = "default" | "danger" | "success" | "warning";

const TONE_STYLES: Record<Tone, { value: string; chip: string }> = {
  default: { value: "text-foreground", chip: "bg-muted text-muted-foreground" },
  danger: { value: "text-rose-700", chip: "bg-rose-100 text-rose-700" },
  success: { value: "text-emerald-700", chip: "bg-emerald-100 text-emerald-700" },
  warning: { value: "text-amber-700", chip: "bg-amber-100 text-amber-700" },
};

function MiniKpi({
  label,
  value,
  sub,
  tone,
  icon: Icon,
  href,
}: {
  label: string;
  value: string;
  sub: string;
  tone: Tone;
  icon: React.ComponentType<{ className?: string; strokeWidth?: number }>;
  href: string;
}) {
  const styles = TONE_STYLES[tone];
  return (
    <Link
      href={href}
      className="group flex-1 flex flex-col justify-center px-6 py-5 hover:bg-muted/40 transition-colors"
    >
      <div className="flex items-center justify-between">
        <span className="text-[10px] uppercase tracking-wider text-muted-foreground font-medium">
          {label}
        </span>
        <span
          className={`inline-flex size-6 items-center justify-center rounded-md ${styles.chip}`}
        >
          <Icon className="size-3" strokeWidth={2} />
        </span>
      </div>
      <div
        className={`mt-2 font-mono tabular-nums text-3xl font-semibold tracking-tight ${styles.value}`}
      >
        {value}
      </div>
      <div className="text-xs text-muted-foreground mt-1">{sub}</div>
    </Link>
  );
}
