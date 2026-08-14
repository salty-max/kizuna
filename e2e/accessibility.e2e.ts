import { expect, generateSampleTeam, test } from "./fixtures";

test("the app shell exposes a page heading, skip link and route focus", async ({ page }) => {
  await page.goto("/");

  const main = page.getByRole("main");
  await expect(main).toHaveCount(1);
  await expect(page.locator("h1")).toHaveCount(1);

  await page.keyboard.press("Tab");
  const skipLink = page.getByRole("link", { name: "Aller au contenu" });
  await expect(skipLink).toBeFocused();
  await skipLink.press("Enter");
  await expect(main).toBeFocused();

  await page.getByRole("link", { name: "Catalogue", exact: true }).click();
  await expect(page).toHaveURL(/\/wiki$/);
  await expect(page.locator("h1")).toHaveText("Catalogue — Kizuna");
  await expect(page.getByRole("main")).toBeFocused();
});

test("the player picker contains focus and restores it when closed", async ({ page }) => {
  await page.goto("/");

  const trigger = page.getByRole("button", { name: "Choisir mon premier joueur" });
  await trigger.click();
  const dialog = page.getByRole("dialog", { name: "Rechercher un personnage…" });
  const search = dialog.getByRole("textbox", { name: "Rechercher un personnage…" });
  await expect(search).toBeFocused();

  await page.keyboard.press("Shift+Tab");
  expect(await dialog.evaluate((element) => element.contains(document.activeElement))).toBe(true);

  await page.keyboard.press("Escape");
  await expect(dialog).toHaveCount(0);
  await expect(page.getByRole("button", { name: "GK — emplacement vide" })).toBeFocused();
});

test("the slot editor behaves like an animated drawer and restores its trigger", async ({
  page,
}) => {
  await page.goto("/");
  await generateSampleTeam(page);

  const trigger = page.locator('[data-slot-id="gk"]');
  await trigger.click();

  const drawer = page.locator(".drawer-panel");
  await expect(drawer).toHaveAttribute("data-state", "open");
  await expect(drawer).toHaveCSS("transform", "matrix(1, 0, 0, 1, 0, 0)");
  await expect(drawer.getByRole("button", { name: "Fermer" })).toBeFocused();

  await drawer.getByRole("button", { name: "Fermer" }).click();
  expect(await drawer.getAttribute("data-state")).toBe("closing");
  await expect(drawer).toHaveCount(0);
  await expect(trigger).toBeFocused();

  await trigger.click();
  await expect(page.locator(".drawer-panel")).toHaveCSS("transform", "matrix(1, 0, 0, 1, 0, 0)");
  await page.locator(".drawer-backdrop").click({ position: { x: 8, y: 8 } });
  await expect(page.locator(".drawer-panel")).toHaveCount(0);
  await expect(trigger).toBeFocused();
});

test("player cards can be swapped with the keyboard", async ({ page }) => {
  await page.goto("/");
  await generateSampleTeam(page);

  const source = page.locator('[data-slot-id="gk"]');
  const target = page.locator('[data-slot-id="df1"]');
  const sourceName = (await source.textContent())?.trim();
  const targetName = (await target.textContent())?.trim();

  await source.press("Space");
  await expect(source).toHaveAttribute("aria-pressed", "true");
  await source.press("ArrowUp");
  await expect(target).toHaveAttribute("data-drop-target", "true");
  await source.press("Space");

  await expect(source).toHaveText(targetName ?? "");
  await expect(target).toHaveText(sourceName ?? "");

  await page.keyboard.press("Control+z");
  await expect(source).toHaveText(sourceName ?? "");
  await expect(target).toHaveText(targetName ?? "");
  await page.keyboard.press("Control+Shift+z");
  await expect(source).toHaveText(targetName ?? "");
  await expect(target).toHaveText(sourceName ?? "");
});
