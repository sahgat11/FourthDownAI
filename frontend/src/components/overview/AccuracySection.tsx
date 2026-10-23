"use client";

import { useState } from "react";
import { ChartFigure, SimpleTable } from "@/components/charts/ChartFigure";
import { CalibrationPlot } from "@/components/charts/CalibrationPlot";
import { ImportanceBars } from "@/components/charts/ImportanceBars";
import { PairedBars } from "@/components/charts/PairedBars";
import { WeekColumns } from "@/components/charts/WeekColumns";
import { Legend } from "@/components/ui/Legend";
import { SegmentedControl } from "@/components/ui/SegmentedControl";
import { count, metric, percent, points } from "@/lib/format";
import type { MetricsFile } from "@/lib/types";

type Metric = "mae" | "rmse";
type View = "week" | "position" | "calibration" | "inputs";

const LEGEND = (
  <Legend
    items={[
      { label: "XGBoost", color: "var(--series-model)" },
      { label: "3-week average baseline", color: "var(--series-baseline)" },
    ]}
  />
);

/** One panel, four views: the accuracy story without four screens of charts. */
export function AccuracySection({ metrics }: { metrics: MetricsFile }) {
  const [view, setView] = useState<View>("week");
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
  const importance = metrics.feature_importance;
  const topTwoShare = (importance[0].importance + importance[1].importance) * 100;

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center gap-3">
        <SegmentedControl<View>
          label="Accuracy view"
          value={view}
          onChange={setView}
          options={[
            { value: "week", label: "By week" },
            { value: "position", label: "By position" },
            { value: "calibration", label: "Calibration" },
            { value: "inputs", label: "Inputs" },
          ]}
        />
        {(view === "week" || view === "position") && (
          <SegmentedControl<Metric>
            label="Error measure"
            value={which}
            onChange={setWhich}
            options={[
              { value: "mae", label: "MAE" },
              { value: "rmse", label: "RMSE" },
            ]}
          />
        )}
      </div>

      {view === "week" && (
        <ChartFigure
          title="Error by week"
          note={`XGBoost had the lower ${name} in ${weeksWon} of ${weeks.length} weeks. Points per player-week; lower is better.`}
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
      )}

      {view === "position" && (
        <ChartFigure
          title="Error by position"
          note={`Lower ${name} for XGBoost at ${positionsWon === positions.length ? "every position" : `${positionsWon} of ${positions.length} positions`}.`}
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
      )}

      {view === "calibration" && (
        <ChartFigure
          title="Are the projections honest?"
          note="Player-weeks grouped by projection. Dots on the line mean players scored what was projected, on average; above it, they beat the projection."
          table={
            <SimpleTable
              head={["Projected", "Avg projection", "Avg result", "Player-weeks"]}
              rows={metrics.calibration.map((b) => [
                b.predicted_max == null ? `${b.predicted_min}+` : `${b.predicted_min}–${b.predicted_max}`,
                points(b.mean_predicted),
                points(b.mean_actual),
                count(b.n),
              ])}
            />
          }
        >
          <CalibrationPlot bins={metrics.calibration} />
        </ChartFigure>
      )}

      {view === "inputs" && (
        <ChartFigure
          title="What the model relies on"
          note={`Share of the model's gain from each input. ${importance[0].label} and ${importance[1].label.toLowerCase()} account for ${percent(topTwoShare)}.`}
          table={
            <SimpleTable
              head={["Input", "Share"]}
              rows={importance.map((f) => [f.label, `${(f.importance * 100).toFixed(1)}%`])}
            />
          }
        >
          <ImportanceBars items={importance.slice(0, 8)} />
          <p className="text-xs text-muted">Top 8 of {importance.length} inputs. The table lists all of them.</p>
        </ChartFigure>
      )}
    </div>
  );
}
