"use client";

import { useEffect, useRef, useState, type FormEvent } from "react";
import { useSearchParams } from "next/navigation";
import { Button } from "@/components/ui/Button";
import { EmptyState, ErrorState, Skeleton, TableSkeleton } from "@/components/ui/States";
import { loadDataFile } from "@/lib/fetchData";
import { points } from "@/lib/format";
import {
  availableWaivers,
  buildOwnedSets,
  buildTeam,
  optimizeLineup,
  ownedPlayerIds,
  recommendMoves,
  slotRequirements,
  type LeagueWaiver,
  type Move,
  type TeamRow,
} from "@/lib/league/engine";
import {
  SleeperError,
  getLeague,
  getLeagueUsers,
  getRosters,
  getUser,
  getUserLeagues,
  rosterForUser,
  type SleeperLeague,
  type SleeperUser,
} from "@/lib/league/sleeper";
import { LeagueWaiverTable, RosterTable } from "./LeagueTables";
import { MoveCard } from "./MoveCard";

const USERNAME_KEY = "fourthdown-sleeper-username";

interface Ready {
  kind: "ready";
  user: SleeperUser;
  leagues: SleeperLeague[];
  league: SleeperLeague;
  teamName: string;
  team: TeamRow[];
  waivers: LeagueWaiver[];
  moves: Move[];
  lineupTotal: number;
}

type Phase =
  | { kind: "idle" }
  | { kind: "loading"; message: string }
  | { kind: "pick"; user: SleeperUser; leagues: SleeperLeague[] }
  | Ready
  | { kind: "error"; title: string; detail: string; retry?: () => void };

function writeUrl(user?: string, league?: string) {
  const params = new URLSearchParams(window.location.search);
  if (user) params.set("user", user);
  else params.delete("user");
  if (league) params.set("league", league);
  else params.delete("league");
  const search = params.toString();
  window.history.replaceState(null, "", `${window.location.pathname}${search ? `?${search}` : ""}`);
}

function remember(username: string) {
  try {
    localStorage.setItem(USERNAME_KEY, username);
  } catch {
    // Storage can be unavailable; the URL still carries the username.
  }
}

function recall(): string {
  try {
    return localStorage.getItem(USERNAME_KEY) ?? "";
  } catch {
    return "";
  }
}

function describe(error: unknown, season: number, username: string): { title: string; detail: string } {
  if (error instanceof SleeperError) {
    if (error.kind === "not_found") {
      return {
        title: "Couldn't find that on Sleeper",
        detail: `${error.message} Use your Sleeper username (shown under your profile), not your display name.`,
      };
    }
    if (error.kind === "timeout") return { title: "Sleeper is slow right now", detail: `${error.message} Try again in a moment.` };
    if (error.kind === "network") return { title: "Couldn't reach Sleeper", detail: "Check your connection and try again." };
    return { title: "Sleeper returned an error", detail: `${error.message} Try again in a moment.` };
  }
  if (error instanceof Error && error.name === "NoLeagues") {
    return { title: "No leagues this season", detail: `${username} isn't in any ${season} NFL leagues on Sleeper.` };
  }
  if (error instanceof Error && error.name === "NoRoster") {
    return { title: "You're not on a team in this league", detail: error.message };
  }
  return { title: "Something went wrong", detail: "The league couldn't be loaded. Try again." };
}

export function LeagueView({ season, completedWeek, projectionWeek }: { season: number; completedWeek: number; projectionWeek: number }) {
  const params = useSearchParams();
  // Rendered only in the browser (it reads the URL), so storage is safe here.
  const [username, setUsername] = useState(() => params.get("user") ?? (typeof window === "undefined" ? "" : recall()));
  const [phase, setPhase] = useState<Phase>({ kind: "idle" });
  const resultsRef = useRef<HTMLDivElement>(null);
  const started = useRef(false);

  async function openLeague(user: SleeperUser, leagues: SleeperLeague[], leagueId: string) {
    setPhase({ kind: "loading", message: "Loading your league…" });
    try {
      const [league, rosters, users, projections, breakouts, players] = await Promise.all([
        getLeague(leagueId),
        getRosters(leagueId),
        getLeagueUsers(leagueId),
        loadDataFile("projections.json"),
        loadDataFile("breakouts.json"),
        loadDataFile("league_players.json"),
      ]);
      const roster = rosterForUser(rosters, user.user_id);
      if (!roster) {
        const e = new Error(`${user.display_name || user.username} doesn't own a team in ${league.name}.`);
        e.name = "NoRoster";
        throw e;
      }
      const owned = buildOwnedSets(players.players, ownedPlayerIds(rosters));
      const waivers = availableWaivers(projections.players, breakouts.players, owned, completedWeek);
      const team = buildTeam(roster, league, players.players, projections.players);
      const moves = recommendMoves(team, waivers);
      const me = users.find((u) => u.user_id === user.user_id);
      writeUrl(user.username, league.league_id);
      setPhase({
        kind: "ready",
        user,
        leagues,
        league,
        teamName: me?.metadata?.team_name || me?.display_name || user.display_name,
        team,
        waivers,
        moves,
        lineupTotal: optimizeLineup(team, slotRequirements(team)).total,
      });
      requestAnimationFrame(() => resultsRef.current?.focus());
    } catch (error) {
      setPhase({ kind: "error", ...describe(error, season, user.username), retry: () => void openLeague(user, leagues, leagueId) });
    }
  }

  async function findLeagues(name: string, preferLeague?: string | null) {
    const trimmed = name.trim();
    if (!trimmed) return;
    setPhase({ kind: "loading", message: "Finding your leagues…" });
    try {
      const user = await getUser(trimmed);
      remember(user.username);
      const leagues = await getUserLeagues(user.user_id, season);
      if (!leagues.length) {
        const e = new Error("no leagues");
        e.name = "NoLeagues";
        throw e;
      }
      writeUrl(user.username);
      const preferred = leagues.find((l) => l.league_id === preferLeague);
      if (preferred || leagues.length === 1) {
        await openLeague(user, leagues, (preferred ?? leagues[0]).league_id);
      } else {
        setPhase({ kind: "pick", user, leagues });
      }
    } catch (error) {
      setPhase({ kind: "error", ...describe(error, season, trimmed), retry: () => void findLeagues(trimmed, preferLeague) });
    }
  }

  // Shared links (?user=…&league=…) load straight away.
  useEffect(() => {
    if (started.current) return;
    started.current = true;
    const user = params.get("user");
    if (user) void findLeagues(user, params.get("league"));
    // eslint-disable-next-line react-hooks/exhaustive-deps -- run once on mount
  }, []);

  function onSubmit(event: FormEvent) {
    event.preventDefault();
    void findLeagues(username);
  }

  function reset() {
    writeUrl();
    setPhase({ kind: "idle" });
  }

  const busy = phase.kind === "loading";

  return (
    <div className="flex flex-col gap-8">
      {phase.kind !== "ready" && (
        <form onSubmit={onSubmit} className="flex max-w-xl flex-col gap-3 rounded-lg border border-rule bg-surface p-4 sm:p-5">
          <label htmlFor="sleeper-username" className="font-display text-xl font-bold">
            Your Sleeper username
          </label>
          <div className="flex flex-col gap-2 sm:flex-row">
            <input
              id="sleeper-username"
              name="username"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              autoComplete="off"
              autoCapitalize="none"
              spellCheck={false}
              required
              placeholder="e.g. sahgat11…"
              className="h-10 min-w-0 flex-1 rounded-md border border-rule-strong bg-surface px-3 text-ink placeholder:text-muted"
            />
            <Button type="submit" variant="primary" disabled={busy} className="h-10">
              {busy ? "Loading…" : "Find my leagues"}
            </Button>
          </div>
          <p className="text-xs text-muted">
            Read-only and runs in your browser: your username goes straight to Sleeper&apos;s public API and nothing is saved on
            our side.
          </p>
        </form>
      )}

      <div ref={resultsRef} tabIndex={-1} className="flex flex-col gap-8 outline-none" aria-live="polite" aria-busy={busy}>
        {phase.kind === "loading" && (
          <div role="status" aria-label={phase.message} className="flex flex-col gap-4">
            <p className="text-sm text-ink-2">{phase.message}</p>
            <Skeleton className="h-40 w-full rounded-lg" />
            <TableSkeleton rows={6} label={phase.message} />
          </div>
        )}

        {phase.kind === "error" && (
          <ErrorState
            title={phase.title}
            action={phase.retry && <Button onClick={phase.retry}>Try again</Button>}
          >
            {phase.detail}
          </ErrorState>
        )}

        {phase.kind === "pick" && (
          <section aria-labelledby="pick-league" className="flex flex-col gap-3">
            <h2 id="pick-league" className="text-2xl font-extrabold">
              Pick a league
            </h2>
            <ul className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              {phase.leagues.map((l) => (
                <li key={l.league_id}>
                  <button
                    type="button"
                    onClick={() => void openLeague(phase.user, phase.leagues, l.league_id)}
                    className="flex w-full flex-col items-start gap-1 rounded-lg border border-rule bg-surface p-4 text-left hover:border-accent"
                  >
                    <span className="font-display text-xl font-bold">{l.name}</span>
                    <span className="text-sm text-muted">
                      {l.total_rosters} teams, {season} season
                    </span>
                  </button>
                </li>
              ))}
            </ul>
          </section>
        )}

        {phase.kind === "ready" && <Results phase={phase} projectionWeek={projectionWeek} onReset={reset} onSwitch={(id) => void openLeague(phase.user, phase.leagues, id)} />}
      </div>
    </div>
  );
}

function Results({
  phase,
  projectionWeek,
  onReset,
  onSwitch,
}: {
  phase: Ready;
  projectionWeek: number;
  onReset: () => void;
  onSwitch: (leagueId: string) => void;
}) {
  const { league, leagues, team, waivers, moves } = phase;
  return (
    <>
      <section className="flex flex-col gap-3 rounded-lg border border-rule bg-surface p-4 sm:flex-row sm:items-center sm:justify-between sm:p-5">
        <div className="flex flex-col gap-1">
          <p className="text-sm text-muted">
            {league.name}, {league.total_rosters} teams
          </p>
          <h2 className="text-3xl font-extrabold">{phase.teamName}</h2>
          <p className="text-sm text-ink-2">
            Your best RB/WR/TE lineup projects for{" "}
            <span className="font-semibold text-ink">{points(phase.lineupTotal)} points</span> in week {projectionWeek}.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          {leagues.length > 1 && (
            <label className="flex items-center gap-2 text-sm text-ink-2">
              <span className="sr-only">Switch league</span>
              <select
                value={league.league_id}
                onChange={(e) => onSwitch(e.target.value)}
                className="h-9 rounded-md border border-rule-strong bg-surface px-2 text-sm text-ink"
              >
                {leagues.map((l) => (
                  <option key={l.league_id} value={l.league_id}>
                    {l.name}
                  </option>
                ))}
              </select>
            </label>
          )}
          <Button variant="ghost" onClick={onReset}>
            Use a different username
          </Button>
        </div>
      </section>

      <section aria-labelledby="moves" className="flex flex-col gap-4">
        <header className="flex flex-wrap items-end justify-between gap-2 border-b-[3px] border-accent pb-2">
          <h2 id="moves" className="text-3xl font-extrabold">
            Recommended moves
          </h2>
          <span className="text-sm text-muted">Waiver adds that beat someone on your bench</span>
        </header>
        {moves.length ? (
          <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
            {moves.map((m, i) => (
              <MoveCard key={`${m.add.player.player_id}-${m.drop.player_id}`} move={m} rank={i + 1} />
            ))}
          </div>
        ) : (
          <EmptyState title="No moves worth making this week">
            Nobody available in your league clearly beats your current bench. Moves need to add at least 0.5 points to your
            best lineup or 2 projected points overall.
          </EmptyState>
        )}
      </section>

      <div className="grid grid-cols-1 items-start gap-8 xl:grid-cols-2">
        <section aria-labelledby="roster" className="flex min-w-0 flex-col gap-3">
          <h2 id="roster" className="text-2xl font-extrabold">
            Your roster
          </h2>
          <RosterTable team={team} />
        </section>
        <section aria-labelledby="available" className="flex min-w-0 flex-col gap-3">
          <h2 id="available" className="text-2xl font-extrabold">
            Available in your league
          </h2>
          {waivers.length ? (
            <LeagueWaiverTable waivers={waivers} />
          ) : (
            <EmptyState title="No one worth adding">Every RB, WR and TE projected for 5+ points is already rostered.</EmptyState>
          )}
        </section>
      </div>
    </>
  );
}
