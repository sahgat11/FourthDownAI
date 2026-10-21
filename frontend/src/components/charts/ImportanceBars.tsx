/** Single-series ranked bars; the section title names the series, so no legend. */
export function ImportanceBars({
  items,
}: {
  items: { label: string; importance: number }[];
}) {
  const max = Math.max(...items.map((i) => i.importance));
  return (
    <ol className="flex flex-col gap-2.5">
      {items.map((item) => (
        <li key={item.label} className="grid grid-cols-[minmax(9rem,13rem)_1fr] items-center gap-3 text-sm">
          <span className="truncate text-ink-2" title={item.label}>{item.label}</span>
          <span className="flex items-center gap-2">
            <span
              className="h-3 rounded-r-[4px] bg-series-model"
              style={{ width: `calc((100% - 3rem) * ${item.importance / max})` }}
            />
            <span className="text-xs tabular text-ink-2">{(item.importance * 100).toFixed(1)}%</span>
          </span>
        </li>
      ))}
    </ol>
  );
}
