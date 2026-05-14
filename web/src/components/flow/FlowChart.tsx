"use client";

import {
  Area,
  Bar,
  ComposedChart,
  CartesianGrid,
  Line,
  ReferenceLine,
  XAxis,
  YAxis,
} from "recharts";

import { Card } from "@/components/ui/card";
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from "@/components/ui/chart";
import { fmtNumber } from "@/lib/format";
import type { FlowMonthPoint } from "@/lib/queries/flow";

const config = {
  sellInUnits: { label: "Sell-in (a cadena)", color: "hsl(var(--chart-4))" },
  sellOutUnits: { label: "Sell-out (al consumidor)", color: "hsl(var(--chart-1))" },
  cumulativeNetUnits: { label: "Gap acumulado", color: "hsl(var(--primary))" },
} satisfies ChartConfig;

function fmtMonthLabel(iso: string): string {
  const d = new Date(iso + "T00:00:00");
  return d.toLocaleDateString("es-MX", { month: "short", year: "2-digit" });
}

export function FlowChart({ monthly }: { monthly: FlowMonthPoint[] }) {
  if (monthly.length === 0) {
    return (
      <Card className="px-6 py-16 text-center">
        <div className="text-sm text-muted-foreground">
          Sin datos suficientes para mostrar flujo sell-in vs sell-out.
        </div>
      </Card>
    );
  }

  return (
    <Card className="p-0 gap-0 overflow-hidden">
      <div className="p-6 border-b">
        <div className="flex items-start justify-between gap-3">
          <div>
            <div className="text-base font-semibold">
              Flujo sell-in vs sell-out
            </div>
            <div className="text-xs text-muted-foreground mt-0.5">
              Unidades por mes · barras = movimiento mensual · línea = gap
              acumulado (stock teórico en cadena)
            </div>
          </div>
          <div className="flex items-center gap-3 text-xs flex-wrap justify-end">
            <Legend dot="bg-sky-500" label="Sell-in" />
            <Legend dot="bg-emerald-600" label="Sell-out" />
            <Legend dot="bg-foreground" label="Gap acumulado" line />
          </div>
        </div>

        <ChartContainer config={config} className="h-[300px] w-full mt-4">
          <ComposedChart
            data={monthly}
            margin={{ left: 0, right: 8, top: 8, bottom: 0 }}
          >
            <defs>
              <linearGradient id="grad-gap" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="var(--color-cumulativeNetUnits)" stopOpacity={0.15} />
                <stop offset="95%" stopColor="var(--color-cumulativeNetUnits)" stopOpacity={0.0} />
              </linearGradient>
            </defs>
            <CartesianGrid
              vertical={false}
              strokeDasharray="3 3"
              stroke="hsl(var(--border))"
            />
            <XAxis
              dataKey="month"
              tickLine={false}
              axisLine={false}
              tickMargin={8}
              tickFormatter={fmtMonthLabel}
              fontSize={11}
            />
            <YAxis
              yAxisId="bars"
              tickLine={false}
              axisLine={false}
              tickMargin={8}
              tickFormatter={(v) =>
                v >= 1000 ? `${Math.round(v / 1000)}k` : String(v)
              }
              fontSize={11}
              width={48}
            />
            <YAxis
              yAxisId="cum"
              orientation="right"
              tickLine={false}
              axisLine={false}
              tickMargin={8}
              tickFormatter={(v) =>
                v >= 1000 ? `${Math.round(v / 1000)}k` : String(v)
              }
              fontSize={11}
              width={48}
            />
            <ChartTooltip
              cursor={{ stroke: "hsl(var(--border))", strokeWidth: 1 }}
              content={
                <ChartTooltipContent
                  labelFormatter={(value) => fmtMonthLabel(String(value))}
                  formatter={(value, name) => {
                    if (value == null) return ["", ""];
                    const label = config[name as keyof typeof config]?.label ?? name;
                    return [fmtNumber(Number(value)) + " un  ", label];
                  }}
                  indicator="dot"
                />
              }
            />
            <ReferenceLine
              yAxisId="cum"
              y={0}
              stroke="hsl(var(--muted-foreground))"
              strokeDasharray="2 2"
              strokeOpacity={0.4}
            />
            <Bar
              yAxisId="bars"
              dataKey="sellInUnits"
              fill="var(--color-sellInUnits)"
              radius={[2, 2, 0, 0]}
              isAnimationActive={false}
            />
            <Bar
              yAxisId="bars"
              dataKey="sellOutUnits"
              fill="var(--color-sellOutUnits)"
              radius={[2, 2, 0, 0]}
              isAnimationActive={false}
            />
            <Area
              yAxisId="cum"
              type="monotone"
              dataKey="cumulativeNetUnits"
              stroke="var(--color-cumulativeNetUnits)"
              strokeWidth={2}
              fill="url(#grad-gap)"
              isAnimationActive={false}
            />
            <Line
              yAxisId="cum"
              type="monotone"
              dataKey="cumulativeNetUnits"
              stroke="var(--color-cumulativeNetUnits)"
              strokeWidth={0}
              dot={{ r: 3, fill: "var(--color-cumulativeNetUnits)" }}
              isAnimationActive={false}
            />
          </ComposedChart>
        </ChartContainer>
      </div>
    </Card>
  );
}

function Legend({
  dot,
  label,
  line,
}: {
  dot: string;
  label: string;
  line?: boolean;
}) {
  return (
    <div className="inline-flex items-center gap-1.5">
      {line ? (
        <span className="inline-block w-4 h-px border-b-2 border-foreground" />
      ) : (
        <span className={`size-2.5 rounded-sm ${dot}`} />
      )}
      <span className="text-muted-foreground">{label}</span>
    </div>
  );
}
