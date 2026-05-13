"use client";

import { useRouter, useSearchParams, usePathname } from "next/navigation";
import { useTransition, useCallback } from "react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";

const PERIODS = [
  { value: "7d", label: "Últimos 7 días" },
  { value: "30d", label: "Últimos 30 días" },
  { value: "90d", label: "Últimos 90 días" },
];

const CHAINS = [
  { value: "heb", label: "HEB" },
  { value: "merco", label: "MERCO (pronto)", disabled: true },
  { value: "alsuper", label: "ALSUPER (pronto)", disabled: true },
];

export type HomeFiltersProps = {
  chain: string;
  period: string;
  currency: string;
};

export function HomeFilters({ chain, period, currency }: HomeFiltersProps) {
  const router = useRouter();
  const pathname = usePathname();
  const sp = useSearchParams();
  const [isPending, startTransition] = useTransition();

  const updateParam = useCallback(
    (key: string, value: string) => {
      const params = new URLSearchParams(sp?.toString() ?? "");
      params.set(key, value);
      startTransition(() => {
        router.push(`${pathname}?${params.toString()}`);
      });
    },
    [router, pathname, sp]
  );

  return (
    <div
      className={cn(
        "flex flex-wrap items-center gap-2 border-y py-3 -mx-6 px-6 lg:-mx-8 lg:px-8 bg-background",
        isPending && "opacity-60 transition-opacity"
      )}
    >
      <Select value={chain} onValueChange={(v) => updateParam("chain", v)}>
        <SelectTrigger size="sm" className="w-[140px]">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {CHAINS.map((c) => (
            <SelectItem key={c.value} value={c.value} disabled={c.disabled}>
              {c.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      <Select value={period} onValueChange={(v) => updateParam("period", v)}>
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

      <div className="inline-flex h-9 items-center rounded-md border bg-muted/30 p-0.5 text-xs font-medium">
        {(["MXN", "USD"] as const).map((c) => (
          <button
            key={c}
            type="button"
            onClick={() => updateParam("cur", c)}
            className={cn(
              "h-8 px-3 rounded-[5px] transition-colors",
              currency === c
                ? "bg-background text-foreground shadow-sm"
                : "text-muted-foreground hover:text-foreground"
            )}
          >
            {c}
          </button>
        ))}
      </div>
    </div>
  );
}
