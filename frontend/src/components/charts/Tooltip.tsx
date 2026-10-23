import type { ReactNode } from "react";

export interface TooltipRow {
  value: string;
  label: string;
  color?: string;
}

/** Values lead, labels follow; series keyed with a short line, not a box. */
export function ChartTooltip({
  x,
  y,
  title,
  rows,
  footer,
  containerWidth,
}: {
  x: number;
  y: number;
  title: string;
  rows: TooltipRow[];
  footer?: ReactNode;
  containerWidth: number;
}) {
  const width = 188;
  const left = Math.max(0, Math.min(x - width / 2, containerWidth - width));
  return (
    <div
      role="status"
      className="pointer-events-none absolute z-20 rounded-md border border-rule bg-surface px-3 py-2.5 shadow-pop"
      style={{ left, top: y, width }}
    >
      <div className="mb-1.5 text-xs text-muted">{title}</div>
      <ul className="flex flex-col gap-1">
        {rows.map((row) => (
          <li key={row.label} className="flex items-center gap-2 text-sm">
            {row.color && <span aria-hidden className="h-[2px] w-3 rounded-full" style={{ background: row.color }} />}
            <span className="font-semibold tabular text-ink">{row.value}</span>
            <span className="text-ink-2">{row.label}</span>
          </li>
        ))}
      </ul>
      {footer && <div className="mt-1.5 text-xs text-muted">{footer}</div>}
    </div>
  );
}
