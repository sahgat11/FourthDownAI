export interface LegendItem {
  label: string;
  color: string; // CSS color or var()
  mark?: "bar" | "line";
}

export function Legend({ items }: { items: LegendItem[] }) {
  return (
    <ul className="flex flex-wrap items-center gap-x-5 gap-y-1 text-sm text-ink-2">
      {items.map((item) => (
        <li key={item.label} className="inline-flex items-center gap-2">
          <span
            aria-hidden
            className={item.mark === "line" ? "h-[2px] w-4 rounded-full" : "h-3 w-3 rounded-[3px]"}
            style={{ background: item.color }}
          />
          {item.label}
        </li>
      ))}
    </ul>
  );
}
