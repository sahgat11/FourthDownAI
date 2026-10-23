import Link from "next/link";
import { PositionBadge } from "@/components/ui/PositionBadge";
import { ScoreBar } from "@/components/ui/ScoreBar";
import { Tag } from "@/components/ui/Tag";
import { cn } from "@/lib/cn";
import type { BreakoutPlayer } from "@/lib/types";
import { PlayerAvatar } from "./PlayerAvatar";
import { Sparkline } from "./Sparkline";
import { breakoutChips, breakoutDek, breakoutHeadline } from "./storyCopy";

/** A breakout written up as a sports story: photo, headline, dek, receipts. */
export function StoryCard({ player, lead = false }: { player: BreakoutPlayer; lead?: boolean }) {
  const chips = breakoutChips(player);
  return (
    <article
      data-story
      className={cn(
        "group relative flex min-w-0 gap-4 rounded-lg border border-rule bg-surface transition-colors hover:border-rule-strong",
        lead ? "flex-col p-5 sm:flex-row sm:items-start sm:gap-6 sm:p-6" : "p-4",
      )}
    >
      <div className={cn("flex shrink-0 items-start gap-3", lead && "sm:flex-col sm:items-center")}>
        <PlayerAvatar player={player} size={lead ? 112 : 52} />
        {lead && (
          <span className="hidden font-display text-sm font-bold tracking-wide text-accent-text uppercase sm:block">
            Top breakout
          </span>
        )}
      </div>
      <div className="flex min-w-0 flex-1 flex-col gap-2">
        <p className="flex flex-wrap items-center gap-2 text-xs text-muted">
          <PositionBadge position={player.position} />
          <span className="font-medium text-ink-2">{player.team}</span>
          {lead && <span className="font-display font-bold tracking-wide text-accent-text uppercase sm:hidden">Top breakout</span>}
        </p>
        <h3 className={cn("font-display leading-tight font-extrabold text-balance", lead ? "text-3xl sm:text-4xl" : "text-2xl")}>
          <Link href="/breakouts" className="after:absolute after:inset-0 after:content-[''] focus-visible:outline-none group-has-[:focus-visible]:underline">
            {breakoutHeadline(player)}
          </Link>
        </h3>
        <p className={cn("text-ink-2", lead ? "text-base" : "text-sm")}>{breakoutDek(player)}</p>
        <ul className="flex flex-wrap gap-1.5" aria-label="Signals">
          {chips.map((c) => (
            <li key={c.label}>
              <Tag tone={c.tone}>{c.label}</Tag>
            </li>
          ))}
        </ul>
        <div className="mt-1 flex flex-wrap items-center gap-x-6 gap-y-2">
          <Sparkline games={player.history} metric="touches" unit="touches" label={`${player.name} touches by game`} />
          <ScoreBar
            value={player.breakout_score}
            tone="brass"
            label={`${player.name} breakout score`}
            className="w-full min-w-0 sm:w-auto sm:min-w-40 sm:flex-1 sm:max-w-56"
          />
        </div>
      </div>
    </article>
  );
}
