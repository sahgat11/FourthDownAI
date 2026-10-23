"use client";

import { useId } from "react";
import { cn } from "@/lib/cn";

/** Single-choice filter built on native radios (arrow keys work for free). */
export function SegmentedControl<T extends string>({
  label,
  options,
  value,
  onChange,
  className,
}: {
  label: string;
  options: { value: T; label: string }[];
  value: T;
  onChange: (value: T) => void;
  className?: string;
}) {
  const name = useId();
  return (
    <fieldset className={cn("inline-flex", className)}>
      <legend className="sr-only">{label}</legend>
      <div className="inline-flex rounded-md border border-rule-strong bg-surface p-0.5">
        {options.map((option) => {
          const checked = option.value === value;
          return (
            <label
              key={option.value}
              className={cn(
                "relative flex h-8 cursor-pointer items-center rounded-[4px] px-3 text-sm font-medium transition-colors",
                "has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-offset-1 has-[:focus-visible]:outline-[var(--focus)]",
                checked
                  ? "bg-ink text-surface"
                  : "text-ink-2 hover:bg-surface-sunk hover:text-ink",
              )}
            >
              <input
                type="radio"
                name={name}
                value={option.value}
                checked={checked}
                onChange={() => onChange(option.value)}
                className="sr-only"
              />
              {option.label}
            </label>
          );
        })}
      </div>
    </fieldset>
  );
}
