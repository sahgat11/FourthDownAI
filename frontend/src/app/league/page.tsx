import type { Metadata } from "next";
import { Suspense } from "react";
import { PageHeader } from "@/components/layout/PageHeader";
import { LeagueView } from "@/components/league/LeagueView";
import { freshness, meta } from "@/lib/data";

export const metadata: Metadata = {
  title: "Your league",
  description: "Connect a Sleeper league for real waiver availability and add/drop recommendations.",
};

export default function LeaguePage() {
  return (
    <>
      <PageHeader
        title="Your league"
        freshness={freshness}
        description={
          <p>
            Connect your Sleeper league to see who&apos;s actually available on your wire and which add/drop moves would most
            improve your starting lineup this week.
          </p>
        }
      />
      <Suspense>
        <LeagueView season={meta.season} completedWeek={meta.data_through_week} projectionWeek={meta.projection_week} />
      </Suspense>
    </>
  );
}
