// Client-side loading of the precompute files in /public/data.
// One promise per file, shared by every component that asks for it.
// A failed load stays cached (so React shows the error instead of
// re-requesting on every render) until forgetDataFile() is called by
// the "Try again" button.

import type { BreakoutsFile, LeaguePlayersFile, MetaFile, MetricsFile, ProjectionsFile, WaiversFile } from "./types";

export const SCHEMA_VERSION = 1;
const TIMEOUT_MS = 15_000;

export interface DataFiles {
  "meta.json": MetaFile;
  "metrics.json": MetricsFile;
  "projections.json": ProjectionsFile;
  "breakouts.json": BreakoutsFile;
  "waivers.json": WaiversFile;
  "league_players.json": LeaguePlayersFile;
}
export type DataFileName = keyof DataFiles;

export type DataErrorKind = "offline" | "timeout" | "http" | "format";

export class DataError extends Error {
  constructor(
    readonly kind: DataErrorKind,
    message: string,
  ) {
    super(message);
    this.name = "DataError";
  }
}

const cache = new Map<DataFileName, Promise<unknown>>();

async function request<N extends DataFileName>(name: N): Promise<DataFiles[N]> {
  let response: Response;
  try {
    response = await fetch(`/data/${name}`, { signal: AbortSignal.timeout(TIMEOUT_MS) });
  } catch (error) {
    if (error instanceof DOMException && (error.name === "TimeoutError" || error.name === "AbortError")) {
      throw new DataError("timeout", "The data took too long to arrive.");
    }
    throw new DataError("offline", "The data file couldn't be reached.");
  }
  if (!response.ok) {
    throw new DataError("http", `The data file returned an error (HTTP ${response.status}).`);
  }
  let body: unknown;
  try {
    body = await response.json();
  } catch {
    throw new DataError("format", "The data file isn't valid JSON.");
  }
  const version = (body as { schema_version?: unknown } | null)?.schema_version;
  if (version !== SCHEMA_VERSION) {
    throw new DataError("format", `Expected data format version ${SCHEMA_VERSION}, got ${String(version)}.`);
  }
  // Player lists are arrays, except league_players.json (keyed by Sleeper id).
  const players = (body as { players?: unknown }).players;
  if ("players" in (body as object) && (players === null || typeof players !== "object")) {
    throw new DataError("format", "The data file is missing its player list.");
  }
  return body as DataFiles[N];
}

export function loadDataFile<N extends DataFileName>(name: N): Promise<DataFiles[N]> {
  let promise = cache.get(name) as Promise<DataFiles[N]> | undefined;
  if (!promise) {
    promise = request(name);
    cache.set(name, promise);
  }
  return promise;
}

export function forgetDataFile(name: DataFileName) {
  cache.delete(name);
}
