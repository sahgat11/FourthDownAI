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
  className,
}: {
  label: string;
  value: string;
  unit?: string;
  detail?: ReactNode;
  emphasis?: boolean;
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
            "font-display text-4xl font-extrabold sm:text-5xl",
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
