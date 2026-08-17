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
