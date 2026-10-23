// Turns a player's numbers into plain-language story text. Every clause
// comes straight from the data file; nothing is invented, and a clause
// is dropped when its number is missing or not meaningful.

import { points } from "@/lib/format";
import type { BreakoutPlayer, PlayerRecord, WaiverPlayer } from "@/lib/types";

export interface Chip {
  label: string;
  tone: "accent" | "brass" | "neutral" | "muted";
}

const pctPoints = (share: number) => (share * 100).toFixed(1);

export function matchupPhrase(p: PlayerRecord): string {
  if (p.on_bye) return "after his bye";
  if (!p.opponent) return "next week";
  return `${p.home ? "vs" : "at"} ${p.opponent}`;
}

const plural = (n: number, word: string) => `${n} ${word}${n === 1 ? "" : "es"}`;

export function breakoutHeadline(p: BreakoutPlayer): string {
  if ((p.opportunity_change ?? 0) >= 4) return `${p.name}'s workload is climbing`;
  if ((p.target_share_change ?? 0) >= 0.05) return `${p.name} is earning more targets`;
  return `The model is buying ${p.name}`;
}

export function breakoutDek(p: BreakoutPlayer): string {
  const projection = `Projected for ${points(p.projected_points)} points ${matchupPhrase(p)}.`;
  if (p.recent_avg == null) return projection;
  return `${projection} He's averaged ${points(p.recent_avg)} over his last three games.`;
}

export function breakoutChips(p: BreakoutPlayer): Chip[] {
  const chips: Chip[] = [{ label: `+${points(p.projection_gain)} vs 3-wk avg`, tone: "accent" }];
  if ((p.opportunity_change ?? 0) > 0) {
    chips.push({ label: `+${plural(Math.round(p.opportunity_change!), "touch")} vs prior game`, tone: "neutral" });
  }
  if ((p.target_share_change ?? 0) >= 0.01) {
    chips.push({ label: `Target share +${pctPoints(p.target_share_change!)} pts`, tone: "neutral" });
  }
  if (p.on_bye) chips.push({ label: "Bye this week", tone: "muted" });
  return chips;
}

/** Short context line for a waiver pick; the projection is shown beside it. */
export function waiverReason(p: WaiverPlayer): string {
  const parts = [matchupPhrase(p)];
  if (p.recent_avg != null) parts.push(`${points(p.recent_avg)} avg last 3`);
  return parts.join(", ");
}
