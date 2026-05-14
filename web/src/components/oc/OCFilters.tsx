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

type StatusKey = "all" | "pending" | "partial" | "fulfilled" | "cancelled";

const STATUS_CHIPS: Array<{
  value: StatusKey;
  label: string;
  dot?: string;
  activeBg?: string;
}> = [
  { value: "all", label: "Todas" },
  {
    value: "pending",
    label: "Pendiente",
    dot: "bg-amber-500",
    activeBg: "bg-amber-600 text-white border-amber-600 hover:bg-amber-600",
  },
  {
    value: "partial",
    label: "Parcial",
    dot: "bg-orange-500",
    activeBg: "bg-orange-600 text-white border-orange-600 hover:bg-orange-600",
  },
  {
    value: "fulfilled",
    label: "Recibida",
    dot: "bg-emerald-500",
    activeBg: "bg-emerald-600 text-white border-emerald-600 hover:bg-emerald-600",
  },
  {
    value: "cancelled",
    label: "Cancelada",
    dot: "bg-muted-foreground/60",
    activeBg: "bg-foreground text-background border-foreground hover:bg-foreground",
  },
];

const PERIODS = [
  { value: "all", label: "Todo el histórico" },
  { value: "30", label: "Últimos 30 días" },
  { value: "90", label: "Últimos 90 días" },
  { value: "365", label: "Último año" },
];

export type OCFiltersProps = {
  status: string;
  period: string;
  search: string;
  statusCounts: Record<StatusKey, number>;
};

export function OCFilters({ status, period, search, statusCounts }: OCFiltersProps) {
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

  const hasActiveFilter = status !== "all" || period !== "all" || search !== "";

  return (
    <div
      className={cn(
        "flex flex-wrap items-center gap-2 py-3",
        isPending && "opacity-60 transition-opacity"
      )}
    >
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

      <Select value={period} onValueChange={(v) => updateParams({ period: v })}>
        <SelectTrigger size="sm" className="w-[180px]">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {PERIODS.map((p) => (
            <SelectItem key={p.value} value={p.value}>
              {p.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      <div className="relative">
        <Search
          className="absolute left-2.5 top-1/2 -translate-y-1/2 size-3.5 text-muted-foreground pointer-events-none"
          strokeWidth={1.75}
        />
        <Input
          placeholder="Buscar # de OC…"
          value={searchLocal}
          onChange={(e) => setSearchLocal(e.target.value)}
          className="h-8 w-[200px] pl-8 text-xs"
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
