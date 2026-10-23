import type { Metadata } from "next";
import { PageHeader } from "@/components/layout/PageHeader";
import { BreakoutsView } from "@/components/data/PlayerViews";
import { breakouts, freshness, meta } from "@/lib/data";
import { points } from "@/lib/format";

export const metadata: Metadata = {
  title: "Breakout watch",
  description: `Players projected to beat their recent production in week ${meta.projection_week}.`,
};

export default function BreakoutsPage() {
  const { criteria } = breakouts;
  const w = criteria.weights;
  return (
    <>
      <PageHeader
        title="Breakout watch"
        freshness={freshness}
        description={
          <p>
            Players whose week {meta.projection_week} projection is at least{" "}
            {points(criteria.min_projection_gain)} points above their 3-week average and at least{" "}
            {points(criteria.min_projected_points)} points overall. Usually that means their role
            is growing faster than their box scores show.
          </p>
        }
      />
      <BreakoutsView />
      <section className="mt-8 grid gap-6 border-t border-rule pt-8 md:grid-cols-[1fr_2fr]">
        <h2 className="text-2xl font-extrabold">How the score works</h2>
        <div className="flex max-w-[62ch] flex-col gap-3 text-sm text-ink-2">
          <p>
            Each candidate is compared with others at the same position. The score blends four
            percentile ranks: projected gain over the 3-week average ({Math.round(w.gain * 100)}%),
            growth in carries plus targets from the previous game ({Math.round(w.opportunity * 100)}%),
            the projection itself ({Math.round(w.projection * 100)}%) and growth in target share (
            {Math.round(w.target_share * 100)}%).
          </p>
          <p>
            A 90 means a player ranks near the top of his position on most of those signals. It
            isn&apos;t a probability.
          </p>
          <p>
            Players on bye stay on the list because the trend carries past this week; their
            projection is for their next game.
          </p>
        </div>
      </section>
    </>
  );
}
