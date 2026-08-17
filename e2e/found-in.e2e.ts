import type { Page } from "@playwright/test";

import { expect, test } from "./fixtures";

/**
 * "Where do I get this character" — the `found_in` join, rendered on the player
 * sheet. The fixtures pin the UI to French, so the assertions use the French
 * catalogue names.
 */

function panel(page: Page) {
  return page
    .locator("section")
    .filter({ has: page.getByRole("heading", { name: "Où l'obtenir" }) });
}

function group(page: Page, kind: "match" | "universe") {
  return panel(page).locator(`[data-found-in-group="${kind}"]`);
}

/** The chips of one group, in render order. */
async function chipsIn(page: Page, kind: "match" | "universe"): Promise<string[]> {
  const list = group(page, kind).locator("li");
  return (await list.allTextContents()).map((text) => text.trim());
}

test("a player sheet says which battles and star signs drop the spirit", async ({ page }) => {
  await page.goto("/wiki/players/1");
  await expect(page.getByRole("heading", { name: "Mark Evans" }).first()).toBeVisible();
  await expect(panel(page)).toBeVisible();

  // Matches first — a battle is something you go and do; a star sign is a draw.
  await expect(panel(page).locator("[data-found-in-group]").first()).toHaveAttribute(
    "data-found-in-group",
    "match",
  );
  await expect(group(page, "match").locator("p").first()).toHaveText("Matchs5 lieux");
  await expect(group(page, "universe").locator("p").first()).toHaveText("Univers du joueur3 lieux");

  // Sorted by French name inside each group.
  expect(await chipsIn(page, "match")).toEqual([
    "Duel au sommet contre les Petits géants",
    "Epsilon + contre-attaque",
    "L'Alius Academy attaque !",
    "La contre-attaque de la Royal",
    "Match au sommet contre ce diable d'Epsilon",
  ]);
  expect(await chipsIn(page, "universe")).toEqual(["Diamandis", "Maindora", "Notaria Entrainus"]);
});

test("a character no drop table covers says so instead of showing an empty list", async ({
  page,
}) => {
  await page.goto("/wiki/players/3325");
  await expect(panel(page)).toBeVisible();
  await expect(
    panel(page).getByText("Aucune table de butin ne donne l'esprit de ce personnage."),
  ).toBeVisible();
  await expect(panel(page).locator("li")).toHaveCount(0);
});

test("the battle the game leaves unnamed is labelled and sinks to the bottom", async ({ page }) => {
  await page.goto("/wiki/players/5");
  await expect(panel(page)).toBeVisible();

  const matches = await chipsIn(page, "match");
  expect(matches).toHaveLength(4);
  expect(matches.at(-1)).toBe("Match sans nom dans le jeu");
  // Singular, so the plural rule is exercised in both directions.
  await expect(group(page, "universe").locator("p").first()).toHaveText("Univers du joueur1 lieu");
});

test("one battle shipped at several difficulties is listed once", async ({ page }) => {
  await page.goto("/wiki/players/2666");
  await expect(panel(page)).toBeVisible();

  // The dump gives this character 18 match ids that collapse onto 9 names.
  const matches = await chipsIn(page, "match");
  expect(matches).toHaveLength(9);
  expect(new Set(matches).size).toBe(9);
  await expect(group(page, "match").locator("p").first()).toHaveText("Matchs9 lieux");
});

test("the obtainable filter narrows the roster to characters a drop table lists", async ({
  page,
}) => {
  await page.goto("/wiki/players");
  const count = page.locator(".muted.tnum").first();
  await expect(count).toHaveText(/5\s*382 entrées/);

  const filter = page.getByRole("button", { name: "Obtenable" });
  await filter.click();
  await expect(filter).toHaveAttribute("aria-pressed", "true");
  // 4856 of 5382 — the old spirit-drop flag would have said 396.
  await expect(count).toHaveText(/4\s*856 entrées/);
});

test("the locations catalogue is fetched for a player sheet and not for the builder", async ({
  page,
}) => {
  const requested: string[] = [];
  await page.route("**/data/*.json", (route) => {
    requested.push(new URL(route.request().url()).pathname.split("/").pop() ?? "");
    return route.continue();
  });

  await page.goto("/");
  await expect(page.getByLabel("Nom de l'équipe")).toBeVisible();
  expect(requested).toContain("players.json");
  expect(requested).not.toContain("locations.json");

  await page.goto("/wiki/players/1");
  await expect(panel(page)).toBeVisible();
  expect(requested).toContain("locations.json");
});

test("the locations catalogue ranks by how many players a place hands out", async ({ page }) => {
  await page.goto("/wiki/locations");
  const rows = page.locator("li a[href^='/wiki/locations/']");
  await expect(rows.first()).toBeVisible();

  const counts = await page.locator("li a[href^='/wiki/locations/'] span.tnum").allTextContents();
  const numbers = counts.map((text) => Number(text.replace(/\D/g, "")));
  expect(numbers.length).toBeGreaterThan(10);
  // Ranked, so the first screen answers "where do I get the most out of a run".
  expect([...numbers].sort((a, b) => b - a)).toEqual(numbers);

  // Scoped to the list: the kind filter itself carries both labels.
  const list = page.locator("ul").filter({ has: rows.first() });
  await page.getByRole("button", { name: "Matchs", exact: true }).click();
  await expect(list.getByText("Matchs", { exact: true }).first()).toBeVisible();
  await expect(list.getByText("Univers du joueur", { exact: true })).toHaveCount(0);
});

test("a location names the players it hands out, and they link back", async ({ page }) => {
  await page.goto("/wiki/locations/tgs24_0001");

  // The one match the game names in no language at all.
  await expect(page.getByRole("heading", { name: "Match sans nom dans le jeu" })).toBeVisible();
  await expect(
    page.getByText("Le jeu ne nomme ce match dans aucune des trois langues."),
  ).toBeVisible();

  const players = page.locator("li a[href^='/wiki/players/']");
  await expect(players).toHaveCount(6);
  await expect(page.getByText("6 joueurs")).toBeVisible();

  await players.first().click();
  await expect(page).toHaveURL(/\/wiki\/players\/\d+$/);
});

test("a player sheet links out to each place that drops them", async ({ page }) => {
  await page.goto("/wiki/players/1");
  const chip = page.locator('[data-found-in-group="universe"] a').filter({ hasText: "Diamandis" });
  await chip.click();

  await expect(page).toHaveURL(/\/wiki\/locations\/star_/);
  await expect(page.getByRole("heading", { name: "Diamandis" }).first()).toBeVisible();
  // Round trip: the player we came from is listed here.
  await expect(page.locator("li a[href='/wiki/players/1']")).toHaveCount(1);
});
