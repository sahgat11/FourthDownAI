"use client";

import { useMemo, useState, type ReactNode } from "react";
import { Button } from "./Button";
import { cn } from "@/lib/cn";

export interface Column<T> {
  key: string;
  header: string;
  /** Visually shorter header (full header stays as the accessible name). */
  shortHeader?: string;
  align?: "left" | "right";
  render: (row: T) => ReactNode;
  /** Present => column is sortable. */
  sortValue?: (row: T) => number | string | null;
  /** First sort direction when the header is clicked. */
  defaultDirection?: "asc" | "desc";
  /** Hide on narrow screens so phones never scroll sideways for basics. */
  hideBelow?: "sm" | "md" | "lg";
  className?: string;
}

type Sort = { key: string; direction: "asc" | "desc" };

const hide = { sm: "hidden sm:table-cell", md: "hidden md:table-cell", lg: "hidden lg:table-cell" };

export function DataTable<T>({
  columns,
  rows,
  rowKey,
  caption,
  initialSort,
  maxHeight = "70vh",
  rankColumn = false,
  pageSize = 100,
}: {
  columns: Column<T>[];
  rows: T[];
  rowKey: (row: T) => string;
  caption: string;
  initialSort?: Sort;
  maxHeight?: string;
  /** Prepend a 1..n column that reflects the current sort. */
  rankColumn?: boolean;
  /**
   * Long tables render this many rows until the reader asks for the rest
   * (keeps filtering snappy on phones). Sorting and filtering always use
   * every row. Tables only a little longer than this render in full.
   */
  pageSize?: number;
}) {
  const [sort, setSort] = useState<Sort | undefined>(initialSort);
  const [expanded, setExpanded] = useState(false);
  const paginate = !expanded && rows.length > pageSize * 1.25;

  const sorted = useMemo(() => {
    if (!sort) return rows;
    const column = columns.find((c) => c.key === sort.key);
    if (!column?.sortValue) return rows;
    const get = column.sortValue;
    const factor = sort.direction === "asc" ? 1 : -1;
    return [...rows].sort((a, b) => {
      const av = get(a);
      const bv = get(b);
      if (av == null && bv == null) return 0;
      if (av == null) return 1; // nulls last either way
      if (bv == null) return -1;
      if (av < bv) return -1 * factor;
      if (av > bv) return 1 * factor;
      return 0;
    });
  }, [rows, columns, sort]);

  function toggle(column: Column<T>) {
    setSort((current) => {
      if (current?.key === column.key) {
        return { key: column.key, direction: current.direction === "asc" ? "desc" : "asc" };
      }
      return { key: column.key, direction: column.defaultDirection ?? "desc" };
    });
  }

  const visible = paginate ? sorted.slice(0, pageSize) : sorted;

  return (
    <div className="flex flex-col gap-3">
      <div
        className={cn(
          "overflow-x-auto rounded-lg border border-rule bg-surface",
          // Phones scroll the page, not a box inside it; larger screens get a sticky header.
          maxHeight !== "none" && "md:max-h-[var(--table-max-h)] md:overflow-y-auto",
        )}
        style={{ "--table-max-h": maxHeight } as React.CSSProperties}
        tabIndex={0}
        role="region"
        aria-label={caption}
      >
        <table className="w-full border-separate border-spacing-0 text-sm tabular">
          <caption className="sr-only">{caption}</caption>
          <thead>
            <tr>
              {rankColumn && (
                <th
                  scope="col"
                  className="sticky top-0 z-10 hidden w-10 border-b border-rule bg-surface-sunk px-3 py-2.5 text-right text-xs font-medium text-muted sm:table-cell"
                >
                  <span className="sr-only">Rank</span>#
                </th>
              )}
              {columns.map((column) => {
                const active = sort?.key === column.key;
                const ariaSort = active
                  ? sort.direction === "asc"
                    ? "ascending"
                    : "descending"
                  : undefined;
                const right = column.align === "right";
                return (
                  <th
                    key={column.key}
                    scope="col"
                    aria-sort={ariaSort}
                    className={cn(
                      "sticky top-0 z-10 border-b border-rule bg-surface-sunk px-3 py-2.5 text-xs font-medium whitespace-nowrap text-ink-2",
                      right ? "text-right" : "text-left",
                      column.hideBelow && hide[column.hideBelow],
                      column.className,
                    )}
                  >
                    {column.sortValue ? (
                      <button
                        type="button"
                        onClick={() => toggle(column)}
                        className={cn(
                          "inline-flex items-center gap-1 rounded-sm hover:text-ink",
                          right && "flex-row-reverse",
                          active && "text-ink",
                        )}
                      >
                        <span aria-hidden={!!column.shortHeader}>
                          {column.shortHeader ?? column.header}
                        </span>
                        {column.shortHeader && <span className="sr-only">{column.header}</span>}
                        <span aria-hidden className={cn("text-[9px]", active ? "text-accent" : "text-transparent")}>
                          {active && sort.direction === "asc" ? "▲" : "▼"}
                        </span>
                      </button>
                    ) : (
                      <>
                        <span aria-hidden={!!column.shortHeader}>
                          {column.shortHeader ?? column.header}
                        </span>
                        {column.shortHeader && <span className="sr-only">{column.header}</span>}
                      </>
                    )}
                  </th>
                );
              })}
            </tr>
          </thead>
          <tbody>
            {visible.map((row, index) => (
              <tr key={rowKey(row)} className="hover:bg-surface-sunk/70">
                {rankColumn && (
                  <td className="hidden border-b border-rule px-3 py-2.5 text-right text-xs text-muted sm:table-cell">
                    {index + 1}
                  </td>
                )}
                {columns.map((column) => (
                  <td
                    key={column.key}
                    className={cn(
                      "border-b border-rule px-3 py-2.5 align-middle",
                      column.align === "right" ? "text-right" : "text-left",
                      column.hideBelow && hide[column.hideBelow],
                      column.className,
                    )}
                  >
                    {column.render(row)}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {paginate && (
        <div className="flex flex-wrap items-center gap-3 text-sm text-ink-2">
          <span>
            Showing the top {pageSize} of {sorted.length}.
          </span>
          <Button onClick={() => setExpanded(true)}>Show all {sorted.length}</Button>
        </div>
      )}
    </div>
  );
}
