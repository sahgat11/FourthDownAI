"use client";

import { use } from "react";
import Link from "next/link";
import { BreakoutsTable } from "@/components/players/BreakoutsTable";
import { ProjectionsExplorer } from "@/components/players/ProjectionsExplorer";
import { WaiversTable } from "@/components/players/WaiversTable";
import { EmptyState } from "@/components/ui/States";
import { loadDataFile } from "@/lib/fetchData";
import { DataBoundary } from "./DataBoundary";
import { PlayerTableSkeleton } from "./PlayerTableSkeleton";

const linkClass = "text-sm font-medium text-accent-text hover:underline";

function ProjectionsLoaded() {
  const data = use(loadDataFile("projections.json"));
  if (!data.players.length) {
    return (
      <EmptyState title="No projections yet">
        Projections appear once the season&apos;s first week has been played and the data
        refreshes.
      </EmptyState>
    );
  }
  return <ProjectionsExplorer players={data.players} />;
}

function BreakoutsLoaded() {
  const data = use(loadDataFile("breakouts.json"));
  if (!data.players.length) {
    return (
      <EmptyState
        title="No breakout candidates this week"
        action={<Link href="/projections" className={linkClass}>Browse all projections</Link>}
      >
        Nobody&apos;s week {data.projection_week} projection beat their 3-week average by{" "}
        {data.criteria.min_projection_gain} points or more.
      </EmptyState>
    );
  }
  return <BreakoutsTable players={data.players} />;
}

function WaiversLoaded() {
  const data = use(loadDataFile("waivers.json"));
  if (!data.players.length) {
    return (
      <EmptyState
        title="No waiver targets this week"
        action={<Link href="/projections" className={linkClass}>Browse all projections</Link>}
      >
        No likely-available player is projected for {data.criteria.min_projected_points} points
        or more.
      </EmptyState>
    );
  }
  return <WaiversTable players={data.players} showAdds={data.availability.sleeper_trending} />;
}

export function ProjectionsView() {
  return (
    <DataBoundary file="projections.json" what="Projections" fallback={<PlayerTableSkeleton label="Loading projections…" />}>
      <ProjectionsLoaded />
    </DataBoundary>
  );
}

export function BreakoutsView() {
  return (
    <DataBoundary file="breakouts.json" what="Breakout candidates" fallback={<PlayerTableSkeleton label="Loading breakout candidates…" search={false} />}>
      <BreakoutsLoaded />
    </DataBoundary>
  );
}

export function WaiversView() {
  return (
    <DataBoundary file="waivers.json" what="Waiver targets" fallback={<PlayerTableSkeleton label="Loading waiver targets…" />}>
      <WaiversLoaded />
    </DataBoundary>
  );
}
