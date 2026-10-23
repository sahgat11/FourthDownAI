import AxeBuilder from "@axe-core/playwright";
import { expect, test } from "@playwright/test";
import { noHorizontalScroll } from "./helpers";

const paths = ["/", "/projections", "/breakouts", "/waivers"];

for (const path of paths) {
  for (const scheme of ["light", "dark"] as const) {
    test(`${path} has no WCAG A/AA violations (${scheme})`, async ({ page }) => {
      await page.emulateMedia({ colorScheme: scheme });
      await page.goto(path);
      if (path !== "/") await expect(page.getByRole("table")).toBeVisible();
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
    if (path !== "/") await expect(page.getByRole("table")).toBeVisible();
    await noHorizontalScroll(page);
  });
}
