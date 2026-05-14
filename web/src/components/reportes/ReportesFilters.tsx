"use client";

import { useRouter, useSearchParams, usePathname } from "next/navigation";
import { useTransition, useCallback } from "react";
import { Filter, X } from "lucide-react";

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export type ReportesFiltersProps = {
  category: string;
  cluster: string;
  region: string;
  categories: string[];
  clusters: string[];
  regions: string[];
};

export function ReportesFilters({
  category,
  cluster,
  region,
  categories,
  clusters,
  regions,
}: ReportesFiltersProps) {
  const router = useRouter();
  const pathname = usePathname();
  const sp = useSearchParams();
  const [isPending, startTransition] = useTransition();

  const update = useCallback(
    (key: string, value: string | null) => {
      const params = new URLSearchParams(sp?.toString() ?? "");
      if (value === null || value === "" || value === "all") params.delete(key);
      else params.set(key, value);
      const qs = params.toString();
      startTransition(() => {
        router.push(qs ? `${pathname}?${qs}` : pathname);
      });
    },
    [router, pathname, sp]
  );

  const hasFilters = category !== "" || cluster !== "" || region !== "";

  return (
    <div
      className={cn(
        "flex flex-wrap items-center gap-2",
        isPending && "opacity-60 transition-opacity"
      )}
    >
      <div className="inline-flex items-center gap-1.5 text-[11px] uppercase tracking-wider text-muted-foreground font-medium">
        <Filter className="size-3" strokeWidth={1.75} />
        Filtros
      </div>

      {categories.length > 0 && (
        <Select
          value={category || "all"}
          onValueChange={(v) => update("cat", v === "all" ? null : v)}
        >
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
        <Select
          value={cluster || "all"}
          onValueChange={(v) => update("cluster", v === "all" ? null : v)}
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

      {regions.length > 0 && (
        <Select
          value={region || "all"}
          onValueChange={(v) => update("region", v === "all" ? null : v)}
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

      {hasFilters && (
        <Button
          variant="ghost"
          size="sm"
          className="h-8 px-2 text-xs text-muted-foreground"
          onClick={() => {
            const params = new URLSearchParams(sp?.toString() ?? "");
            params.delete("cat");
            params.delete("cluster");
            params.delete("region");
            const qs = params.toString();
            startTransition(() =>
              router.push(qs ? `${pathname}?${qs}` : pathname)
            );
          }}
        >
          <X className="size-3" strokeWidth={2} />
          Limpiar
        </Button>
      )}
    </div>
  );
}
