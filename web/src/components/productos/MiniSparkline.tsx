type Point = { x: string | number; y: number };

type Tone = "default" | "success" | "danger" | "muted";

const TONE_CLASS: Record<Tone, string> = {
  default: "stroke-foreground",
  success: "stroke-emerald-600",
  danger: "stroke-rose-600",
  muted: "stroke-muted-foreground/50",
};

const FILL_CLASS: Record<Tone, string> = {
  default: "fill-foreground/10",
  success: "fill-emerald-600/10",
  danger: "fill-rose-600/10",
  muted: "fill-muted/40",
};

export function MiniSparkline({
  data,
  tone = "default",
  height = 28,
  width = 110,
  showArea = true,
}: {
  data: Point[];
  tone?: Tone;
  height?: number;
  width?: number;
  showArea?: boolean;
}) {
  if (!data || data.length < 2) {
    return (
      <div
        className="text-[11px] text-muted-foreground font-mono tabular-nums flex items-center"
        style={{ height, width }}
      >
        —
      </div>
    );
  }

  const ys = data.map((d) => d.y);
  const minY = Math.min(...ys);
  const maxY = Math.max(...ys);
  const rangeY = maxY - minY || 1;
  const padY = 2;
  const w = width;
  const h = height;
  const stepX = (w - 2) / (data.length - 1);

  const coords = data.map((d, i) => {
    const x = 1 + i * stepX;
    const y = padY + (1 - (d.y - minY) / rangeY) * (h - padY * 2);
    return { x, y };
  });

  const linePoints = coords.map((c) => `${c.x.toFixed(2)},${c.y.toFixed(2)}`).join(" ");

  const areaPath =
    showArea && coords.length > 0
      ? `M ${coords[0].x.toFixed(2)},${(h - 0.5).toFixed(2)} ` +
        coords.map((c) => `L ${c.x.toFixed(2)},${c.y.toFixed(2)}`).join(" ") +
        ` L ${coords[coords.length - 1].x.toFixed(2)},${(h - 0.5).toFixed(2)} Z`
      : null;

  return (
    <svg
      width={w}
      height={h}
      viewBox={`0 0 ${w} ${h}`}
      role="img"
      aria-hidden
      className="block"
    >
      {areaPath && <path d={areaPath} className={FILL_CLASS[tone]} />}
      <polyline
        points={linePoints}
        fill="none"
        className={TONE_CLASS[tone]}
        strokeWidth={1.5}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}
