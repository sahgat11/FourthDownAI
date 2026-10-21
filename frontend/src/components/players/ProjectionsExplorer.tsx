"use client";

import { DataTable, type Column } from "@/components/ui/DataTable";
import { Delta } from "@/components/ui/Delta";
import { Matchup } from "@/components/ui/Matchup";
import { Button } from "@/components/ui/Button";
import { EmptyState } from "@/components/ui/States";
import { Tag } from "@/components/ui/Tag";
import { points, share } from "@/lib/format";
import type { PlayerRecord } from "@/lib/types";
import { FilterBar } from "./FilterBar";
import { PlayerCell, positionRank } from "./PlayerCell";
import { usePlayerFilter } from "./usePlayerFilter";

const diff = (p: PlayerRecord) =>
  p.on_bye || p.recent_avg == null ? null : p.projected_points - p.recent_avg;

const columns: Column<PlayerRecord>[] = [
  {
    key: "player",
    header: "Player",
    render: (p) => <PlayerCell player={p} />,
    sortValue: (p) => p.name,
    defaultDirection: "asc",
  },
  { key: "team", header: "Team", render: (p) => p.team, sortValue: (p) => p.team, defaultDirection: "asc", hideBelow: "md" },
  {
    key: "matchup",
    header: "Matchup",
    render: (p) => <Matchup opponent={p.opponent} home={p.home} onBye={p.on_bye} />,
    hideBelow: "md",
  },
  {
    key: "proj",
    header: "Projected points",
    shortHeader: "Proj",
    align: "right",
    render: (p) =>
      p.on_bye ? (
        <Tag tone="muted">Bye</Tag>
      ) : (
        <span className="font-semibold text-ink">{points(p.projected_points)}</span>
      ),
    // Byes sort last: they have no game to project.
    sortValue: (p) => (p.on_bye ? null : p.projected_points),
  },
  {
    key: "rank",
    header: "Position rank",
    shortHeader: "Pos rank",
    align: "right",
    render: (p) => <span className="text-ink-2">{positionRank(p)}</span>,
    sortValue: (p) => p.position_rank,
    defaultDirection: "asc",
    hideBelow: "sm",
  },
  {
    key: "avg",
    header: "3-week average",
    shortHeader: "3-wk avg",
    align: "right",
    render: (p) => <span className="text-ink-2">{points(p.recent_avg)}</span>,
    sortValue: (p) => p.recent_avg,
    hideBelow: "sm",
  },
  {
    key: "diff",
    header: "Projection minus 3-week average",
    shortHeader: "vs avg",
    align: "right",
    render: (p) => <Delta value={diff(p)} />,
    sortValue: diff,
    hideBelow: "md",
  },
  {
    key: "last",
    header: "Points last game",
    shortHeader: "Last",
    align: "right",
    render: (p) => <span className="text-ink-2">{points(p.last_week_points)}</span>,
    sortValue: (p) => p.last_week_points,
    hideBelow: "lg",
  },
  {
    key: "opps",
    header: "Carries plus targets per game (3-week average)",
    shortHeader: "Touches",
    align: "right",
    render: (p) => <span className="text-ink-2">{points(p.usage.opportunities_avg_3)}</span>,
    sortValue: (p) => p.usage.opportunities_avg_3,
    hideBelow: "lg",
  },
  {
    key: "share",
    header: "Target share (3-week average)",
    shortHeader: "Tgt share",
    align: "right",
    render: (p) => <span className="text-ink-2">{share(p.usage.target_share_avg_3)}</span>,
    sortValue: (p) => p.usage.target_share_avg_3,
    hideBelow: "lg",
  },
];

export function ProjectionsExplorer({ players }: { players: PlayerRecord[] }) {
  const f = usePlayerFilter(players);
  return (
    <div className="flex flex-col gap-4">
      <FilterBar
        position={f.position}
        onPosition={f.setPosition}
        query={f.query}
        onQuery={f.setQuery}
        hideByes={f.hideByes}
        onHideByes={f.setHideByes}
        shown={f.rows.length}
        total={players.length}
      />
      {f.rows.length ? (
        <DataTable
          caption="Projected PPR points for next week"
          columns={columns}
          rows={f.rows}
          rowKey={(p) => p.player_id}
          initialSort={{ key: "proj", direction: "desc" }}
          rankColumn
        />
      ) : (
        <EmptyState title="No players match these filters" action={<Button onClick={f.reset}>Clear filters</Button>}>
          Try another position or a shorter search.
        </EmptyState>
      )}
    </div>
  );
}
