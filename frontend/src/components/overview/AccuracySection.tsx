"use client";

import { useState } from "react";
import { ChartFigure, SimpleTable } from "@/components/charts/ChartFigure";
import { PairedBars } from "@/components/charts/PairedBars";
import { WeekColumns } from "@/components/charts/WeekColumns";
import { Legend } from "@/components/ui/Legend";
import { SegmentedControl } from "@/components/ui/SegmentedControl";
import { count, metric } from "@/lib/format";
import type { MetricsFile } from "@/lib/types";

type Metric = "mae" | "rmse";

const LEGEND = (
  <Legend
    items={[
      { label: "XGBoost", color: "var(--series-model)" },
      { label: "3-week average baseline", color: "var(--series-baseline)" },
    ]}
  />
);

export function AccuracySection({ metrics }: { metrics: MetricsFile }) {
  const [which, setWhich] = useState<Metric>("mae");
  const name = which === "mae" ? "mean absolute error" : "root mean squared error";
  const pick = (d: MetricsFile["by_week"][number] | MetricsFile["by_position"][number]) =>
    which === "mae"
      ? { model: d.xgboost_mae, baseline: d.baseline_mae }
      : { model: d.xgboost_rmse, baseline: d.baseline_rmse };

  const weeks = metrics.by_week.map((w) => ({
    label: `Wk ${w.target_week}`,
    title: `Week ${w.target_week}`,
    n: w.n,
    ...pick(w),
  }));
  const positions = metrics.by_position.map((p) => ({ label: p.position, n: p.n, ...pick(p) }));
  const weeksWon = weeks.filter((w) => w.model < w.baseline).length;
  const positionsWon = positions.filter((p) => p.model < p.baseline).length;

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <SegmentedControl<Metric>
          label="Error measure"
          value={which}
          onChange={setWhich}
          options={[
            { value: "mae", label: "Mean absolute error" },
            { value: "rmse", label: "RMSE" },
          ]}
        />
        <p className="text-sm text-muted">Points per player-week. Lower is better.</p>
      </div>
      <div className="grid gap-4 lg:grid-cols-[3fr_2fr]">
        <ChartFigure
          title="Error by week"
          note={`XGBoost had the lower ${name} in ${weeksWon} of ${weeks.length} weeks.`}
          legend={LEGEND}
          table={
            <SimpleTable
              head={["Week", "XGBoost", "Baseline", "Player-weeks"]}
              rows={weeks.map((w) => [w.title, metric(w.model), metric(w.baseline), count(w.n)])}
            />
          }
        >
          <WeekColumns data={weeks} unit={`points ${which === "mae" ? "MAE" : "RMSE"}`} />
        </ChartFigure>
        <ChartFigure
          title="Error by position"
          note={`Lower for XGBoost at ${positionsWon === positions.length ? "every position" : `${positionsWon} of ${positions.length} positions`}.`}
          legend={LEGEND}
          table={
            <SimpleTable
              head={["Position", "XGBoost", "Baseline", "Player-weeks"]}
              rows={positions.map((p) => [p.label, metric(p.model), metric(p.baseline), count(p.n)])}
            />
          }
        >
          <PairedBars data={positions} />
        </ChartFigure>
      </div>
    </div>
  );
}
