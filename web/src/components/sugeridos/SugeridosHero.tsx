"use client";

import * as React from "react";
import Link from "next/link";
import { Area, AreaChart } from "recharts";
import {
  TrendingUp,
  TrendingDown,
  AlertCircle,
  ShoppingCart,
  Boxes,
  Wallet,
  ArrowUpRight,
} from "lucide-react";

import { Card } from "@/components/ui/card";
import {
  ChartContainer,
  type ChartConfig,
} from "@/components/ui/chart";
import { fmtMXN, fmtNumber } from "@/lib/format";
import { cn } from "@/lib/utils";

const trendConfig = {
  lostSale: { label: "Venta perdida", color: "hsl(var(--chart-2))" },
} satisfies ChartConfig;

export type SeverityBucket = { count: number; lostSale: number };

export type SugeridosHeroProps = {
  count: number;
  lostSale: number;
  cases: number;
  trend: Array<{ date: string; lostSale: number }>;
  severity: {
    critical: SeverityBucket;
    high: SeverityBucket;
    medium: SeverityBucket;
    low: SeverityBucket;
  };
};

function pctDelta(series: SugeridosHeroProps["trend"]): number | null {
  if (series.length < 4) return null;
  const half = Math.floor(series.length / 2);
  const prev = series.slice(0, half).reduce((a, p) => a + p.lostSale, 0);
  const curr = series.slice(half).reduce((a, p) => a + p.lostSale, 0);
  if (prev === 0) return null;
  return ((curr - prev) / prev) * 100;
}

const SEV_META = [
  {
    key: "critical" as const,
    label: "Crítico",
    sub: "DDI ≤ 1",
    bar: "bg-rose-600",
    chip: "bg-rose-100 text-rose-700",
    dot: "bg-rose-600",
    href: "?severity=critical",
  },
  {
    key: "high" as const,
    label: "Alto",
    sub: "DDI ≤ 3",
    bar: "bg-amber-500",
    chip: "bg-amber-100 text-amber-700",
    dot: "bg-amber-500",
    href: "?severity=critical",
  },
  {
    key: "medium" as const,
    label: "Medio",
    sub: "DDI ≤ 7",
    bar: "bg-amber-300",
    chip: "bg-amber-50 text-amber-700",
    dot: "bg-amber-300",
    href: null,
  },
  {
    key: "low" as const,
    label: "Sano",
    sub: "DDI > 7",
    bar: "bg-emerald-500",
    chip: "bg-emerald-50 text-emerald-700",
    dot: "bg-emerald-500",
    href: null,
  },
];

export function SugeridosHero({
  count,
  lostSale,
  cases,
  trend,
  severity,
}: SugeridosHeroProps) {
  const delta = pctDelta(trend);

  // % de la barra apilada por severidad — basado en $ riesgo (no count)
  const totalRisk = SEV_META.reduce(
    (a, s) => a + severity[s.key].lostSale,
    0
  );
  const segments = SEV_META.map((s) => {
    const v = severity[s.key];
    const share = totalRisk > 0 ? (v.lostSale / totalRisk) * 100 : 0;
    return { ...s, ...v, share };
  });

  const criticalCount = severity.critical.count + severity.high.count;
  const criticalRisk = severity.critical.lostSale + severity.high.lostSale;
  const criticalShare = lostSale > 0 ? Math.round((criticalRisk / lostSale) * 100) : 0;

  return (
    <Card className="p-0 gap-0 overflow-hidden">
      <div className="grid grid-cols-1 lg:grid-cols-5">
        {/* Severity breakdown side */}
        <div className="lg:col-span-3 p-6 lg:border-r">
          <div className="flex items-start justify-between gap-3">
            <div>
              <div className="text-[11px] tracking-wider uppercase text-muted-foreground font-medium">
                Mix de urgencia · $ riesgo
              </div>
              <div className="text-xs text-muted-foreground/70 mt-0.5">
                {fmtNumber(count)} sugeridos pendientes · ordenados por DDI
              </div>
            </div>
            {delta != null && trend.length > 0 && (
              <div className="flex items-center gap-2 shrink-0">
                <ChartContainer
                  config={trendConfig}
                  className="h-9 w-24 -mb-2"
                >
                  <AreaChart
                    data={trend}
                    margin={{ left: 0, right: 0, top: 2, bottom: 0 }}
                  >
                    <defs>
                      <linearGradient id="grad-sug-spark" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="var(--color-lostSale)" stopOpacity={0.4} />
                        <stop offset="95%" stopColor="var(--color-lostSale)" stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <Area
                      type="monotone"
                      dataKey="lostSale"
                      stroke="var(--color-lostSale)"
                      strokeWidth={1.5}
                      fill="url(#grad-sug-spark)"
                      isAnimationActive={false}
                    />
                  </AreaChart>
                </ChartContainer>
                <span
                  className={cn(
                    "text-xs font-medium inline-flex items-center gap-1 px-2 py-1 rounded-md",
                    delta <= 0
                      ? "bg-emerald-100 text-emerald-700"
                      : "bg-rose-100 text-rose-700"
                  )}
                >
                  {delta <= 0 ? (
                    <TrendingDown className="size-3" strokeWidth={2} />
                  ) : (
                    <TrendingUp className="size-3" strokeWidth={2} />
                  )}
                  {Math.abs(delta).toFixed(1)}%
                </span>
              </div>
            )}
          </div>

          {/* Hero number */}
          <div className="mt-5 flex items-baseline gap-3">
            <span className="font-mono tabular-nums text-3xl lg:text-4xl font-semibold tracking-tight text-rose-700">
              {fmtMXN(lostSale)}
            </span>
            <span className="text-xs text-muted-foreground">
              en riesgo total · {fmtNumber(cases)} cajas a mover
            </span>
          </div>

          {/* Stacked bar by severity */}
          {totalRisk > 0 ? (
            <div className="mt-6 space-y-3">
              <div className="flex h-3 rounded-full overflow-hidden bg-muted">
                {segments.map((s) =>
                  s.share === 0 ? null : s.href ? (
                    <Link
                      key={s.key}
                      href={s.href}
                      className={cn(s.bar, "transition-opacity hover:opacity-80")}
                      style={{ width: `${s.share}%` }}
                      title={`${s.label}: ${fmtMXN(s.lostSale)} (${s.share.toFixed(1)}%)`}
                    />
                  ) : (
                    <div
                      key={s.key}
                      className={s.bar}
                      style={{ width: `${s.share}%` }}
                      title={`${s.label}: ${fmtMXN(s.lostSale)} (${s.share.toFixed(1)}%)`}
                    />
                  )
                )}
              </div>

              {/* Legend grid: 4 columns, each clickable when applicable */}
              <div className="grid grid-cols-4 gap-2">
                {segments.map((s) => {
                  const inner = (
                    <div
                      className={cn(
                        "group flex flex-col gap-0.5 px-2 py-1.5 rounded-md transition-colors",
                        s.href && "hover:bg-muted/50"
                      )}
                    >
                      <div className="flex items-center gap-1.5">
                        <span className={cn("size-2 rounded-full", s.dot)} />
                        <span className="text-[10px] uppercase tracking-wider text-muted-foreground font-medium">
                          {s.label}
                        </span>
                        <span className="text-[9px] tabular-nums text-muted-foreground/70 ml-auto">
                          {s.sub}
                        </span>
                      </div>
                      <div className="flex items-baseline gap-1.5 mt-0.5">
                        <span className="font-mono tabular-nums text-base font-semibold">
                          {fmtNumber(s.count)}
                        </span>
                        <span className="font-mono tabular-nums text-[11px] text-muted-foreground">
                          {fmtMXN(s.lostSale)}
                        </span>
                      </div>
                    </div>
                  );
                  return s.href ? (
                    <Link key={s.key} href={s.href} className="block">
                      {inner}
                    </Link>
                  ) : (
                    <div key={s.key}>{inner}</div>
                  );
                })}
              </div>
            </div>
          ) : (
            <div className="mt-8 text-sm text-muted-foreground">
              Sin sugeridos pendientes con esos filtros.
            </div>
          )}
        </div>

        {/* KPI grid side */}
        <div className="lg:col-span-2 grid grid-cols-1 sm:grid-cols-2 divide-x divide-y border-t lg:border-t-0">
          <KpiBlock
            icon={ShoppingCart}
            label="Sugeridos"
            value={fmtNumber(count)}
            sub="pendientes de enviar"
          />
          <KpiBlock
            icon={Wallet}
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
            label="Críticos + Altos"
            value={fmtNumber(criticalCount)}
            sub={
              criticalCount === 0
                ? "ningún SKU urgente"
                : `${criticalShare}% del riesgo total`
            }
            tone={criticalCount > 0 ? "danger" : "default"}
            href={criticalCount > 0 ? "?severity=critical" : undefined}
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
  href,
}: {
  icon: React.ComponentType<{ className?: string; strokeWidth?: number }>;
  label: string;
  value: string;
  sub: string;
  tone?: Tone;
  href?: string;
}) {
  const t = TONE[tone];
  const inner = (
    <div
      className={cn(
        "group flex flex-col justify-center px-5 py-5 h-full",
        href && "hover:bg-muted/40 transition-colors"
      )}
    >
      <div className="flex items-center justify-between">
        <span className="text-[10px] uppercase tracking-wider text-muted-foreground font-medium">
          {label}
        </span>
        <span className={cn("inline-flex size-6 items-center justify-center rounded-md", t.chip)}>
          <Icon className="size-3" strokeWidth={2} />
        </span>
      </div>
      <div
        className={cn(
          "mt-2 font-mono tabular-nums text-2xl font-semibold tracking-tight",
          t.value
        )}
      >
        {value}
      </div>
      <div className="flex items-center justify-between gap-2 mt-0.5">
        <span className="text-[11px] text-muted-foreground truncate">{sub}</span>
        {href && (
          <ArrowUpRight
            className="size-3 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity shrink-0"
            strokeWidth={2}
          />
        )}
      </div>
    </div>
  );
  return href ? <Link href={href}>{inner}</Link> : inner;
}
