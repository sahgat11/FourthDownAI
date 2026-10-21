"use client";

import { useState } from "react";
import { DataTable, type Column } from "@/components/ui/DataTable";
import { Matchup } from "@/components/ui/Matchup";
import { PositionBadge } from "@/components/ui/PositionBadge";
import { SegmentedControl } from "@/components/ui/SegmentedControl";
import { Delta } from "@/components/ui/Delta";
import { points, share } from "@/lib/format";
import type { PlayerRecord, Position } from "@/lib/types";

type Filter = "ALL" | Position;

const columns: Column<PlayerRecord>[] = [
  {
    key: "name",
    header: "Player",
    render: (p) => (
      <span className="flex items-center gap-2.5">
        <PositionBadge position={p.position} />
        <span className="flex flex-col">
          <span className="font-medium text-ink">{p.name}</span>
          <span className="flex items-center gap-1.5 text-xs text-muted md:hidden">
            <span className="sm:hidden">{p.team}</span>
            <Matchup opponent={p.opponent} home={p.home} onBye={p.on_bye} />
          </span>
        </span>
      </span>
    ),
    sortValue: (p) => p.name,
    defaultDirection: "asc",
  },
  { key: "team", header: "Team", render: (p) => p.team, sortValue: (p) => p.team, defaultDirection: "asc", hideBelow: "sm" },
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
    hideBelow: "sm",
  },
  {
    key: "diff",
    header: "Projection minus 3-week average",
    shortHeader: "vs avg",
    align: "right",
    render: (p) => <Delta value={p.recent_avg == null ? null : p.projected_points - p.recent_avg} />,
    sortValue: (p) => (p.recent_avg == null ? null : p.projected_points - p.recent_avg),
    hideBelow: "md",
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

export function ProjectionTableDemo({ players }: { players: PlayerRecord[] }) {
  const [filter, setFilter] = useState<Filter>("ALL");
  const rows = (filter === "ALL" ? players : players.filter((p) => p.position === filter)).slice(0, 12);

  return (
    <div className="flex flex-col gap-3">
      <SegmentedControl<Filter>
        label="Position"
        value={filter}
        onChange={setFilter}
        options={[
          { value: "ALL", label: "All" },
          { value: "RB", label: "RB" },
          { value: "WR", label: "WR" },
          { value: "TE", label: "TE" },
        ]}
      />
      <DataTable
        caption="Top projected players"
        columns={columns}
        rows={rows}
        rowKey={(p) => p.player_id}
        initialSort={{ key: "proj", direction: "desc" }}
        rankColumn
        maxHeight="none"
      />
    </div>
  );
}
