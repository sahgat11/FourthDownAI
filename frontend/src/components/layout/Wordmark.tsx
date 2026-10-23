/** Yard-line ticks + varsity block wordmark. The ticks echo the ScoreBar scale. */
export function Wordmark() {
  return (
    <span className="inline-flex items-center gap-2.5">
      <svg aria-hidden width="22" height="20" viewBox="0 0 22 20" className="shrink-0">
        <rect x="0" y="4" width="2" height="12" rx="1" fill="var(--header-ink-2)" opacity="0.55" />
        <rect x="6" y="4" width="2" height="12" rx="1" fill="var(--header-ink-2)" opacity="0.55" />
        <rect x="12" y="4" width="2" height="12" rx="1" fill="var(--header-ink-2)" opacity="0.55" />
        <rect x="18" y="1" width="3" height="18" rx="1.5" fill="var(--accent)" />
      </svg>
      <span translate="no" className="font-varsity text-[1.35rem] leading-none text-header-ink">
        FourthDown
      </span>
    </span>
  );
}
