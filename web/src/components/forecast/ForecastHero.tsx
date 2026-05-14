"use client";

import {
  Area,
  ComposedChart,
  CartesianGrid,
  Line,
  ReferenceLine,
  XAxis,
  YAxis,
} from "recharts";
import {
  TrendingUp,
  TrendingDown,
  Sparkles,
  Calendar,
  Target,
  Activity,
} from "lucide-react";

import { Card } from "@/components/ui/card";
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from "@/components/ui/chart";
import { fmtMXN } from "@/lib/format";
import { cn } from "@/lib/utils";
import type { ForecastSeriesPoint } from "@/lib/queries/forecast";

const config = {
  actual: { label: "Real", color: "hsl(var(--chart-1))" },
  forecast: { label: "Pronóstico", color: "hsl(var(--primary))" },
  yoy: { label: "Año anterior", color: "hsl(var(--muted-foreground))" },
} satisfies ChartConfig;

function fmtShortDate(iso: string): string {
  const d = new Date(iso + "T00:00:00");
  return d.toLocaleDateString("es-MX", { day: "numeric", month: "short" });
}

export type ForecastHeroProps = {
  series: ForecastSeriesPoint[];
  forecast30dRevenue: number;
  forecastDeltaPct: number | null;
  yoyDeltaPct: number | null;
  momDeltaPct: number | null;
  mape: number | null;
  trendSlopeWeekly: number | null;
};

export function ForecastHero({
  series,
  forecast30dRevenue,
  forecastDeltaPct,
  yoyDeltaPct,
  momDeltaPct,
  mape,
  trendSlopeWeekly,
}: ForecastHeroProps) {
  // El chart espera valores numéricos para todos los días en cada serie
  // Usamos null para "no aplica" pero Recharts dibuja gaps
  const chartData = series.map((p) => ({
    date: p.date,
    actual: p.actual,
    forecast: p.forecast,
    yoy: p.yoy,
  }));

  const todayIso = new Date().toISOString().slice(0, 10);
  const accuracy = mape == null ? null : Math.max(0, 100 - mape);

  return (
    <Card className="p-0 gap-0 overflow-hidden">
      <div className="grid grid-cols-1 lg:grid-cols-5">
        {/* Chart side */}
        <div className="lg:col-span-3 p-6 lg:border-r">
          <div className="flex items-start justify-between gap-3">
            <div>
              <div className="text-[11px] tracking-wider uppercase text-muted-foreground font-medium">
                Real vs pronóstico vs año anterior
              </div>
              <div className="text-xs text-muted-foreground/70 mt-0.5">
                90 días históricos · 30 días proyectados
              </div>
            </div>
            <div className="flex items-center gap-3 text-xs flex-wrap justify-end">
              <Legend dot="bg-emerald-600" label="Real" />
              <Legend dot="bg-foreground" label="Pronóstico" dashed />
              <Legend dot="bg-muted-foreground/60" label="Año anterior" />
            </div>
          </div>

          {/* Hero number: pronóstico 30d */}
          <div className="mt-4 flex items-baseline gap-3 flex-wrap">
            <div>
              <div className="text-[10px] uppercase tracking-wider text-muted-foreground font-medium">
                Pronóstico próximos 30d
              </div>
              <div className="flex items-baseline gap-2 mt-1">
                <span className="font-mono tabular-nums text-3xl lg:text-4xl font-semibold tracking-tight">
                  {fmtMXN(forecast30dRevenue)}
                </span>
                {forecastDeltaPct != null && (
                  <DeltaBadge value={forecastDeltaPct} label="vs mes actual" />
                )}
              </div>
            </div>
          </div>

          {/* Chart */}
          <ChartContainer config={config} className="h-[260px] w-full mt-4">
            <ComposedChart
              data={chartData}
              margin={{ left: 0, right: 8, top: 8, bottom: 0 }}
            >
              <defs>
                <linearGradient id="grad-actual" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="var(--color-actual)" stopOpacity={0.35} />
                  <stop offset="95%" stopColor="var(--color-actual)" stopOpacity={0.02} />
                </linearGradient>
                <linearGradient id="grad-forecast" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="var(--color-forecast)" stopOpacity={0.25} />
                  <stop offset="95%" stopColor="var(--color-forecast)" stopOpacity={0.02} />
                </linearGradient>
              </defs>
              <CartesianGrid
                vertical={false}
                strokeDasharray="3 3"
                stroke="hsl(var(--border))"
              />
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
                tickFormatter={(v) =>
                  v >= 1_000_000
                    ? `${(v / 1_000_000).toFixed(1)}M`
                    : v >= 1000
                    ? `${Math.round(v / 1000)}k`
                    : String(v)
                }
                fontSize={11}
                width={48}
              />
              <ChartTooltip
                cursor={{ stroke: "hsl(var(--border))", strokeWidth: 1 }}
                content={
                  <ChartTooltipContent
                    labelFormatter={(value) => fmtShortDate(String(value))}
                    formatter={(value, name) => {
                      if (value == null) return ["", ""];
                      const label = config[name as keyof typeof config]?.label ?? name;
                      return [fmtMXN(Number(value)) + "  ", label];
                    }}
                    indicator="dot"
                  />
                }
              />
              <ReferenceLine
                x={todayIso}
                stroke="hsl(var(--foreground))"
                strokeDasharray="2 2"
                strokeOpacity={0.4}
                label={{
                  value: "hoy",
                  position: "top",
                  fontSize: 10,
                  fill: "hsl(var(--muted-foreground))",
                }}
              />
              <Line
                type="monotone"
                dataKey="yoy"
                stroke="var(--color-yoy)"
                strokeWidth={1.5}
                strokeOpacity={0.5}
                dot={false}
                isAnimationActive={false}
              />
              <Area
                type="monotone"
                dataKey="actual"
                stroke="var(--color-actual)"
                strokeWidth={2}
                fill="url(#grad-actual)"
                isAnimationActive={false}
                connectNulls={false}
              />
              <Area
                type="monotone"
                dataKey="forecast"
                stroke="var(--color-forecast)"
                strokeWidth={2}
                strokeDasharray="4 3"
                fill="url(#grad-forecast)"
                isAnimationActive={false}
                connectNulls={false}
              />
            </ComposedChart>
          </ChartContainer>
        </div>

        {/* KPI side */}
        <div className="lg:col-span-2 grid grid-cols-1 sm:grid-cols-2 divide-x divide-y border-t lg:border-t-0">
          <KpiBlock
            icon={Calendar}
            label="vs mes anterior"
            value={
              momDeltaPct == null
                ? "—"
                : `${momDeltaPct >= 0 ? "+" : ""}${momDeltaPct.toFixed(1)}%`
            }
            sub="último mes vs previo"
            tone={
              momDeltaPct == null
                ? "default"
                : momDeltaPct >= 5
                ? "success"
                : momDeltaPct <= -5
                ? "danger"
                : "default"
            }
            tonedValue
          />
          <KpiBlock
            icon={Sparkles}
            label="vs año anterior"
            value={
              yoyDeltaPct == null
                ? "—"
                : `${yoyDeltaPct >= 0 ? "+" : ""}${yoyDeltaPct.toFixed(1)}%`
            }
            sub="mismo periodo YoY"
            tone={
              yoyDeltaPct == null
                ? "default"
                : yoyDeltaPct >= 5
                ? "success"
                : yoyDeltaPct <= -5
                ? "danger"
                : "default"
            }
            tonedValue
          />
          <KpiBlock
            icon={Activity}
            label="Tendencia 8 sem"
            value={
              trendSlopeWeekly == null
                ? "—"
                : `${trendSlopeWeekly >= 0 ? "+" : ""}${trendSlopeWeekly.toFixed(1)}%`
            }
            sub="por semana"
            tone={
              trendSlopeWeekly == null
                ? "default"
                : trendSlopeWeekly >= 1
                ? "success"
                : trendSlopeWeekly <= -1
                ? "danger"
                : "default"
            }
            tonedValue
          />
          <KpiBlock
            icon={Target}
            label="Precisión"
            value={accuracy == null ? "—" : `${accuracy.toFixed(1)}%`}
            sub="back-test 30d (MAPE)"
            tone={
              accuracy == null
                ? "default"
                : accuracy >= 85
                ? "success"
                : accuracy >= 70
                ? "warning"
                : "danger"
            }
            tonedValue
          />
        </div>
      </div>
    </Card>
  );
}

function Legend({
  dot,
  label,
  dashed,
}: {
  dot: string;
  label: string;
  dashed?: boolean;
}) {
  return (
    <div className="inline-flex items-center gap-1.5">
      {dashed ? (
        <span className="inline-block w-4 h-px border-b-2 border-dashed border-foreground" />
      ) : (
        <span className={cn("size-2.5 rounded-sm", dot)} />
      )}
      <span className="text-muted-foreground">{label}</span>
    </div>
  );
}

function DeltaBadge({ value, label }: { value: number; label: string }) {
  const positive = value >= 0;
  return (
    <span
      className={cn(
        "text-xs font-medium inline-flex items-center gap-1 px-2 py-0.5 rounded-md",
        positive ? "bg-emerald-100 text-emerald-700" : "bg-rose-100 text-rose-700"
      )}
    >
      {positive ? (
        <TrendingUp className="size-3" strokeWidth={2} />
      ) : (
        <TrendingDown className="size-3" strokeWidth={2} />
      )}
      {positive ? "+" : ""}
      {value.toFixed(1)}% {label}
    </span>
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
  tonedValue = false,
}: {
  icon: React.ComponentType<{ className?: string; strokeWidth?: number }>;
  label: string;
  value: string;
  sub: string;
  tone?: Tone;
  tonedValue?: boolean;
}) {
  const t = TONE[tone];
  return (
    <div className="flex flex-col justify-center px-5 py-5 h-full">
      <div className="flex items-center justify-between">
        <span className="text-[10px] uppercase tracking-wider text-muted-foreground font-medium">
          {label}
        </span>
        <span
          className={cn(
            "inline-flex size-6 items-center justify-center rounded-md",
            t.chip
          )}
        >
          <Icon className="size-3" strokeWidth={2} />
        </span>
      </div>
      <div
        className={cn(
          "mt-2 font-mono tabular-nums text-2xl font-semibold tracking-tight truncate",
          tonedValue ? t.value : "text-foreground"
        )}
      >
        {value}
      </div>
      <div className="text-[11px] text-muted-foreground mt-0.5 truncate">
        {sub}
      </div>
    </div>
  );
}

