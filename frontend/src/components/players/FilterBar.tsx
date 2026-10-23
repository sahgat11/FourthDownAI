"use client";

import { SegmentedControl } from "@/components/ui/SegmentedControl";
import { POSITION_OPTIONS, type PositionFilter } from "./usePlayerFilter";

export function FilterBar({
  position,
  onPosition,
  query,
  onQuery,
  hideByes,
  onHideByes,
  shown,
  total,
  noun = "players",
}: {
  position: PositionFilter;
  onPosition: (p: PositionFilter) => void;
  query?: string;
  onQuery?: (q: string) => void;
  hideByes?: boolean;
  onHideByes?: (v: boolean) => void;
  shown: number;
  total: number;
  noun?: string;
}) {
  return (
    <div className="flex flex-wrap items-center gap-x-4 gap-y-3">
      <SegmentedControl<PositionFilter>
        label="Position"
        value={position}
        onChange={onPosition}
        options={POSITION_OPTIONS}
      />
      {onQuery && (
        <label className="relative flex min-w-0 flex-1 basis-56 sm:max-w-72 sm:flex-none">
          <span className="sr-only">Search players or teams</span>
          <svg aria-hidden className="pointer-events-none absolute top-1/2 left-3 -translate-y-1/2 text-muted" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
            <circle cx="11" cy="11" r="7" />
            <path d="m20 20-3.5-3.5" />
          </svg>
          <input
            type="search"
            name="q"
            autoComplete="off"
            spellCheck={false}
            enterKeyHint="search"
            value={query}
            onChange={(e) => onQuery(e.target.value)}
            placeholder="Search players or teams…"
            className="h-9 w-full rounded-md border border-rule-strong bg-surface pr-3 pl-9 text-sm text-ink placeholder:text-muted"
          />
        </label>
      )}
      {onHideByes && (
        <label className="inline-flex cursor-pointer items-center gap-2 text-sm text-ink-2">
          <input
            type="checkbox"
            checked={hideByes}
            onChange={(e) => onHideByes(e.target.checked)}
            className="h-4 w-4 accent-[var(--accent)]"
          />
          Hide bye weeks
        </label>
      )}
      <p className="text-sm text-muted sm:ml-auto" aria-live="polite">
        {shown === total ? `${total} ${noun}` : `${shown} of ${total} ${noun}`}
      </p>
    </div>
  );
}
