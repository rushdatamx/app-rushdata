import { cn } from "@/lib/utils";

type Tone = "danger" | "warning" | "accent" | "muted";

const tones: Record<Tone, string> = {
  danger: "bg-danger-soft text-danger",
  warning: "bg-warning-soft text-warning",
  accent: "bg-accent-soft text-accent",
  muted: "bg-surface-hover text-muted-strong",
};

export function ReasonBadge({ label, tone = "muted" }: { label: string; tone?: Tone }) {
  return (
    <span
      className={cn(
        "inline-flex items-center px-1.5 py-0.5 rounded text-[11px] font-medium",
        tones[tone]
      )}
    >
      {label}
    </span>
  );
}
