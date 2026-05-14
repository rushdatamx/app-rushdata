"use client";

import { useRouter, useSearchParams, usePathname } from "next/navigation";
import { useTransition, useCallback, useState, useEffect } from "react";
import { Search, X, LayoutGrid, Table as TableIcon } from "lucide-react";

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

type StatusKey = "all" | "critical" | "warning" | "healthy";

const STATUS_CHIPS: Array<{
  value: StatusKey;
  label: string;
  dot?: string;
  activeBg?: string;
}> = [
  { value: "all", label: "Todas" },
  {
    value: "critical",
    label: "Críticos",
    dot: "bg-rose-500",
    activeBg: "bg-rose-600 text-white border-rose-600 hover:bg-rose-600",
  },
  {
    value: "warning",
    label: "Atención",
    dot: "bg-amber-500",
    activeBg: "bg-amber-600 text-white border-amber-600 hover:bg-amber-600",
  },
  {
    value: "healthy",
    label: "Sanos",
    dot: "bg-emerald-500",
    activeBg: "bg-emerald-600 text-white border-emerald-600 hover:bg-emerald-600",
  },
];

export type TiendasFiltersProps = {
  cluster: string;
  region: string;
  status: string;
  search: string;
  view: string;
  clusters: string[];
  regions: string[];
  statusCounts: Record<StatusKey, number>;
};

export function TiendasFilters({
  cluster,
  region,
  status,
  search,
  view,
  clusters,
  regions,
  statusCounts,
}: TiendasFiltersProps) {
  const router = useRouter();
  const pathname = usePathname();
  const sp = useSearchParams();
  const [isPending, startTransition] = useTransition();
  const [searchLocal, setSearchLocal] = useState(search);

  useEffect(() => {
    setSearchLocal(search);
  }, [search]);

  const updateParams = useCallback(
    (patch: Record<string, string | null>) => {
      const params = new URLSearchParams(sp?.toString() ?? "");
      for (const [k, v] of Object.entries(patch)) {
        if (v === null || v === "" || v === "all") params.delete(k);
        else params.set(k, v);
      }
      const qs = params.toString();
      startTransition(() => {
        router.push(qs ? `${pathname}?${qs}` : pathname);
      });
    },
    [router, pathname, sp]
  );

  useEffect(() => {
    if (searchLocal === search) return;
    const t = setTimeout(() => {
      updateParams({ q: searchLocal || null });
    }, 300);
    return () => clearTimeout(t);
  }, [searchLocal, search, updateParams]);

  const hasActiveFilter =
    cluster !== "" || region !== "" || status !== "all" || search !== "";

  return (
    <div
      className={cn(
        "flex flex-wrap items-center gap-2 py-3",
        isPending && "opacity-60 transition-opacity"
      )}
    >
      {/* Cluster */}
      {clusters.length > 0 && (
        <Select
          value={cluster || "all"}
          onValueChange={(v) => updateParams({ cluster: v === "all" ? null : v })}
        >
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

      {/* Región */}
      {regions.length > 1 && (
        <Select
          value={region || "all"}
          onValueChange={(v) => updateParams({ region: v === "all" ? null : v })}
        >
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

      {/* Status chips */}
      <div className="flex items-center gap-1 flex-wrap">
        {STATUS_CHIPS.map((s) => {
          const count = statusCounts[s.value] ?? 0;
          if (s.value !== "all" && count === 0 && status !== s.value) return null;
          const isActive = status === s.value;
          return (
            <button
              key={s.value}
              type="button"
              onClick={() => updateParams({ status: s.value })}
              className={cn(
                "h-8 pl-3 pr-2 rounded-md text-xs font-medium transition-colors inline-flex items-center gap-2 border",
                isActive
                  ? s.activeBg ?? "bg-primary text-primary-foreground border-primary"
                  : "bg-background hover:bg-muted"
              )}
            >
              {s.dot && (
                <span
                  className={cn(
                    "size-2 rounded-full",
                    isActive ? "bg-white/80" : s.dot
                  )}
                />
              )}
              <span>{s.label}</span>
              <span
                className={cn(
                  "inline-flex items-center justify-center min-w-[20px] h-5 px-1 rounded text-[10px] font-mono tabular-nums",
                  isActive
                    ? "bg-white/15 text-white"
                    : "bg-muted text-muted-foreground"
                )}
              >
                {count}
              </span>
            </button>
          );
        })}
      </div>

      {/* Search */}
      <div className="relative">
        <Search
          className="absolute left-2.5 top-1/2 -translate-y-1/2 size-3.5 text-muted-foreground pointer-events-none"
          strokeWidth={1.75}
        />
        <Input
          placeholder="Buscar tienda o ciudad…"
          value={searchLocal}
          onChange={(e) => setSearchLocal(e.target.value)}
          className="h-8 w-[240px] pl-8 text-xs"
        />
      </div>

      {hasActiveFilter && (
        <Button
          variant="ghost"
          size="sm"
          className="h-8 px-2 text-xs text-muted-foreground"
          onClick={() => {
            setSearchLocal("");
            startTransition(() =>
              router.push(view === "table" ? `${pathname}?view=table` : pathname)
            );
          }}
        >
          <X className="size-3" strokeWidth={2} />
          Limpiar
        </Button>
      )}

      {/* View toggle */}
      <div className="ml-auto inline-flex h-8 items-center rounded-md border bg-muted/30 p-0.5">
        <button
          type="button"
          onClick={() => updateParams({ view: null })}
          className={cn(
            "h-7 px-2.5 rounded-[5px] inline-flex items-center gap-1.5 text-xs font-medium transition-colors",
            view !== "table"
              ? "bg-background text-foreground shadow-sm"
              : "text-muted-foreground hover:text-foreground"
          )}
          aria-label="Vista grid"
        >
          <LayoutGrid className="size-3.5" strokeWidth={2} />
          Grid
        </button>
        <button
          type="button"
          onClick={() => updateParams({ view: "table" })}
          className={cn(
            "h-7 px-2.5 rounded-[5px] inline-flex items-center gap-1.5 text-xs font-medium transition-colors",
            view === "table"
              ? "bg-background text-foreground shadow-sm"
              : "text-muted-foreground hover:text-foreground"
          )}
          aria-label="Vista tabla"
        >
          <TableIcon className="size-3.5" strokeWidth={2} />
          Tabla
        </button>
      </div>
    </div>
  );
}
