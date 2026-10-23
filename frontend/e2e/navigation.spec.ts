import { expect, test } from "@playwright/test";
import { data, isPhone } from "./helpers";

const pages = [
  { path: "/", link: "Overview", h1: `Week ${data.meta.projection_week} fantasy moves` },
  { path: "/projections", link: "Projections", h1: `Week ${data.meta.projection_week} projections` },
  { path: "/breakouts", link: "Breakouts", h1: "Breakout watch" },
  { path: "/waivers", link: "Waivers", h1: "Waiver targets" },
];

test("main nav reaches every page and marks the current one", async ({ page }) => {
  await page.goto("/");
  const nav = page.getByRole("navigation", { name: "Main" });
  for (const p of pages) {
    await nav.getByRole("link", { name: p.link }).click();
    await expect(page).toHaveURL(p.path);
    await expect(page.getByRole("heading", { level: 1 })).toHaveText(p.h1);
    await expect(nav.getByRole("link", { name: p.link })).toHaveAttribute("aria-current", "page");
    await expect(nav.locator('[aria-current="page"]')).toHaveCount(1);
  }
});

test("every page says which data it shows", async ({ page }) => {
  const { season, projection_week, data_through_week } = data.meta;
  for (const p of pages.slice(1)) {
    await page.goto(p.path);
    await expect(page.getByText(`${season} season, week ${projection_week}`)).toBeVisible();
    await expect(page.getByText(`projections from data through week ${data_through_week}`)).toBeVisible();
  }
  await page.goto("/");
  await expect(page.getByText(`${season} season, data through week ${data_through_week}`)).toBeVisible();
});

test("pages have distinct titles", async ({ page }) => {
  const titles = new Set<string>();
  for (const p of pages) {
    await page.goto(p.path);
    titles.add(await page.title());
  }
  expect(titles.size).toBe(pages.length);
});

test("skip link jumps to the main content", async ({ page }) => {
  test.skip(isPhone(page), "keyboard navigation is a desktop concern");
  await page.goto("/projections");
  await page.keyboard.press("Tab");
  const skip = page.getByRole("link", { name: "Skip to content" });
  await expect(skip).toBeFocused();
  await expect(skip).toBeVisible();
  await page.keyboard.press("Enter");
  await expect(page).toHaveURL(/#main$/);
});

test("theme toggle switches and remembers the theme", async ({ page }) => {
  await page.emulateMedia({ colorScheme: "light" });
  await page.goto("/");
  const html = page.locator("html");
  await page.getByRole("button", { name: "Switch to dark theme" }).click();
  await expect(html).toHaveAttribute("data-theme", "dark");
  const background = await page.evaluate(() => getComputedStyle(document.body).backgroundColor);
  expect(background).toBe("rgb(11, 22, 44)");

  await page.reload();
  await expect(html).toHaveAttribute("data-theme", "dark");
  await page.getByRole("button", { name: "Switch to light theme" }).click();
  await expect(html).toHaveAttribute("data-theme", "light");
});

test("dark system preference is followed without a stored choice", async ({ page }) => {
  await page.emulateMedia({ colorScheme: "dark" });
  await page.goto("/");
  await expect(page.getByRole("button", { name: "Switch to light theme" })).toBeVisible();
});

test("unknown pages return a helpful 404", async ({ page }) => {
  const response = await page.goto("/not-a-real-page");
  expect(response?.status()).toBe(404);
  await expect(page.getByRole("heading", { level: 1 })).toHaveText("Page not found");
  await page.getByRole("link", { name: "Go to the overview" }).click();
  await expect(page).toHaveURL("/");
});
