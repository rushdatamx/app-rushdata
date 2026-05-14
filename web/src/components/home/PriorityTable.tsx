"use client";

import * as React from "react";
import Link from "next/link";
import { ArrowRight, ArrowUpRight } from "lucide-react";
import { Card, CardHeader, CardTitle, CardDescription, CardAction } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { fmtMXN, fmtNumber, fmtDecimal } from "@/lib/format";
import type { TopSuggestion, AlertRow } from "@/lib/queries/home";

function ddiSeverity(ddi: number | null): "critical" | "high" | "medium" | "low" {
  if (ddi == null) return "medium";
  if (ddi <= 1) return "critical";
  if (ddi <= 3) return "high";
  if (ddi <= 7) return "medium";
  return "low";
}

const SEV_BADGE: Record<string, { className: string; label: string }> = {
  critical: { className: "bg-rose-100 text-rose-700 hover:bg-rose-100", label: "crítico" },
  high: { className: "bg-amber-100 text-amber-800 hover:bg-amber-100", label: "alto" },
  medium: { className: "bg-amber-50 text-amber-700 hover:bg-amber-50", label: "medio" },
  low: { className: "bg-emerald-50 text-emerald-700 hover:bg-emerald-50", label: "ok" },
};

const REASON_META: Record<string, { label: string; className: string }> = {
  stockout_risk: {
    label: "Riesgo quiebre",
    className: "bg-rose-50 text-rose-700 hover:bg-rose-50",
  },
  low_ddi: {
    label: "DDI bajo",
    className: "bg-amber-50 text-amber-700 hover:bg-amber-50",
  },
  velocity_up: {
    label: "Velocity ↑",
    className: "bg-sky-50 text-sky-700 hover:bg-sky-50",
  },
  periodic_replenish: {
    label: "Reposición",
    className: "bg-muted text-muted-foreground hover:bg-muted",
  },
};

export type PriorityTableProps = {
  rows: TopSuggestion[];
  totalCount: number;
  alerts: AlertRow[];
};

type Tab = "priority" | "alerts";

export function PriorityTable({ rows, totalCount, alerts }: PriorityTableProps) {
  const [tab, setTab] = React.useState<Tab>("priority");

  return (
    <Card className="p-0 gap-0 overflow-hidden">
      <CardHeader className="px-6 py-4 border-b">
        <CardTitle className="text-base">Accionables del día</CardTitle>
        <CardDescription>
          {tab === "priority"
            ? "Sugeridos pendientes ordenados por venta perdida estimada"
            : "Combinaciones tienda × SKU con quiebre confirmado"}
        </CardDescription>
        <CardAction>
          <Link
            href={tab === "priority" ? "/sugeridos" : "/sugeridos?severity=critical"}
            className="text-xs text-foreground hover:text-foreground/80 inline-flex items-center gap-1 font-medium"
          >
            {tab === "priority" ? `Ver los ${totalCount}` : `Ver los ${alerts.length}`}
            <ArrowRight className="size-3.5" strokeWidth={2} />
          </Link>
        </CardAction>
      </CardHeader>

      {/* Tabs */}
      <div className="px-6 pt-3 pb-0 border-b bg-muted/10 flex gap-1">
        <TabButton
          active={tab === "priority"}
          onClick={() => setTab("priority")}
          label="Por reabastecer"
          count={totalCount}
        />
        <TabButton
          active={tab === "alerts"}
          onClick={() => setTab("alerts")}
          label="En quiebre ahora"
          count={alerts.length}
          tone={alerts.length > 0 ? "danger" : "default"}
        />
      </div>

      {tab === "priority" ? (
        <PriorityBody rows={rows} totalCount={totalCount} />
      ) : (
        <AlertsBody rows={alerts} />
      )}
    </Card>
  );
}

function TabButton({
  active,
  onClick,
  label,
  count,
  tone = "default",
}: {
  active: boolean;
  onClick: () => void;
  label: string;
  count: number;
  tone?: "default" | "danger";
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "relative px-3 py-2 text-xs font-medium transition-colors",
        active
          ? "text-foreground"
          : "text-muted-foreground hover:text-foreground"
      )}
    >
      <span className="inline-flex items-center gap-1.5">
        {label}
        <span
          className={cn(
            "inline-flex items-center justify-center min-w-[18px] h-4 px-1 rounded text-[10px] font-mono tabular-nums",
            active
              ? tone === "danger"
                ? "bg-rose-100 text-rose-700"
                : "bg-foreground text-background"
              : "bg-muted text-muted-foreground"
          )}
        >
          {count}
        </span>
      </span>
      {active && (
        <span className="absolute inset-x-0 -bottom-px h-0.5 bg-foreground" />
      )}
    </button>
  );
}

function PriorityBody({
  rows,
  totalCount,
}: {
  rows: TopSuggestion[];
  totalCount: number;
}) {
  const visible = rows.slice(0, 8);
  const subtotalLost = visible.reduce((a, r) => a + r.lostSale, 0);
  const totalLost = rows.reduce((a, r) => a + r.lostSale, 0);
  const subtotalShare =
    totalLost > 0 ? Math.round((subtotalLost / totalLost) * 100) : 0;

  if (visible.length === 0) {
    return (
      <div className="px-6 py-12 text-center text-sm text-muted-foreground">
        No hay sugeridos pendientes. Corre el motor para generar la siguiente tanda.
      </div>
    );
  }

  return (
    <>
      <Table>
        <TableHeader>
          <TableRow className="bg-muted/30 hover:bg-muted/30">
            <TableHead className="w-10 pl-6">#</TableHead>
            <TableHead>Tienda · Producto</TableHead>
            <TableHead>Razón</TableHead>
            <TableHead className="text-right">DDI</TableHead>
            <TableHead className="text-right">Sugerido</TableHead>
            <TableHead className="text-right">$ Riesgo</TableHead>
            <TableHead className="text-right pr-6 w-20">Conf.</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {visible.map((r, i) => {
            const sev = ddiSeverity(r.ddi);
            const sevStyles = SEV_BADGE[sev];
            const reason = r.reasonCode
              ? REASON_META[r.reasonCode] ?? null
              : null;
            return (
              <TableRow key={r.id} className="group">
                <TableCell className="pl-6 text-muted-foreground font-mono tabular-nums text-xs">
                  {i + 1}
                </TableCell>
                <TableCell>
                  <Link
                    href="/sugeridos"
                    className="block hover:text-foreground/80"
                  >
                    <div className="flex items-center gap-1.5">
                      <span className="font-medium">{r.store}</span>
                      {r.storeCluster && (
                        <span className="inline-flex items-center px-1.5 h-4 rounded bg-muted text-[10px] tabular-nums text-muted-foreground font-medium shrink-0">
                          {r.storeCluster}
                        </span>
                      )}
                      <ArrowUpRight
                        className="size-3 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity"
                        strokeWidth={2}
                      />
                    </div>
                    <div className="text-xs text-muted-foreground truncate mt-0.5">
                      {r.product}
                    </div>
                  </Link>
                </TableCell>
                <TableCell>
                  {reason ? (
                    <Badge variant="secondary" className={reason.className}>
                      {reason.label}
                    </Badge>
                  ) : (
                    <span className="text-xs text-muted-foreground">—</span>
                  )}
                </TableCell>
                <TableCell className="text-right">
                  <div className="inline-flex items-center gap-1.5 justify-end">
                    <span className="font-mono tabular-nums">
                      {fmtDecimal(r.ddi)}
                    </span>
                    <Badge variant="secondary" className={sevStyles.className}>
                      {sevStyles.label}
                    </Badge>
                  </div>
                </TableCell>
                <TableCell className="text-right">
                  <div className="font-mono tabular-nums">
                    {fmtNumber(r.suggestedUnits)}
                  </div>
                  <div className="text-[10px] text-muted-foreground tabular-nums">
                    {fmtNumber(r.suggestedCases)} cajas
                  </div>
                </TableCell>
                <TableCell className="text-right font-mono tabular-nums font-semibold text-rose-700">
                  {fmtMXN(r.lostSale)}
                </TableCell>
                <TableCell className="text-right pr-6 font-mono tabular-nums text-muted-foreground">
                  {r.confidence == null ? "—" : `${Math.round(r.confidence * 100)}%`}
                </TableCell>
              </TableRow>
            );
          })}
        </TableBody>
      </Table>
      <div className="px-6 py-3 border-t bg-muted/20 flex items-center justify-between text-xs">
        <span className="text-muted-foreground">
          Mostrando {visible.length} de {totalCount} sugeridos
        </span>
        <span className="text-muted-foreground">
          Estos {visible.length} representan{" "}
          <span className="font-mono tabular-nums font-semibold text-rose-700">
            {fmtMXN(subtotalLost)}
          </span>{" "}
          {totalLost > 0 && (
            <span className="text-muted-foreground">
              ({subtotalShare}% del total en riesgo)
            </span>
          )}
        </span>
      </div>
    </>
  );
}

function AlertsBody({ rows }: { rows: AlertRow[] }) {
  if (rows.length === 0) {
    return (
      <div className="px-6 py-12 text-center text-sm text-muted-foreground">
        Sin quiebres confirmados. Buen trabajo.
      </div>
    );
  }
  const total = rows.reduce((a, r) => a + r.lostSale, 0);
  return (
    <>
      <Table>
        <TableHeader>
          <TableRow className="bg-muted/30 hover:bg-muted/30">
            <TableHead className="pl-6">Tienda · Producto</TableHead>
            <TableHead>Severidad</TableHead>
            <TableHead className="text-right">Días en quiebre</TableHead>
            <TableHead className="text-right pr-6">$ Estimado</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {rows.map((a) => {
            const sev = SEV_BADGE[a.severity] ?? SEV_BADGE.medium;
            return (
              <TableRow key={a.id} className="group">
                <TableCell className="pl-6">
                  <div className="font-medium">{a.store}</div>
                  <div className="text-xs text-muted-foreground truncate mt-0.5">
                    {a.product}
                  </div>
                </TableCell>
                <TableCell>
                  <Badge variant="secondary" className={sev.className}>
                    {sev.label}
                  </Badge>
                </TableCell>
                <TableCell className="text-right font-mono tabular-nums">
                  {fmtNumber(a.daysIn)}
                </TableCell>
                <TableCell className="text-right pr-6 font-mono tabular-nums font-semibold text-rose-700">
                  {fmtMXN(a.lostSale)}
                </TableCell>
              </TableRow>
            );
          })}
        </TableBody>
      </Table>
      <div className="px-6 py-3 border-t bg-muted/20 flex items-center justify-between text-xs">
        <span className="text-muted-foreground">{rows.length} quiebres mostrados</span>
        <span className="text-muted-foreground">
          Total estimado:{" "}
          <span className="font-mono tabular-nums font-semibold text-rose-700">
            {fmtMXN(total)}
          </span>
        </span>
      </div>
    </>
  );
}
