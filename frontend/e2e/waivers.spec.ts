import { expect, test } from "@playwright/test";
import { data, rowNames, showAll, tableReady } from "./helpers";

const { players, count, availability } = data.waivers;

test.beforeEach(async ({ page }) => {
  await page.goto("/waivers");
});

test("explains that availability is estimated, with the real cutoffs", async ({ page }) => {
  const note = page.getByText("Availability is estimated.").locator("..");
  const c = availability.rostered_cutoffs;
  await expect(note).toContainText(`top ${c.RB} running backs, ${c.WR} receivers and ${c.TE}`);
});

test("lists every target by waiver score with breakout tags", async ({ page }) => {
  test.skip(count === 0, "no targets this week");
  await tableReady(page);
  await showAll(page, count);
  await expect(page.locator("tbody tr")).toHaveCount(count);
  const sorted = [...players].sort((a, b) => b.waiver_score - a.waiver_score);
  expect((await rowNames(page)).slice(0, 3)).toEqual(sorted.slice(0, 3).map((p) => p.name));
  await expect(page.locator("tbody").getByText("Breakout", { exact: true })).toHaveCount(
    players.filter((p) => p.is_breakout).length,
  );
});

test("no likely-rostered player appears", async () => {
  const ranked = [...data.projections.players].sort((a, b) => (b.season_ppr ?? 0) - (a.season_ppr ?? 0));
  const rostered = new Set<string>();
  for (const [position, cutoff] of Object.entries(availability.rostered_cutoffs)) {
    ranked.filter((p) => p.position === position).slice(0, cutoff).forEach((p) => rostered.add(p.player_id));
  }
  expect(players.filter((p) => rostered.has(p.player_id))).toEqual([]);
});

test("Sleeper adds column only appears when that data exists", async ({ page, isMobile }) => {
  test.skip(isMobile, "column is desktop-only");
  await tableReady(page);
  const header = page.getByRole("columnheader", { name: /Sleeper adds/ });
  if (availability.sleeper_trending) await expect(header).toBeAttached();
  else await expect(header).toHaveCount(0);
});
