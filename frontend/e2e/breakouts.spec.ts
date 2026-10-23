import { expect, test } from "@playwright/test";
import { data, rowNames, tableReady } from "./helpers";

const { players, count, criteria } = data.breakouts;

test.beforeEach(async ({ page }) => {
  await page.goto("/breakouts");
});

test("lists every candidate by breakout score", async ({ page }) => {
  test.skip(count === 0, "no candidates this week");
  await tableReady(page);
  await expect(page.getByText(`${count} candidates`, { exact: true })).toBeVisible();
  await expect(page.locator("tbody tr")).toHaveCount(count);
  const sorted = [...players].sort((a, b) => b.breakout_score - a.breakout_score);
  expect((await rowNames(page)).slice(0, 3)).toEqual(sorted.slice(0, 3).map((p) => p.name));
  await expect(page.getByRole("meter").first()).toHaveAttribute("aria-valuenow", String(sorted[0].breakout_score));
});

test("criteria on the page match the data", async ({ page }) => {
  const intro = page.locator("main p").filter({ hasText: "Players whose week" });
  await expect(intro).toContainText(`at least ${criteria.min_projection_gain.toFixed(1)} points above`);
  await expect(intro).toContainText(`at least ${criteria.min_projected_points.toFixed(1)} points overall`);
  await expect(page.getByText(`(${Math.round(criteria.weights.gain * 100)}%)`)).toBeVisible();
});

test("every listed player meets the criteria", async () => {
  for (const p of players) {
    expect(p.projected_points).toBeGreaterThanOrEqual(criteria.min_projected_points);
    expect(p.projection_gain).toBeGreaterThanOrEqual(criteria.min_projection_gain);
  }
});

test("position filter narrows the list", async ({ page }) => {
  await tableReady(page);
  const wrs = players.filter((p) => p.position === "WR").length;
  test.skip(wrs === 0, "no WR candidates");
  await page.getByRole("group", { name: "Position" }).getByText("WR", { exact: true }).click();
  await expect(page.locator("tbody tr")).toHaveCount(wrs);
});
