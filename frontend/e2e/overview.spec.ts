import { expect, test } from "@playwright/test";
import { data, one, two } from "./helpers";

const { metrics } = data;

test.beforeEach(async ({ page }) => {
  await page.goto("/");
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
  await expect(page.getByText(`${one(metrics.improvement.mae_pct)}% lower than the baseline`)).toBeVisible();
  await expect(page.getByText(`${one(metrics.improvement.rmse_pct)}% lower; fewer big misses`)).toBeVisible();
  await expect(page.getByText(`${metrics.evaluation.test_rows.toLocaleString("en-US")} player-weeks`)).toBeVisible();
});

test("XGBoost beats the baseline in the published numbers", async () => {
  // Guards the site's main claim: if a refresh ever flips it, the copy must change too.
  expect(metrics.xgboost.mae).toBeLessThan(metrics.baseline.mae);
  expect(metrics.xgboost.rmse).toBeLessThan(metrics.baseline.rmse);
});

test("error-by-week chart and its table show every week", async ({ page }) => {
  const figure = page.locator("figure", { hasText: "Error by week" });
  const won = metrics.by_week.filter((w) => w.xgboost_mae < w.baseline_mae).length;
  await expect(figure).toContainText(`in ${won} of ${metrics.by_week.length} weeks`);

  await figure.getByText("Show as table").click();
  const rows = figure.locator("tbody tr");
  await expect(rows).toHaveCount(metrics.by_week.length);
  for (const [i, w] of metrics.by_week.entries()) {
    await expect(rows.nth(i)).toContainText(`Week ${w.target_week}`);
    await expect(rows.nth(i)).toContainText(two(w.xgboost_mae));
    await expect(rows.nth(i)).toContainText(two(w.baseline_mae));
  }
});

test("switching to RMSE updates both comparison charts", async ({ page }) => {
  await page.getByText("RMSE", { exact: true }).click();
  const weekFigure = page.locator("figure", { hasText: "Error by week" });
  await expect(weekFigure).toContainText("root mean squared error");
  await weekFigure.getByText("Show as table").click();
  await expect(weekFigure.locator("tbody tr").first()).toContainText(two(metrics.by_week[0].xgboost_rmse));

  const posFigure = page.locator("figure", { hasText: "Error by position" });
  await expect(posFigure).toContainText(two(metrics.by_position[0].xgboost_rmse));
});

test("chart values are reachable by keyboard", async ({ page, isMobile }) => {
  test.skip(isMobile, "keyboard focus is a desktop concern");
  const first = metrics.by_week[0];
  const bar = page.getByRole("button", { name: new RegExp(`^Week ${first.target_week}: XGBoost`) });
  await bar.focus();
  await expect(page.getByRole("status").filter({ hasText: `Week ${first.target_week}` })).toContainText(two(first.xgboost_mae));
});

test("calibration and feature charts come from the data", async ({ page }) => {
  const calibration = page.locator("figure", { hasText: "Are the projections honest?" });
  await calibration.getByText("Show as table").click();
  await expect(calibration.locator("tbody tr")).toHaveCount(metrics.calibration.length);

  const features = page.locator("figure", { hasText: "What the model relies on" });
  await expect(features.locator("ol li").first()).toContainText(metrics.feature_importance[0].label);
  await features.getByText("Show as table").click();
  await expect(features.locator("tbody tr")).toHaveCount(metrics.feature_importance.length);
});

test("week at a glance links into each page", async ({ page }) => {
  const topName = data.projections.players.find((p) => !p.on_bye)!.name;
  await expect(page.getByRole("heading", { name: "Top projections" }).locator("..").locator("..")).toContainText(topName);
  await page.getByRole("link", { name: `All ${data.breakouts.count} breakout candidates` }).click();
  await expect(page).toHaveURL("/breakouts");
});
