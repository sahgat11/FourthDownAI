import fs from "node:fs";
import path from "node:path";
import { expect, type Page } from "@playwright/test";
import type {
  BreakoutsFile,
  MetaFile,
  MetricsFile,
  ProjectionsFile,
  WaiversFile,
} from "../src/lib/types";

// Tests read the same files the site serves, so every assertion checks
// that the page shows what the precompute produced (nothing hardcoded).
function read<T>(name: string): T {
  return JSON.parse(fs.readFileSync(path.join(__dirname, "..", "public", "data", name), "utf8")) as T;
}

export const data = {
  meta: read<MetaFile>("meta.json"),
  metrics: read<MetricsFile>("metrics.json"),
  projections: read<ProjectionsFile>("projections.json"),
  breakouts: read<BreakoutsFile>("breakouts.json"),
  waivers: read<WaiversFile>("waivers.json"),
};

export const one = (v: number) => v.toFixed(1);
export const two = (v: number) => v.toFixed(2);

export const isPhone = (page: Page) => (page.viewportSize()?.width ?? 1280) < 640;

/** Waits for a client-loaded table to finish loading. */
export async function tableReady(page: Page) {
  await expect(page.getByRole("table")).toBeVisible();
}

/**
 * Expands a paginated table so all `total` rows render. Tables split
 * only when they're more than 25% longer than a page (see DataTable).
 */
export async function showAll(page: Page, total: number, pageSize = 100) {
  if (total <= pageSize * 1.25) return;
  await page.getByRole("button", { name: `Show all ${total}` }).click();
}

/** Player names in the visible table, top to bottom. */
export async function rowNames(page: Page): Promise<string[]> {
  return page.locator("tbody [data-player-name]").allInnerTexts();
}

export async function noHorizontalScroll(page: Page) {
  const overflow = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
  expect(overflow).toBeLessThanOrEqual(0);
}
