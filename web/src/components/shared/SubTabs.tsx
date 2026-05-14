"use client";

import { useRouter, useSearchParams, usePathname } from "next/navigation";
import { useTransition, useCallback } from "react";
import { cn } from "@/lib/utils";

export type SubTab = {
  value: string;
  label: string;
};

export type SubTabsProps = {
  tabs: SubTab[];
  current: string;
  paramName?: string;
};

export function SubTabs({ tabs, current, paramName = "tab" }: SubTabsProps) {
  const router = useRouter();
  const pathname = usePathname();
  const sp = useSearchParams();
  const [, startTransition] = useTransition();

  const update = useCallback(
    (value: string) => {
      const params = new URLSearchParams(sp?.toString() ?? "");
      // Default tab (primer tab) → eliminar param para URL limpia
      if (value === tabs[0]?.value) params.delete(paramName);
      else params.set(paramName, value);
      const qs = params.toString();
      startTransition(() => {
        router.push(qs ? `${pathname}?${qs}` : pathname);
      });
    },
    [router, pathname, sp, paramName, tabs]
  );

  return (
    <div className="inline-flex h-9 items-center rounded-md border bg-muted/30 p-0.5 self-start">
      {tabs.map((t) => {
        const active = t.value === current;
        return (
          <button
            key={t.value}
            type="button"
            onClick={() => update(t.value)}
            className={cn(
              "inline-flex h-8 items-center rounded px-3 text-sm font-medium transition-colors",
              active
                ? "bg-background text-foreground shadow-sm"
                : "text-muted-foreground hover:text-foreground"
            )}
          >
            {t.label}
          </button>
        );
      })}
    </div>
  );
}
