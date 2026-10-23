import fs from "node:fs";
import path from "node:path";
import { expect, test, type Page } from "@playwright/test";
import { buildTeam } from "../src/lib/league/engine";
import { data, one } from "./helpers";

// Sleeper's API is mocked with the parity fixture league, so these tests
// never touch the real Sleeper and the expected moves are known.
const fixture = JSON.parse(fs.readFileSync(path.join(__dirname, "fixtures", "league.json"), "utf8"));
const season = data.meta.season;
const API = "https://api.sleeper.app/v1";
const ME = { user_id: "me", username: "me", display_name: "Me", avatar: null };
const SECOND = { ...fixture.league, league_id: "second", name: "Work League" };

async function mockSleeper(page: Page, overrides: Record<string, unknown> = {}) {
  const routes: Record<string, unknown> = {
    [`${API}/user/me`]: ME,
    [`${API}/user/me/leagues/nfl/${season}`]: [fixture.league, SECOND],
    [`${API}/league/fixture`]: fixture.league,
    [`${API}/league/fixture/rosters`]: fixture.rosters,
    [`${API}/league/fixture/users`]: fixture.users,
    ...overrides,
  };
  await page.route(`${API}/**`, (route) => {
    const url = route.request().url();
    if (url in routes) {
      const body = routes[url];
      return body === "ABORT" ? route.abort("internetdisconnected") : route.fulfill({ json: body });
    }
    return route.fulfill({ json: null });
  });
}

async function connect(page: Page, username = "me") {
  await page.getByLabel("Your Sleeper username").fill(username);
  await page.getByRole("button", { name: "Find my leagues" }).click();
}

test("username to league to recommended moves", async ({ page }) => {
  await mockSleeper(page);
  await page.goto("/league");
  await connect(page);

  await page.getByRole("button", { name: /Parity League/ }).click();
  await expect(page.getByRole("heading", { name: "Recommended moves" })).toBeVisible();
  await expect(page).toHaveURL(/user=me/);
  await expect(page).toHaveURL(/league=fixture/);

  const moves = page.locator("[data-move]");
  await expect(moves).toHaveCount(fixture.expected.moves.length);
  for (const [i, m] of fixture.expected.moves.entries()) {
    await expect(moves.nth(i)).toContainText(m.add);
    await expect(moves.nth(i)).toContainText(m.drop);
    await expect(moves.nth(i)).toContainText(`${m.confidence.toLowerCase()} confidence`);
  }
  const first = fixture.expected.moves[0];
  await expect(moves.first()).toContainText(one(first.new));
});

test("roster and league waivers match the engine", async ({ page }) => {
  await mockSleeper(page);
  await page.goto("/league?user=me&league=fixture");
  const roster = page.getByRole("region", { name: "Your roster" });
  await expect(roster.locator("tbody tr")).toHaveCount(fixture.expected.team.length);
  await expect(roster).toContainText("Not modeled"); // QB / K / DEF
  const mine = fixture.rosters.find((r: { owner_id: string }) => r.owner_id === "me");
  const byes = buildTeam(mine, fixture.league, fixture.league_players, data.projections.players).filter(
    (r) => r.on_bye && ["RB", "WR", "TE"].includes(r.position),
  ).length;
  expect(byes).toBeGreaterThan(0);
  await expect(roster.getByText("Bye", { exact: true })).toHaveCount(byes);

  const available = page.getByRole("region", { name: "Available in your league" });
  await expect(available.locator("tbody [data-player-name]").first()).toHaveText(fixture.expected.waivers[0][0]);
  await expect(available.locator("tbody tr")).toHaveCount(15);
  await available.getByRole("button", { name: `Show all ${fixture.expected.waivers.length}` }).click();
  await expect(available.locator("tbody tr")).toHaveCount(fixture.expected.waivers.length);
});

test("a shared link opens the league directly and can switch leagues", async ({ page }) => {
  await mockSleeper(page, {
    [`${API}/league/second`]: SECOND,
    [`${API}/league/second/rosters`]: fixture.rosters,
    [`${API}/league/second/users`]: fixture.users,
  });
  await page.goto("/league?user=me&league=fixture");
  await expect(page.getByRole("heading", { name: "Recommended moves" })).toBeVisible();
  await expect(page.getByLabel("Your Sleeper username")).toHaveCount(0);
  await page.getByLabel("Switch league").selectOption("second");
  await expect(page.getByText("Work League, 10 teams")).toBeVisible();
  await expect(page).toHaveURL(/league=second/);
});

test("explains an unknown username", async ({ page }) => {
  await mockSleeper(page);
  await page.goto("/league");
  await connect(page, "nobody-here");
  const alert = page.getByRole("alert").filter({ hasText: "Couldn't find that on Sleeper" });
  await expect(alert).toContainText('No Sleeper user named "nobody-here"');
  await expect(alert).toContainText("not your display name");
});

test("explains a user with no leagues this season", async ({ page }) => {
  await mockSleeper(page, { [`${API}/user/me/leagues/nfl/${season}`]: [] });
  await page.goto("/league");
  await connect(page);
  await expect(page.getByRole("alert").filter({ hasText: "No leagues this season" })).toContainText(`${season} NFL leagues`);
});

test("explains a league you're not in", async ({ page }) => {
  const rosters = fixture.rosters.filter((r: { owner_id: string }) => r.owner_id !== "me");
  await mockSleeper(page, { [`${API}/league/fixture/rosters`]: rosters });
  await page.goto("/league?user=me&league=fixture");
  await expect(page.getByRole("alert").filter({ hasText: "You're not on a team in this league" })).toBeVisible();
});

test("recovers from a lost connection with Try again", async ({ page }) => {
  let down = true;
  await page.route(`${API}/**`, (route) => {
    if (down) return route.abort("internetdisconnected");
    const url = route.request().url();
    const routes: Record<string, unknown> = {
      [`${API}/user/me`]: ME,
      [`${API}/user/me/leagues/nfl/${season}`]: [fixture.league],
      [`${API}/league/fixture`]: fixture.league,
      [`${API}/league/fixture/rosters`]: fixture.rosters,
      [`${API}/league/fixture/users`]: fixture.users,
    };
    return route.fulfill({ json: routes[url] ?? null });
  });
  await page.goto("/league");
  await connect(page);
  const alert = page.getByRole("alert").filter({ hasText: "Couldn't reach Sleeper" });
  await expect(alert).toBeVisible();
  down = false;
  await alert.getByRole("button", { name: "Try again" }).click();
  await expect(page.getByRole("heading", { name: "Recommended moves" })).toBeVisible(); // single league opens directly
});

test("remembers the last username on this device", async ({ page }) => {
  await mockSleeper(page);
  await page.goto("/league");
  await connect(page);
  await expect(page.getByRole("heading", { name: "Pick a league" })).toBeVisible();
  await page.goto("/league");
  await expect(page.getByLabel("Your Sleeper username")).toHaveValue("me");
});
