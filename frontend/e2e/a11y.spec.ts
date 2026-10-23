import AxeBuilder from "@axe-core/playwright";
import { expect, test } from "@playwright/test";
import { noHorizontalScroll } from "./helpers";

const paths = ["/", "/projections", "/breakouts", "/waivers", "/league"];

for (const path of paths) {
  for (const scheme of ["light", "dark"] as const) {
    test(`${path} has no WCAG A/AA violations (${scheme})`, async ({ page }) => {
      await page.emulateMedia({ colorScheme: scheme });
      await page.goto(path);
      if (path !== "/" && path !== "/league") await expect(page.getByRole("table")).toBeVisible();
      const results = await new AxeBuilder({ page })
        .withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa", "wcag22aa"])
        .analyze();
      const summary = results.violations.map((v) => ({
        id: v.id,
        impact: v.impact,
        nodes: v.nodes.slice(0, 3).map((n) => n.target.join(" ")),
      }));
      expect(summary).toEqual([]);
    });
  }

  test(`${path} never scrolls sideways at 320px`, async ({ page }) => {
    await page.setViewportSize({ width: 320, height: 700 });
    await page.goto(path);
    if (path !== "/" && path !== "/league") await expect(page.getByRole("table")).toBeVisible();
    await noHorizontalScroll(page);
  });
}

test("a loaded league page has no WCAG A/AA violations", async ({ page }) => {
  const fixture = JSON.parse((await import("node:fs")).readFileSync(`${__dirname}/fixtures/league.json`, "utf8"));
  const API = "https://api.sleeper.app/v1";
  const routes: Record<string, unknown> = {
    [`${API}/user/me`]: { user_id: "me", username: "me", display_name: "Me", avatar: null },
    [`${API}/user/me/leagues/nfl/${fixture.league.season}`]: [fixture.league],
    [`${API}/league/fixture`]: fixture.league,
    [`${API}/league/fixture/rosters`]: fixture.rosters,
    [`${API}/league/fixture/users`]: fixture.users,
  };
  await page.route(`${API}/**`, (route) => route.fulfill({ json: routes[route.request().url()] ?? null }));
  await page.goto("/league?user=me&league=fixture");
  await expect(page.getByRole("heading", { name: "Recommended moves" })).toBeVisible();
  const results = await new AxeBuilder({ page }).withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa", "wcag22aa"]).analyze();
  expect(results.violations.map((v) => ({ id: v.id, nodes: v.nodes.slice(0, 3).map((n) => n.target.join(" ")) }))).toEqual([]);
  await page.setViewportSize({ width: 320, height: 700 });
  await noHorizontalScroll(page);
});
