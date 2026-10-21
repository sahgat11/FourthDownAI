import Link from "next/link";
import type { ReactNode } from "react";
import { PositionBadge } from "@/components/ui/PositionBadge";
import type { PlayerRecord } from "@/lib/types";

export function ThisWeekList<T extends PlayerRecord>({
  title,
  description,
  players,
  value,
  href,
  linkLabel,
}: {
  title: string;
  description: string;
  players: T[];
  value: (p: T) => ReactNode;
  href: string;
  linkLabel: string;
}) {
  return (
    <section className="flex flex-col rounded-lg border border-rule bg-surface">
      <header className="flex flex-col gap-1 border-b border-rule px-4 py-3.5">
        <h3 className="text-base font-semibold">{title}</h3>
        <p className="text-sm text-ink-2">{description}</p>
      </header>
      <ul className="flex-1 divide-y divide-rule">
        {players.map((p) => (
          <li key={p.player_id} className="flex items-center gap-2.5 px-4 py-2.5 text-sm">
            <PositionBadge position={p.position} />
            <span className="min-w-0 flex-1 truncate">
              <span className="font-medium text-ink">{p.name}</span>{" "}
              <span className="text-muted">{p.team}</span>
            </span>
            <span className="tabular">{value(p)}</span>
          </li>
        ))}
      </ul>
      <Link
        href={href}
        className="rounded-b-lg border-t border-rule px-4 py-3 text-sm font-medium text-accent-text hover:bg-surface-sunk"
      >
        {linkLabel}
      </Link>
    </section>
  );
}
