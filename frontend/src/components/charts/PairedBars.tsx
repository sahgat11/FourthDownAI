import { metric } from "@/lib/format";

export interface PairedDatum {
  label: string;
  model: number;
  baseline: number;
  n: number;
}

/** Horizontal paired bars with values at the tips (few bars, so labels stay sparse). */
export function PairedBars({ data }: { data: PairedDatum[] }) {
  const max = Math.max(...data.flatMap((d) => [d.model, d.baseline]));
  return (
    <ul className="flex flex-col gap-4">
      {data.map((d) => (
        <li key={d.label} className="grid grid-cols-[2.5rem_1fr] items-center gap-3">
          <span className="text-sm font-semibold text-ink-2">{d.label}</span>
          <div className="flex flex-col gap-[2px]">
            {[
              { v: d.model, color: "var(--series-model)", name: "XGBoost" },
              { v: d.baseline, color: "var(--series-baseline)", name: "Baseline" },
            ].map((bar) => (
              <div key={bar.name} className="flex items-center gap-2">
                <div
                  className="h-3 rounded-r-[4px]"
                  style={{ width: `calc((100% - 3.5rem) * ${bar.v / max})`, background: bar.color }}
                  title={`${bar.name} ${metric(bar.v)}`}
                />
                <span className="text-xs tabular text-ink-2">
                  <span className="sr-only">{bar.name} </span>
                  {metric(bar.v)}
                </span>
              </div>
            ))}
          </div>
        </li>
      ))}
    </ul>
  );
}
