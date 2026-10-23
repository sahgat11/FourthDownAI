import Link from "next/link";
import { count, points } from "@/lib/format";
import type { BreakoutsFile, WaiversFile } from "@/lib/types";

/**
 * The pitch: what FourthDown does that a projection site doesn't. Every
 * number in the "this week" receipts comes from the data files.
 */
export function EdgeBand({ breakouts, waivers }: { breakouts: BreakoutsFile; waivers: WaiversFile }) {
  const biggest = breakouts.players.reduce<BreakoutsFile["players"][number] | undefined>(
    (best, p) => (!best || p.projection_gain > best.projection_gain ? p : best),
    undefined,
  );
  const topWaiver = waivers.players[0];
  const cut = waivers.availability.rostered_cutoffs;
  const minGain = breakouts.criteria.min_projection_gain;

  const pillars = [
    {
      title: "Catch breakouts early",
      body: `Points are a lagging stat. We flag players whose role is growing, with more touches and a bigger target share, and who project at least ${points(minGain)} points above their recent average before the box score shows it.`,
      receipt: biggest
        ? `${count(breakouts.count)} breakouts this week. Biggest jump: ${biggest.name}, +${points(biggest.projection_gain)} over his 3-week average.`
        : "No breakout candidates this week.",
      href: "/breakouts",
      cta: "Breakout watch",
    },
    {
      title: "Only players you can get",
      body: `A top-20 list of stars doesn't help on waiver day. We drop anyone likely rostered in a 12-team league (the top ${cut.RB} RB, ${cut.WR} WR and ${cut.TE} TE) and rank who's left.`,
      receipt: topWaiver
        ? `${count(waivers.count)} pickups this week. Top claim: ${topWaiver.name}, ${points(topWaiver.projected_points)} projected.`
        : "No waiver targets this week.",
      href: "/waivers",
      cta: "Waiver wire",
    },
    {
      title: "Moves for your roster",
      body: "Enter your Sleeper username and we check your league's actual wire against your bench, then tell you exactly who to add, who to drop, and how many points it's worth.",
      receipt: "No sign-up. Runs in your browser.",
      href: "/league",
      cta: "Connect your league",
    },
  ];

  return (
    <section aria-labelledby="edge-title" className="overflow-hidden rounded-lg border border-header-rule bg-header text-header-ink">
      <div className="varsity-stripe" aria-hidden />
      <div className="flex flex-col gap-8 px-5 py-8 sm:px-8 sm:py-10">
        <div className="flex flex-col gap-3">
          <p className="font-display text-sm font-bold tracking-[0.12em] text-header-accent uppercase">
            Beyond the projection
          </p>
          <h2 id="edge-title" className="text-4xl leading-none font-extrabold text-balance text-header-ink sm:text-5xl lg:text-6xl">
            Anyone can project points. <span className="block text-header-accent">We find the edge.</span>
          </h2>
          <p className="max-w-[60ch] text-lg text-header-ink-2">
            Projections tell you who should score. FourthDown tells you who&apos;s about to break out,
            who you can actually pick up, and who to cut to make room.
          </p>
        </div>
        <ol className="grid grid-cols-1 gap-px overflow-hidden rounded-md bg-header-rule md:grid-cols-3">
          {pillars.map((p, i) => (
            <li key={p.title} className="flex min-w-0 flex-col gap-3 bg-header p-5 sm:p-6">
              <span aria-hidden className="font-display text-5xl leading-none font-extrabold text-header-accent tabular">
                {String(i + 1).padStart(2, "0")}
              </span>
              <h3 className="font-display text-2xl leading-tight font-extrabold text-header-ink">{p.title}</h3>
              <p className="text-sm text-header-ink-2">{p.body}</p>
              <p className="mt-auto border-l-[3px] border-header-accent pl-3 text-sm font-medium text-header-ink">
                {p.receipt}
              </p>
              <Link
                href={p.href}
                className="font-display text-base font-bold tracking-wide text-header-ink uppercase underline decoration-header-accent decoration-2 underline-offset-4 hover:text-header-accent"
              >
                {p.cta} <span aria-hidden>→</span>
              </Link>
            </li>
          ))}
        </ol>
      </div>
    </section>
  );
}
