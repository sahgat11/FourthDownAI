import type { ReactNode } from "react";
import { updatedAt } from "@/lib/format";

export interface Freshness {
  season: number;
  dataThroughWeek: number;
  projectionWeek: number;
  generatedAt: string;
}

export function PageHeader({
  title,
  description,
  freshness,
  children,
}: {
  title: string;
  description?: ReactNode;
  freshness?: Freshness;
  children?: ReactNode;
}) {
  return (
    <div className="flex flex-col gap-4 pb-6 sm:pb-8">
      {freshness && (
        <p className="text-sm text-ink-2">
          <span className="font-semibold text-ink">
            {freshness.season} season, week {freshness.projectionWeek}
          </span>{" "}
          <span className="text-muted">
            projections from data through week {freshness.dataThroughWeek}. Updated{" "}
            <time dateTime={freshness.generatedAt}>{updatedAt(freshness.generatedAt)}</time>.
          </span>
        </p>
      )}
      <h1 className="font-display text-4xl font-extrabold text-balance sm:text-5xl">{title}</h1>
      {description && <div className="max-w-[62ch] text-base text-ink-2">{description}</div>}
      {children}
    </div>
  );
}
