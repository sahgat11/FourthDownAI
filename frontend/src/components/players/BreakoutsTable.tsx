"use client";

import { DataTable, type Column } from "@/components/ui/DataTable";
import { Delta } from "@/components/ui/Delta";
import { Matchup } from "@/components/ui/Matchup";
import { ScoreBar } from "@/components/ui/ScoreBar";
import { Button } from "@/components/ui/Button";
import { EmptyState } from "@/components/ui/States";
import { points } from "@/lib/format";
import type { BreakoutPlayer } from "@/lib/types";
import { FilterBar } from "./FilterBar";
import { PlayerCell } from "./PlayerCell";
import { usePlayerFilter } from "./usePlayerFilter";

const shareChange = (v: number) => (v * 100).toFixed(1);
const wholeChange = (v: number) => v.toFixed(0);

const columns: Column<BreakoutPlayer>[] = [
  {
    key: "player",
    header: "Player",
    render: (p) => <PlayerCell player={p} />,
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
    header: "Breakout score",
    render: (p) => <ScoreBar value={p.breakout_score} tone="brass" label={`${p.name} breakout score`} className="min-w-24 sm:min-w-40" />,
    sortValue: (p) => p.breakout_score,
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
    key: "avg",
    header: "3-week average",
    shortHeader: "3-wk avg",
    align: "right",
    render: (p) => <span className="text-ink-2">{points(p.recent_avg)}</span>,
    sortValue: (p) => p.recent_avg,
    hideBelow: "md",
  },
  {
    key: "gain",
    header: "Projected gain over 3-week average",
    shortHeader: "Gain",
    align: "right",
    render: (p) => <Delta value={p.projection_gain} />,
    sortValue: (p) => p.projection_gain,
    hideBelow: "sm",
  },
  {
    key: "opp",
    header: "Change in carries plus targets from the previous game",
    shortHeader: "Touches chg",
    align: "right",
    render: (p) => <Delta value={p.opportunity_change} format={wholeChange} />,
    sortValue: (p) => p.opportunity_change,
    hideBelow: "lg",
  },
  {
    key: "ts",
    header: "Change in target share from the previous game, percentage points",
    shortHeader: "Tgt share chg",
    align: "right",
    render: (p) => <Delta value={p.target_share_change} format={shareChange} />,
    sortValue: (p) => p.target_share_change,
    hideBelow: "lg",
  },
];

export function BreakoutsTable({ players }: { players: BreakoutPlayer[] }) {
  const f = usePlayerFilter(players);
  return (
    <div className="flex flex-col gap-4">
      <FilterBar position={f.position} onPosition={f.setPosition} shown={f.rows.length} total={players.length} noun="candidates" />
      {f.rows.length ? (
        <DataTable
          caption="Breakout candidates"
          columns={columns}
          rows={f.rows}
          rowKey={(p) => p.player_id}
          initialSort={{ key: "score", direction: "desc" }}
          rankColumn
          maxHeight="none"
        />
      ) : (
        <EmptyState title="No breakout candidates at this position" action={<Button onClick={f.reset}>Show all positions</Button>}>
          No one at this position cleared the breakout criteria this week.
        </EmptyState>
      )}
    </div>
  );
}
