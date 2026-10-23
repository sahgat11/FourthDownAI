import type { Metadata } from "next";
import { PageHeader } from "@/components/layout/PageHeader";
import { WaiversView } from "@/components/data/PlayerViews";
import { freshness, meta, waivers } from "@/lib/data";
import { points } from "@/lib/format";

export const metadata: Metadata = {
  title: "Waiver targets",
  description: `Likely-available RB, WR and TE pickups ranked for week ${meta.projection_week}.`,
};

export default function WaiversPage() {
  const { availability, criteria } = waivers;
  const w = criteria.weights;
  const cutoffs = availability.rostered_cutoffs;
  return (
    <>
      <PageHeader
        title="Waiver targets"
        freshness={freshness}
        description={
          <p>
            Players likely sitting on waivers in a typical 12-team league, ranked by how much they
            should help in week {meta.projection_week} and beyond.
          </p>
        }
      >
        <aside className="max-w-[62ch] rounded-md border border-rule bg-surface px-4 py-3 text-sm text-ink-2">
          <span className="font-semibold text-ink">Availability is estimated.</span> No league is
          connected, so the top {cutoffs.RB} running backs, {cutoffs.WR} receivers and {cutoffs.TE}{" "}
          tight ends by season points are treated as rostered and left out. Check your own
          league&apos;s wire before claiming.
        </aside>
      </PageHeader>
      <WaiversView />
      <section className="mt-8 grid gap-6 border-t border-rule pt-8 md:grid-cols-[1fr_2fr]">
        <h2 className="text-lg font-semibold">How the score works</h2>
        <div className="flex max-w-[62ch] flex-col gap-3 text-sm text-ink-2">
          <p>
            Among players projected for at least {points(criteria.min_projected_points)} points
            who played in the last two weeks, the score blends their projection rank (
            {Math.round(w.projection * 100)}%), their 3-week average rank ({Math.round(w.recent * 100)}%)
            and their breakout score ({Math.round(w.breakout * 100)}%).
          </p>
          <p>
            Players tagged Breakout also appear on the Breakout watch page. Players on bye stay on
            the list because a pickup is for the weeks ahead; their projection is for their next
            game.
          </p>
        </div>
      </section>
    </>
  );
}
