import Link from "next/link";
import { StoryCard } from "@/components/feed/StoryCard";
import { Ticker } from "@/components/feed/Ticker";
import { WaiverSidebar } from "@/components/feed/WaiverSidebar";
import { AccuracySection } from "@/components/overview/AccuracySection";
import { EdgeBand } from "@/components/overview/EdgeBand";
import { StatTile } from "@/components/ui/StatTile";
import { breakouts, meta, metrics, projections, waivers } from "@/lib/data";
import { count, metric, percent, updatedAt } from "@/lib/format";

const button =
  "inline-flex h-10 items-center rounded-md px-4 font-display text-base font-bold tracking-wide uppercase transition-colors";

export default function OverviewPage() {
  const { evaluation, improvement } = metrics;
  const topProjections = projections.players.filter((p) => !p.on_bye).slice(0, 12);
  const [lead, ...rest] = breakouts.players;
  const stories = rest.slice(0, 6);
  const weeks = evaluation.target_weeks;
  const firstTrain = evaluation.train_seasons[0];
  const lastTrain = evaluation.train_seasons[evaluation.train_seasons.length - 1];

  return (
    <div className="flex flex-col gap-10">
      <Ticker players={topProjections} week={meta.projection_week} />

      <section className="grid grid-cols-1 items-start gap-6 lg:grid-cols-[minmax(0,5fr)_minmax(0,7fr)] lg:gap-10">
        <div className="flex flex-col gap-4 lg:pt-2">
          <p className="text-sm text-muted">
            {meta.season} season, data through week {meta.data_through_week}. Updated{" "}
            <time dateTime={meta.generated_at}>{updatedAt(meta.generated_at)}</time>.
          </p>
          <h1 className="font-display text-4xl leading-[0.95] font-extrabold sm:text-[3.25rem]">
            Week {meta.projection_week} fantasy moves
          </h1>
          <p className="max-w-[52ch] text-lg text-ink-2">
            Breakouts before they show up in the box score, waiver pickups worth a claim, and
            projections for every RB, WR and TE, from a model that beats the 3-week average.
          </p>
          <div className="flex flex-wrap gap-2">
            <Link href="/league" className={`${button} bg-accent text-accent-ink hover:bg-accent-hover`}>
              Connect your Sleeper league
            </Link>
            <Link href="/breakouts" className={`${button} border border-rule-strong bg-surface text-ink hover:bg-surface-sunk`}>
              Breakout watch
            </Link>
            <Link href="/projections" className={`${button} text-ink-2 hover:bg-surface-sunk hover:text-ink`}>
              All projections
            </Link>
          </div>
          <p className="border-l-[3px] border-accent pl-3 text-sm text-ink-2">
            <span className="font-semibold text-ink">
              {metric(metrics.xgboost.mae)} vs {metric(metrics.baseline.mae)} points of error
            </span>{" "}
            against the 3-week average, {percent(improvement.mae_pct)} better on{" "}
            {count(evaluation.test_rows)} held-out player-weeks.{" "}
            <a href="#accuracy" className="font-semibold text-accent-text hover:underline">
              Why trust it
            </a>
          </p>
        </div>
        {lead && <StoryCard player={lead} lead />}
      </section>

      <EdgeBand breakouts={breakouts} waivers={waivers} />

      <div className="grid grid-cols-1 items-start gap-8 lg:grid-cols-[minmax(0,2fr)_minmax(0,1fr)]">
        <section aria-labelledby="breakouts" className="flex flex-col gap-4">
          <header className="flex flex-wrap items-end justify-between gap-x-3 gap-y-1 border-b-[3px] border-accent pb-2">
            <h2 id="breakouts" className="text-3xl font-extrabold">
              Breakout watch
            </h2>
            <Link href="/breakouts" className="text-sm font-semibold text-accent-text hover:underline">
              All {breakouts.count} breakout candidates
            </Link>
          </header>
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            {stories.map((p) => (
              <StoryCard key={p.player_id} player={p} />
            ))}
          </div>
        </section>
        <aside className="flex flex-col gap-6 lg:sticky lg:top-6">
          <WaiverSidebar players={waivers.players.slice(0, 8)} total={waivers.count} />
        </aside>
      </div>

      <section id="accuracy" aria-labelledby="accuracy-title" className="flex scroll-mt-6 flex-col gap-5 border-t border-rule pt-8">
        <div className="flex flex-col gap-1">
          <h2 id="accuracy-title" className="text-3xl font-extrabold">
            Why trust it
          </h2>
          <p className="max-w-[62ch] text-ink-2">
            The model is trained on {firstTrain}–{lastTrain} and scored on {count(evaluation.test_rows)}{" "}
            {evaluation.test_season} player-weeks (weeks {weeks[0]}–{weeks[weeks.length - 1]}) it never
            saw. Each prediction uses only games before kickoff, and the 3-week-average baseline is
            scored on exactly the same rows.
          </p>
        </div>
        <div className="grid grid-cols-2 gap-x-5 gap-y-6 lg:grid-cols-4">
          <StatTile
            compact
            emphasis
            label="XGBoost mean absolute error"
            value={metric(metrics.xgboost.mae)}
            unit="pts"
            detail={`${percent(improvement.mae_pct)} lower than the baseline`}
          />
          <StatTile compact label="Baseline mean absolute error" value={metric(metrics.baseline.mae)} unit="pts" detail="3-week rolling average" />
          <StatTile
            compact
            emphasis
            label="XGBoost RMSE"
            value={metric(metrics.xgboost.rmse)}
            unit="pts"
            detail={`${percent(improvement.rmse_pct)} lower; fewer big misses`}
          />
          <StatTile compact label="Baseline RMSE" value={metric(metrics.baseline.rmse)} unit="pts" detail="3-week rolling average" />
        </div>
        <AccuracySection metrics={metrics} />
        <dl className="grid grid-cols-2 gap-x-6 gap-y-4 text-sm sm:grid-cols-3 lg:grid-cols-6">
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
