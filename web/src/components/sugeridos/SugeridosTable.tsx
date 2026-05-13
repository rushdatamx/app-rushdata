"use client";

import * as React from "react";
import Link from "next/link";
import { useState, useTransition, useMemo } from "react";
import {
  CheckCircle2,
  Loader2,
  Send,
  Download,
  X,
} from "lucide-react";

import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { fmtMXN, fmtNumber, fmtDecimal } from "@/lib/format";
import { cn } from "@/lib/utils";
import { markSuggestionsSent } from "@/app/sugeridos/actions";
import type { Suggestion } from "@/lib/queries/suggestions";

const REASON_BADGE: Record<string, { className: string; label: string }> = {
  stockout_risk: {
    className: "bg-rose-100 text-rose-700 hover:bg-rose-100",
    label: "Riesgo quiebre",
  },
  low_ddi: {
    className: "bg-amber-100 text-amber-700 hover:bg-amber-100",
    label: "DDI bajo",
  },
  velocity_up: {
    className: "bg-emerald-100 text-emerald-700 hover:bg-emerald-100",
    label: "Velocity ↑",
  },
  periodic_replenish: {
    className: "bg-muted text-muted-foreground hover:bg-muted",
    label: "Reposición",
  },
  multi_flavor_restock: {
    className: "bg-violet-100 text-violet-700 hover:bg-violet-100",
    label: "PDQ",
  },
};

const SEV_BADGE: Record<string, { className: string; label: string }> = {
  critical: { className: "bg-rose-100 text-rose-700 hover:bg-rose-100", label: "crítico" },
  high: { className: "bg-amber-100 text-amber-800 hover:bg-amber-100", label: "alto" },
  medium: { className: "bg-amber-50 text-amber-700 hover:bg-amber-50", label: "medio" },
  low: { className: "bg-emerald-50 text-emerald-700 hover:bg-emerald-50", label: "ok" },
};

function ddiSeverity(ddi: number | null): "critical" | "high" | "medium" | "low" {
  if (ddi == null) return "medium";
  if (ddi <= 1) return "critical";
  if (ddi <= 3) return "high";
  if (ddi <= 7) return "medium";
  return "low";
}

export type SugeridosTableProps = {
  rows: Suggestion[];
};

export function SugeridosTable({ rows }: SugeridosTableProps) {
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [isPending, startTransition] = useTransition();
  const [toast, setToast] = useState<{
    kind: "success" | "error";
    msg: string;
  } | null>(null);

  const allChecked = rows.length > 0 && rows.every((r) => selected.has(r.id));
  const someChecked = rows.some((r) => selected.has(r.id)) && !allChecked;

  const stats = useMemo(() => {
    const sel = rows.filter((r) => selected.has(r.id));
    return {
      count: sel.length,
      cases: sel.reduce((a, r) => a + r.suggestedCases, 0),
      lostSale: sel.reduce((a, r) => a + r.lostSale, 0),
      units: sel.reduce((a, r) => a + r.suggestedUnits, 0),
    };
  }, [rows, selected]);

  const toggleAll = () => {
    if (allChecked) setSelected(new Set());
    else setSelected(new Set(rows.map((r) => r.id)));
  };

  const toggleOne = (id: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const handleMarkSent = () => {
    if (stats.count === 0) return;
    const ids = Array.from(selected);
    startTransition(async () => {
      const res = await markSuggestionsSent(ids);
      if (res.ok) {
        setToast({
          kind: "success",
          msg: `${res.updated} sugerido${res.updated === 1 ? "" : "s"} marcado${res.updated === 1 ? "" : "s"} como enviado`,
        });
        setSelected(new Set());
      } else {
        setToast({ kind: "error", msg: res.error });
      }
      setTimeout(() => setToast(null), 4000);
    });
  };

  const handleExport = () => {
    const sel = rows.filter((r) => selected.has(r.id));
    if (sel.length === 0) return;
    const header = [
      "Tienda",
      "Cluster",
      "Producto",
      "Razón",
      "DDI",
      "Stock",
      "Velocidad/día",
      "Sugerido (un)",
      "Cajas",
      "$ Riesgo",
      "Confianza",
    ].join(",");
    const lines = sel.map((r) =>
      [
        `"${r.store}"`,
        r.storeCluster ?? "",
        `"${r.product}"`,
        r.reasonCode ?? "",
        r.ddi ?? "",
        r.inventory,
        r.velocity ?? "",
        r.suggestedUnits,
        r.suggestedCases,
        r.lostSale,
        r.confidence ?? "",
      ].join(",")
    );
    const csv = [header, ...lines].join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    const stamp = new Date().toISOString().slice(0, 10);
    a.href = url;
    a.download = `sugeridos-${stamp}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  if (rows.length === 0) {
    return (
      <Card className="px-6 py-16 text-center">
        <div className="text-sm text-muted-foreground">
          Sin sugeridos con esos filtros. Ajusta los filtros o corre el motor para generar nuevos.
        </div>
      </Card>
    );
  }

  return (
    <>
      <Card className="p-0 gap-0 overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow className="bg-muted/30 hover:bg-muted/30">
              <TableHead className="w-10 pl-6">
                <Checkbox
                  checked={allChecked ? true : someChecked ? "indeterminate" : false}
                  onCheckedChange={toggleAll}
                  aria-label="Seleccionar todos"
                />
              </TableHead>
              <TableHead>Tienda</TableHead>
              <TableHead>Producto</TableHead>
              <TableHead>Razón</TableHead>
              <TableHead className="text-right">DDI</TableHead>
              <TableHead className="text-right">Stock</TableHead>
              <TableHead className="text-right">Vel/día</TableHead>
              <TableHead className="text-right">Sugerido</TableHead>
              <TableHead className="text-right">Cajas</TableHead>
              <TableHead className="text-right">$ Riesgo</TableHead>
              <TableHead className="text-right pr-6">Conf.</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {rows.map((r) => {
              const isSelected = selected.has(r.id);
              const sev = ddiSeverity(r.ddi);
              const sevStyles = SEV_BADGE[sev];
              const reasonStyles = r.reasonCode ? REASON_BADGE[r.reasonCode] : null;
              return (
                <TableRow
                  key={r.id}
                  data-state={isSelected ? "selected" : undefined}
                  className="group"
                >
                  <TableCell className="pl-6">
                    <Checkbox
                      checked={isSelected}
                      onCheckedChange={() => toggleOne(r.id)}
                      aria-label={`Seleccionar ${r.product} en ${r.store}`}
                    />
                  </TableCell>
                  <TableCell>
                    <Link
                      href={`/tiendas/${r.storeId}`}
                      className="block hover:text-foreground/80 transition-colors"
                    >
                      <div className="font-medium">{r.store}</div>
                      {r.storeCluster && (
                        <div className="text-[11px] text-muted-foreground">
                          Cluster {r.storeCluster}
                        </div>
                      )}
                    </Link>
                  </TableCell>
                  <TableCell>
                    <Link
                      href={`/productos/${r.productId}`}
                      className="hover:text-foreground/80 transition-colors"
                    >
                      {r.product}
                    </Link>
                  </TableCell>
                  <TableCell>
                    {reasonStyles && (
                      <Badge variant="secondary" className={reasonStyles.className}>
                        {reasonStyles.label}
                      </Badge>
                    )}
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="inline-flex items-center gap-2 justify-end">
                      <span className="font-mono tabular-nums">{fmtDecimal(r.ddi)}</span>
                      <Badge variant="secondary" className={sevStyles.className}>
                        {sevStyles.label}
                      </Badge>
                    </div>
                  </TableCell>
                  <TableCell className="text-right font-mono tabular-nums text-muted-foreground">
                    {fmtNumber(r.inventory)}
                  </TableCell>
                  <TableCell className="text-right font-mono tabular-nums text-muted-foreground">
                    {fmtDecimal(r.velocity)}
                  </TableCell>
                  <TableCell className="text-right font-mono tabular-nums">
                    {fmtNumber(r.suggestedUnits)}
                  </TableCell>
                  <TableCell className="text-right font-mono tabular-nums text-muted-foreground">
                    {fmtNumber(r.suggestedCases)}
                  </TableCell>
                  <TableCell className="text-right font-mono tabular-nums font-semibold">
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
      </Card>

      {/* Sticky action bar */}
      <div
        className={cn(
          "fixed bottom-4 left-1/2 -translate-x-1/2 z-50 transition-all duration-200",
          stats.count === 0
            ? "translate-y-[140%] opacity-0 pointer-events-none"
            : "translate-y-0 opacity-100"
        )}
      >
        <div className="flex items-center gap-4 bg-primary text-primary-foreground rounded-xl shadow-xl pl-5 pr-2 py-2 min-w-[640px]">
          <div className="flex items-center gap-3">
            <span className="font-mono tabular-nums text-2xl font-semibold">
              {stats.count}
            </span>
            <span className="text-xs text-primary-foreground/70 leading-tight">
              seleccionados<br />
              <span className="font-mono tabular-nums">{fmtNumber(stats.cases)}</span> cajas
            </span>
          </div>
          <div className="h-8 w-px bg-primary-foreground/20" />
          <div className="flex flex-col">
            <span className="text-[10px] uppercase tracking-wider text-primary-foreground/60">
              Riesgo total
            </span>
            <span className="font-mono tabular-nums text-base font-semibold">
              {fmtMXN(stats.lostSale)}
            </span>
          </div>

          <div className="ml-auto flex items-center gap-2">
            <Button
              variant="ghost"
              size="sm"
              className="text-primary-foreground hover:bg-primary-foreground/10 hover:text-primary-foreground h-8"
              onClick={() => setSelected(new Set())}
            >
              <X className="size-3.5" strokeWidth={2} />
              Limpiar
            </Button>
            <Button
              variant="ghost"
              size="sm"
              className="text-primary-foreground hover:bg-primary-foreground/10 hover:text-primary-foreground h-8"
              onClick={handleExport}
            >
              <Download className="size-3.5" strokeWidth={2} />
              Exportar CSV
            </Button>
            <Button
              size="sm"
              className="bg-emerald-500 hover:bg-emerald-600 text-white h-8"
              disabled={isPending}
              onClick={handleMarkSent}
            >
              {isPending ? (
                <Loader2 className="size-3.5 animate-spin" strokeWidth={2} />
              ) : (
                <Send className="size-3.5" strokeWidth={2} />
              )}
              Marcar enviado
            </Button>
          </div>
        </div>
      </div>

      {/* Toast */}
      {toast && (
        <div
          className={cn(
            "fixed top-20 right-6 z-50 px-4 py-3 rounded-lg shadow-lg flex items-center gap-2 text-sm",
            toast.kind === "success"
              ? "bg-emerald-50 text-emerald-900 border border-emerald-200"
              : "bg-rose-50 text-rose-900 border border-rose-200"
          )}
        >
          {toast.kind === "success" ? (
            <CheckCircle2 className="size-4 text-emerald-600" strokeWidth={2} />
          ) : (
            <X className="size-4 text-rose-600" strokeWidth={2} />
          )}
          {toast.msg}
        </div>
      )}
    </>
  );
}
