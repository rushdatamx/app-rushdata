"use client";

import Link from "next/link";
import { Bar, BarChart, CartesianGrid, XAxis, YAxis } from "recharts";
import { AlertTriangle, TrendingUp, ShieldAlert, Layers } from "lucide-react";

import { Card } from "@/components/ui/card";
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from "@/components/ui/chart";
import { fmtMXN, fmtNumber } from "@/lib/format";

const chartConfig = {
  revenue: { label: "Venta 30d", color: "hsl(var(--chart-1))" },
} satisfies ChartConfig;

export type ClusterPoint = { cluster: string; revenue: number; stores: number };

export type TiendasHeroProps = {
  totalStores: number;
  totalStockouts: number;
  totalRevenue: number;
  storesWithStockout: number;
  byCluster: ClusterPoint[];
  topStore: { id: string; name: string; revenue: number } | null;
  riskStore: { id: string; name: string; stockouts: number } | null;
  top5Concentration: number;
};

export function TiendasHero({
  totalStores,
  totalStockouts,
  totalRevenue,
  storesWithStockout,
  byCluster,
  topStore,
  riskStore,
  top5Concentration,
}: TiendasHeroProps) {
  const pctStockout =
    totalStores === 0 ? 0 : (storesWithStockout / totalStores) * 100;

  return (
    <Card className="p-0 gap-0 overflow-hidden">
      <div className="grid grid-cols-1 lg:grid-cols-5">
        {/* Chart side */}
        <div className="lg:col-span-3 p-6 lg:border-r">
          <div className="flex items-start justify-between">
            <div>
              <div className="text-[11px] tracking-wider uppercase text-muted-foreground font-medium">
                Venta por cluster
              </div>
              <div className="text-xs text-muted-foreground/70 mt-0.5">
                Últimos 30 días · MXN
              </div>
            </div>
          </div>

          <div className="mt-4 flex items-baseline gap-3">
            <span className="font-mono tabular-nums text-3xl lg:text-4xl font-semibold tracking-tight">
              {fmtMXN(totalRevenue)}
            </span>
            <span className="text-xs text-muted-foreground">
              en {fmtNumber(totalStores)} tiendas
            </span>
          </div>

          <ChartContainer
            config={chartConfig}
            className="h-[200px] w-full mt-6"
          >
            <BarChart
              data={byCluster}
              margin={{ left: 0, right: 8, top: 8, bottom: 0 }}
            >
              <CartesianGrid
                vertical={false}
                strokeDasharray="3 3"
                stroke="hsl(var(--border))"
              />
              <XAxis
                dataKey="cluster"
                tickLine={false}
                axisLine={false}
                tickMargin={6}
                fontSize={11}
                tickFormatter={(v) => `C${v}`}
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
                cursor={{ fill: "hsl(var(--muted))" }}
                content={
                  <ChartTooltipContent
                    labelFormatter={(value) => `Cluster ${value}`}
                    formatter={(value, _name, item) => [
                      fmtMXN(Number(value)) + "  ",
                      `${item.payload.stores} tiendas`,
                    ]}
                    indicator="dot"
                  />
                }
              />
              <Bar
                dataKey="revenue"
                fill="var(--color-revenue)"
                radius={[4, 4, 0, 0]}
              />
            </BarChart>
          </ChartContainer>
        </div>

        {/* KPI side */}
        <div className="lg:col-span-2 grid grid-cols-1 sm:grid-cols-2 divide-x divide-y border-t lg:border-t-0">
          <KpiBlock
            icon={ShieldAlert}
            label="Con quiebres"
            value={`${pctStockout.toFixed(0)}%`}
            sub={`${storesWithStockout} de ${totalStores} tiendas`}
            tone={pctStockout > 20 ? "danger" : pctStockout > 0 ? "warning" : "success"}
          />
          <KpiBlock
            icon={Layers}
            label="Concentración top 5"
            value={`${top5Concentration.toFixed(0)}%`}
            sub={
              top5Concentration > 60
                ? "alta dependencia · riesgo"
                : top5Concentration > 40
                ? "moderada"
                : "diversificado"
            }
            tone={
              top5Concentration > 60
                ? "warning"
                : top5Concentration > 80
                ? "danger"
                : "default"
            }
          />
          {topStore ? (
            <LinkKpiBlock
              href={`/tiendas/${topStore.id}`}
              icon={TrendingUp}
              label="Top tienda 30d"
              value={fmtMXN(topStore.revenue)}
              sub={topStore.name}
              tone="success"
            />
          ) : (
            <KpiBlock icon={TrendingUp} label="Top tienda 30d" value="—" sub="sin datos" />
          )}
          {riskStore && riskStore.stockouts > 0 ? (
            <LinkKpiBlock
              href={`/tiendas/${riskStore.id}`}
              icon={AlertTriangle}
              label="Mayor riesgo"
              value={`${riskStore.stockouts} quiebres`}
              sub={riskStore.name}
              tone="danger"
            />
          ) : (
            <KpiBlock
              icon={AlertTriangle}
              label="Mayor riesgo"
              value="0"
              sub="sin quiebres activos"
              tone="success"
            />
          )}
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
        <span
          className={`inline-flex size-6 items-center justify-center rounded-md ${t.chip}`}
        >
          <Icon className="size-3" strokeWidth={2} />
        </span>
      </div>
      <div
        className={`mt-2 font-mono tabular-nums text-xl lg:text-2xl font-semibold tracking-tight truncate ${t.value}`}
      >
        {value}
      </div>
      <div className="text-[11px] text-muted-foreground mt-0.5 truncate">{sub}</div>
    </div>
  );
}

function LinkKpiBlock(props: React.ComponentProps<typeof KpiBlock> & { href: string }) {
  const { href, ...rest } = props;
  return (
    <Link href={href} className="hover:bg-muted/40 transition-colors">
      <KpiBlock {...rest} />
    </Link>
  );
}
