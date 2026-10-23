import type { ReactNode } from "react";
import { cn } from "@/lib/cn";

/**
 * A headline number. The numeral is the loudest thing on a page, so it
 * uses the condensed display width; everything around it stays quiet.
 */
export function StatTile({
  label,
  value,
  unit,
  detail,
  emphasis = false,
  compact = false,
  className,
}: {
  label: string;
  value: string;
  unit?: string;
  detail?: ReactNode;
  emphasis?: boolean;
  /** Smaller numerals for supporting stats (not a page's headline figure). */
  compact?: boolean;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "flex flex-col gap-2 border-t-2 pt-3",
        emphasis ? "border-accent" : "border-rule-strong",
        className,
      )}
    >
      <span className="text-sm text-ink-2">{label}</span>
      <span className="flex items-baseline gap-1.5">
        <span
          className={cn(
            "font-display leading-none font-extrabold",
            compact ? "text-4xl" : "text-[2.5rem] xs:text-4xl sm:text-5xl",
            emphasis ? "text-ink" : "text-ink-2",
          )}
        >
          {value}
        </span>
        {unit && <span className="text-sm text-muted">{unit}</span>}
      </span>
      {detail && <span className="text-sm text-ink-2">{detail}</span>}
    </div>
  );
}
