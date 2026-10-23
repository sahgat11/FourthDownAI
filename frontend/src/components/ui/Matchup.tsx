import { Tag } from "./Tag";

/** "vs HOU" (home) / "at KC" (away) / BYE. */
export function Matchup({
  opponent,
  home,
  onBye,
}: {
  opponent: string | null;
  home: boolean | null;
  onBye: boolean | null;
}) {
  if (onBye) return <Tag tone="muted">Bye</Tag>;
  if (!opponent) return <span className="text-muted">–</span>;
  return (
    <span className="whitespace-nowrap text-ink-2">
      <span className="text-muted">{home ? "vs" : "at"}</span>{" "}
      <span className="font-medium text-ink">{opponent}</span>
    </span>
  );
}
