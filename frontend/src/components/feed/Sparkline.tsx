import type { GameLine } from "@/lib/types";

/**
 * A tiny single-series trend line (one hue, so no legend). The label
 * carries every value for screen readers; the last value is printed.
 */
export function Sparkline({
  games,
  metric,
  label,
  unit,
  format = (v) => String(Math.round(v)),
  width = 104,
  height = 30,
}: {
  games: GameLine[];
  metric: "touches" | "points" | "target_share";
  label: string;
  /** Printed after the latest value, e.g. "touches". */
  unit: string;
  format?: (v: number) => string;
  width?: number;
  height?: number;
}) {
  const points = games
    .map((g) => ({ week: g.week, v: g[metric] }))
    .filter((p): p is { week: number; v: number } => p.v != null);
  if (points.length < 2) return null;

  const pad = 4;
  const max = Math.max(...points.map((p) => p.v), 1);
  const x = (i: number) => pad + (i / (points.length - 1)) * (width - pad * 2);
  const y = (v: number) => height - pad - (v / max) * (height - pad * 2);
  const path = points.map((p, i) => `${i ? "L" : "M"}${x(i).toFixed(1)},${y(p.v).toFixed(1)}`).join("");
  const last = points[points.length - 1];
  const description = `${label}: ${points.map((p) => `week ${p.week} ${format(p.v)}`).join(", ")}`;

  return (
    <span className="inline-flex items-center gap-2" role="img" aria-label={description}>
      <svg width={width} height={height} aria-hidden className="overflow-visible">
        <line x1={pad} x2={width - pad} y1={height - pad} y2={height - pad} stroke="var(--rule)" />
        <path d={path} fill="none" stroke="var(--accent)" strokeWidth={2} strokeLinejoin="round" strokeLinecap="round" />
        <circle cx={x(points.length - 1)} cy={y(last.v)} r={3.5} fill="var(--accent)" stroke="var(--surface)" strokeWidth={2} />
      </svg>
      <span aria-hidden className="text-xs text-muted tabular">
        <span className="font-semibold text-ink">{format(last.v)}</span> {unit}, wk {last.week}
      </span>
    </span>
  );
}
