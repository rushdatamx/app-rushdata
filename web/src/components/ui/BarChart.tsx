import { cn } from "@/lib/utils";

type Bar = {
  label: string;
  value: number;
  sublabel?: string;
};

export function BarChart({
  data,
  height = 160,
  format = (n) => String(Math.round(n)),
  highlightLast = true,
  className,
}: {
  data: Bar[];
  height?: number;
  format?: (n: number) => string;
  highlightLast?: boolean;
  className?: string;
}) {
  if (!data || data.length === 0) {
    return (
      <div className="text-[12px] text-subtle py-4 text-center">Sin datos</div>
    );
  }

  const max = Math.max(...data.map((d) => d.value), 1);
  const barCount = data.length;

  return (
    <div className={cn("w-full", className)}>
      <div
        className="flex items-end gap-1.5 w-full"
        style={{ height }}
        role="img"
        aria-label={`Gráfica de barras con ${barCount} valores`}
      >
        {data.map((d, i) => {
          const h = Math.max(2, (d.value / max) * height);
          const isLast = i === data.length - 1;
          const highlight = highlightLast && isLast;
          return (
            <div
              key={`${d.label}-${i}`}
              className="flex-1 flex flex-col items-center justify-end gap-1 min-w-0 group relative"
            >
              <div
                className={cn(
                  "w-full rounded-sm transition-colors",
                  highlight ? "bg-accent" : "bg-foreground/80 group-hover:bg-foreground"
                )}
                style={{ height: h }}
                title={`${d.label}: ${format(d.value)}`}
              />
              <div className="text-[10px] text-subtle tabular-nums tracking-tight w-full text-center truncate">
                {d.label}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
