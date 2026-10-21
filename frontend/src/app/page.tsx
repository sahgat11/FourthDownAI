import { ChartFigure, SimpleTable } from "@/components/charts/ChartFigure";
import { CalibrationPlot } from "@/components/charts/CalibrationPlot";
import { ImportanceBars } from "@/components/charts/ImportanceBars";
import { PageHeader } from "@/components/layout/PageHeader";
import { AccuracySection } from "@/components/overview/AccuracySection";
import { ThisWeekList } from "@/components/overview/ThisWeekList";
import { StatTile } from "@/components/ui/StatTile";
import { breakouts, freshness, meta, metrics, projections, waivers } from "@/lib/data";
import { count, metric, percent, points } from "@/lib/format";

export default function OverviewPage() {
  const { evaluation, improvement } = metrics;
  const topProjections = projections.players.filter((p) => !p.on_bye).slice(0, 5);
  const importance = metrics.feature_importance;
  const topTwoShare = (importance[0].importance + importance[1].importance) * 100;
  const firstTrain = evaluation.train_seasons[0];
  const lastTrain = evaluation.train_seasons[evaluation.train_seasons.length - 1];
  const weeks = evaluation.target_weeks;

  return (
    <div className="flex flex-col gap-14">
      <PageHeader
        title="Next week's fantasy points, projected"
        freshness={freshness}
        description={
          <p>
            FourthDown projects PPR points for every active running back, receiver and tight end
            from their last three weeks of usage. Then it grades itself against the simplest
            alternative: assuming each player repeats his 3-week average.
          </p>
        }
      />

      <section aria-labelledby="results" className="flex flex-col gap-6">
        <div className="flex flex-col gap-1">
          <h2 id="results" className="text-2xl font-semibold">
            How it did this season
          </h2>
          <p className="max-w-[62ch] text-ink-2">
            {count(evaluation.test_rows)} player-weeks from {evaluation.test_season} weeks{" "}
            {weeks[0]}–{weeks[weeks.length - 1]}, none of which the model saw in training.
          </p>
        </div>
        <div className="grid gap-x-8 gap-y-8 sm:grid-cols-2 lg:grid-cols-4">
          <StatTile
            emphasis
            label="XGBoost mean absolute error"
            value={metric(metrics.xgboost.mae)}
            unit="pts"
            detail={`${percent(improvement.mae_pct)} lower than the baseline`}
          />
          <StatTile
            label="Baseline mean absolute error"
            value={metric(metrics.baseline.mae)}
            unit="pts"
            detail="3-week rolling average"
          />
          <StatTile
            emphasis
            label="XGBoost RMSE"
            value={metric(metrics.xgboost.rmse)}
            unit="pts"
            detail={`${percent(improvement.rmse_pct)} lower; fewer big misses`}
          />
          <StatTile
            label="Baseline RMSE"
            value={metric(metrics.baseline.rmse)}
            unit="pts"
            detail="3-week rolling average"
          />
        </div>
      </section>

      <section aria-labelledby="this-week" className="flex flex-col gap-4">
        <h2 id="this-week" className="text-2xl font-semibold">
          Week {meta.projection_week} at a glance
        </h2>
        <div className="grid gap-4 md:grid-cols-3">
          <ThisWeekList
            title="Top projections"
            description="Highest projected PPR points, bye weeks excluded."
            players={topProjections}
            value={(p) => <span className="font-semibold">{points(p.projected_points)}</span>}
            href="/projections"
            linkLabel={`All ${count(projections.count)} projections`}
          />
          <ThisWeekList
            title="Breakout watch"
            description="Highest breakout scores, with projected gain over the 3-week average."
            players={breakouts.players.slice(0, 5)}
            value={(p) => <span className="text-ink-2">+{points(p.projection_gain)}</span>}
            href="/breakouts"
            linkLabel={`All ${count(breakouts.count)} breakout candidates`}
          />
          <ThisWeekList
            title="Waiver targets"
            description="Highest waiver scores among likely-available players, with projections."
            players={waivers.players.slice(0, 5)}
            value={(p) => <span className="font-semibold">{points(p.projected_points)}</span>}
            href="/waivers"
            linkLabel={`All ${count(waivers.count)} waiver targets`}
          />
        </div>
      </section>

      <section aria-labelledby="accuracy" className="flex flex-col gap-4">
        <div className="flex flex-col gap-1">
          <h2 id="accuracy" className="text-2xl font-semibold">
            Where the edge comes from
          </h2>
          <p className="max-w-[62ch] text-ink-2">
            Both models predict the same games. The gap holds across weeks and positions rather
            than coming from one lucky stretch.
          </p>
        </div>
        <AccuracySection metrics={metrics} />
        <div className="grid gap-4 lg:grid-cols-2">
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
        </div>
      </section>

      <section aria-labelledby="method" className="grid gap-8 border-t border-rule pt-10 lg:grid-cols-[2fr_3fr]">
        <div className="flex flex-col gap-3">
          <h2 id="method" className="text-2xl font-semibold">
            How it&apos;s tested
          </h2>
          <p className="text-ink-2">
            The model is trained on {firstTrain}–{lastTrain} and scored on {evaluation.test_season}.
            Every row uses a player&apos;s stats through week N to predict his PPR points in week
            N+1, so results from the predicted week never leak into its own projection. The
            baseline is scored on exactly the same rows.
          </p>
          <p className="text-ink-2">
            The live projections come from the same setup, retrained with every completed week
            of {meta.season} included.
          </p>
        </div>
        <dl className="grid grid-cols-2 gap-x-6 gap-y-5 self-start text-sm sm:grid-cols-3">
          {[
            ["Model", meta.model.name],
            ["Target", meta.model.target],
            ["Inputs", `${meta.model.features.length} rolling usage stats`],
            ["Training rows", count(evaluation.train_rows)],
            ["Test rows", count(evaluation.test_rows)],
            ["Trees / depth", `${meta.model.params.n_estimators} / ${meta.model.params.max_depth}`],
          ].map(([term, detail]) => (
            <div key={term} className="flex flex-col gap-1 border-t border-rule pt-2">
              <dt className="text-muted">{term}</dt>
              <dd className="font-medium text-ink">{detail}</dd>
            </div>
          ))}
        </dl>
      </section>
    </div>
  );
}
