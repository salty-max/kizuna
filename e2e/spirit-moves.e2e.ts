import { expect, test } from "./fixtures";

/**
 * `auras[].skill_id` — the move a spirit puts in a character's hands. 228 of the
 * 443 auras carry one, and the wiki reads the link from both ends.
 */

const AMATERASU = "1355982814"; // keshin
const AURORA_ARROW = "-1840631725"; // the move it grants
const LUCKY_DRAW = "-861371110"; // granted by three distinct spirits
const PLAIN_MOVE = "1942335296"; // learned by levelling, no spirit either way

test("a spirit names the move it grants, and the move links back", async ({ page }) => {
  await page.goto(`/wiki/abilities/${encodeURIComponent(AMATERASU)}`);
  await expect(page.getByText("Technique accordée")).toBeVisible();

  const granted = page.locator(`a[href*="${encodeURIComponent(AURORA_ARROW)}"]`);
  await expect(granted).toContainText("Flèche de l'aube");
  await granted.click();

  await expect(page).toHaveURL(new RegExp(encodeURIComponent(AURORA_ARROW).replace("-", "\\-")));
  await expect(page.getByText("Accordée par 1 esprit")).toBeVisible();
  // Round trip: the spirit we came from is listed here.
  await expect(page.locator(`a[href*="${AMATERASU}"]`)).toContainText("Amaterasu");
});

test("a move granted by several spirits lists them all", async ({ page }) => {
  await page.goto(`/wiki/abilities/${encodeURIComponent(LUCKY_DRAW)}`);

  await expect(page.getByText("Accordée par 3 esprits")).toBeVisible();
  const spirits = page.locator("li a[href^='/wiki/abilities/']");
  await expect(spirits).toHaveCount(3);
  // Alphabetical, so the order does not follow catalogue insertion.
  await expect(spirits).toHaveText([/Aléa/, /Dice/, /Las Vega/]);
});

test("a move no spirit grants says nothing rather than showing an empty list", async ({ page }) => {
  // Pinned by id: picking it through the search box would let a reordering of
  // the catalogue silently change what this test asserts.
  await page.goto(`/wiki/abilities/${PLAIN_MOVE}`);
  await expect(page.getByRole("heading", { name: /Accélération/ }).last()).toBeVisible();

  await expect(page.getByText("Accordée par", { exact: false })).toHaveCount(0);
  await expect(page.getByText("Technique accordée")).toHaveCount(0);
});
