type Point = { x: string | number; y: number };

const COLOR: Record<string, string> = {
  accent: "#0F766E",
  muted: "#A8A29E",
  danger: "#B91C1C",
  success: "#15803D",
};

export function Sparkline({
  data,
  tone = "accent",
  height = 28,
  width = 120,
}: {
  data: Point[];
  tone?: keyof typeof COLOR;
  height?: number;
  width?: number;
}) {
  if (!data || data.length < 2) {
    return (
      <div
        className="text-[11px] text-subtle font-mono tabular-nums flex items-center"
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

  const points = data
    .map((d, i) => {
      const x = 1 + i * stepX;
      const y = padY + (1 - (d.y - minY) / rangeY) * (h - padY * 2);
      return `${x.toFixed(2)},${y.toFixed(2)}`;
    })
    .join(" ");

  const color = COLOR[tone] ?? COLOR.accent;

  return (
    <svg
      width={w}
      height={h}
      viewBox={`0 0 ${w} ${h}`}
      role="img"
      aria-hidden
      className="block"
    >
      <polyline
        points={points}
        fill="none"
        stroke={color}
        strokeWidth={1.5}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}
