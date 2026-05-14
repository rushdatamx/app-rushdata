"use client";

import Link from "next/link";
import { useState, useMemo } from "react";
import { ArrowUpRight, Filter } from "lucide-react";

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";
import { fmtDecimal, fmtNumber } from "@/lib/format";
import type {
  CoverageCell,
  CoverageProduct,
  CoverageStore,
} from "@/lib/queries/coverage";
import { CsvExportButton } from "@/components/shared/CsvExportButton";

type Metric = "ddi" | "inventory" | "velocity" | "stockout";

const METRIC_OPTIONS: Array<{ value: Metric; label: string }> = [
  { value: "ddi", label: "DDI (días)" },
  { value: "inventory", label: "Inventario (un)" },
  { value: "velocity", label: "Velocidad (un/día)" },
  { value: "stockout", label: "Quiebres" },
];

export type CoverageMatrixProps = {
  stores: CoverageStore[];
  products: CoverageProduct[];
  cells: CoverageCell[];
  clusters: string[];
  regions: string[];
  categories: string[];
};

export function CoverageMatrix({
  stores,
  products,
  cells,
  clusters,
  regions,
  categories,
}: CoverageMatrixProps) {
  const [metric, setMetric] = useState<Metric>("ddi");
  const [cluster, setCluster] = useState<string>("all");
  const [region, setRegion] = useState<string>("all");
  const [category, setCategory] = useState<string>("all");
  const [hideCedis, setHideCedis] = useState(true);

  // build a map for O(1) cell lookups
  const cellMap = useMemo(() => {
    const m = new Map<string, CoverageCell>();
    for (const c of cells) m.set(`${c.storeId}::${c.productId}`, c);
    return m;
  }, [cells]);

  const filteredStores = useMemo(
    () =>
      stores.filter((s) => {
        if (hideCedis && s.isCedis) return false;
        if (cluster !== "all" && s.cluster !== cluster) return false;
        if (region !== "all" && s.region !== region) return false;
        return true;
      }),
    [stores, cluster, region, hideCedis]
  );

  const filteredProducts = useMemo(
    () =>
      products.filter((p) => {
        if (category !== "all" && p.category !== category) return false;
        return true;
      }),
    [products, category]
  );

  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-wrap items-center gap-2">
        <div className="inline-flex items-center gap-1.5 text-[11px] uppercase tracking-wider text-muted-foreground font-medium">
          <Filter className="size-3" strokeWidth={1.75} />
          Mostrando
        </div>
        <Select value={metric} onValueChange={(v) => setMetric(v as Metric)}>
          <SelectTrigger size="sm" className="w-[170px]">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {METRIC_OPTIONS.map((m) => (
              <SelectItem key={m.value} value={m.value}>
                {m.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        {categories.length > 0 && (
          <Select value={category} onValueChange={setCategory}>
            <SelectTrigger size="sm" className="w-[180px]">
              <SelectValue placeholder="Categoría" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todas las categorías</SelectItem>
              {categories.map((c) => (
                <SelectItem key={c} value={c}>
                  {c}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        )}

        {clusters.length > 0 && (
          <Select value={cluster} onValueChange={setCluster}>
            <SelectTrigger size="sm" className="w-[160px]">
              <SelectValue placeholder="Cluster" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos los clusters</SelectItem>
              {clusters.map((c) => (
                <SelectItem key={c} value={c}>
                  Cluster {c}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        )}

        {regions.length > 0 && (
          <Select value={region} onValueChange={setRegion}>
            <SelectTrigger size="sm" className="w-[160px]">
              <SelectValue placeholder="Región" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todas las regiones</SelectItem>
              {regions.map((r) => (
                <SelectItem key={r} value={r}>
                  {r}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        )}

        <label className="inline-flex items-center gap-1.5 text-xs text-muted-foreground cursor-pointer ml-auto">
          <input
            type="checkbox"
            checked={hideCedis}
            onChange={(e) => setHideCedis(e.target.checked)}
            className="accent-foreground"
          />
          Ocultar CEDIS
        </label>
        <CsvExportButton
          rows={() => {
            const productMap = new Map(filteredProducts.map((p) => [p.id, p]));
            const storeMap = new Map(filteredStores.map((s) => [s.id, s]));
            const out: Array<{
              storeName: string;
              storeCluster: string | null;
              storeRegion: string | null;
              productName: string;
              productCategory: string | null;
              upc: string | null;
              inventory: number;
              velocity: number;
              ddi: number | null;
              hasStockout: boolean;
            }> = [];
            for (const p of filteredProducts) {
              for (const s of filteredStores) {
                const c = cellMap.get(`${s.id}::${p.id}`);
                if (!c) continue;
                const store = storeMap.get(s.id)!;
                const product = productMap.get(p.id)!;
                out.push({
                  storeName: store.name,
                  storeCluster: store.cluster,
                  storeRegion: store.region,
                  productName: product.name,
                  productCategory: product.category,
                  upc: product.upc,
                  inventory: c.inventory,
                  velocity: c.velocity,
                  ddi: c.ddi,
                  hasStockout: c.hasStockout,
                });
              }
            }
            return out;
          }}
          filename="cobertura-matriz"
          columns={[
            { header: "Tienda", accessor: (r) => r.storeName },
            { header: "Cluster", accessor: (r) => r.storeCluster ?? "" },
            { header: "Región", accessor: (r) => r.storeRegion ?? "" },
            { header: "Producto", accessor: (r) => r.productName },
            { header: "Categoría", accessor: (r) => r.productCategory ?? "" },
            { header: "UPC", accessor: (r) => r.upc ?? "" },
            { header: "Inventario", accessor: (r) => r.inventory },
            { header: "Velocidad/día", accessor: (r) => r.velocity },
            { header: "DDI", accessor: (r) => r.ddi },
            { header: "En quiebre", accessor: (r) => r.hasStockout },
          ]}
        />
      </div>

      <div className="text-xs text-muted-foreground">
        <span className="font-medium text-foreground">
          {fmtNumber(filteredProducts.length)}
        </span>{" "}
        productos ×{" "}
        <span className="font-medium text-foreground">
          {fmtNumber(filteredStores.length)}
        </span>{" "}
        tiendas ={" "}
        <span className="font-medium text-foreground">
          {fmtNumber(filteredProducts.length * filteredStores.length)}
        </span>{" "}
        celdas
      </div>

      <Legend metric={metric} />

      {/* Matriz */}
      <div className="overflow-auto border rounded-md bg-background">
        <table className="text-xs border-collapse">
          <thead className="sticky top-0 z-20 bg-background">
            <tr>
              <th
                className="sticky left-0 z-30 bg-background border-b border-r p-2 text-left font-medium text-muted-foreground min-w-[200px] max-w-[200px]"
              >
                Producto
              </th>
              {filteredStores.map((s) => (
                <th
                  key={s.id}
                  className="border-b p-1 text-center font-mono tabular-nums text-[10px] text-muted-foreground"
                  style={{ minWidth: 36, maxWidth: 36 }}
                  title={`${s.name}${s.cluster ? ` · C${s.cluster}` : ""}${
                    s.city ? ` · ${s.city}` : ""
                  }`}
                >
                  <div className="rotate-[-60deg] origin-bottom-left whitespace-nowrap translate-y-2 translate-x-3 inline-block">
                    {s.name.replace(/^HEB\s+/, "").slice(0, 14)}
                  </div>
                </th>
              ))}
            </tr>
            <tr>
              <th className="sticky left-0 z-30 bg-muted/30 border-b border-r p-0 h-1" />
              {filteredStores.map((s) => (
                <th
                  key={s.id}
                  className="border-b bg-muted/30 p-0 h-1"
                  style={{ minWidth: 36, maxWidth: 36 }}
                />
              ))}
            </tr>
          </thead>
          <tbody>
            {filteredProducts.map((p) => (
              <tr key={p.id} className="group">
                <th
                  className="sticky left-0 z-10 bg-background border-r border-b p-2 text-left font-medium text-foreground min-w-[200px] max-w-[200px] truncate"
                  title={p.name}
                >
                  <Link
                    href={`/productos/${p.id}`}
                    className="block hover:text-foreground/70 transition-colors"
                  >
                    <span className="truncate block">{p.name}</span>
                    {p.category && (
                      <span className="text-[10px] text-muted-foreground capitalize block truncate">
                        {p.category}
                      </span>
                    )}
                  </Link>
                </th>
                {filteredStores.map((s) => {
                  const cell = cellMap.get(`${s.id}::${p.id}`);
                  return (
                    <td
                      key={s.id}
                      className="border-b text-center font-mono tabular-nums text-[10px] p-0"
                      style={{ minWidth: 36, maxWidth: 36, height: 28 }}
                    >
                      <Cell cell={cell} metric={metric} />
                    </td>
                  );
                })}
              </tr>
            ))}
            {filteredProducts.length === 0 && (
              <tr>
                <td
                  colSpan={filteredStores.length + 1}
                  className="text-center text-muted-foreground py-6"
                >
                  Sin productos que coincidan con los filtros
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      <div className="text-[11px] text-muted-foreground">
        Click en el nombre de un producto para ver detalle. Hover sobre celda muestra valores.
      </div>
    </div>
  );
}

function Cell({ cell, metric }: { cell: CoverageCell | undefined; metric: Metric }) {
  if (!cell) {
    return (
      <div className="size-full bg-muted/20" title="Sin datos" />
    );
  }
  if (metric === "stockout") {
    const cls = cell.hasStockout
      ? "bg-rose-500"
      : cell.inventory <= 0
      ? "bg-muted/30"
      : "bg-emerald-100";
    return (
      <div
        className={cn("size-full flex items-center justify-center", cls)}
        title={`Inv: ${fmtNumber(cell.inventory)} · Vel: ${fmtDecimal(cell.velocity)} · DDI: ${
          cell.ddi == null ? "—" : fmtDecimal(cell.ddi)
        }`}
      />
    );
  }
  if (metric === "ddi") {
    const cls = ddiColor(cell.ddi, cell.inventory, cell.velocity);
    return (
      <div
        className={cn("size-full flex items-center justify-center", cls)}
        title={`DDI: ${cell.ddi == null ? "—" : fmtDecimal(cell.ddi)} · Inv: ${fmtNumber(
          cell.inventory
        )} · Vel: ${fmtDecimal(cell.velocity)}`}
      >
        {cell.ddi != null && cell.ddi <= 99 ? (
          <span
            className={cn(
              cell.ddi <= 3 ? "text-white" : "text-foreground/70"
            )}
          >
            {Math.round(cell.ddi)}
          </span>
        ) : null}
      </div>
    );
  }
  if (metric === "inventory") {
    const cls = inventoryColor(cell.inventory);
    return (
      <div
        className={cn("size-full flex items-center justify-center", cls)}
        title={`Inv: ${fmtNumber(cell.inventory)}`}
      >
        {cell.inventory > 0 ? (
          <span className="text-foreground/70">
            {cell.inventory >= 1000
              ? `${(cell.inventory / 1000).toFixed(0)}k`
              : Math.round(cell.inventory)}
          </span>
        ) : null}
      </div>
    );
  }
  // velocity
  const cls = velocityColor(cell.velocity);
  return (
    <div
      className={cn("size-full flex items-center justify-center", cls)}
      title={`Vel: ${fmtDecimal(cell.velocity)} un/día`}
    >
      {cell.velocity > 0 ? (
        <span className="text-foreground/70">{cell.velocity.toFixed(1)}</span>
      ) : null}
    </div>
  );
}

function ddiColor(
  ddi: number | null,
  inventory: number,
  velocity: number
): string {
  if (inventory <= 0 && velocity > 0) return "bg-rose-500"; // quiebre activo
  if (inventory <= 0) return "bg-muted/30"; // sin stock y sin venta — sin distribución
  if (ddi == null) return "bg-muted/40"; // sin velocidad
  if (ddi <= 1) return "bg-rose-400";
  if (ddi <= 3) return "bg-amber-400";
  if (ddi <= 7) return "bg-amber-200";
  if (ddi <= 30) return "bg-emerald-100";
  return "bg-emerald-50";
}

function inventoryColor(inv: number): string {
  if (inv <= 0) return "bg-muted/30";
  if (inv < 10) return "bg-emerald-50";
  if (inv < 50) return "bg-emerald-100";
  if (inv < 200) return "bg-emerald-200";
  return "bg-emerald-300";
}

function velocityColor(vel: number): string {
  if (vel <= 0) return "bg-muted/30";
  if (vel < 0.5) return "bg-sky-50";
  if (vel < 2) return "bg-sky-100";
  if (vel < 5) return "bg-sky-200";
  return "bg-sky-300";
}

function Legend({ metric }: { metric: Metric }) {
  if (metric === "ddi") {
    return (
      <div className="flex items-center gap-2 text-[10px] text-muted-foreground">
        <span className="uppercase tracking-wider font-medium">Escala</span>
        <LegendDot cls="bg-rose-500" label="Quiebre" />
        <LegendDot cls="bg-rose-400" label="≤1d" />
        <LegendDot cls="bg-amber-400" label="≤3d" />
        <LegendDot cls="bg-amber-200" label="≤7d" />
        <LegendDot cls="bg-emerald-100" label="≤30d" />
        <LegendDot cls="bg-emerald-50" label="+30d" />
        <LegendDot cls="bg-muted/30" label="Sin dist." />
      </div>
    );
  }
  if (metric === "stockout") {
    return (
      <div className="flex items-center gap-2 text-[10px] text-muted-foreground">
        <span className="uppercase tracking-wider font-medium">Escala</span>
        <LegendDot cls="bg-rose-500" label="Quiebre activo" />
        <LegendDot cls="bg-emerald-100" label="Con stock" />
        <LegendDot cls="bg-muted/30" label="Sin distribución" />
      </div>
    );
  }
  if (metric === "inventory") {
    return (
      <div className="flex items-center gap-2 text-[10px] text-muted-foreground">
        <span className="uppercase tracking-wider font-medium">Escala unidades</span>
        <LegendDot cls="bg-emerald-50" label="<10" />
        <LegendDot cls="bg-emerald-100" label="<50" />
        <LegendDot cls="bg-emerald-200" label="<200" />
        <LegendDot cls="bg-emerald-300" label="200+" />
      </div>
    );
  }
  return (
    <div className="flex items-center gap-2 text-[10px] text-muted-foreground">
      <span className="uppercase tracking-wider font-medium">Escala un/día</span>
      <LegendDot cls="bg-sky-50" label="<0.5" />
      <LegendDot cls="bg-sky-100" label="<2" />
      <LegendDot cls="bg-sky-200" label="<5" />
      <LegendDot cls="bg-sky-300" label="5+" />
    </div>
  );
}

function LegendDot({ cls, label }: { cls: string; label: string }) {
  return (
    <span className="inline-flex items-center gap-1">
      <span className={cn("size-3 rounded-sm border", cls)} />
      {label}
    </span>
  );
}
