// Browser port of the league-specific engines:
//   waiver_engine.find_available_players  -> availableWaivers
//   team_engine.build_team_roster         -> buildTeam
//   move_engine.generate_add_drop_recommendations -> recommendMoves
// Thresholds and weights match the Python exactly; e2e/league-parity.spec.ts
// checks the outputs against the Python engines on a shared fixture.

import type { BreakoutPlayer, PlayerRecord, Position } from "@/lib/types";
import { playerKey } from "./names";
import type { LeaguePlayers, SleeperLeague, SleeperRoster } from "./sleeper";

const SKILL = new Set(["RB", "WR", "TE"]);

// ------------------------------------------------------------ ownership

export interface OwnedSets {
  gsis: Set<string>;
  keys: Set<string>;
}

export function ownedPlayerIds(rosters: SleeperRoster[]): Set<string> {
  const ids = new Set<string>();
  for (const roster of rosters) {
    for (const group of [roster.players, roster.reserve, roster.taxi]) {
      for (const id of group ?? []) ids.add(String(id));
    }
  }
  return ids;
}

export function buildOwnedSets(players: LeaguePlayers, ownedIds: Iterable<string>): OwnedSets {
  const gsis = new Set<string>();
  const keys = new Set<string>();
  for (const id of ownedIds) {
    const p = players[id];
    if (!p) continue;
    const [name, position, , gsisId] = p;
    if (gsisId) gsis.add(gsisId);
    if (name && position) keys.add(playerKey(name, position));
  }
  return { gsis, keys };
}

export function isRostered(p: Pick<PlayerRecord, "player_id" | "name" | "position">, owned: OwnedSets): boolean {
  if (p.player_id && owned.gsis.has(String(p.player_id))) return true;
  return owned.keys.has(playerKey(p.name, p.position));
}

// -------------------------------------------------------------- waivers

/** pandas rank(pct=True, method="average"); a lone value scores 1.0. */
function percentileRanks(values: number[]): number[] {
  const n = values.length;
  if (n === 1) return [1];
  const order = values.map((v, i) => [v, i] as const).sort((a, b) => a[0] - b[0]);
  const ranks = new Array<number>(n);
  let i = 0;
  while (i < n) {
    let j = i;
    while (j + 1 < n && order[j + 1][0] === order[i][0]) j++;
    const avgRank = (i + j + 2) / 2; // 1-based average rank of the tie group
    for (let k = i; k <= j; k++) ranks[order[k][1]] = avgRank / n;
    i = j + 1;
  }
  return ranks;
}

/** numpy-style round half to even, so sort order matches pandas .round(1). */
export function roundHalfEven(x: number, digits = 1): number {
  const m = 10 ** digits;
  const y = x * m;
  const r = Math.round(y);
  const isHalf = Math.abs(Math.abs(y % 1) - 0.5) < 1e-9;
  return (isHalf ? 2 * Math.round(y / 2) : r) / m;
}

export interface LeagueWaiver {
  player: PlayerRecord;
  waiver_score: number;
  waiver_score_raw: number;
  breakout_score: number;
  is_breakout: boolean;
}

export function availableWaivers(
  pool: PlayerRecord[],
  breakouts: BreakoutPlayer[],
  owned: OwnedSets,
  completedWeek: number,
  { minProjection = 5, maxDataAgeWeeks = 1 } = {},
): LeagueWaiver[] {
  const available = pool.filter(
    (p) =>
      SKILL.has(p.position) &&
      p.projected_points != null &&
      p.projected_points >= minProjection &&
      p.data_week >= completedWeek - maxDataAgeWeeks &&
      !isRostered(p, owned),
  );
  if (!available.length) return [];

  const byId = new Map(breakouts.map((b) => [String(b.player_id), b.breakout_score]));
  const byKey = new Map(breakouts.map((b) => [playerKey(b.name, b.position), b.breakout_score]));
  const breakout = available.map((p) => byId.get(String(p.player_id)) ?? byKey.get(playerKey(p.name, p.position)) ?? 0);

  const projRank = percentileRanks(available.map((p) => p.projected_points));
  const recentRank = percentileRanks(available.map((p) => p.recent_avg ?? 0));

  return available
    .map((player, i) => {
      const raw = (0.7 * projRank[i] + 0.2 * recentRank[i] + 0.1 * (breakout[i] / 100)) * 100;
      return {
        player,
        waiver_score_raw: raw,
        waiver_score: roundHalfEven(raw, 1),
        breakout_score: breakout[i],
        is_breakout: breakout[i] > 0,
      };
    })
    .sort((a, b) => b.waiver_score - a.waiver_score || b.player.projected_points - a.player.projected_points);
}

// ----------------------------------------------------------------- team

export type RosterStatus = "Starter" | "Bench" | "IR";

export interface TeamRow {
  player_id: string; // Sleeper id (or "waiver::name::pos" for a hypothetical add)
  name: string;
  position: string;
  team: string;
  slot: string;
  status: RosterStatus;
  projected_points: number | null;
  recent_avg: number | null;
  data_week: number | null;
  match: "GSIS" | "NAME" | "NONE" | "WAIVER";
  /** On bye this week: can't start, and is never offered as a drop. */
  on_bye: boolean;
  projection: PlayerRecord | null;
}

const STATUS_ORDER: Record<RosterStatus, number> = { Starter: 0, Bench: 1, IR: 2 };

export function buildTeam(
  roster: SleeperRoster,
  league: SleeperLeague,
  players: LeaguePlayers,
  pool: PlayerRecord[],
): TeamRow[] {
  const byId = new Map(pool.map((p) => [String(p.player_id), p]));
  const byKey = new Map(pool.map((p) => [playerKey(p.name, p.position), p]));

  const starterIds = (roster.starters ?? []).map(String).filter((id) => id !== "0");
  const reserveIds = new Set((roster.reserve ?? []).map(String));
  const starterSlots = (league.roster_positions ?? []).filter((slot) => !["BN", "IR", "TAXI"].includes(slot));
  const slotFor = new Map(starterIds.map((id, i) => [id, i < starterSlots.length ? starterSlots[i] : "START"]));
  const starterSet = new Set(starterIds);

  const rows: TeamRow[] = [];
  for (const raw of roster.players ?? []) {
    const id = String(raw);
    const p = players[id];
    if (!p) continue;
    const [name, position, nflTeam, gsis] = p;

    let projection: PlayerRecord | null = null;
    let match: TeamRow["match"] = "NONE";
    if (gsis && byId.has(gsis)) {
      projection = byId.get(gsis)!;
      match = "GSIS";
    } else if (byKey.has(playerKey(name, position))) {
      projection = byKey.get(playerKey(name, position))!;
      match = "NAME";
    }

    const status: RosterStatus = reserveIds.has(id) ? "IR" : starterSet.has(id) ? "Starter" : "Bench";
    rows.push({
      player_id: id,
      name,
      position: position ?? "",
      team: nflTeam ?? "FA",
      slot: status === "IR" ? "IR" : status === "Starter" ? (slotFor.get(id) ?? "START") : "BN",
      status,
      projected_points: projection?.projected_points ?? null,
      recent_avg: projection?.recent_avg ?? null,
      data_week: projection?.data_week ?? null,
      match,
      on_bye: Boolean(projection?.on_bye),
      projection,
    });
  }

  // Same order as pandas sort_values: status, then position, then name,
  // compared by character code (not locale), so tie-breaks match Python.
  const cmp = (x: string, y: string) => (x < y ? -1 : x > y ? 1 : 0);
  return rows.sort(
    (a, b) =>
      STATUS_ORDER[a.status] - STATUS_ORDER[b.status] || cmp(a.position, b.position) || cmp(a.name, b.name),
  );
}

// ---------------------------------------------------------------- moves

export interface Requirements {
  RB: number;
  WR: number;
  TE: number;
  FLEX: number;
}

export function slotRequirements(team: TeamRow[]): Requirements {
  const req: Requirements = { RB: 0, WR: 0, TE: 0, FLEX: 0 };
  for (const row of team) {
    if (row.status === "Starter" && row.slot in req) req[row.slot as keyof Requirements] += 1;
  }
  return req;
}

/** Best RB/WR/TE/FLEX lineup by projection; returns the total and who starts. */
export function optimizeLineup(team: TeamRow[], req: Requirements): { total: number; lineup: (TeamRow & { optimized_slot: string })[] } {
  const pool = team.filter((r) => SKILL.has(r.position) && r.projected_points != null && !r.on_bye);
  const chosen = new Set<string>();
  const lineup: (TeamRow & { optimized_slot: string })[] = [];
  const byProjection = (a: TeamRow, b: TeamRow) => (b.projected_points ?? 0) - (a.projected_points ?? 0);

  for (const position of ["RB", "WR", "TE"] as const) {
    const picks = pool.filter((r) => r.position === position && !chosen.has(r.player_id)).sort(byProjection).slice(0, req[position]);
    for (const r of picks) {
      lineup.push({ ...r, optimized_slot: position });
      chosen.add(r.player_id);
    }
  }
  const flex = pool.filter((r) => !chosen.has(r.player_id)).sort(byProjection).slice(0, req.FLEX);
  for (const r of flex) {
    lineup.push({ ...r, optimized_slot: "FLEX" });
    chosen.add(r.player_id);
  }
  const total = lineup.reduce((sum, r) => sum + (r.projected_points ?? 0), 0);
  return { total, lineup };
}

export function depthRisk(team: TeamRow[], req: Requirements): number {
  let risk = 0;
  for (const position of ["RB", "WR", "TE"] as const) {
    if (!req[position]) continue;
    const have = team.filter((r) => r.position === position).length;
    risk += Math.max(0, req[position] + 1 - have);
  }
  return risk;
}

export type Confidence = "HIGH" | "MEDIUM" | "LOW";

export function confidence(starterGain: number, assetGain: number): Confidence {
  if (starterGain >= 3 || (starterGain >= 2 && assetGain >= 3)) return "HIGH";
  if (starterGain >= 1 || assetGain >= 3) return "MEDIUM";
  return "LOW";
}

export interface Move {
  add: LeagueWaiver;
  drop: TeamRow;
  starter_gain: number;
  asset_gain: number;
  depth_penalty: number;
  current_lineup_projection: number;
  new_lineup_projection: number;
  move_score: number;
  move_type: "STARTER UPGRADE" | "DEPTH UPGRADE";
  confidence: Confidence;
}

export function moveReason(m: Pick<Move, "starter_gain" | "asset_gain" | "depth_penalty">): string {
  let reason =
    m.starter_gain >= 0.5
      ? `Improves your best starting lineup by ${m.starter_gain.toFixed(2)} projected points.`
      : `Improves your bench by ${m.asset_gain.toFixed(2)} projected points.`;
  if (m.depth_penalty > 0) reason += " Leaves you a little thinner at one position.";
  return reason;
}

export function recommendMoves(team: TeamRow[], waivers: LeagueWaiver[], maxMoves = 5): Move[] {
  if (!team.length || !waivers.length) return [];

  const teamKeys = new Set(team.map((r) => playerKey(r.name, r.position)));
  const req = slotRequirements(team);
  const weeks = team.map((r) => r.data_week).filter((w): w is number => w != null);
  const latestWeek = weeks.length ? Math.max(...weeks) : null;
  const current = optimizeLineup(team, req);
  const currentRisk = depthRisk(team, req);

  // Never suggest dropping someone whose projection is from stale data
  // (injury) or who is on bye: neither is evidence of low value.
  const droppable = team.filter(
    (r) =>
      r.status === "Bench" &&
      SKILL.has(r.position) &&
      r.projected_points != null &&
      !r.on_bye &&
      (latestWeek == null || (r.data_week != null && r.data_week >= latestWeek)),
  );
  if (!droppable.length) return [];

  const candidates: Move[] = [];
  for (const add of waivers) {
    const p = add.player;
    if (teamKeys.has(playerKey(p.name, p.position))) continue;
    if (!SKILL.has(p.position) || p.projected_points == null) continue;

    const addRow: TeamRow = {
      player_id: `waiver::${p.name}::${p.position}`,
      name: p.name,
      position: p.position,
      team: p.team,
      slot: "BN",
      status: "Bench",
      projected_points: p.projected_points,
      recent_avg: p.recent_avg,
      data_week: p.data_week,
      match: "WAIVER",
      on_bye: Boolean(p.on_bye),
      projection: p,
    };

    for (const drop of droppable) {
      const hypothetical = [...team.filter((r) => r.player_id !== drop.player_id), addRow];
      const next = optimizeLineup(hypothetical, req);
      const starterGain = next.total - current.total;
      const assetGain = p.projected_points - (drop.projected_points ?? 0);
      const addedRisk = Math.max(0, depthRisk(hypothetical, req) - currentRisk);
      const depthPenalty = addedRisk * 2.5;
      if (starterGain < 0.5 && assetGain < 2.0) continue;
      const score = starterGain * 1.75 + Math.max(assetGain, 0) * 0.75 + add.breakout_score * 0.02 - depthPenalty;
      if (score <= 0) continue;
      candidates.push({
        add,
        drop,
        starter_gain: starterGain,
        asset_gain: assetGain,
        depth_penalty: depthPenalty,
        current_lineup_projection: current.total,
        new_lineup_projection: next.total,
        move_score: score,
        move_type: starterGain >= 0.5 ? "STARTER UPGRADE" : "DEPTH UPGRADE",
        confidence: confidence(starterGain, assetGain),
      });
    }
  }

  candidates.sort(
    (a, b) => b.move_score - a.move_score || b.starter_gain - a.starter_gain || b.asset_gain - a.asset_gain,
  );
  const usedAdds = new Set<string>();
  const usedDrops = new Set<string>();
  const selected: Move[] = [];
  for (const m of candidates) {
    if (usedAdds.has(m.add.player.name) || usedDrops.has(m.drop.name)) continue;
    selected.push(m);
    usedAdds.add(m.add.player.name);
    usedDrops.add(m.drop.name);
    if (selected.length >= maxMoves) break;
  }
  return selected;
}

export type { Position };
