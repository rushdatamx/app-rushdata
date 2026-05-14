"use client";

import { useRouter, useSearchParams, usePathname } from "next/navigation";
import { useTransition, useCallback, useState } from "react";
import { Calendar, ChevronDown, Check } from "lucide-react";
import { DropdownMenu as DropdownMenuPrimitive } from "radix-ui";

import { cn } from "@/lib/utils";

export type PeriodOption = {
  value: string;
  label: string;
  shortLabel: string;
};

export type PeriodSelectorProps = {
  value: string;
  resolvedLabel: string;     // "Mayo 2026", "Últimos 30 días"
  resolvedShortLabel: string; // "May 26", "30d"
  rolling: PeriodOption[];
  calendar: PeriodOption[];
  fiscal: PeriodOption[];
  /** Si se incluye, agrega una opción "Todo" arriba como valor "all". */
  includeAll?: boolean;
  /** Valor que se considera default y se omite del URL. Default: "30d". */
  defaultValue?: string;
  paramKey?: string;          // default "period"
  className?: string;
};

export function PeriodSelector({
  value,
  resolvedLabel,
  rolling,
  calendar,
  fiscal,
  includeAll = false,
  defaultValue = "30d",
  paramKey = "period",
  className,
}: PeriodSelectorProps) {
  const router = useRouter();
  const pathname = usePathname();
  const sp = useSearchParams();
  const [isPending, startTransition] = useTransition();
  const [open, setOpen] = useState(false);

  const update = useCallback(
    (next: string) => {
      const params = new URLSearchParams(sp?.toString() ?? "");
      if (next === defaultValue) params.delete(paramKey);
      else params.set(paramKey, next);
      const qs = params.toString();
      startTransition(() => {
        router.push(qs ? `${pathname}?${qs}` : pathname);
        setOpen(false);
      });
    },
    [router, pathname, sp, paramKey, defaultValue]
  );

  const hasFiscal = fiscal.length > 0;

  return (
    <DropdownMenuPrimitive.Root open={open} onOpenChange={setOpen}>
      <DropdownMenuPrimitive.Trigger asChild>
        <button
          type="button"
          className={cn(
            "inline-flex h-9 items-center gap-2 rounded-md border bg-background px-3 text-xs font-medium hover:bg-muted transition-colors",
            isPending && "opacity-60",
            className
          )}
        >
          <Calendar className="size-3.5 text-muted-foreground" strokeWidth={1.75} />
          <span>{resolvedLabel}</span>
          <ChevronDown className="size-3.5 text-muted-foreground" strokeWidth={1.75} />
        </button>
      </DropdownMenuPrimitive.Trigger>

      <DropdownMenuPrimitive.Portal>
        <DropdownMenuPrimitive.Content
          align="start"
          sideOffset={6}
          className={cn(
            "z-50 rounded-md border bg-popover p-3 text-popover-foreground shadow-md",
            "data-[state=open]:animate-in data-[state=closed]:animate-out",
            "data-[state=open]:fade-in-0 data-[state=closed]:fade-out-0",
            "data-[state=open]:zoom-in-95 data-[state=closed]:zoom-out-95",
            "w-[480px]"
          )}
        >
          {includeAll && (
            <button
              type="button"
              onClick={() => update("all")}
              className={cn(
                "w-full flex items-center justify-between h-8 px-2 mb-3 rounded text-xs font-medium transition-colors",
                value === "all"
                  ? "bg-primary text-primary-foreground"
                  : "hover:bg-muted text-foreground border border-border"
              )}
            >
              <span>Todo el histórico</span>
              {value === "all" && <Check className="size-3.5 ml-2 shrink-0" strokeWidth={2} />}
            </button>
          )}
          <div
            className={cn(
              "grid gap-4",
              hasFiscal ? "grid-cols-3" : "grid-cols-2"
            )}
          >
            <Column
              title="Rolling"
              options={rolling}
              value={value}
              onSelect={update}
            />
            <Column
              title="Calendario"
              options={calendar}
              value={value}
              onSelect={update}
            />
            {hasFiscal && (
              <Column
                title="Fiscal HEB"
                options={fiscal}
                value={value}
                onSelect={update}
              />
            )}
          </div>
        </DropdownMenuPrimitive.Content>
      </DropdownMenuPrimitive.Portal>
    </DropdownMenuPrimitive.Root>
  );
}

function Column({
  title,
  options,
  value,
  onSelect,
}: {
  title: string;
  options: PeriodOption[];
  value: string;
  onSelect: (v: string) => void;
}) {
  return (
    <div className="flex flex-col gap-1">
      <div className="text-[10px] uppercase tracking-wider text-muted-foreground font-medium px-2 pb-1">
        {title}
      </div>
      {options.map((o) => {
        const active = o.value === value;
        return (
          <button
            key={o.value}
            type="button"
            onClick={() => onSelect(o.value)}
            className={cn(
              "flex items-center justify-between h-8 px-2 rounded text-xs text-left transition-colors",
              active
                ? "bg-primary text-primary-foreground"
                : "hover:bg-muted text-foreground"
            )}
          >
            <span className="truncate">{o.label}</span>
            {active && <Check className="size-3.5 ml-2 shrink-0" strokeWidth={2} />}
          </button>
        );
      })}
    </div>
  );
}
