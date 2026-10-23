import { expect, test } from "@playwright/test";
import { data, one, two } from "./helpers";

const { metrics, breakouts, waivers, projections } = data;

test.beforeEach(async ({ page }) => {
  await page.goto("/");
});

test("the ticker lists the week's top projections, byes excluded", async ({ page }) => {
  const top = projections.players.filter((p) => !p.on_bye).slice(0, 12);
  const ticker = page.getByRole("region", { name: `Week ${data.meta.projection_week} top projections` });
  const items = ticker.locator("li");
  await expect(items).toHaveCount(top.length);
  await expect(items.first()).toContainText(top[0].name);
  await expect(items.first()).toContainText(one(top[0].projected_points));
});

test("the lead story is the top breakout, written from its data", async ({ page }) => {
  const lead = breakouts.players[0];
  const story = page.locator("[data-story]").first();
  await expect(story).toContainText("Top breakout");
  await expect(story).toContainText(lead.name);
  await expect(story).toContainText(`Projected for ${one(lead.projected_points)} points`);
  await expect(story).toContainText(`+${one(lead.projection_gain)} vs 3-wk avg`);
  await expect(story.getByRole("meter")).toHaveAttribute("aria-valuenow", String(lead.breakout_score));
});

test("breakout stories follow in score order and link to the full list", async ({ page }) => {
  const section = page.getByRole("region", { name: "Breakout watch" });
  const stories = section.locator("[data-story]");
  const expected = breakouts.players.slice(1, 7);
  await expect(stories).toHaveCount(expected.length);
  for (const [i, p] of expected.entries()) {
    await expect(stories.nth(i)).toContainText(p.name);
  }
  await section.getByRole("link", { name: `All ${breakouts.count} breakout candidates` }).click();
  await expect(page).toHaveURL("/breakouts");
});

test("story signals only claim what the data shows", async ({ page }) => {
  const stories = page.locator("[data-story]");
  for (const [i, p] of breakouts.players.slice(0, 7).entries()) {
    const signals = stories.nth(i).getByRole("list", { name: "Signals" });
    if ((p.opportunity_change ?? 0) > 0) {
      await expect(signals).toContainText(`+${Math.round(p.opportunity_change!)} touch`);
    } else {
      await expect(signals).not.toContainText("touch");
    }
    if (p.on_bye) await expect(signals).toContainText("Bye this week");
  }
});

test("the waiver wire sidebar shows the top targets", async ({ page }) => {
  const wire = page.getByRole("region", { name: "Waiver wire" });
  const rows = wire.locator("li");
  await expect(rows).toHaveCount(Math.min(8, waivers.players.length));
  await expect(rows.first()).toContainText(waivers.players[0].name);
  await expect(rows.first()).toContainText(one(waivers.players[0].projected_points));
  await expect(wire.getByText("Breakout", { exact: true })).toHaveCount(
    waivers.players.slice(0, 8).filter((p) => p.is_breakout).length,
  );
});

test("player photos fall back to initials when they can't load", async ({ page }) => {
  await page.route("https://static.www.nfl.com/**", (route) => route.abort());
  await page.goto("/");
  const lead = page.locator("[data-story]").first();
  await lead.scrollIntoViewIfNeeded(); // photos load lazily
  const initials = breakouts.players[0].name.split(" ").map((w) => w[0]);
  await expect(lead.locator("[data-avatar-fallback]")).toBeVisible();
  await expect(lead.locator("[data-avatar-fallback]")).toContainText(initials[0]);
  await expect(lead.locator("img")).toHaveCount(0);
});

test("headline metrics match metrics.json", async ({ page }) => {
  const tiles = [
    { label: "XGBoost mean absolute error", value: two(metrics.xgboost.mae) },
    { label: "Baseline mean absolute error", value: two(metrics.baseline.mae) },
    { label: "XGBoost RMSE", value: two(metrics.xgboost.rmse) },
    { label: "Baseline RMSE", value: two(metrics.baseline.rmse) },
  ];
  for (const tile of tiles) {
    const box = page.locator("div", { has: page.getByText(tile.label, { exact: true }) }).last();
    await expect(box).toContainText(tile.value);
  }
  await expect(page.getByText(`${two(metrics.xgboost.mae)} vs ${two(metrics.baseline.mae)} points of error`)).toBeVisible();
  await expect(page.getByText(`${one(metrics.improvement.mae_pct)}% lower than the baseline`)).toBeVisible();
});

test("XGBoost beats the baseline in the published numbers", async () => {
  expect(metrics.xgboost.mae).toBeLessThan(metrics.baseline.mae);
  expect(metrics.xgboost.rmse).toBeLessThan(metrics.baseline.rmse);
});

test("'Why trust it' jumps to the accuracy section", async ({ page }) => {
  await page.getByRole("link", { name: "Why trust it" }).click();
  await expect(page).toHaveURL(/#accuracy$/);
  await expect(page.getByRole("heading", { name: "Why trust it" })).toBeInViewport();
});

test("accuracy tabs show every view with a table of the same numbers", async ({ page }) => {
  const weekFigure = page.locator("figure", { hasText: "Error by week" });
  const won = metrics.by_week.filter((w) => w.xgboost_mae < w.baseline_mae).length;
  await expect(weekFigure).toContainText(`in ${won} of ${metrics.by_week.length} weeks`);
  await weekFigure.getByText("Show as table").click();
  await expect(weekFigure.locator("tbody tr")).toHaveCount(metrics.by_week.length);
  await expect(weekFigure.locator("tbody tr").first()).toContainText(two(metrics.by_week[0].xgboost_mae));

  const views = page.getByRole("group", { name: "Accuracy view" });
  await views.getByText("By position", { exact: true }).click();
  await expect(page.locator("figure", { hasText: "Error by position" })).toContainText(two(metrics.by_position[0].xgboost_mae));

  await views.getByText("Calibration", { exact: true }).click();
  const calibration = page.locator("figure", { hasText: "Are the projections honest?" });
  await calibration.getByText("Show as table").click();
  await expect(calibration.locator("tbody tr")).toHaveCount(metrics.calibration.length);

  await views.getByText("Inputs", { exact: true }).click();
  const inputs = page.locator("figure", { hasText: "What the model relies on" });
  await expect(inputs.locator("ol li").first()).toContainText(metrics.feature_importance[0].label);
});

test("switching to RMSE updates the comparison charts", async ({ page }) => {
  await page.getByRole("group", { name: "Error measure" }).getByText("RMSE", { exact: true }).click();
  const weekFigure = page.locator("figure", { hasText: "Error by week" });
  await expect(weekFigure).toContainText("root mean squared error");
  await weekFigure.getByText("Show as table").click();
  await expect(weekFigure.locator("tbody tr").first()).toContainText(two(metrics.by_week[0].xgboost_rmse));
});

test("chart values are reachable by keyboard", async ({ page, isMobile }) => {
  test.skip(isMobile, "keyboard focus is a desktop concern");
  const first = metrics.by_week[0];
  const bar = page.getByRole("button", { name: new RegExp(`^Week ${first.target_week}: XGBoost`) });
  await bar.focus();
  await expect(page.getByRole("status").filter({ hasText: `Week ${first.target_week}` })).toContainText(two(first.xgboost_mae));
});
