import { direction, signed } from "@/lib/format";
import { cn } from "@/lib/cn";

/** Signed change with a direction glyph; color stays ink so sign + glyph carry meaning. */
export function Delta({
  value,
  format,
  className,
  label,
}: {
  value: number | null;
  format?: (v: number) => string;
  className?: string;
  label?: string;
}) {
  if (value == null) return <span className="text-muted">–</span>;
  const dir = direction(value, format);
  const up = dir === 1;
  const down = dir === -1;
  return (
    <span
      className={cn("inline-flex items-center gap-1 tabular whitespace-nowrap", className)}
      aria-label={label ? `${label} ${signed(value, format)}` : undefined}
    >
      <span
        aria-hidden
        className={cn("text-[9px]", up ? "text-accent" : "text-muted")}
      >
        {up ? "▲" : down ? "▼" : "•"}
      </span>
      {signed(value, format)}
    </span>
  );
}
