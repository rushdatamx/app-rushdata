"use client";

import { useRouter, useSearchParams, usePathname } from "next/navigation";
import { useTransition, useCallback, useState, useEffect } from "react";
import { Search, X } from "lucide-react";

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

const REASONS = [
  { value: "all", label: "Todas" },
  { value: "stockout_risk", label: "Riesgo quiebre" },
  { value: "low_ddi", label: "DDI bajo" },
  { value: "velocity_up", label: "Velocity ↑" },
  { value: "periodic_replenish", label: "Reposición" },
] as const;

type ReasonKey =
  | "all"
  | "stockout_risk"
  | "low_ddi"
  | "velocity_up"
  | "periodic_replenish";

const DDI = [
  { value: "all", label: "Todos" },
  { value: "critical", label: "Críticos (DDI ≤ 3)" },
];

export type SugeridosFiltersProps = {
  reason: string;
  severity: string;
  cluster: string;
  search: string;
  clusters: string[];
  reasonCounts: Record<ReasonKey, number>;
};

export function SugeridosFilters({
  reason,
  severity,
  cluster,
  search,
  clusters,
  reasonCounts,
}: SugeridosFiltersProps) {
  const router = useRouter();
  const pathname = usePathname();
  const sp = useSearchParams();
  const [isPending, startTransition] = useTransition();
  const [searchLocal, setSearchLocal] = useState(search);

  // sync local search input with URL state when URL changes externally
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

  // debounce search input
  useEffect(() => {
    if (searchLocal === search) return;
    const t = setTimeout(() => {
      updateParams({ q: searchLocal || null });
    }, 300);
    return () => clearTimeout(t);
  }, [searchLocal, search, updateParams]);

  const hasActiveFilter =
    reason !== "all" || severity !== "all" || cluster !== "" || search !== "";

  return (
    <div
      className={cn(
        "flex flex-wrap items-center gap-2 py-3",
        isPending && "opacity-60 transition-opacity"
      )}
    >
      {/* Reason chips */}
      <div className="flex items-center gap-1 flex-wrap">
        {REASONS.map((r) => {
          const count = reasonCounts[r.value as ReasonKey] ?? 0;
          // ocultar chips no-"all" sin sugeridos
          if (r.value !== "all" && count === 0 && reason !== r.value) return null;
          const isActive = reason === r.value;
          return (
            <button
              key={r.value}
              type="button"
              onClick={() => updateParams({ reason: r.value })}
              className={cn(
                "h-8 pl-3 pr-2 rounded-md text-xs font-medium transition-colors inline-flex items-center gap-2",
                isActive
                  ? "bg-primary text-primary-foreground"
                  : "border bg-background hover:bg-muted"
              )}
            >
              <span>{r.label}</span>
              <span
                className={cn(
                  "inline-flex items-center justify-center min-w-[20px] h-5 px-1 rounded text-[10px] font-mono tabular-nums",
                  isActive
                    ? "bg-primary-foreground/15 text-primary-foreground"
                    : "bg-muted text-muted-foreground"
                )}
              >
                {count}
              </span>
            </button>
          );
        })}
      </div>

      <div className="h-6 w-px bg-border mx-1" />

      {/* DDI severity */}
      <Select value={severity} onValueChange={(v) => updateParams({ severity: v })}>
        <SelectTrigger size="sm" className="w-[180px]">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {DDI.map((d) => (
            <SelectItem key={d.value} value={d.value}>
              {d.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

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

      {/* Search */}
      <div className="relative ml-auto">
        <Search
          className="absolute left-2.5 top-1/2 -translate-y-1/2 size-3.5 text-muted-foreground pointer-events-none"
          strokeWidth={1.75}
        />
        <Input
          placeholder="Buscar tienda o SKU…"
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
            startTransition(() => router.push(pathname));
          }}
        >
          <X className="size-3" strokeWidth={2} />
          Limpiar
        </Button>
      )}
    </div>
  );
}
