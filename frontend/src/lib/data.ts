// Build-time access to the precompute output (frontend/public/data).
// Server components import from here; Milestone 4 adds client fetching.

import type {
  BreakoutsFile,
  MetaFile,
  MetricsFile,
  ProjectionsFile,
  WaiversFile,
} from "./types";
import breakoutsJson from "../../public/data/breakouts.json";
import metaJson from "../../public/data/meta.json";
import metricsJson from "../../public/data/metrics.json";
import projectionsJson from "../../public/data/projections.json";
import waiversJson from "../../public/data/waivers.json";
import type { Freshness } from "@/components/layout/PageHeader";

export const meta = metaJson as MetaFile;
export const metrics = metricsJson as MetricsFile;
export const projections = projectionsJson as ProjectionsFile;
export const breakouts = breakoutsJson as BreakoutsFile;
export const waivers = waiversJson as WaiversFile;

export const freshness: Freshness = {
  season: meta.season,
  dataThroughWeek: meta.data_through_week,
  projectionWeek: meta.projection_week,
  generatedAt: meta.generated_at,
};
