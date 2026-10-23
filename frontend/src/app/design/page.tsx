import type { Metadata } from "next";
import type { ReactNode } from "react";
import { PageHeader } from "@/components/layout/PageHeader";
import { Button } from "@/components/ui/Button";
import { Delta } from "@/components/ui/Delta";
import { Legend } from "@/components/ui/Legend";
import { Matchup } from "@/components/ui/Matchup";
import { Panel } from "@/components/ui/Panel";
import { PositionBadge } from "@/components/ui/PositionBadge";
import { ScoreBar } from "@/components/ui/ScoreBar";
import { StatTile } from "@/components/ui/StatTile";
import { EmptyState, ErrorState, TableSkeleton } from "@/components/ui/States";
import { Tag } from "@/components/ui/Tag";
import { count, metric, percent, points } from "@/lib/format";
import type { BreakoutsFile, MetaFile, MetricsFile, ProjectionsFile, WaiversFile } from "@/lib/types";
import breakoutsJson from "../../../public/data/breakouts.json";
import metaJson from "../../../public/data/meta.json";
import metricsJson from "../../../public/data/metrics.json";
import projectionsJson from "../../../public/data/projections.json";
import waiversJson from "../../../public/data/waivers.json";
import { ProjectionTableDemo } from "./ProjectionTableDemo";

export const metadata: Metadata = {
  title: "Design system",
  robots: { index: false },
};

const meta = metaJson as MetaFile;
const metrics = metricsJson as MetricsFile;
const projections = projectionsJson as ProjectionsFile;
const breakouts = breakoutsJson as BreakoutsFile;
const waivers = waiversJson as WaiversFile;

const swatches: { token: string; name: string; light: string; dark: string; use: string }[] = [
  { token: "--fog", name: "Chalk", light: "#f4f2ec", dark: "#0b162c", use: "Page background" },
  { token: "--surface", name: "Surface", light: "#ffffff", dark: "#13223f", use: "Panels and tables" },
  { token: "--surface-sunk", name: "Sunk", light: "#eef0f4", dark: "#1a2b4c", use: "Headers, hover, inputs" },
  { token: "--rule", name: "Rule", light: "#d9dde5", dark: "#26385c", use: "Borders and dividers" },
  { token: "--ink", name: "Navy", light: "#0e1c36", dark: "#eef1f7", use: "Primary text" },
  { token: "--ink-2", name: "Ink 2", light: "#3b4a66", dark: "#aeb9cf", use: "Secondary text" },
  { token: "--muted", name: "Muted", light: "#5d6a80", dark: "#8c98b1", use: "Captions" },
  { token: "--accent", name: "Varsity red", light: "#b8122e", dark: "#e8475a", use: "The model, active state, primary action" },
  { token: "--brass", name: "Old gold", light: "#7a5c17", dark: "#d9ae52", use: "Breakout signal only" },
  { token: "--series-baseline", name: "Varsity blue", light: "#2c5aa0", dark: "#5b8fd6", use: "Baseline series in charts" },
];

const typeScale = [
  { cls: "font-display text-5xl font-extrabold", size: "72 / Big Shoulders 800", sample: points(projections.players[0]?.projected_points) },
  { cls: "font-display text-4xl font-extrabold", size: "48 / Big Shoulders 800", sample: "Week " + meta.projection_week + " projections" },
  { cls: "font-display text-3xl font-bold", size: "36 / Big Shoulders 700", sample: "Breakout watch" },
  { cls: "font-display text-2xl font-bold", size: "24 / Big Shoulders 700", sample: "Model vs baseline" },
  { cls: "text-lg font-semibold", size: "18 / 600", sample: "Error by week" },
  { cls: "text-base", size: "16 / Barlow 400", sample: metrics.evaluation.description },
  { cls: "text-sm text-ink-2", size: "14 / 400", sample: "Table body, labels and controls." },
  { cls: "text-xs text-muted", size: "12 / 400", sample: "Captions and footnotes." },
];

const spacing = [4, 8, 12, 16, 24, 32, 48, 64];

function Section({ title, note, children }: { title: string; note?: string; children: ReactNode }) {
  return (
    <section className="flex flex-col gap-4 border-t border-rule pt-8">
      <div className="flex flex-col gap-1">
        <h2 className="text-3xl font-extrabold">{title}</h2>
        {note && <p className="max-w-[62ch] text-sm text-ink-2">{note}</p>}
      </div>
      {children}
    </section>
  );
}

export default function DesignPage() {
  const topBreakout = breakouts.players[0];
  const topWaiver = waivers.players[0];
  const bye = projections.players.find((p) => p.on_bye);
  const home = projections.players.find((p) => p.home === true);
  const away = projections.players.find((p) => p.home === false);

  return (
    <div className="flex flex-col gap-12">
      <PageHeader
        title="Design system"
        description="Tokens and components for the FourthDown site. Every number on this page is read from the precompute output, the same files the live pages use."
        freshness={{
          season: meta.season,
          dataThroughWeek: meta.data_through_week,
          projectionWeek: meta.projection_week,
          generatedAt: meta.generated_at,
        }}
      />

      <Section
        title="Color"
        note="Varsity navy and red. Red marks the model and anything active; old gold is reserved for breakout signals; varsity blue appears only as the baseline series. Use the toggle in the header to check the dark set."
      >
        <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
          {swatches.map((s) => (
            <li key={s.token} className="overflow-hidden rounded-md border border-rule bg-surface">
              <div className="h-14 border-b border-rule" style={{ background: `var(${s.token})` }} />
              <div className="flex flex-col gap-0.5 p-2.5">
                <span className="text-sm font-semibold">{s.name}</span>
                <span className="text-xs text-muted tabular">
                  {s.light} / {s.dark}
                </span>
                <span className="text-xs text-ink-2">{s.use}</span>
              </div>
            </li>
          ))}
        </ul>
      </Section>

      <Section
        title="Type"
        note="Big Shoulders Display, a stadium-signage face, carries headlines and stat numerals; Barlow carries reading text; Graduate's varsity lettering is reserved for the wordmark. Table figures are tabular so columns of numbers align."
      >
        <div className="flex flex-col divide-y divide-rule rounded-lg border border-rule bg-surface">
          {typeScale.map((t) => (
            <div key={t.size} className="grid gap-1 px-4 py-4 sm:grid-cols-[180px_1fr] sm:items-baseline sm:gap-6">
              <span className="text-xs text-muted tabular">{t.size}</span>
              <span className={`${t.cls} tabular max-w-[68ch]`}>{t.sample}</span>
            </div>
          ))}
        </div>
      </Section>

      <Section title="Spacing" note="A 4px base. Components use 8 to 24; page sections use 32 to 64.">
        <div className="flex flex-wrap items-end gap-6 rounded-lg border border-rule bg-surface p-4">
          {spacing.map((s) => (
            <div key={s} className="flex flex-col items-center gap-2">
              <div className="bg-accent-soft" style={{ width: s, height: s }}>
                <div className="h-full w-full border border-accent/40" />
              </div>
              <span className="text-xs text-muted tabular">{s}</span>
            </div>
          ))}
        </div>
      </Section>

      <Section
        title="Stat tiles"
        note={`Held-out ${metrics.evaluation.test_season} evaluation, ${count(metrics.evaluation.test_rows)} player-weeks. The model tile carries the accent rule; comparisons stay quiet.`}
      >
        <div className="grid gap-x-8 gap-y-8 sm:grid-cols-2 lg:grid-cols-4">
          <StatTile
            emphasis
            label="XGBoost mean absolute error"
            value={metric(metrics.xgboost.mae)}
            unit="pts"
            detail={`${percent(metrics.improvement.mae_pct)} lower than the baseline`}
          />
          <StatTile label="Baseline mean absolute error" value={metric(metrics.baseline.mae)} unit="pts" detail="3-week rolling average" />
          <StatTile
            emphasis
            label="XGBoost RMSE"
            value={metric(metrics.xgboost.rmse)}
            unit="pts"
            detail={`${percent(metrics.improvement.rmse_pct)} lower than the baseline`}
          />
          <StatTile label="Baseline RMSE" value={metric(metrics.baseline.rmse)} unit="pts" detail="3-week rolling average" />
        </div>
      </Section>

      <Section title="Player details" note="Position badges are neutral on purpose: position is identity, not a color-coded series.">
        <div className="grid gap-4 lg:grid-cols-2">
          <Panel title="Badges, tags and matchups">
            <dl className="grid grid-cols-[140px_1fr] items-center gap-x-4 gap-y-3 text-sm">
              <dt className="text-ink-2">Positions</dt>
              <dd className="flex gap-2">
                <PositionBadge position="RB" />
                <PositionBadge position="WR" />
                <PositionBadge position="TE" />
              </dd>
              <dt className="text-ink-2">Tags</dt>
              <dd className="flex flex-wrap gap-2">
                <Tag tone="brass">Breakout</Tag>
                <Tag tone="accent">Top projection</Tag>
                <Tag>Week {meta.data_through_week} data</Tag>
                <Tag tone="muted">Bye</Tag>
              </dd>
              {home && (
                <>
                  <dt className="text-ink-2">Home game</dt>
                  <dd>
                    {home.name} <Matchup opponent={home.opponent} home={home.home} onBye={home.on_bye} />
                  </dd>
                </>
              )}
              {away && (
                <>
                  <dt className="text-ink-2">Away game</dt>
                  <dd>
                    {away.name} <Matchup opponent={away.opponent} home={away.home} onBye={away.on_bye} />
                  </dd>
                </>
              )}
              {bye && (
                <>
                  <dt className="text-ink-2">On bye</dt>
                  <dd>
                    {bye.name} <Matchup opponent={bye.opponent} home={bye.home} onBye={bye.on_bye} />
                  </dd>
                </>
              )}
            </dl>
          </Panel>
          <Panel title="Scores and change" description="Score bars run 0 to 100 with a tick every 10 and midfield at 50.">
            <div className="flex flex-col gap-4 text-sm">
              {topBreakout && (
                <div className="grid items-center gap-2 sm:grid-cols-[1fr_minmax(140px,220px)] sm:gap-4">
                  <span>
                    <span className="font-medium">{topBreakout.name}</span>{" "}
                    <span className="text-muted">breakout score</span>
                  </span>
                  <ScoreBar value={topBreakout.breakout_score} tone="brass" label={`${topBreakout.name} breakout score`} />
                </div>
              )}
              {topWaiver && (
                <div className="grid items-center gap-2 sm:grid-cols-[1fr_minmax(140px,220px)] sm:gap-4">
                  <span>
                    <span className="font-medium">{topWaiver.name}</span>{" "}
                    <span className="text-muted">waiver score</span>
                  </span>
                  <ScoreBar value={topWaiver.waiver_score} label={`${topWaiver.name} waiver score`} />
                </div>
              )}
              {topBreakout && (
                <div className="grid grid-cols-[1fr_auto] items-center gap-4">
                  <span className="text-ink-2">Projection vs 3-week average</span>
                  <span className="flex gap-4">
                    <Delta value={topBreakout.projection_gain} />
                    <Delta value={-1.2} />
                  </span>
                </div>
              )}
            </div>
          </Panel>
        </div>
      </Section>

      <Section title="Controls">
        <div className="flex flex-wrap items-center gap-3">
          <Button variant="primary">Refresh data</Button>
          <Button>Show all players</Button>
          <Button variant="ghost">Clear filters</Button>
          <Button disabled>Unavailable</Button>
        </div>
      </Section>

      <Section
        title="Data table"
        note="Sortable headers, right-aligned tabular numbers, sticky header. Columns drop away on narrow screens instead of scrolling sideways. Showing the top 12 of the week's projections."
      >
        <ProjectionTableDemo players={projections.players} />
      </Section>

      <Section
        title="Chart series"
        note="Charts compare two series. The colors passed a colorblind-separation and contrast check in both themes, and every chart ships with a legend and direct labels."
      >
        <Panel>
          <div className="flex flex-col gap-4">
            <Legend
              items={[
                { label: "XGBoost", color: "var(--series-model)" },
                { label: "3-week average baseline", color: "var(--series-baseline)" },
              ]}
            />
            <div className="flex flex-col gap-2 text-sm">
              {[
                { label: "XGBoost", value: metrics.xgboost.mae, color: "var(--series-model)" },
                { label: "Baseline", value: metrics.baseline.mae, color: "var(--series-baseline)" },
              ].map((bar) => (
                <div key={bar.label} className="grid grid-cols-[72px_1fr_48px] items-center gap-3">
                  <span className="text-ink-2">{bar.label}</span>
                  <div className="h-4 rounded-r-[4px]" style={{ width: `${(bar.value / metrics.baseline.mae) * 100}%`, background: bar.color }} />
                  <span className="text-right font-semibold tabular">{metric(bar.value)}</span>
                </div>
              ))}
              <p className="text-xs text-muted">Mean absolute error, points. Lower is better.</p>
            </div>
          </div>
        </Panel>
      </Section>

      <Section title="Loading, empty and error" note="Placeholders keep the layout steady; empty and error states say what happened and what to do next.">
        <div className="grid gap-4 lg:grid-cols-3">
          <TableSkeleton rows={4} />
          <EmptyState as="h3" title="No players match these filters" action={<Button>Clear filters</Button>}>
            Try a different position or lower the minimum projection.
          </EmptyState>
          <ErrorState as="h3" title="Projections didn't load" action={<Button>Try again</Button>}>
            The data file couldn&apos;t be reached. Check your connection and try again.
          </ErrorState>
        </div>
      </Section>
    </div>
  );
}
