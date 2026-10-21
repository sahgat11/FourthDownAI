"use client";

import { useState } from "react";
import { count, points } from "@/lib/format";
import type { MetricsFile } from "@/lib/types";
import { ChartTooltip } from "./Tooltip";
import { niceTicks } from "./geometry";
import { useElementWidth } from "./useElementWidth";

const HEIGHT = 280;
const M = { top: 16, right: 12, bottom: 40, left: 40 };

type Bin = MetricsFile["calibration"][number];

function binLabel(b: Bin) {
  return b.predicted_max == null ? `${b.predicted_min}+ pts` : `${b.predicted_min}–${b.predicted_max} pts`;
}

/** Average projection vs average actual result, per projection bucket, against the y = x line. */
export function CalibrationPlot({ bins }: { bins: Bin[] }) {
  const [ref, width] = useElementWidth<HTMLDivElement>();
  const [active, setActive] = useState<number | null>(null);

  const max = Math.max(...bins.flatMap((b) => [b.mean_predicted, b.mean_actual]));
  const ticks = niceTicks(max, 5);
  const top = ticks[ticks.length - 1];
  const innerW = Math.max(0, width - M.left - M.right);
  const innerH = HEIGHT - M.top - M.bottom;
  const x = (v: number) => M.left + (v / top) * innerW;
  const y = (v: number) => M.top + innerH - (v / top) * innerH;
  const line = bins.map((b, i) => `${i ? "L" : "M"}${x(b.mean_predicted)},${y(b.mean_actual)}`).join("");
  const current = active == null ? null : bins[active];

  return (
    <div ref={ref} className="relative" style={{ height: HEIGHT }} onMouseLeave={() => setActive(null)}>
      {width > 0 && (
        <svg width={width} height={HEIGHT} role="img" aria-label="Average projected points against average actual points for each projection range. Use Show as table for exact values.">
          {ticks.map((t) => (
            <g key={t}>
              <line x1={M.left} x2={width - M.right} y1={y(t)} y2={y(t)} stroke="var(--rule)" />
              <text x={M.left - 8} y={y(t)} dy="0.32em" textAnchor="end" className="fill-muted text-[11px] tabular">{t}</text>
              <text x={x(t)} y={M.top + innerH + 16} textAnchor="middle" className="fill-muted text-[11px] tabular">{t}</text>
            </g>
          ))}
          <line x1={x(0)} y1={y(0)} x2={x(top)} y2={y(top)} stroke="var(--rule-strong)" strokeWidth={1} />
          <text x={x(top) - 4} y={y(top) + 14} textAnchor="end" className="fill-muted text-[11px]">
            Projection = result
          </text>
          <text x={M.left + innerW / 2} y={HEIGHT - 4} textAnchor="middle" className="fill-ink-2 text-[12px]">
            Average projection (pts)
          </text>
          <text x={M.left} y={M.top - 4} className="fill-ink-2 text-[12px]">
            Average result (pts)
          </text>
          <path d={line} fill="none" stroke="var(--series-model)" strokeWidth={2} strokeLinejoin="round" strokeLinecap="round" />
          {bins.map((b, i) => (
            <g key={binLabel(b)}>
              <circle cx={x(b.mean_predicted)} cy={y(b.mean_actual)} r={active === i ? 6 : 5} fill="var(--series-model)" stroke="var(--surface)" strokeWidth={2} />
              <circle
                cx={x(b.mean_predicted)}
                cy={y(b.mean_actual)}
                r={14}
                fill="transparent"
                tabIndex={0}
                role="button"
                aria-label={`Projected ${binLabel(b)}: average projection ${points(b.mean_predicted)}, average result ${points(b.mean_actual)}, ${b.n} player-weeks`}
                onMouseEnter={() => setActive(i)}
                onFocus={() => setActive(i)}
                onBlur={() => setActive(null)}
                className="outline-none focus-visible:stroke-[var(--focus)] focus-visible:stroke-2"
              />
            </g>
          ))}
        </svg>
      )}
      {current && active != null && (
        <ChartTooltip
          x={x(current.mean_predicted)}
          y={Math.max(0, y(current.mean_actual) - 110)}
          containerWidth={width}
          title={`Projected ${binLabel(current)}`}
          rows={[
            { value: points(current.mean_actual), label: "average result", color: "var(--series-model)" },
            { value: points(current.mean_predicted), label: "average projection" },
          ]}
          footer={`${count(current.n)} player-weeks`}
        />
      )}
    </div>
  );
}
