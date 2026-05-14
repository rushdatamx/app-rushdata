"use client";

import * as React from "react";
import { Bar, BarChart, CartesianGrid, Legend, XAxis, YAxis } from "recharts";
import { TrendingDown, TrendingUp } from "lucide-react";
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from "@/components/ui/chart";
import { Card } from "@/components/ui/card";
import { fmtMXN } from "@/lib/format";
import type { MonthlyYoyPoint } from "@/lib/queries/home-business";

const config = {
  revenueCurrent: {
    label: "Año actual",
    color: "hsl(var(--chart-1))",
  },
  revenuePrevious: {
    label: "Año anterior",
    color: "hsl(var(--chart-4))",
  },
} satisfies ChartConfig;

const MONTH_LABELS = [
  "ene", "feb", "mar", "abr", "may", "jun",
  "jul", "ago", "sep", "oct", "nov", "dic",
];

function parseMonth(monthStart: string): { m: number; y: number } {
  return {
    m: parseInt(monthStart.slice(5, 7), 10) - 1,
    y: parseInt(monthStart.slice(0, 4), 10),
  };
}

function shortMonth(monthStart: string): string {
  const { m, y } = parseMonth(monthStart);
  return `${MONTH_LABELS[m] ?? ""} ${String(y).slice(2)}`;
}

function fmtPctSigned(n: number | null): string {
  if (n == null) return "—";
  const abs = Math.abs(n).toFixed(1);
  return `${n >= 0 ? "+" : "−"}${abs}%`;
}

function kFmt(v: number): string {
  if (v >= 1_000_000) return `$${(v / 1_000_000).toFixed(1)}M`;
  if (v >= 1_000) return `$${Math.round(v / 1000)}k`;
  return `$${v}`;
}

export type YoyHeroCardProps = {
  monthly: MonthlyYoyPoint[];
  totalCurrent: number;
  totalPrevious: number;
  totalDeltaPct: number | null;
};

export function YoyHeroCard({
  monthly,
  totalCurrent,
  totalPrevious,
  totalDeltaPct,
}: YoyHeroCardProps) {
  const chartData = monthly.map((m) => ({
    label: shortMonth(m.monthStart),
    revenueCurrent: m.revenueCurrent,
    revenuePrevious: m.revenuePrevious,
  }));

  return (
    <Card className="overflow-hidden p-0 gap-0">
      <div className="grid grid-cols-1 lg:grid-cols-5">
        {/* Chart side */}
        <div className="lg:col-span-3 p-6 lg:border-r flex flex-col">
          <div>
            <div className="text-[10px] uppercase tracking-wider text-muted-foreground font-medium">
              Venta sell-out · últimos 12 meses
            </div>
            <div className="mt-2 flex items-baseline gap-3 flex-wrap">
              <span className="font-mono tabular-nums text-3xl lg:text-4xl font-semibold tracking-tight">
                {fmtMXN(totalCurrent)}
              </span>
              {totalDeltaPct != null && (
                <span
                  className={`text-xs font-medium inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded ${
                    totalDeltaPct >= 0
                      ? "bg-emerald-100 text-emerald-700"
                      : "bg-rose-100 text-rose-700"
                  }`}
                >
                  {totalDeltaPct >= 0 ? (
                    <TrendingUp className="size-3" strokeWidth={2} />
                  ) : (
                    <TrendingDown className="size-3" strokeWidth={2} />
                  )}
                  {fmtPctSigned(totalDeltaPct)} vs 12m previos
                </span>
              )}
            </div>
            <p className="text-xs text-muted-foreground mt-2">
              Comparativo mes vs mismo mes del año anterior. Datos anclados al
              último día de ventas registrado.
            </p>
          </div>

          <ChartContainer config={config} className="h-[260px] w-full mt-5">
            <BarChart
              data={chartData}
              margin={{ left: 0, right: 8, top: 8, bottom: 0 }}
              barCategoryGap="20%"
            >
              <CartesianGrid
                vertical={false}
                strokeDasharray="3 3"
                stroke="hsl(var(--border))"
              />
              <XAxis
                dataKey="label"
                tickLine={false}
                axisLine={false}
                tickMargin={8}
                fontSize={11}
              />
              <YAxis
                tickLine={false}
                axisLine={false}
                tickMargin={4}
                tickFormatter={kFmt}
                fontSize={10}
                width={48}
              />
              <ChartTooltip
                cursor={{ fill: "hsl(var(--muted) / 0.4)" }}
                content={
                  <ChartTooltipContent
                    formatter={(value, name) => [
                      fmtMXN(Number(value)) + "  ",
                      config[name as keyof typeof config]?.label ?? name,
                    ]}
                    indicator="dot"
                  />
                }
              />
              <Legend
                verticalAlign="bottom"
                height={24}
                iconType="circle"
                iconSize={8}
                formatter={(name) =>
                  config[name as keyof typeof config]?.label ?? name
                }
                wrapperStyle={{ fontSize: 11 }}
              />
              <Bar
                dataKey="revenueCurrent"
                fill="var(--color-revenueCurrent)"
                radius={[3, 3, 0, 0]}
              />
              <Bar
                dataKey="revenuePrevious"
                fill="var(--color-revenuePrevious)"
                radius={[3, 3, 0, 0]}
              />
            </BarChart>
          </ChartContainer>
        </div>

        {/* Pivot table side */}
        <div className="lg:col-span-2 p-6 flex flex-col">
          <div className="text-[10px] uppercase tracking-wider text-muted-foreground font-medium mb-3">
            Detalle mes a mes
          </div>
          <div className="overflow-hidden border rounded-md">
            <table className="w-full text-xs">
              <thead className="bg-muted/30">
                <tr className="text-left text-[10px] uppercase tracking-wider text-muted-foreground">
                  <th className="px-3 py-2 font-medium">Mes</th>
                  <th className="px-3 py-2 font-medium text-right">Actual</th>
                  <th className="px-3 py-2 font-medium text-right">Anterior</th>
                  <th className="px-3 py-2 font-medium text-right">%</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {monthly.map((m) => (
                  <tr key={m.monthStart} className="hover:bg-muted/30">
                    <td className="px-3 py-1.5 font-medium capitalize">
                      {shortMonth(m.monthStart)}
                    </td>
                    <td className="px-3 py-1.5 text-right font-mono tabular-nums">
                      {kFmt(m.revenueCurrent)}
                    </td>
                    <td className="px-3 py-1.5 text-right font-mono tabular-nums text-muted-foreground">
                      {m.revenuePrevious > 0 ? kFmt(m.revenuePrevious) : "—"}
                    </td>
                    <td className="px-3 py-1.5 text-right">
                      {m.deltaPct == null ? (
                        <span className="text-muted-foreground">—</span>
                      ) : (
                        <span
                          className={`inline-block font-mono tabular-nums font-medium text-[11px] ${
                            m.deltaPct >= 0
                              ? "text-emerald-700"
                              : "text-rose-700"
                          }`}
                        >
                          {fmtPctSigned(m.deltaPct)}
                        </span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
              <tfoot className="bg-muted/20 border-t-2">
                <tr className="text-xs font-semibold">
                  <td className="px-3 py-2">Total</td>
                  <td className="px-3 py-2 text-right font-mono tabular-nums">
                    {kFmt(totalCurrent)}
                  </td>
                  <td className="px-3 py-2 text-right font-mono tabular-nums text-muted-foreground">
                    {totalPrevious > 0 ? kFmt(totalPrevious) : "—"}
                  </td>
                  <td className="px-3 py-2 text-right">
                    {totalDeltaPct == null ? (
                      <span className="text-muted-foreground">—</span>
                    ) : (
                      <span
                        className={`font-mono tabular-nums text-[11px] ${
                          totalDeltaPct >= 0
                            ? "text-emerald-700"
                            : "text-rose-700"
                        }`}
                      >
                        {fmtPctSigned(totalDeltaPct)}
                      </span>
                    )}
                  </td>
                </tr>
              </tfoot>
            </table>
          </div>
        </div>
      </div>
    </Card>
  );
}
