import type { ReactNode } from "react";
import { cn } from "@/lib/cn";

export function Skeleton({ className }: { className?: string }) {
  return (
    <div
      aria-hidden
      className={cn("animate-pulse rounded-sm bg-surface-sunk", className)}
    />
  );
}

/** Placeholder rows shaped like the table that will replace them. */
export function TableSkeleton({ rows = 8, label = "Loading data" }: { rows?: number; label?: string }) {
  return (
    <div role="status" aria-label={label} className="divide-y divide-rule rounded-lg border border-rule bg-surface">
      <div className="flex gap-4 bg-surface-sunk px-4 py-3">
        <Skeleton className="h-3 w-24" />
        <Skeleton className="ml-auto h-3 w-12" />
        <Skeleton className="h-3 w-12" />
      </div>
      {Array.from({ length: rows }, (_, i) => (
        <div key={i} className="flex items-center gap-4 px-4 py-3">
          <Skeleton className="h-4 w-8" />
          <Skeleton className="h-4 w-40" />
          <Skeleton className="ml-auto h-4 w-10" />
          <Skeleton className="h-4 w-10" />
        </div>
      ))}
    </div>
  );
}

export function EmptyState({
  title,
  children,
  action,
}: {
  title: string;
  children?: ReactNode;
  action?: ReactNode;
}) {
  return (
    <div className="flex flex-col items-start gap-3 rounded-lg border border-dashed border-rule-strong bg-surface px-6 py-10">
      <h3 className="text-lg font-semibold">{title}</h3>
      {children && <div className="max-w-prose text-sm text-ink-2">{children}</div>}
      {action}
    </div>
  );
}

export function ErrorState({
  title,
  children,
  action,
}: {
  title: string;
  children?: ReactNode;
  action?: ReactNode;
}) {
  return (
    <div
      role="alert"
      className="flex flex-col items-start gap-3 rounded-lg border border-rule bg-surface px-6 py-8 border-l-4 border-l-accent"
    >
      <h3 className="text-lg font-semibold">{title}</h3>
      {children && <div className="max-w-prose text-sm text-ink-2">{children}</div>}
      {action}
    </div>
  );
}
