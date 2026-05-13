"use client";

import { Bar, BarChart, CartesianGrid, XAxis, YAxis } from "recharts";
import { MapPin, AlertTriangle, Boxes, ShoppingCart } from "lucide-react";

import { Card } from "@/components/ui/card";
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from "@/components/ui/chart";
import { fmtMXN, fmtNumber } from "@/lib/format";

const chartConfig = {
  revenue: { label: "Venta", color: "hsl(var(--chart-1))" },
} satisfies ChartConfig;

const MES = ["ene", "feb", "mar", "abr", "may", "jun", "jul", "ago", "sep", "oct", "nov", "dic"];

function fmtMonthLabel(iso: string): string {
  if (!iso) return "—";
  const d = new Date(iso + "T00:00:00");
  return `${MES[d.getMonth()]} ${String(d.getFullYear()).slice(2)}`;
}

export type MonthlyPoint = { monthStart: string; revenue: number; units: number };

export type ProductDetailHeroProps = {
  monthly: MonthlyPoint[];
  storesWithInventory: number;
  storesTotal: number;
  stockouts: number;
  inventoryUnits: number;
  pendingSuggestions: number;
  revenue30d: number;
};

export function ProductDetailHero({
  monthly,
  storesWithInventory,
  storesTotal,
  stockouts,
  inventoryUnits,
  pendingSuggestions,
  revenue30d,
}: ProductDetailHeroProps) {
  const data = monthly.map((m) => ({
    month: fmtMonthLabel(m.monthStart),
    revenue: m.revenue,
    units: m.units,
  }));
  const penetration = storesTotal === 0 ? 0 : (storesWithInventory / storesTotal) * 100;

  return (
    <Card className="p-0 gap-0 overflow-hidden">
      <div className="grid grid-cols-1 lg:grid-cols-5">
        {/* Chart side */}
        <div className="lg:col-span-3 p-6 lg:border-r">
          <div className="text-[11px] tracking-wider uppercase text-muted-foreground font-medium">
            Venta mensual
          </div>
          <div className="text-xs text-muted-foreground/70 mt-0.5">
            Histórico de {monthly.length} meses
          </div>

          <div className="mt-4 flex items-baseline gap-3">
            <span className="font-mono tabular-nums text-3xl lg:text-4xl font-semibold tracking-tight">
              {fmtMXN(revenue30d)}
            </span>
            <span className="text-xs text-muted-foreground">últimos 30 días</span>
          </div>

          {data.length >= 2 ? (
            <ChartContainer config={chartConfig} className="h-[200px] w-full mt-4">
              <BarChart data={data} margin={{ left: 0, right: 8, top: 8, bottom: 0 }}>
                <CartesianGrid
                  vertical={false}
                  strokeDasharray="3 3"
                  stroke="hsl(var(--border))"
                />
                <XAxis
                  dataKey="month"
                  tickLine={false}
                  axisLine={false}
                  tickMargin={6}
                  fontSize={11}
                  interval="preserveStartEnd"
                  minTickGap={20}
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
                      labelFormatter={(value) => `Mes ${value}`}
                      formatter={(value, _name, item) => [
                        fmtMXN(Number(value)) + "  ",
                        `${fmtNumber(item.payload.units)} unidades`,
                      ]}
                      indicator="dot"
                    />
                  }
                />
                <Bar dataKey="revenue" fill="var(--color-revenue)" radius={[3, 3, 0, 0]} />
              </BarChart>
            </ChartContainer>
          ) : (
            <div className="h-[200px] flex items-center justify-center text-sm text-muted-foreground">
              Sin histórico suficiente
            </div>
          )}
        </div>

        {/* KPI side */}
        <div className="lg:col-span-2 grid grid-cols-1 sm:grid-cols-2 divide-x divide-y">
          <KpiBlock
            icon={MapPin}
            label="Penetración"
            value={`${fmtNumber(storesWithInventory)}/${fmtNumber(storesTotal)}`}
            sub={`${penetration.toFixed(0)}% de las tiendas`}
            tone={penetration >= 90 ? "success" : penetration >= 70 ? "default" : "warning"}
          />
          <KpiBlock
            icon={AlertTriangle}
            label="En quiebre"
            value={fmtNumber(stockouts)}
            sub={stockouts === 0 ? "sin quiebres" : "tiendas afectadas"}
            tone={stockouts > 0 ? "danger" : "success"}
          />
          <KpiBlock
            icon={Boxes}
            label="Inv. red"
            value={fmtNumber(inventoryUnits)}
            sub="unidades disponibles"
          />
          <KpiBlock
            icon={ShoppingCart}
            label="Sugeridos"
            value={fmtNumber(pendingSuggestions)}
            sub={pendingSuggestions > 0 ? "pendientes" : "ninguno"}
            tone={pendingSuggestions > 0 ? "warning" : "default"}
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
