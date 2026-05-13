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
  { value: "star", label: "⭐ Estrellas (top 20%)" },
  { value: "risk", label: "🔴 Con quiebres" },
  { value: "dormant", label: "💤 Dormidos (sin venta 30d)" },
];

export type ProductosFiltersProps = {
  category: string;
  status: string;
  search: string;
  view: string;
  categories: string[];
};

export function ProductosFilters({
  category,
  status,
  search,
  view,
  categories,
}: ProductosFiltersProps) {
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
    category !== "" || status !== "all" || search !== "";

  return (
    <div
      className={cn(
        "flex flex-wrap items-center gap-2 py-3",
        isPending && "opacity-60 transition-opacity"
      )}
    >
      {/* Categoría */}
      {categories.length > 0 && (
        <Select
          value={category || "all"}
          onValueChange={(v) => updateParams({ cat: v === "all" ? null : v })}
        >
          <SelectTrigger size="sm" className="w-[180px]">
            <SelectValue placeholder="Categoría" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todas las categorías</SelectItem>
            {categories.map((c) => (
              <SelectItem key={c} value={c} className="capitalize">
                {c}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      )}

      {/* Status */}
      <Select value={status} onValueChange={(v) => updateParams({ status: v })}>
        <SelectTrigger size="sm" className="w-[210px]">
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
          placeholder="Buscar SKU o UPC…"
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
            view !== "grid"
              ? "bg-background text-foreground shadow-sm"
              : "text-muted-foreground hover:text-foreground"
          )}
        >
          <TableIcon className="size-3.5" strokeWidth={2} />
          Tabla
        </button>
        <button
          type="button"
          onClick={() => updateParams({ view: "grid" })}
          className={cn(
            "h-7 px-2.5 rounded-[5px] inline-flex items-center gap-1.5 text-xs font-medium transition-colors",
            view === "grid"
              ? "bg-background text-foreground shadow-sm"
              : "text-muted-foreground hover:text-foreground"
          )}
        >
          <LayoutGrid className="size-3.5" strokeWidth={2} />
          Grid
        </button>
      </div>
    </div>
  );
}
