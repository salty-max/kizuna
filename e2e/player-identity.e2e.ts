import { expect, generateSampleTeam, test } from "./fixtures";

/**
 * Gender sits beside the name on both surfaces that show one, because the field
 * was otherwise buried in a data row on the wiki and absent from the builder.
 *
 * The game only draws male and female, so the 36 characters the dump calls
 * `other` get the word instead of a glyph — a `?` there would claim the value
 * is unknown when the dump states it.
 */

const MALE = 1; // Mark Evans
const FEMALE = 167; // Maddie Moonlight
const NEUTRAL = 3586; // Soldat de terre cuite 1

test("a wiki player sheet shows gender next to the name", async ({ page }) => {
  await page.goto(`/wiki/players/${FEMALE}`);
  const heading = page.getByRole("heading", { name: /Maddie Moonlight/ }).last();
  await expect(heading.getByRole("img", { name: "Féminin" })).toBeVisible();

  await page.goto(`/wiki/players/${MALE}`);
  await expect(
    page
      .getByRole("heading", { name: /Mark Evans/ })
      .last()
      .getByRole("img", { name: "Masculin" }),
  ).toBeVisible();
});

test("a gender the game draws no glyph for is spelled out, not marked unknown", async ({
  page,
}) => {
  await page.goto(`/wiki/players/${NEUTRAL}`);
  const heading = page.getByRole("heading", { name: /Soldat de terre cuite 1/ }).last();

  await expect(heading).toContainText("Autre");
  await expect(heading.getByText("?")).toHaveCount(0);
});

test("the slot editor shows gender next to the name", async ({ page }) => {
  await page.goto("/");
  await generateSampleTeam(page);
  await page.locator('[data-slot-id="gk"]').click();

  // The drawer's panel title repeats the player name, so the heading is picked
  // by its own hook rather than by position.
  const heading = page.locator(".drawer-panel [data-slot-player-name]");
  await expect(heading).toBeVisible();
  // Whichever character the generator picked, the name carries a gender marker:
  // a glyph for male and female, the word for anything the game does not draw.
  const glyph = heading.locator("img");
  const spelledOut = heading.getByText(/Masculin|Féminin|Autre/);
  expect((await glyph.count()) + (await spelledOut.count())).toBeGreaterThan(0);
  await expect(heading.getByText("?", { exact: true })).toHaveCount(0);
});
