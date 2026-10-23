"use client";

import { useState } from "react";
import { metric } from "@/lib/format";
import { ChartTooltip } from "./Tooltip";
import { columnPath, niceTicks } from "./geometry";
import { useElementWidth } from "./useElementWidth";

export interface WeekDatum {
  label: string;      // "Wk 2"
  title: string;      // "Week 2"
  model: number;
  baseline: number;
  n: number;
}

const HEIGHT = 240;
const M = { top: 12, right: 4, bottom: 28, left: 36 };

/** Grouped columns: XGBoost vs baseline per target week. */
export function WeekColumns({ data, unit }: { data: WeekDatum[]; unit: string }) {
  const [ref, width] = useElementWidth<HTMLDivElement>();
  const [active, setActive] = useState<number | null>(null);

  const innerW = Math.max(0, width - M.left - M.right);
  const innerH = HEIGHT - M.top - M.bottom;
  const ticks = niceTicks(Math.max(...data.flatMap((d) => [d.model, d.baseline])));
  const top = ticks[ticks.length - 1];
  const y = (v: number) => M.top + innerH - (v / top) * innerH;

  const band = data.length ? innerW / data.length : 0;
  const barW = Math.max(6, Math.min(24, (band * 0.62 - 2) / 2));
  const gap = 2;

  const current = active == null ? null : data[active];

  return (
    <div ref={ref} className="relative" style={{ height: HEIGHT }} onMouseLeave={() => setActive(null)}>
      {width > 0 && (
        <svg width={width} height={HEIGHT} role="group" aria-label={`Error by week in ${unit}. Each week is focusable; Show as table lists every value.`}>
          {ticks.map((t) => (
            <g key={t}>
              <line x1={M.left} x2={width - M.right} y1={y(t)} y2={y(t)} stroke="var(--rule)" strokeWidth={1} />
              <text x={M.left - 8} y={y(t)} dy="0.32em" textAnchor="end" className="fill-muted text-[11px] tabular">
                {t}
              </text>
            </g>
          ))}
          {data.map((d, i) => {
            const cx = M.left + band * i + band / 2;
            const x0 = cx - barW - gap / 2;
            const x1 = cx + gap / 2;
            const dim = active != null && active !== i;
            return (
              <g key={d.label} opacity={dim ? 0.45 : 1} className="transition-opacity duration-150">
                <path d={columnPath(x0, y(d.model), barW, y(0) - y(d.model))} fill="var(--series-model)" />
                <path d={columnPath(x1, y(d.baseline), barW, y(0) - y(d.baseline))} fill="var(--series-baseline)" />
                <text x={cx} y={HEIGHT - 8} textAnchor="middle" className="fill-ink-2 text-[12px]">
                  {d.label}
                </text>
                <rect
                  x={M.left + band * i}
                  y={M.top}
                  width={band}
                  height={innerH}
                  fill="transparent"
                  tabIndex={0}
                  role="button"
                  aria-label={`${d.title}: XGBoost ${metric(d.model)}, baseline ${metric(d.baseline)} ${unit}`}
                  onMouseEnter={() => setActive(i)}
                  onFocus={() => setActive(i)}
                  onBlur={() => setActive(null)}
                  className="cursor-default outline-none focus-visible:stroke-[var(--focus)] focus-visible:stroke-2"
                />
              </g>
            );
          })}
          <line x1={M.left} x2={width - M.right} y1={y(0)} y2={y(0)} stroke="var(--rule-strong)" strokeWidth={1} />
        </svg>
      )}
      {current && active != null && (
        <ChartTooltip
          x={M.left + band * active + band / 2}
          y={8}
          containerWidth={width}
          title={current.title}
          rows={[
            { value: metric(current.model), label: "XGBoost", color: "var(--series-model)" },
            { value: metric(current.baseline), label: "Baseline", color: "var(--series-baseline)" },
          ]}
          footer={`${current.n} player-weeks, ${unit}`}
        />
      )}
    </div>
  );
}
