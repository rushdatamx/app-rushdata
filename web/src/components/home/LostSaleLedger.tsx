"use client";

import * as React from "react";
import { Bar, BarChart, XAxis, YAxis, Cell } from "recharts";
import { TrendingDown, TrendingUp, Wallet } from "lucide-react";
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from "@/components/ui/chart";
import { Card } from "@/components/ui/card";
import { fmtMXN, fmtNumber } from "@/lib/format";

const config = {
  lostSale: {
    label: "Venta perdida",
    color: "hsl(var(--chart-2))",
  },
} satisfies ChartConfig;

const MONTH_LABELS = [
  "ene",
  "feb",
  "mar",
  "abr",
  "may",
  "jun",
  "jul",
  "ago",
  "sep",
  "oct",
  "nov",
  "dic",
];

function shortMonth(monthStart: string): string {
  const m = parseInt(monthStart.slice(5, 7), 10) - 1;
  return MONTH_LABELS[m] ?? monthStart;
}

export type LostSaleLedgerProps = {
  ytdLostSale: number;
  ytdStockouts: number;
  ytdSince: string;
  monthlySeries: Array<{ monthStart: string; lostSale: number; stockouts: number }>;
  lastMonthLostSale: number;
  prevMonthLostSale: number;
};

export function LostSaleLedger({
  ytdLostSale,
  ytdStockouts,
  monthlySeries,
  lastMonthLostSale,
  prevMonthLostSale,
}: LostSaleLedgerProps) {
  if (ytdLostSale === 0 && monthlySeries.length === 0) return null;

  const year = new Date().getUTCFullYear();
  const monthsElapsed = monthlySeries.length || 1;
  const avgPerMonth = ytdLostSale / monthsElapsed;
  const projectedYear = avgPerMonth * 12;

  const monthDelta =
    prevMonthLostSale > 0
      ? ((lastMonthLostSale - prevMonthLostSale) / prevMonthLostSale) * 100
      : null;

  const chartData = monthlySeries.map((m) => ({
    label: shortMonth(m.monthStart),
    value: m.lostSale,
  }));
  const maxValue = Math.max(...chartData.map((d) => d.value), 1);

  return (
    <Card className="overflow-hidden p-0 gap-0">
      <div className="grid grid-cols-1 lg:grid-cols-5">
        {/* Left: hero number */}
        <div className="lg:col-span-2 p-6 lg:border-r flex flex-col justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <span className="inline-flex size-7 items-center justify-center rounded-md bg-rose-100 text-rose-700">
                <Wallet className="size-3.5" strokeWidth={2} />
              </span>
              <span className="text-[10px] uppercase tracking-wider text-muted-foreground font-medium">
                Lost Sale Ledger {year}
              </span>
            </div>
            <div className="mt-3 font-mono tabular-nums text-3xl lg:text-4xl font-semibold tracking-tight text-rose-700">
              {fmtMXN(ytdLostSale)}
            </div>
            <p className="text-xs text-muted-foreground mt-2">
              Venta perdida acumulada por quiebres y sugeridos no cumplidos en lo
              que va del año.
            </p>
          </div>

          <div className="grid grid-cols-2 gap-4 pt-4 border-t">
            <div>
              <div className="text-[10px] uppercase tracking-wider text-muted-foreground font-medium">
                Mes corriente
              </div>
              <div className="flex items-baseline gap-2 mt-1">
                <span className="font-mono tabular-nums text-base font-semibold">
                  {fmtMXN(lastMonthLostSale)}
                </span>
                {monthDelta != null && (
                  <span
                    className={`text-[11px] inline-flex items-center gap-0.5 font-medium ${
                      monthDelta <= 0 ? "text-emerald-600" : "text-rose-600"
                    }`}
                  >
                    {monthDelta <= 0 ? (
                      <TrendingDown className="size-3" strokeWidth={2} />
                    ) : (
                      <TrendingUp className="size-3" strokeWidth={2} />
                    )}
                    {Math.abs(monthDelta).toFixed(0)}%
                  </span>
                )}
              </div>
            </div>
            <div>
              <div className="text-[10px] uppercase tracking-wider text-muted-foreground font-medium">
                Quiebres-día YTD
              </div>
              <div className="font-mono tabular-nums text-base font-semibold mt-1">
                {fmtNumber(ytdStockouts)}
              </div>
            </div>
          </div>
        </div>

        {/* Right: monthly chart + projection */}
        <div className="lg:col-span-3 p-6 flex flex-col">
          <div className="flex items-end justify-between gap-4">
            <div>
              <div className="text-[10px] uppercase tracking-wider text-muted-foreground font-medium">
                Por mes · {year}
              </div>
              <div className="text-xs text-muted-foreground/70 mt-0.5">
                Proyección anual:{" "}
                <span className="font-mono tabular-nums font-medium text-foreground">
                  {fmtMXN(projectedYear)}
                </span>
              </div>
            </div>
          </div>

          <ChartContainer config={config} className="h-[140px] w-full mt-3">
            <BarChart
              data={chartData}
              margin={{ left: 0, right: 0, top: 8, bottom: 0 }}
            >
              <XAxis
                dataKey="label"
                tickLine={false}
                axisLine={false}
                tickMargin={6}
                fontSize={11}
              />
              <YAxis
                tickLine={false}
                axisLine={false}
                tickMargin={4}
                tickFormatter={(v) =>
                  v >= 1000 ? `${Math.round(v / 1000)}k` : String(v)
                }
                fontSize={10}
                width={40}
              />
              <ChartTooltip
                cursor={{ fill: "hsl(var(--muted) / 0.4)" }}
                content={
                  <ChartTooltipContent
                    formatter={(value, _name, item) => [
                      fmtMXN(Number(value)) + "  ",
                      `${(item?.payload?.label as string)?.toUpperCase()}`,
                    ]}
                    indicator="dot"
                  />
                }
              />
              <Bar dataKey="value" radius={[3, 3, 0, 0]}>
                {chartData.map((d, i) => (
                  <Cell
                    key={i}
                    fill={
                      d.value === maxValue
                        ? "hsl(var(--chart-2))"
                        : "hsl(var(--chart-2) / 0.55)"
                    }
                  />
                ))}
              </Bar>
            </BarChart>
          </ChartContainer>

          <div className="mt-3 text-[11px] text-muted-foreground">
            Cada peso aquí es venta que tu marca <em>pudo</em> haber capturado.
            Compara contra el costo de RushData para validar el ROI mes a mes.
          </div>
        </div>
      </div>
    </Card>
  );
}
