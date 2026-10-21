import { cn } from "@/lib/cn";

/**
 * 0–100 score drawn as a stretch of field: a tick every 10, a heavier
 * one at midfield. The ticks are real scale marks, not decoration.
 */
export function ScoreBar({
  value,
  label,
  tone = "accent",
  className,
}: {
  value: number;
  label: string;
  tone?: "accent" | "brass" | "ink";
  className?: string;
}) {
  const clamped = Math.max(0, Math.min(100, value));
  const fill =
    tone === "brass" ? "bg-brass" : tone === "ink" ? "bg-ink-2" : "bg-accent";

  return (
    <div className={cn("flex items-center gap-2.5", className)}>
      <span className="w-9 text-right text-sm font-semibold tabular">
        {clamped.toFixed(1)}
      </span>
      <div
        role="meter"
        aria-label={label}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={clamped}
        className="relative h-2 min-w-16 flex-1 overflow-hidden rounded-[2px] bg-surface-sunk"
      >
        <div
          className={cn("absolute inset-y-0 left-0 rounded-r-[2px]", fill)}
          style={{ width: `${clamped}%` }}
        />
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0"
          style={{
            backgroundImage:
              "repeating-linear-gradient(to right, transparent 0, transparent calc(10% - 1px), var(--surface) calc(10% - 1px), var(--surface) 10%)",
          }}
        />
        <div
          aria-hidden
          className="pointer-events-none absolute inset-y-0 left-1/2 w-[2px] -translate-x-1/2 bg-surface"
        />
      </div>
    </div>
  );
}
