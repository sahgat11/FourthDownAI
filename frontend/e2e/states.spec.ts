import { expect, test } from "@playwright/test";
import { data } from "./helpers";

const views = [
  { path: "/projections", file: "projections.json", what: "Projections", loading: "Loading projections", empty: "No projections yet", body: data.projections },
  { path: "/breakouts", file: "breakouts.json", what: "Breakout candidates", loading: "Loading breakout candidates", empty: "No breakout candidates this week", body: data.breakouts },
  { path: "/waivers", file: "waivers.json", what: "Waiver targets", loading: "Loading waiver targets", empty: "No waiver targets this week", body: data.waivers },
];

for (const v of views) {
  test.describe(v.path, () => {
    test("shows a placeholder while data loads", async ({ page }) => {
      let release!: () => void;
      const gate = new Promise<void>((r) => (release = r));
      await page.route(`**/data/${v.file}`, async (route) => {
        await gate;
        await route.continue();
      });
      await page.goto(v.path);
      await expect(page.getByRole("status", { name: `${v.loading}…` })).toBeVisible();
      await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
      release();
      await expect(page.getByRole("table")).toBeVisible();
      await expect(page.getByRole("status", { name: `${v.loading}…` })).toHaveCount(0);
    });

    test("explains a failed load and recovers with Try again", async ({ page }) => {
      let fail = true;
      await page.route(`**/data/${v.file}`, (route) =>
        fail ? route.fulfill({ status: 500, body: "error" }) : route.continue(),
      );
      await page.goto(v.path);
      const alert = page.getByRole("alert").filter({ hasText: `${v.what} didn't load` });
      await expect(alert).toContainText("HTTP 500");
      fail = false;
      await alert.getByRole("button", { name: "Try again" }).click();
      await expect(page.getByRole("table")).toBeVisible();
    });

    test("explains a lost connection", async ({ page }) => {
      await page.route(`**/data/${v.file}`, (route) => route.abort("internetdisconnected"));
      await page.goto(v.path);
      await expect(page.getByRole("alert").filter({ hasText: "didn't load" })).toContainText("Check your connection");
    });

    test("refuses data in an unexpected format", async ({ page }) => {
      await page.route(`**/data/${v.file}`, (route) => route.fulfill({ json: { ...v.body, schema_version: 99 } }));
      await page.goto(v.path);
      await expect(page.getByRole("alert").filter({ hasText: "didn't load" })).toContainText("format version");
    });

    test("has a clear empty state", async ({ page }) => {
      await page.route(`**/data/${v.file}`, (route) => route.fulfill({ json: { ...v.body, count: 0, players: [] } }));
      await page.goto(v.path);
      await expect(page.getByRole("heading", { name: v.empty })).toBeVisible();
      await expect(page.getByRole("table")).toHaveCount(0);
    });
  });
}
