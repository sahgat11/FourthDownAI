import { PlayerAvatar } from "@/components/feed/PlayerAvatar";
import { PositionBadge } from "@/components/ui/PositionBadge";
import { Tag } from "@/components/ui/Tag";
import { points, signed } from "@/lib/format";
import { moveReason, type Move } from "@/lib/league/engine";

const CONFIDENCE_TONE = { HIGH: "accent", MEDIUM: "neutral", LOW: "muted" } as const;
const two = (v: number) => v.toFixed(2);

function Side({
  verb,
  name,
  position,
  team,
  projection,
  headshot,
  children,
}: {
  verb: "Add" | "Drop";
  name: string;
  position: string;
  team: string;
  projection: number | null;
  headshot: string | null;
  children?: React.ReactNode;
}) {
  return (
    <div className="flex min-w-0 items-center gap-3">
      <PlayerAvatar player={{ name, headshot_url: headshot }} size={44} />
      <div className="flex min-w-0 flex-col">
        <span
          className={
            verb === "Add"
              ? "font-display text-sm font-bold tracking-wide text-accent-text uppercase"
              : "font-display text-sm font-bold tracking-wide text-muted uppercase"
          }
        >
          {verb}
        </span>
        <span className="flex flex-wrap items-center gap-x-2 gap-y-0.5">
          <span className="truncate font-semibold text-ink">{name}</span>
          {children}
        </span>
        <span className="flex items-center gap-1.5 text-xs text-muted">
          {(position === "RB" || position === "WR" || position === "TE") && <PositionBadge position={position} />}
          {team}, {points(projection)} projected
        </span>
      </div>
    </div>
  );
}

export function MoveCard({ move, rank }: { move: Move; rank: number }) {
  const add = move.add.player;
  const drop = move.drop;
  return (
    <article data-move className="flex flex-col gap-4 rounded-lg border border-rule bg-surface p-4 sm:p-5">
      <header className="flex flex-wrap items-center justify-between gap-2">
        <h3 className="font-display text-xl font-extrabold">
          <span className="text-muted">{rank}.</span> {move.move_type === "STARTER UPGRADE" ? "Starter upgrade" : "Depth upgrade"}
        </h3>
        <Tag tone={CONFIDENCE_TONE[move.confidence]}>{move.confidence.toLowerCase()} confidence</Tag>
      </header>
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)] sm:items-center">
        <Side verb="Add" name={add.name} position={add.position} team={add.team} projection={add.projected_points} headshot={add.headshot_url}>
          {move.add.is_breakout && <Tag tone="brass">Breakout</Tag>}
          {add.on_bye && <Tag tone="muted">Bye</Tag>}
        </Side>
        <span aria-hidden className="hidden font-display text-2xl text-muted sm:block">
          ⇄
        </span>
        <Side
          verb="Drop"
          name={drop.name}
          position={drop.position}
          team={drop.team}
          projection={drop.projected_points}
          headshot={drop.projection?.headshot_url ?? null}
        />
      </div>
      <dl className="grid grid-cols-2 gap-3 border-t border-rule pt-3 text-sm sm:grid-cols-3">
        <div>
          <dt className="text-muted">Starting lineup</dt>
          <dd className="font-display text-2xl font-extrabold tabular">{signed(move.starter_gain, two)}</dd>
        </div>
        <div>
          <dt className="text-muted">Projected points swapped</dt>
          <dd className="font-display text-2xl font-extrabold tabular">{signed(move.asset_gain, two)}</dd>
        </div>
        <div className="col-span-2 sm:col-span-1">
          <dt className="text-muted">Lineup after the move</dt>
          <dd className="font-display text-2xl font-extrabold tabular">
            {points(move.new_lineup_projection)}
            <span className="ml-1 text-sm font-normal text-muted">from {points(move.current_lineup_projection)}</span>
          </dd>
        </div>
      </dl>
      <p className="text-sm text-ink-2">{moveReason(move)}</p>
    </article>
  );
}
