"use client";

import Link from "next/link";
import { Bar, BarChart, CartesianGrid, XAxis, YAxis } from "recharts";
import {
  Target,
  Clock,
  HandCoins,
  AlertTriangle,
  ArrowUpRight,
} from "lucide-react";

import { Card } from "@/components/ui/card";
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from "@/components/ui/chart";
import { fmtMXN, fmtNumber } from "@/lib/format";
import { cn } from "@/lib/utils";

const chartConfig = {
  ordered: { label: "Pedido", color: "hsl(var(--chart-4))" },
  received: { label: "Recibido", color: "hsl(var(--chart-1))" },
} satisfies ChartConfig;

const MES = [
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

function fmtMonthLabel(iso: string): string {
  if (!iso) return "—";
  const d = new Date(iso + "T00:00:00");
  return `${MES[d.getMonth()]} ${String(d.getFullYear()).slice(2)}`;
}

export type MonthlyPoint = {
  monthStart: string;
  ordered: number;
  received: number;
};

export type OCHeroProps = {
  monthly: MonthlyPoint[];
  totalValue: number;
  avgFillRate: number | null;
  activePOs: number;
  pendingValue: number;
  avgLeadTimeDays: number | null;
  underFillCount: number;
  unitsOrdered: number;
  unitsReceived: number;
};

export function OCHero({
  monthly,
  totalValue,
  avgFillRate,
  activePOs,
  pendingValue,
  avgLeadTimeDays,
  underFillCount,
  unitsOrdered,
  unitsReceived,
}: OCHeroProps) {
  const data = monthly.map((m) => ({
    month: fmtMonthLabel(m.monthStart),
    ordered: m.ordered,
    received: m.received,
  }));

  const fillRatePct = avgFillRate == null ? null : avgFillRate * 100;
  const gapUnits = unitsOrdered - unitsReceived;
  const gapPct = unitsOrdered > 0 ? (gapUnits / unitsOrdered) * 100 : 0;

  return (
    <Card className="p-0 gap-0 overflow-hidden">
      <div className="grid grid-cols-1 lg:grid-cols-5">
        {/* Chart side */}
        <div className="lg:col-span-3 p-6 lg:border-r">
          <div className="flex items-start justify-between">
            <div>
              <div className="text-[11px] tracking-wider uppercase text-muted-foreground font-medium">
                Pedido vs Recibido
              </div>
              <div className="text-xs text-muted-foreground/70 mt-0.5">
                Unidades por mes · brecha = incumplimiento
              </div>
            </div>
            <div className="flex items-center gap-3 text-xs">
              <div className="inline-flex items-center gap-1.5">
                <span className="size-2.5 rounded-sm bg-sky-500" />
                <span className="text-muted-foreground">Pedido</span>
              </div>
              <div className="inline-flex items-center gap-1.5">
                <span className="size-2.5 rounded-sm bg-emerald-600" />
                <span className="text-muted-foreground">Recibido</span>
              </div>
            </div>
          </div>

          <div className="mt-4 flex items-baseline gap-3">
            <span className="font-mono tabular-nums text-3xl lg:text-4xl font-semibold tracking-tight">
              {fmtMXN(totalValue)}
            </span>
            <span className="text-xs text-muted-foreground">histórico ordenado</span>
            {gapUnits > 0 && (
              <span
                className={cn(
                  "text-xs font-medium inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded-md",
                  gapPct >= 10
                    ? "bg-rose-100 text-rose-700"
                    : gapPct >= 5
                    ? "bg-amber-100 text-amber-700"
                    : "bg-muted text-muted-foreground"
                )}
              >
                Brecha {gapPct.toFixed(1)}% · {fmtNumber(gapUnits)} un no recibidas
              </span>
            )}
          </div>

          <ChartContainer config={chartConfig} className="h-[220px] w-full mt-6">
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
                    formatter={(value, name) => [
                      fmtNumber(Number(value)) + " un  ",
                      chartConfig[name as keyof typeof chartConfig]?.label ?? name,
                    ]}
                    indicator="dot"
                  />
                }
              />
              <Bar dataKey="ordered" fill="var(--color-ordered)" radius={[3, 3, 0, 0]} />
              <Bar dataKey="received" fill="var(--color-received)" radius={[3, 3, 0, 0]} />
            </BarChart>
          </ChartContainer>
        </div>

        {/* KPI side */}
        <div className="lg:col-span-2 grid grid-cols-1 sm:grid-cols-2 divide-x divide-y border-t lg:border-t-0">
          <KpiBlock
            icon={Target}
            label="Fill rate global"
            value={fillRatePct == null ? "—" : `${fillRatePct.toFixed(1)}%`}
            sub={
              fillRatePct == null
                ? "sin OCs registradas"
                : fillRatePct >= 95
                ? "surtido completo"
                : fillRatePct >= 90
                ? "surtido parcial"
                : "atención cadena"
            }
            tone={
              fillRatePct == null
                ? "default"
                : fillRatePct >= 95
                ? "success"
                : fillRatePct >= 90
                ? "warning"
                : "danger"
            }
          />
          {underFillCount > 0 ? (
            <LinkKpiBlock
              href="?status=partial"
              icon={AlertTriangle}
              label="OCs sub-surtidas"
              value={fmtNumber(underFillCount)}
              sub="cadena pidió menos del 90%"
              tone="danger"
            />
          ) : (
            <KpiBlock
              icon={AlertTriangle}
              label="OCs sub-surtidas"
              value="0"
              sub="ninguna < 90% fill"
              tone="success"
            />
          )}
          <KpiBlock
            icon={HandCoins}
            label="$ por recibir"
            value={fmtMXN(pendingValue)}
            sub={`${fmtNumber(activePOs)} OCs abiertas`}
            tone={pendingValue > 0 ? "warning" : "success"}
          />
          <KpiBlock
            icon={Clock}
            label="Lead time"
            value={
              avgLeadTimeDays == null
                ? "—"
                : `${avgLeadTimeDays.toFixed(1)} d`
            }
            sub="prom. orden → entrega"
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
    <div className="flex flex-col justify-center px-5 py-5 h-full">
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

function LinkKpiBlock(
  props: React.ComponentProps<typeof KpiBlock> & { href: string }
) {
  const { href, ...rest } = props;
  return (
    <Link
      href={href}
      className="group relative hover:bg-muted/40 transition-colors"
    >
      <KpiBlock {...rest} />
      <ArrowUpRight
        className="absolute top-3 right-3 size-3 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity"
        strokeWidth={2}
      />
    </Link>
  );
}
