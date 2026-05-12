import Link from "next/link";
import { ArrowUpRight, ArrowDownRight, ArrowRight } from "lucide-react";
import { cn } from "@/lib/utils";

export type KPIDelta = {
  label: string;
  direction: "up" | "down" | "flat";
  tone: "good" | "bad" | "neutral";
};

type Variant = "default" | "danger" | "success" | "warning";

const variantBar: Record<Variant, string> = {
  default: "bg-border",
  danger: "bg-danger",
  success: "bg-success",
  warning: "bg-warning",
};

export function KPICard({
  label,
  value,
  unit,
  delta,
  subtitle,
  variant = "default",
  href,
  size = "md",
}: {
  label: string;
  value: string;
  unit?: string;
  delta?: KPIDelta;
  subtitle?: string;
  variant?: Variant;
  href?: string;
  size?: "md" | "lg";
}) {
  const Body = (
    <div className="px-5 py-4 flex flex-col gap-3 h-full">
      <div className="flex items-center justify-between">
        <div className="text-[11px] tracking-wider uppercase text-subtle font-medium">
          {label}
        </div>
        {href && (
          <ArrowRight
            className="size-3.5 text-subtle group-hover:text-foreground transition-colors"
            strokeWidth={1.5}
          />
        )}
      </div>
      <div className="flex items-baseline gap-2">
        <span
          className={cn(
            "font-mono tabular-nums text-foreground tracking-tight",
            size === "lg" ? "text-[32px] leading-none" : "text-[24px] leading-none"
          )}
        >
          {value}
        </span>
        {unit && (
          <span className="text-[12px] text-muted">{unit}</span>
        )}
      </div>
      {(delta || subtitle) && (
        <div className="flex items-center gap-2 text-[12px]">
          {delta && (
            <span
              className={cn(
                "inline-flex items-center gap-0.5 font-medium",
                delta.tone === "good" && "text-success",
                delta.tone === "bad" && "text-danger",
                delta.tone === "neutral" && "text-muted"
              )}
            >
              {delta.direction === "up" && <ArrowUpRight className="size-3" strokeWidth={2} />}
              {delta.direction === "down" && <ArrowDownRight className="size-3" strokeWidth={2} />}
              {delta.label}
            </span>
          )}
          {subtitle && <span className="text-muted">{subtitle}</span>}
        </div>
      )}
      <div className={cn("h-0.5 w-full rounded-full mt-auto", variantBar[variant])} />
    </div>
  );

  if (href) {
    return (
      <Link
        href={href}
        className="group block bg-surface border border-border rounded-lg hover:bg-surface-hover transition-colors h-full"
        style={{ boxShadow: "0 1px 2px rgba(0,0,0,0.04)" }}
      >
        {Body}
      </Link>
    );
  }

  return (
    <div
      className="bg-surface border border-border rounded-lg h-full"
      style={{ boxShadow: "0 1px 2px rgba(0,0,0,0.04)" }}
    >
      {Body}
    </div>
  );
}
