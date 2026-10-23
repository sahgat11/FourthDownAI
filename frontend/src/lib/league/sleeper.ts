// Minimal client for Sleeper's public read API (no auth, CORS-enabled).
// https://docs.sleeper.com/

const API = "https://api.sleeper.app/v1";
const TIMEOUT_MS = 15_000;

export interface SleeperUser {
  user_id: string;
  username: string;
  display_name: string;
  avatar: string | null;
}

export interface SleeperLeague {
  league_id: string;
  name: string;
  season: string;
  status: string;
  total_rosters: number;
  roster_positions: string[];
  scoring_settings?: Record<string, number>;
}

export interface SleeperRoster {
  roster_id: number;
  owner_id: string | null;
  co_owners?: string[] | null;
  players: string[] | null;
  starters: string[] | null;
  reserve: string[] | null;
  taxi: string[] | null;
}

export interface SleeperLeagueUser {
  user_id: string;
  display_name: string;
  metadata?: { team_name?: string } | null;
}

/** league_players.json: Sleeper id -> [name, position, team, gsis_id]. */
export type LeaguePlayers = Record<string, [string, string, string | null, string | null]>;

export type SleeperErrorKind = "not_found" | "network" | "timeout" | "http";

export class SleeperError extends Error {
  constructor(
    readonly kind: SleeperErrorKind,
    message: string,
  ) {
    super(message);
    this.name = "SleeperError";
  }
}

async function get<T>(path: string): Promise<T> {
  let response: Response;
  try {
    response = await fetch(`${API}${path}`, { signal: AbortSignal.timeout(TIMEOUT_MS) });
  } catch (error) {
    if (error instanceof DOMException && (error.name === "TimeoutError" || error.name === "AbortError")) {
      throw new SleeperError("timeout", "Sleeper took too long to respond.");
    }
    throw new SleeperError("network", "Couldn't reach Sleeper.");
  }
  if (response.status === 404) throw new SleeperError("not_found", "Not found on Sleeper.");
  if (!response.ok) throw new SleeperError("http", `Sleeper returned an error (HTTP ${response.status}).`);
  return (await response.json()) as T;
}

/** Sleeper answers unknown usernames with `null`, not a 404. */
export async function getUser(username: string): Promise<SleeperUser> {
  const user = await get<SleeperUser | null>(`/user/${encodeURIComponent(username.trim())}`);
  if (!user) throw new SleeperError("not_found", `No Sleeper user named "${username.trim()}".`);
  return user;
}

export function getUserLeagues(userId: string, season: number): Promise<SleeperLeague[]> {
  return get<SleeperLeague[] | null>(`/user/${userId}/leagues/nfl/${season}`).then((l) => l ?? []);
}

export async function getLeague(leagueId: string): Promise<SleeperLeague> {
  const league = await get<SleeperLeague | null>(`/league/${encodeURIComponent(leagueId)}`);
  if (!league) throw new SleeperError("not_found", "That league ID doesn't exist on Sleeper.");
  return league;
}

export function getRosters(leagueId: string): Promise<SleeperRoster[]> {
  return get<SleeperRoster[] | null>(`/league/${leagueId}/rosters`).then((r) => r ?? []);
}

export function getLeagueUsers(leagueId: string): Promise<SleeperLeagueUser[]> {
  return get<SleeperLeagueUser[] | null>(`/league/${leagueId}/users`).then((u) => u ?? []);
}

export function rosterForUser(rosters: SleeperRoster[], userId: string): SleeperRoster | undefined {
  return rosters.find((r) => String(r.owner_id) === userId || (r.co_owners ?? []).map(String).includes(userId));
}
