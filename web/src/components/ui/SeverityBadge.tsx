import { cn } from "@/lib/utils";

type Level = "critical" | "high" | "medium" | "low";

const styles: Record<Level, { dot: string; text: string; bg: string; label: string }> = {
  critical: { dot: "bg-danger", text: "text-danger", bg: "bg-danger-soft", label: "Crítico" },
  high: { dot: "bg-warning", text: "text-warning", bg: "bg-warning-soft", label: "Alto" },
  medium: { dot: "bg-muted", text: "text-muted-strong", bg: "bg-surface-hover", label: "Medio" },
  low: { dot: "bg-subtle", text: "text-muted", bg: "bg-surface-hover", label: "Bajo" },
};

export function SeverityBadge({ level, label }: { level: Level; label?: string }) {
  const s = styles[level];
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 px-1.5 py-0.5 rounded text-[11px] font-medium",
        s.bg,
        s.text
      )}
    >
      <span className={cn("size-1.5 rounded-full", s.dot)} />
      {label ?? s.label}
    </span>
  );
}
