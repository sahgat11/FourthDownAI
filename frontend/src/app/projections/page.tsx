import type { Metadata } from "next";
import { PageHeader } from "@/components/layout/PageHeader";
import { ProjectionsExplorer } from "@/components/players/ProjectionsExplorer";
import { freshness, meta, projections } from "@/lib/data";

export const metadata: Metadata = {
  title: `Week ${meta.projection_week} projections`,
  description: `Projected PPR points for every active RB, WR and TE in week ${meta.projection_week}.`,
};

export default function ProjectionsPage() {
  return (
    <>
      <PageHeader
        title={`Week ${meta.projection_week} projections`}
        freshness={freshness}
        description={
          <p>
            Projected PPR points for every running back, receiver and tight end who played in
            the last two weeks. Players on bye are listed but have no projection.
          </p>
        }
      />
      <ProjectionsExplorer players={projections.players} />
    </>
  );
}
