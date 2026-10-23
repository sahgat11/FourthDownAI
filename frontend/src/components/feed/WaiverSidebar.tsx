import Link from "next/link";
import { Tag } from "@/components/ui/Tag";
import { points } from "@/lib/format";
import type { WaiverPlayer } from "@/lib/types";
import { PlayerAvatar } from "./PlayerAvatar";
import { waiverReason } from "./storyCopy";

export function WaiverSidebar({ players, total }: { players: WaiverPlayer[]; total: number }) {
  return (
    <section aria-labelledby="waiver-wire" className="rounded-lg border border-rule bg-surface">
      <header className="flex items-center justify-between gap-3 border-b-[3px] border-accent px-4 py-3">
        <h2 id="waiver-wire" className="text-2xl font-extrabold">
          Waiver wire
        </h2>
        <span className="text-xs text-muted">Likely available</span>
      </header>
      <ol className="divide-y divide-rule">
        {players.map((p, i) => (
          <li key={p.player_id} className="flex items-center gap-3 px-4 py-3">
            <span className="w-4 font-display text-lg font-bold text-muted">{i + 1}</span>
            <PlayerAvatar player={p} size={40} />
            <span className="flex min-w-0 flex-1 flex-col">
              <span className="flex flex-wrap items-center gap-x-2">
                <span className="truncate text-sm font-semibold text-ink">{p.name}</span>
                {p.is_breakout && <Tag tone="brass">Breakout</Tag>}
              </span>
              <span className="truncate text-xs text-muted">
                {p.position} {p.team}, {waiverReason(p)}
              </span>
            </span>
            <span className="font-display text-xl font-extrabold text-ink tabular">{points(p.projected_points)}</span>
          </li>
        ))}
      </ol>
      <div className="flex flex-wrap justify-between gap-2 rounded-b-lg border-t border-rule px-4 py-3 text-sm font-semibold">
        <Link href="/waivers" className="text-accent-text hover:underline">
          All {total} waiver targets
        </Link>
        <Link href="/league" className="text-ink-2 hover:text-ink hover:underline">
          Check your league&apos;s wire
        </Link>
      </div>
    </section>
  );
}
