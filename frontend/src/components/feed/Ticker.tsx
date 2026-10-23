import { positionRank } from "@/components/players/PlayerCell";
import { points } from "@/lib/format";
import type { PlayerRecord } from "@/lib/types";

/** Scoreboard-style strip of the week's top projections. */
export function Ticker({ players, week }: { players: PlayerRecord[]; week: number }) {
  return (
    <section aria-label={`Week ${week} top projections`} className="relative -mx-4 sm:mx-0">
      {/* Focusable so keyboard users can scroll it with the arrow keys. */}
      <div
        tabIndex={0}
        className="flex items-stretch overflow-x-auto border-y border-rule bg-surface sm:rounded-lg sm:border"
      >
        <p className="sticky left-0 z-10 flex shrink-0 flex-col justify-center border-r border-rule bg-header px-4 py-2 font-display leading-none font-bold text-header-ink uppercase">
          <span className="text-xs tracking-wider text-header-ink-2">Week {week}</span>
          <span className="text-lg">Top projections</span>
        </p>
        <ol className="flex">
          {players.map((p, i) => (
            <li key={p.player_id} className="flex shrink-0 flex-col justify-center gap-0.5 border-r border-rule px-4 py-2 last:border-r-0">
              <span className="flex items-center gap-1.5 text-xs text-muted">
                <span className="font-display font-bold text-ink-2">{i + 1}</span>
                {positionRank(p)}
                <span>{p.home ? "vs" : "at"} {p.opponent}</span>
              </span>
              <span className="flex items-baseline gap-2 whitespace-nowrap">
                <span className="text-sm font-semibold text-ink">{p.name}</span>
                <span className="font-display text-lg font-extrabold text-accent-text tabular">{points(p.projected_points)}</span>
              </span>
            </li>
          ))}
        </ol>
      </div>
    </section>
  );
}
