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

const STATUS = [
  { value: "all", label: "Todos los estados" },
  { value: "critical", label: "🔴 Críticos (3+ quiebres)" },
  { value: "warning", label: "🟡 Atención (1-2 quiebres)" },
  { value: "healthy", label: "🟢 Sanos (sin quiebres)" },
];

export type TiendasFiltersProps = {
  cluster: string;
  region: string;
  status: string;
  search: string;
  view: string;
  clusters: string[];
  regions: string[];
};

export function TiendasFilters({
  cluster,
  region,
  status,
  search,
  view,
  clusters,
  regions,
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

      {/* Status */}
      <Select value={status} onValueChange={(v) => updateParams({ status: v })}>
        <SelectTrigger size="sm" className="w-[200px]">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {STATUS.map((s) => (
            <SelectItem key={s.value} value={s.value}>
              {s.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

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
