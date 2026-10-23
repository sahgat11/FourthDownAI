"use client";

import { PlayerAvatar } from "@/components/feed/PlayerAvatar";
import { DataTable, type Column } from "@/components/ui/DataTable";
import { Matchup } from "@/components/ui/Matchup";
import { ScoreBar } from "@/components/ui/ScoreBar";
import { Tag } from "@/components/ui/Tag";
import { points } from "@/lib/format";
import type { LeagueWaiver, TeamRow } from "@/lib/league/engine";

const SKILL = new Set(["RB", "WR", "TE"]);

function Player({ name, position, team, headshot }: { name: string; position: string; team: string; headshot: string | null }) {
  return (
    <span className="flex items-center gap-2.5">
      <PlayerAvatar player={{ name, headshot_url: headshot }} size={32} />
      <span className="flex min-w-0 flex-col">
        <span data-player-name className="font-medium text-ink">
          {name}
        </span>
        <span className="text-xs text-muted">
          {position} {team}
        </span>
      </span>
    </span>
  );
}

const rosterColumns: Column<TeamRow>[] = [
  {
    key: "slot",
    header: "Slot",
    render: (r) => (
      <span className={r.status === "Starter" ? "font-display font-bold text-ink" : "font-display text-muted"}>{r.slot}</span>
    ),
  },
  {
    key: "player",
    header: "Player",
    render: (r) => <Player name={r.name} position={r.position} team={r.team} headshot={r.projection?.headshot_url ?? null} />,
  },
  {
    key: "matchup",
    header: "Matchup",
    // Byes are shown once, in the projection column.
    render: (r) =>
      r.projection && !r.on_bye ? (
        <Matchup opponent={r.projection.opponent} home={r.projection.home} onBye={false} />
      ) : (
        <span className="text-muted">–</span>
      ),
    hideBelow: "md",
  },
  {
    key: "proj",
    header: "Projected points",
    shortHeader: "Proj",
    align: "right",
    render: (r) => {
      if (!SKILL.has(r.position)) return <span className="text-xs text-muted">Not modeled</span>;
      if (r.on_bye) return <Tag tone="muted">Bye</Tag>;
      if (r.projected_points == null) return <span className="text-xs text-muted">No recent games</span>;
      return <span className="font-semibold text-ink">{points(r.projected_points)}</span>;
    },
  },
  {
    key: "avg",
    header: "3-week average",
    shortHeader: "3-wk avg",
    align: "right",
    render: (r) => <span className="text-ink-2">{points(r.recent_avg)}</span>,
    hideBelow: "sm",
  },
];

export function RosterTable({ team }: { team: TeamRow[] }) {
  return (
    <DataTable caption="Roster slots, players and projections" columns={rosterColumns} rows={team} rowKey={(r) => r.player_id} maxHeight="none" />
  );
}

const waiverColumns: Column<LeagueWaiver>[] = [
  {
    key: "player",
    header: "Player",
    render: (w) => (
      <span className="flex flex-wrap items-center gap-2">
        <Player name={w.player.name} position={w.player.position} team={w.player.team} headshot={w.player.headshot_url} />
        {w.is_breakout && <Tag tone="brass">Breakout</Tag>}
      </span>
    ),
    sortValue: (w) => w.player.name,
    defaultDirection: "asc",
  },
  {
    key: "score",
    header: "Waiver score",
    render: (w) => <ScoreBar value={w.waiver_score} label={`${w.player.name} waiver score`} className="min-w-24 sm:min-w-40" />,
    sortValue: (w) => w.waiver_score,
  },
  {
    key: "proj",
    header: "Projected points",
    shortHeader: "Proj",
    align: "right",
    // A pickup is for the weeks ahead, so bye players keep their projection;
    // the Matchup column says Bye.
    render: (w) => <span className="font-semibold text-ink">{points(w.player.projected_points)}</span>,
    sortValue: (w) => w.player.projected_points,
  },
  {
    key: "matchup",
    header: "Matchup",
    render: (w) => <Matchup opponent={w.player.opponent} home={w.player.home} onBye={w.player.on_bye} />,
    hideBelow: "md",
  },
];

export function LeagueWaiverTable({ waivers }: { waivers: LeagueWaiver[] }) {
  return (
    <DataTable
      caption="Players available in your league, by waiver score"
      columns={waiverColumns}
      rows={waivers}
      rowKey={(w) => w.player.player_id}
      initialSort={{ key: "score", direction: "desc" }}
      rankColumn
      pageSize={15}
      maxHeight="none"
    />
  );
}
