import type { ReactNode } from "react";

/**
 * Chart wrapper: title, optional note and legend, the chart, and a
 * table view of the same numbers (so no value is hover-only).
 */
export function ChartFigure({
  title,
  note,
  legend,
  table,
  children,
}: {
  title: string;
  note?: ReactNode;
  legend?: ReactNode;
  table: ReactNode;
  children: ReactNode;
}) {
  return (
    <figure className="flex flex-col gap-3 rounded-lg border border-rule bg-surface p-4 sm:p-5">
      <figcaption className="flex flex-col gap-1">
        <span className="text-lg font-semibold">{title}</span>
        {note && <span className="max-w-prose text-sm text-ink-2">{note}</span>}
      </figcaption>
      {legend}
      {children}
      <details className="group text-sm">
        <summary className="cursor-pointer list-none text-ink-2 hover:text-ink [&::-webkit-details-marker]:hidden">
          <span className="inline-flex items-center gap-1.5 rounded-sm">
            <svg aria-hidden width="10" height="10" viewBox="0 0 10 10" className="transition-transform group-open:rotate-90">
              <path d="M3 1.5 7 5 3 8.5" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
            Show as table
          </span>
        </summary>
        <div className="mt-3 overflow-x-auto">{table}</div>
      </details>
    </figure>
  );
}

export function SimpleTable({
  head,
  rows,
}: {
  head: string[];
  rows: (string | number)[][];
}) {
  return (
    <table className="w-full text-sm tabular">
      <thead>
        <tr>
          {head.map((h, i) => (
            <th key={h} scope="col" className={`border-b border-rule py-1.5 pr-4 font-medium text-ink-2 ${i === 0 ? "text-left" : "text-right"}`}>
              {h}
            </th>
          ))}
        </tr>
      </thead>
      <tbody>
        {rows.map((row, r) => (
          <tr key={r}>
            {row.map((cell, i) => (
              <td key={i} className={`border-b border-rule py-1.5 pr-4 ${i === 0 ? "text-left text-ink-2" : "text-right"}`}>
                {cell}
              </td>
            ))}
          </tr>
        ))}
      </tbody>
    </table>
  );
}
