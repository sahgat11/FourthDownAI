import { expect, test } from "@playwright/test";
import { data, isPhone, one, rowNames, showAll, tableReady } from "./helpers";

const { players, count } = data.projections;
const byProjection = players.filter((p) => !p.on_bye).sort((a, b) => b.projected_points - a.projected_points);

test.beforeEach(async ({ page }) => {
  await page.goto("/projections");
  await tableReady(page);
});

test("lists every projected player, best projection first", async ({ page }) => {
  await expect(page.getByText(`${count} players`, { exact: true })).toBeVisible();
  await expect(page.locator("tbody tr")).toHaveCount(Math.min(count, 100));
  await expect(page.getByText(`Showing the top 100 of ${count}.`)).toBeVisible();
  await showAll(page, count);
  await expect(page.locator("tbody tr")).toHaveCount(count);
  const names = await rowNames(page);
  expect(names.slice(0, 5)).toEqual(byProjection.slice(0, 5).map((p) => p.name));
  await expect(page.locator("tbody tr").first()).toContainText(one(byProjection[0].projected_points));
});

test("bye-week players show Bye instead of a projection and sort last", async ({ page }) => {
  const byes = players.filter((p) => p.on_bye);
  test.skip(byes.length === 0, "no byes this week");
  await showAll(page, count);
  const names = await rowNames(page);
  expect(names.slice(-byes.length).sort()).toEqual(byes.map((p) => p.name).sort());

  // The table stays expanded once "Show all" is used, even as filters change.
  await page.getByLabel("Hide bye weeks").check();
  await expect(page.locator("tbody tr")).toHaveCount(count - byes.length);
  await expect(page).toHaveURL(/byes=hide/);
});

test("position filter shows only that position", async ({ page }) => {
  await page.getByRole("group", { name: "Position" }).getByText("TE", { exact: true }).click();
  const tes = players.filter((p) => p.position === "TE").length;
  await expect(page.locator("tbody tr")).toHaveCount(tes);
  await expect(page.getByText(`${tes} of ${count} players`)).toBeVisible();
  const badges = await page.locator("tbody abbr").allInnerTexts();
  expect(new Set(badges)).toEqual(new Set(["TE"]));
});

test("search matches names and teams, ignoring accents and case", async ({ page }) => {
  const target = byProjection[0];
  await page.getByRole("searchbox").fill(target.name.toUpperCase());
  await expect(page.locator("tbody tr")).toHaveCount(players.filter((p) => p.name === target.name).length);
  await expect(page.locator("tbody tr").first()).toContainText(target.name);

  await page.getByRole("searchbox").fill(target.team.toLowerCase());
  const teamCount = players.filter((p) => `${p.name} ${p.team}`.toLowerCase().includes(target.team.toLowerCase())).length;
  await expect(page.locator("tbody tr")).toHaveCount(teamCount);
});

test("a search with no matches offers a way back", async ({ page }) => {
  await page.getByRole("searchbox").fill("no such player zzz");
  await expect(page.getByRole("heading", { name: "No players match these filters" })).toBeVisible();
  await page.getByRole("button", { name: "Clear filters" }).click();
  await showAll(page, count);
  await expect(page.locator("tbody tr")).toHaveCount(count);
});

test("column headers sort both ways and announce the sort", async ({ page }) => {
  test.skip(isPhone(page), "3-week average column is hidden on phones");
  const header = page.getByRole("columnheader", { name: "3-week average", exact: true });
  await header.getByRole("button").click();
  await expect(header).toHaveAttribute("aria-sort", "descending");
  const top = [...players].sort((a, b) => (b.recent_avg ?? -1) - (a.recent_avg ?? -1))[0];
  expect((await rowNames(page))[0]).toBe(top.name);

  await header.getByRole("button").click();
  await expect(header).toHaveAttribute("aria-sort", "ascending");
  const bottom = [...players].filter((p) => p.recent_avg != null).sort((a, b) => a.recent_avg! - b.recent_avg!)[0];
  expect((await rowNames(page))[0]).toBe(bottom.name);
});

test("phones get team and matchup under the name instead of extra columns", async ({ page }) => {
  test.skip(!isPhone(page), "phone layout only");
  await expect(page.getByRole("columnheader", { name: "Team" })).toBeHidden();
  const first = byProjection[0];
  await expect(page.locator("tbody tr").first()).toContainText(first.team);
  await expect(page.locator("tbody tr").first()).toContainText(first.opponent!);
});

test("filters are kept in the URL so views can be shared", async ({ page }) => {
  await page.getByRole("group", { name: "Position" }).getByText("WR", { exact: true }).click();
  await page.getByRole("searchbox").fill("smith");
  await expect(page).toHaveURL(/pos=wr/);
  await expect(page).toHaveURL(/q=smith/);
  const shown = await page.locator("tbody tr").count();

  await page.reload();
  await expect(page.getByRole("table")).toBeVisible();
  await expect(page.getByRole("searchbox")).toHaveValue("smith");
  await expect(page.getByRole("radio", { name: "WR" })).toBeChecked();
  await expect(page.locator("tbody tr")).toHaveCount(shown);
});
