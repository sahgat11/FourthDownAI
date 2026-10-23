"use client";

import { DataTable, type Column } from "@/components/ui/DataTable";
import { Matchup } from "@/components/ui/Matchup";
import { ScoreBar } from "@/components/ui/ScoreBar";
import { Button } from "@/components/ui/Button";
import { EmptyState } from "@/components/ui/States";
import { Tag } from "@/components/ui/Tag";
import { count, points } from "@/lib/format";
import type { WaiverPlayer } from "@/lib/types";
import { FilterBar } from "./FilterBar";
import { PlayerCell, positionRank } from "./PlayerCell";
import { usePlayerFilter } from "./usePlayerFilter";

function buildColumns(showAdds: boolean): Column<WaiverPlayer>[] {
  const columns: Column<WaiverPlayer>[] = [
    {
      key: "player",
      header: "Player",
      render: (p) => (
        <PlayerCell player={p}>
          {p.is_breakout && <Tag tone="brass">Breakout</Tag>}
        </PlayerCell>
      ),
      sortValue: (p) => p.name,
      defaultDirection: "asc",
    },
    {
      key: "matchup",
      header: "Matchup",
      render: (p) => <Matchup opponent={p.opponent} home={p.home} onBye={p.on_bye} />,
      hideBelow: "md",
    },
    {
      key: "score",
      header: "Waiver score",
      render: (p) => <ScoreBar value={p.waiver_score} label={`${p.name} waiver score`} className="min-w-24 sm:min-w-40" />,
      sortValue: (p) => p.waiver_score,
    },
    {
      key: "proj",
      header: "Projected points",
      shortHeader: "Proj",
      align: "right",
      render: (p) => <span className="font-semibold text-ink">{points(p.projected_points)}</span>,
      sortValue: (p) => p.projected_points,
    },
    {
      key: "rank",
      header: "Position rank this week",
      shortHeader: "Pos rank",
      align: "right",
      render: (p) => <span className="text-ink-2">{positionRank(p)}</span>,
      sortValue: (p) => p.position_rank,
      defaultDirection: "asc",
      hideBelow: "md",
    },
    {
      key: "avg",
      header: "3-week average",
      shortHeader: "3-wk avg",
      align: "right",
      render: (p) => <span className="text-ink-2">{points(p.recent_avg)}</span>,
      sortValue: (p) => p.recent_avg,
      hideBelow: "lg",
    },
    {
      key: "season",
      header: "Season PPR points",
      shortHeader: "Season pts",
      align: "right",
      render: (p) => <span className="text-ink-2">{points(p.season_ppr)}</span>,
      sortValue: (p) => p.season_ppr,
      hideBelow: "lg",
    },
  ];
  if (showAdds) {
    columns.push({
      key: "adds",
      header: "Sleeper adds, last 48 hours",
      shortHeader: "Adds 48h",
      align: "right",
      render: (p) => <span className="text-ink-2">{count(p.sleeper_adds_48h)}</span>,
      sortValue: (p) => p.sleeper_adds_48h,
      hideBelow: "lg",
    });
  }
  return columns;
}

export function WaiversTable({ players, showAdds }: { players: WaiverPlayer[]; showAdds: boolean }) {
  const f = usePlayerFilter(players);
  return (
    <div className="flex flex-col gap-4">
      <FilterBar
        position={f.position}
        onPosition={f.setPosition}
        query={f.query}
        onQuery={f.setQuery}
        shown={f.rows.length}
        total={players.length}
        noun="targets"
      />
      {f.rows.length ? (
        <DataTable
          caption="Waiver targets"
          columns={buildColumns(showAdds)}
          rows={f.rows}
          rowKey={(p) => p.player_id}
          initialSort={{ key: "score", direction: "desc" }}
          rankColumn
        />
      ) : (
        <EmptyState title="No waiver targets match" action={<Button onClick={f.reset}>Clear filters</Button>}>
          Try another position or a shorter search.
        </EmptyState>
      )}
    </div>
  );
}
