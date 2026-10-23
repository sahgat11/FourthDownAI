import type { ReactNode } from "react";
import { cn } from "@/lib/cn";

type Tone = "neutral" | "accent" | "brass" | "muted";

const tones: Record<Tone, string> = {
  neutral: "bg-surface-sunk text-ink-2 border-rule",
  accent: "bg-accent-soft text-accent-text border-transparent",
  brass: "bg-brass-soft text-brass border-transparent",
  muted: "bg-transparent text-muted border-rule",
};

export function Tag({
  tone = "neutral",
  children,
  className,
}: {
  tone?: Tone;
  children: ReactNode;
  className?: string;
}) {
  return (
    <span
      className={cn(
        "inline-flex h-5 items-center rounded-sm border px-1.5 text-xs font-medium whitespace-nowrap",
        tones[tone],
        className,
      )}
    >
      {children}
    </span>
  );
}
