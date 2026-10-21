import type { ReactNode } from "react";
import { cn } from "@/lib/cn";

/** A titled section. Panels are flat: a hairline, no drop shadow. */
export function Panel({
  title,
  description,
  actions,
  children,
  className,
}: {
  title?: string;
  description?: ReactNode;
  actions?: ReactNode;
  children: ReactNode;
  className?: string;
}) {
  return (
    <section className={cn("rounded-lg border border-rule bg-surface p-4 sm:p-5", className)}>
      {(title || actions) && (
        <header className="mb-4 flex flex-wrap items-start justify-between gap-3">
          <div className="flex flex-col gap-1">
            {title && <h2 className="text-lg font-semibold">{title}</h2>}
            {description && <p className="max-w-prose text-sm text-ink-2">{description}</p>}
          </div>
          {actions}
        </header>
      )}
      {children}
    </section>
  );
}
