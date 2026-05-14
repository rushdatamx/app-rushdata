"use client";

import { useRouter, useSearchParams, usePathname } from "next/navigation";
import { useTransition, useCallback } from "react";
import { Calendar } from "lucide-react";
import { cn } from "@/lib/utils";

const HORIZONS = [
  { value: "90d", label: "90d", days: 90 },
  { value: "1y", label: "1 año", days: 365 },
  { value: "2y", label: "2 años", days: 730 },
  { value: "5y", label: "5 años", days: 1825 },
] as const;

export type HorizonValue = (typeof HORIZONS)[number]["value"];

export function horizonToDays(v: string | undefined): number {
  const found = HORIZONS.find((h) => h.value === v);
  return found?.days ?? 90;
}

export function HorizonSelector({ value }: { value: string }) {
  const router = useRouter();
  const pathname = usePathname();
  const sp = useSearchParams();
  const [isPending, startTransition] = useTransition();

  const update = useCallback(
    (next: string) => {
      const params = new URLSearchParams(sp?.toString() ?? "");
      if (next === "90d") params.delete("horizon");
      else params.set("horizon", next);
      const qs = params.toString();
      startTransition(() => {
        router.push(qs ? `${pathname}?${qs}` : pathname);
      });
    },
    [router, pathname, sp]
  );

  return (
    <div
      className={cn(
        "inline-flex items-center h-9 rounded-md border bg-background p-0.5 text-xs font-medium",
        isPending && "opacity-60"
      )}
    >
      <span className="px-2.5 text-muted-foreground inline-flex items-center gap-1.5">
        <Calendar className="size-3.5" strokeWidth={1.75} />
        Histórico
      </span>
      {HORIZONS.map((h) => (
        <button
          key={h.value}
          type="button"
          onClick={() => update(h.value)}
          className={cn(
            "h-8 px-3 rounded-[5px] transition-colors",
            value === h.value
              ? "bg-primary text-primary-foreground"
              : "text-muted-foreground hover:text-foreground"
          )}
        >
          {h.label}
        </button>
      ))}
    </div>
  );
}
