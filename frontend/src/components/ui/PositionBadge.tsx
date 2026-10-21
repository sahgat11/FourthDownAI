import type { Position } from "@/lib/types";

const names: Record<Position, string> = {
  RB: "Running back",
  WR: "Wide receiver",
  TE: "Tight end",
};

/** Neutral by design: position is identity, not a color-coded series. */
export function PositionBadge({ position }: { position: Position }) {
  return (
    <abbr
      title={names[position]}
      className="inline-flex h-5 w-8 items-center justify-center rounded-sm border border-rule-strong text-[11px] font-semibold text-ink-2 no-underline font-semi-condensed"
    >
      {position}
    </abbr>
  );
}
