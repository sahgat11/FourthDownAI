// The browser league engine must give exactly the answers the Python
// engines give. The fixture (a synthetic 10-team league built from the
// site's data, plus the Python output) comes from
// backend/scripts/make_league_fixture.py; regenerate it after changing
// either engine or the data.

import fs from "node:fs";
import path from "node:path";
import { expect, test } from "@playwright/test";
import {
  availableWaivers,
  buildOwnedSets,
  buildTeam,
  ownedPlayerIds,
  recommendMoves,
} from "../src/lib/league/engine";
import type { LeaguePlayers, SleeperLeague, SleeperRoster } from "../src/lib/league/sleeper";
import { normalizeName } from "../src/lib/league/names";
import { data } from "./helpers";

interface Fixture {
  data_generated_at: string;
  completed_week: number;
  league: SleeperLeague;
  rosters: SleeperRoster[];
  user_id: string;
  league_players: LeaguePlayers;
  expected: {
    waivers: [string, number][];
    team: [string, string, string, number | null, string][];
    moves: {
      add: string;
      drop: string;
      starter_gain: number;
      asset_gain: number;
      depth_penalty: number;
      move_score: number;
      current: number;
      new: number;
      move_type: string;
      confidence: string;
    }[];
  };
}

const fixture: Fixture = JSON.parse(fs.readFileSync(path.join(__dirname, "fixtures", "league.json"), "utf8"));

test.describe("league engine parity with Python", () => {
  test.skip(({ isMobile }) => isMobile, "pure logic; the desktop project covers it");

  test("fixture was generated from the current data", () => {
    expect(fixture.data_generated_at, "rerun backend/scripts/make_league_fixture.py").toBe(data.meta.generated_at);
  });

  const owned = buildOwnedSets(fixture.league_players, ownedPlayerIds(fixture.rosters));
  const waivers = availableWaivers(
    data.projections.players,
    data.breakouts.players,
    owned,
    fixture.completed_week,
  );
  const mine = fixture.rosters.find((r) => r.owner_id === fixture.user_id)!;
  const team = buildTeam(mine, fixture.league, fixture.league_players, data.projections.players);
  const moves = recommendMoves(team, waivers);

  test("league-specific waivers match", () => {
    expect(waivers.map((w) => [w.player.name, w.waiver_score])).toEqual(fixture.expected.waivers);
  });

  test("roster rows, slots and projection matches match", () => {
    expect(team.map((r) => [r.player_id, r.slot, r.status, r.projected_points, r.match])).toEqual(fixture.expected.team);
  });

  test("add/drop recommendations match", () => {
    expect(moves.map((m) => [m.add.player.name, m.drop.name, m.move_type, m.confidence])).toEqual(
      fixture.expected.moves.map((m) => [m.add, m.drop, m.move_type, m.confidence]),
    );
    for (const [i, m] of moves.entries()) {
      const want = fixture.expected.moves[i];
      expect(m.starter_gain).toBeCloseTo(want.starter_gain, 9);
      expect(m.asset_gain).toBeCloseTo(want.asset_gain, 9);
      expect(m.depth_penalty).toBeCloseTo(want.depth_penalty, 9);
      expect(m.move_score).toBeCloseTo(want.move_score, 9);
      expect(m.current_lineup_projection).toBeCloseTo(want.current, 9);
      expect(m.new_lineup_projection).toBeCloseTo(want.new, 9);
    }
  });

  test("the fixture exercises the hard cases", () => {
    // Name-matched and GSIS-matched players, a bye-week bench player, IR.
    const matches = new Set(team.map((r) => r.match));
    expect(matches).toContain("NAME");
    expect(matches).toContain("GSIS");
    expect(team.some((r) => r.on_bye && r.status === "Bench")).toBe(true);
    expect(team.some((r) => r.status === "IR")).toBe(true);
    expect(moves.every((m) => !m.drop.on_bye)).toBe(true);
  });

  test("names normalize like the Python", () => {
    expect(normalizeName("Kenneth Walker III")).toBe("kenneth walker");
    expect(normalizeName("Amon-Ra St. Brown")).toBe("amon ra st brown");
    expect(normalizeName("Ja'Marr Chase")).toBe("ja marr chase");
    expect(normalizeName("José Núñez Jr.")).toBe("jose nunez");
  });
});
