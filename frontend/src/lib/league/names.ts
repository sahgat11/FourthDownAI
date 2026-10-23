// Port of waiver_engine.normalize_name / create_player_key. Sleeper and
// nflverse spell names differently ("Kenneth Walker III" vs "Kenneth
// Walker"), so players are matched on a normalized name + position.

const SUFFIXES = new Set(["jr", "sr", "ii", "iii", "iv", "v"]);

export function normalizeName(name: string | null | undefined): string {
  if (!name) return "";
  return name
    .normalize("NFKD")
    .replace(/[^\x00-\x7f]/g, "") // drop accents / non-ASCII, like .encode("ascii", "ignore")
    .toLowerCase()
    .replace(/[^a-z0-9 ]/g, " ")
    .split(/\s+/)
    .filter((word) => word && !SUFFIXES.has(word))
    .join(" ");
}

export function playerKey(name: string | null | undefined, position: string | null | undefined): string {
  return `${normalizeName(name)}|${(position ?? "").toUpperCase()}`;
}
