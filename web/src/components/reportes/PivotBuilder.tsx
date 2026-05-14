"use client";

import { useMemo, useState } from "react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableFooter,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Card } from "@/components/ui/card";
import { CsvExportButton } from "@/components/shared/CsvExportButton";
import { fmtMXN, fmtNumber, fmtDecimal } from "@/lib/format";
import { cn } from "@/lib/utils";
import type { ReportFact } from "@/lib/queries/reports";

type Dimension =
  | "product"
  | "store"
  | "category"
  | "cluster"
  | "region"
  | "month";

const DIMENSION_OPTIONS: Array<{ value: Dimension; label: string }> = [
  { value: "product", label: "Producto" },
  { value: "store", label: "Tienda" },
  { value: "category", label: "Categoría" },
  { value: "cluster", label: "Cluster" },
  { value: "region", label: "Región" },
  { value: "month", label: "Mes" },
];

type Metric = "units" | "revenue" | "asp" | "inventory";

const METRIC_OPTIONS: Array<{ value: Metric; label: string }> = [
  { value: "units", label: "Unidades" },
  { value: "revenue", label: "Revenue" },
  { value: "asp", label: "ASP (precio prom.)" },
  { value: "inventory", label: "Inventario actual" },
];

function fmtMonthLong(iso: string): string {
  const d = new Date(iso + "T00:00:00");
  return d.toLocaleDateString("es-MX", { month: "long", year: "numeric" });
}

function dimensionLabel(f: ReportFact, dim: Dimension): string {
  switch (dim) {
    case "product":
      return f.productName;
    case "store":
      return f.storeName;
    case "category":
      return f.productCategory ?? "(sin categoría)";
    case "cluster":
      return f.storeCluster == null ? "(sin cluster)" : `Cluster ${f.storeCluster}`;
    case "region":
      return f.storeRegion ?? "(sin región)";
    case "month":
      return fmtMonthLong(f.month);
  }
}

function dimensionKey(f: ReportFact, dim: Dimension): string {
  switch (dim) {
    case "product":
      return f.productId;
    case "store":
      return f.storeId;
    case "category":
      return f.productCategory ?? "__none__";
    case "cluster":
      return f.storeCluster ?? "__none__";
    case "region":
      return f.storeRegion ?? "__none__";
    case "month":
      return f.month;
  }
}

export type PivotBuilderProps = {
  facts: ReportFact[];
  periodLabel: string;
};

type AggRow = {
  key: string;
  label: string;
  units: number;
  revenue: number;
  inventory: number; // sum of unique (product, store) inventories — solo aplica si la dim no es producto+tienda
  asp: number | null;
};

export function PivotBuilder({ facts, periodLabel }: PivotBuilderProps) {
  const [dimension, setDimension] = useState<Dimension>("product");
  const [metrics, setMetrics] = useState<Set<Metric>>(
    new Set<Metric>(["units", "revenue", "asp"])
  );
  const [sortBy, setSortBy] = useState<Metric>("revenue");

  const aggregated = useMemo<AggRow[]>(() => {
    type Acc = {
      units: number;
      revenue: number;
      // Para inventario: como puede haber muchas combinaciones product×store dentro
      // de un grupo, usamos un Set para no contar duplicados al sumar inventario.
      // Pero como el inventario está atado a (product,store), no a (group, month),
      // tomamos solo el inventario único por combinación que cae en el grupo.
      invPairs: Map<string, number>;
    };
    const map = new Map<string, Acc & { label: string }>();
    for (const f of facts) {
      const key = dimensionKey(f, dimension);
      let cur = map.get(key);
      if (!cur) {
        cur = {
          label: dimensionLabel(f, dimension),
          units: 0,
          revenue: 0,
          invPairs: new Map(),
        };
        map.set(key, cur);
      }
      cur.units += f.units;
      cur.revenue += f.revenue;
      cur.invPairs.set(`${f.productId}::${f.storeId}`, f.currentInventory);
    }
    const rows: AggRow[] = Array.from(map.entries()).map(([key, v]) => {
      let inventory = 0;
      for (const inv of v.invPairs.values()) inventory += inv;
      return {
        key,
        label: v.label,
        units: v.units,
        revenue: v.revenue,
        inventory,
        asp: v.units > 0 ? v.revenue / v.units : null,
      };
    });
    rows.sort((a, b) => {
      const av = sortValue(a, sortBy);
      const bv = sortValue(b, sortBy);
      return (bv ?? -Infinity) - (av ?? -Infinity);
    });
    return rows;
  }, [facts, dimension, sortBy]);

  const totals = useMemo(() => {
    const units = aggregated.reduce((a, r) => a + r.units, 0);
    const revenue = aggregated.reduce((a, r) => a + r.revenue, 0);
    const inventory = aggregated.reduce((a, r) => a + r.inventory, 0);
    return {
      units,
      revenue,
      inventory,
      asp: units > 0 ? revenue / units : null,
    };
  }, [aggregated]);

  const toggleMetric = (m: Metric) => {
    setMetrics((prev) => {
      const next = new Set(prev);
      if (next.has(m)) {
        if (next.size > 1) next.delete(m);
      } else {
        next.add(m);
      }
      return next;
    });
  };

  return (
    <div className="flex flex-col gap-4">
      {/* Controles */}
      <Card className="p-4 flex flex-wrap items-center gap-3">
        <div className="flex items-center gap-2">
          <span className="text-[11px] uppercase tracking-wider text-muted-foreground font-medium">
            Agrupar por
          </span>
          <Select
            value={dimension}
            onValueChange={(v) => setDimension(v as Dimension)}
          >
            <SelectTrigger size="sm" className="w-[160px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {DIMENSION_OPTIONS.map((d) => (
                <SelectItem key={d.value} value={d.value}>
                  {d.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="h-6 w-px bg-border" />

        <div className="flex items-center gap-2">
          <span className="text-[11px] uppercase tracking-wider text-muted-foreground font-medium">
            Métricas
          </span>
          <div className="flex items-center gap-1 flex-wrap">
            {METRIC_OPTIONS.map((m) => {
              const active = metrics.has(m.value);
              return (
                <button
                  key={m.value}
                  type="button"
                  onClick={() => toggleMetric(m.value)}
                  className={cn(
                    "h-7 px-2.5 rounded text-xs font-medium border transition-colors",
                    active
                      ? "bg-primary text-primary-foreground border-primary"
                      : "bg-background hover:bg-muted text-muted-foreground"
                  )}
                >
                  {m.label}
                </button>
              );
            })}
          </div>
        </div>

        <div className="h-6 w-px bg-border" />

        <div className="flex items-center gap-2">
          <span className="text-[11px] uppercase tracking-wider text-muted-foreground font-medium">
            Ordenar por
          </span>
          <Select value={sortBy} onValueChange={(v) => setSortBy(v as Metric)}>
            <SelectTrigger size="sm" className="w-[160px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {METRIC_OPTIONS.filter((m) => metrics.has(m.value)).map((m) => (
                <SelectItem key={m.value} value={m.value}>
                  {m.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <CsvExportButton
          rows={() =>
            aggregated.map((r) => ({
              dimension: r.label,
              units: r.units,
              revenue: r.revenue,
              asp: r.asp,
              inventory: r.inventory,
            }))
          }
          filename={`reporte-${dimension}`}
          columns={[
            {
              header: DIMENSION_OPTIONS.find((d) => d.value === dimension)?.label ?? dimension,
              accessor: (r) => r.dimension,
            },
            { header: "Unidades vendidas", accessor: (r) => r.units },
            { header: "Revenue MXN", accessor: (r) => r.revenue },
            { header: "ASP MXN", accessor: (r) => r.asp },
            { header: "Inventario actual", accessor: (r) => r.inventory },
          ]}
          className="ml-auto"
        />
      </Card>

      {/* Resumen */}
      <div className="text-xs text-muted-foreground">
        <span className="font-medium text-foreground">{fmtNumber(aggregated.length)}</span>{" "}
        grupos · <span className="font-medium text-foreground">{fmtNumber(facts.length)}</span>{" "}
        filas de hechos · ventas en{" "}
        <span className="font-medium text-foreground">{periodLabel}</span>
      </div>

      {/* Tabla */}
      <Card className="p-0 gap-0 overflow-hidden">
        {aggregated.length === 0 ? (
          <div className="px-6 py-16 text-center text-sm text-muted-foreground">
            Sin datos para los filtros seleccionados.
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow className="bg-muted/30 hover:bg-muted/30">
                <TableHead className="pl-6">
                  {DIMENSION_OPTIONS.find((d) => d.value === dimension)?.label}
                </TableHead>
                {metrics.has("units") && (
                  <TableHead className="text-right">Unidades</TableHead>
                )}
                {metrics.has("revenue") && (
                  <TableHead className="text-right">Revenue</TableHead>
                )}
                {metrics.has("asp") && (
                  <TableHead className="text-right">ASP</TableHead>
                )}
                {metrics.has("inventory") && (
                  <TableHead className="text-right pr-6">Inventario</TableHead>
                )}
              </TableRow>
            </TableHeader>
            <TableBody>
              {aggregated.map((r) => (
                <TableRow key={r.key}>
                  <TableCell className="pl-6 font-medium">{r.label}</TableCell>
                  {metrics.has("units") && (
                    <TableCell className="text-right font-mono tabular-nums">
                      {fmtNumber(r.units)}
                    </TableCell>
                  )}
                  {metrics.has("revenue") && (
                    <TableCell className="text-right font-mono tabular-nums font-semibold">
                      {fmtMXN(r.revenue)}
                    </TableCell>
                  )}
                  {metrics.has("asp") && (
                    <TableCell className="text-right font-mono tabular-nums text-muted-foreground">
                      {r.asp == null ? "—" : fmtMXN(r.asp)}
                    </TableCell>
                  )}
                  {metrics.has("inventory") && (
                    <TableCell className="text-right pr-6 font-mono tabular-nums text-muted-foreground">
                      {fmtNumber(r.inventory)}
                    </TableCell>
                  )}
                </TableRow>
              ))}
            </TableBody>
            <TableFooter>
              <TableRow className="bg-muted/30 hover:bg-muted/30 font-semibold">
                <TableCell className="pl-6">Total</TableCell>
                {metrics.has("units") && (
                  <TableCell className="text-right font-mono tabular-nums">
                    {fmtNumber(totals.units)}
                  </TableCell>
                )}
                {metrics.has("revenue") && (
                  <TableCell className="text-right font-mono tabular-nums">
                    {fmtMXN(totals.revenue)}
                  </TableCell>
                )}
                {metrics.has("asp") && (
                  <TableCell className="text-right font-mono tabular-nums">
                    {totals.asp == null ? "—" : fmtMXN(totals.asp)}
                  </TableCell>
                )}
                {metrics.has("inventory") && (
                  <TableCell className="text-right pr-6 font-mono tabular-nums">
                    {fmtNumber(totals.inventory)}
                  </TableCell>
                )}
              </TableRow>
            </TableFooter>
          </Table>
        )}
      </Card>
    </div>
  );
}

function sortValue(r: AggRow, m: Metric): number | null {
  switch (m) {
    case "units":
      return r.units;
    case "revenue":
      return r.revenue;
    case "asp":
      return r.asp;
    case "inventory":
      return r.inventory;
  }
}
