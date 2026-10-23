/** Yard-line ticks + condensed wordmark. The ticks echo the ScoreBar scale. */
export function Wordmark() {
  return (
    <span className="inline-flex items-center gap-2">
      <svg aria-hidden width="22" height="18" viewBox="0 0 22 18" className="shrink-0">
        <rect x="0" y="3" width="2" height="12" rx="1" fill="var(--rule-strong)" />
        <rect x="6" y="3" width="2" height="12" rx="1" fill="var(--rule-strong)" />
        <rect x="12" y="3" width="2" height="12" rx="1" fill="var(--rule-strong)" />
        <rect x="18" y="0" width="3" height="18" rx="1.5" fill="var(--accent)" />
      </svg>
      <span translate="no" className="font-display text-xl font-extrabold tracking-tight text-ink">
        FourthDown
      </span>
    </span>
  );
}
