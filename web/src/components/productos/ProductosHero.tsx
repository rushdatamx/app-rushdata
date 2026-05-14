"use client";

import Link from "next/link";
import { Bar, BarChart, CartesianGrid, XAxis, YAxis } from "recharts";
import { Wallet, Star, AlertTriangle, PieChart } from "lucide-react";

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

export type TopProductPoint = {
  id: string;
  shortName: string;
  fullName: string;
  revenue: number;
  units: number;
};

export type ProductosHeroProps = {
  totalSkus: number;
  totalRevenue: number;
  totalMargin: number;
  marginPct: number;
  topConcentration: number; // % de venta que representan los top 3
  topProducts: TopProductPoint[];
  starProduct: { id: string; name: string; revenue: number } | null;
  riskProduct: { id: string; name: string; stockouts: number } | null;
};

function truncate(s: string, n: number): string {
  if (s.length <= n) return s;
  return s.slice(0, n - 1) + "…";
}

export function ProductosHero({
  totalSkus,
  totalRevenue,
  totalMargin,
  marginPct,
  topConcentration,
  topProducts,
  starProduct,
  riskProduct,
}: ProductosHeroProps) {
  const data = topProducts.slice(0, 10);

  return (
    <Card className="p-0 gap-0 overflow-hidden">
      <div className="grid grid-cols-1 lg:grid-cols-5">
        {/* Chart side */}
        <div className="lg:col-span-3 p-6 lg:border-r">
          <div className="flex items-start justify-between">
            <div>
              <div className="text-[11px] tracking-wider uppercase text-muted-foreground font-medium">
                Top SKUs por venta
              </div>
              <div className="text-xs text-muted-foreground/70 mt-0.5">
                Últimos 30 días · ordenado por revenue
              </div>
            </div>
          </div>

          <div className="mt-4 flex items-baseline gap-3">
            <span className="font-mono tabular-nums text-3xl lg:text-4xl font-semibold tracking-tight">
              {fmtMXN(totalRevenue)}
            </span>
            <span className="text-xs text-muted-foreground">
              en {fmtNumber(totalSkus)} SKUs
            </span>
          </div>

          <ChartContainer config={chartConfig} className="h-[220px] w-full mt-6">
            <BarChart
              data={data}
              layout="vertical"
              margin={{ left: 0, right: 16, top: 4, bottom: 0 }}
            >
              <CartesianGrid
                horizontal={false}
                strokeDasharray="3 3"
                stroke="hsl(var(--border))"
              />
              <XAxis
                type="number"
                tickLine={false}
                axisLine={false}
                tickMargin={6}
                tickFormatter={(v) =>
                  v >= 1_000_000
                    ? `${(v / 1_000_000).toFixed(1)}M`
                    : v >= 1000
                    ? `${Math.round(v / 1000)}k`
                    : String(v)
                }
                fontSize={11}
              />
              <YAxis
                dataKey="shortName"
                type="category"
                tickLine={false}
                axisLine={false}
                tickMargin={6}
                fontSize={11}
                width={120}
                interval={0}
              />
              <ChartTooltip
                cursor={{ fill: "hsl(var(--muted))" }}
                content={
                  <ChartTooltipContent
                    labelFormatter={(_value, payload) => {
                      const p = payload?.[0]?.payload as TopProductPoint | undefined;
                      return p?.fullName ?? "";
                    }}
                    formatter={(value, _name, item) => [
                      fmtMXN(Number(value)) + "  ",
                      `${fmtNumber(item.payload.units)} unidades`,
                    ]}
                    indicator="dot"
                  />
                }
              />
              <Bar dataKey="revenue" fill="var(--color-revenue)" radius={[0, 4, 4, 0]} />
            </BarChart>
          </ChartContainer>
        </div>

        {/* KPI side */}
        <div className="lg:col-span-2 grid grid-cols-1 sm:grid-cols-2 divide-x divide-y border-t lg:border-t-0">
          <KpiBlock
            icon={Wallet}
            label="Margen 30d"
            value={fmtMXN(totalMargin)}
            sub={`${marginPct.toFixed(1)}% sobre venta · ${fmtNumber(totalSkus)} SKUs`}
            tone={
              marginPct >= 25 ? "success" : marginPct >= 15 ? "default" : "warning"
            }
          />
          <KpiBlock
            icon={PieChart}
            label="Concentración top 3"
            value={`${topConcentration.toFixed(0)}%`}
            sub={
              topConcentration > 60
                ? "alta dependencia · riesgo"
                : "de la venta total"
            }
            tone={topConcentration > 60 ? "warning" : "default"}
          />
          {starProduct ? (
            <LinkKpiBlock
              href={`/productos/${starProduct.id}`}
              icon={Star}
              label="SKU estrella 30d"
              value={fmtMXN(starProduct.revenue)}
              sub={truncate(starProduct.name, 28)}
              tone="success"
            />
          ) : (
            <KpiBlock icon={Star} label="SKU estrella 30d" value="—" sub="sin datos" />
          )}
          {riskProduct && riskProduct.stockouts > 0 ? (
            <LinkKpiBlock
              href={`/productos/${riskProduct.id}`}
              icon={AlertTriangle}
              label="Más en quiebre"
              value={`${riskProduct.stockouts} tiendas`}
              sub={truncate(riskProduct.name, 28)}
              tone="danger"
            />
          ) : (
            <KpiBlock
              icon={AlertTriangle}
              label="Más en quiebre"
              value="0"
              sub="sin quiebres"
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
        <span className={`inline-flex size-6 items-center justify-center rounded-md ${t.chip}`}>
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
