import { Matchup } from "@/components/ui/Matchup";
import { PositionBadge } from "@/components/ui/PositionBadge";
import type { PlayerRecord } from "@/lib/types";

/**
 * Name + position, with team and matchup underneath on narrow screens
 * (where the Team and Matchup columns are hidden).
 */
export function PlayerCell({ player, children }: { player: PlayerRecord; children?: React.ReactNode }) {
  return (
    <span className="flex items-center gap-2.5">
      <PositionBadge position={player.position} />
      <span className="flex min-w-0 flex-col">
        <span className="flex flex-wrap items-center gap-x-2 gap-y-0.5">
          <span className="font-medium text-ink">{player.name}</span>
          {children}
        </span>
        <span className="flex items-center gap-1.5 text-xs text-muted md:hidden">
          <span>{player.team}</span>
          <Matchup opponent={player.opponent} home={player.home} onBye={player.on_bye} />
        </span>
      </span>
    </span>
  );
}

/** "WR4" style rank, or nothing for bye weeks. */
export function positionRank(player: PlayerRecord): string {
  return player.position_rank == null ? "–" : `${player.position}${player.position_rank}`;
}
