import { expect, generateSampleTeam, test } from "./fixtures";

test("the mobile catalogue navigates without page-level horizontal overflow", async ({ page }) => {
  await page.goto("/wiki");

  await expect(page.getByRole("heading", { name: "Catalogue" })).toBeVisible();
  await page.getByRole("link", { name: /Équipement/ }).click();
  await expect(page).toHaveURL(/\/wiki\/equipment$/);
  await expect(page.getByRole("heading", { name: "Équipement", exact: true })).toBeVisible();

  const overflow = await page.evaluate(() => ({
    viewport: document.documentElement.clientWidth,
    page: document.documentElement.scrollWidth,
  }));
  expect(overflow.page).toBeLessThanOrEqual(overflow.viewport + 1);

  await page.getByRole("link", { name: "Composition" }).click();
  await expect(page.getByLabel("Nom de l'équipe")).toBeVisible();

  const welcome = await page.getByRole("heading", { name: "Coup d'envoi" }).boundingBox();
  const pitch = await page
    .getByRole("heading", { name: "4-4-2 Diamant", exact: true })
    .boundingBox();
  expect(welcome).not.toBeNull();
  expect(pitch).not.toBeNull();
  expect(welcome!.y).toBeLessThan(pitch!.y);

  await page.setViewportSize({ width: 320, height: 640 });
  const narrowOverflow = await page.evaluate(() => ({
    viewport: document.documentElement.clientWidth,
    page: document.documentElement.scrollWidth,
  }));
  expect(narrowOverflow.page).toBeLessThanOrEqual(narrowOverflow.viewport + 1);

  const keeper = page.getByRole("button", { name: "GK — emplacement vide" });
  await keeper.click();
  const picker = page.getByRole("dialog", { name: "Rechercher un personnage…" });
  await expect(picker).toBeVisible();
  await picker.getByRole("textbox", { name: "Rechercher un personnage…" }).fill("Dvalin");
  await picker
    .getByRole("button", { name: /Dvalin.*Epsilon \+/ })
    .first()
    .click();

  await page.locator('[data-slot-id="gk"]').click();
  const drawer = page.locator(".drawer-panel");
  await expect(drawer).toBeVisible();
  await expect(drawer).toHaveCSS("transform", "matrix(1, 0, 0, 1, 0, 0)");
  const drawerBox = await drawer.boundingBox();
  expect(drawerBox).not.toBeNull();
  expect(drawerBox!.x + drawerBox!.width).toBeCloseTo(320, 0);
  expect(drawerBox!.width).toBeCloseTo(320, 0);
});

test("player cards can be swapped with a long touch gesture", async ({ page }) => {
  await page.goto("/");
  await generateSampleTeam(page);

  const source = page.locator('[data-slot-id="bench1"]');
  const target = page.locator('[data-slot-id="bench2"]');
  await source.scrollIntoViewIfNeeded();
  await target.scrollIntoViewIfNeeded();
  const sourceName = (await source.textContent())?.trim();
  const targetName = (await target.textContent())?.trim();
  const sourceBox = await source.boundingBox();
  const targetBox = await target.boundingBox();
  expect(sourceBox).not.toBeNull();
  expect(targetBox).not.toBeNull();
  if (!sourceBox || !targetBox) return;

  const session = await page.context().newCDPSession(page);
  const sourcePoint = {
    x: sourceBox.x + sourceBox.width / 2,
    y: sourceBox.y + sourceBox.height / 2,
  };
  const targetPoint = {
    x: targetBox.x + targetBox.width / 2,
    y: targetBox.y + targetBox.height / 2,
  };
  await session.send("Input.dispatchTouchEvent", {
    type: "touchStart",
    touchPoints: [sourcePoint],
  });
  await page.waitForTimeout(220);
  await session.send("Input.dispatchTouchEvent", {
    type: "touchMove",
    touchPoints: [targetPoint],
  });
  await expect(target).toHaveAttribute("data-drop-target", "true");
  await session.send("Input.dispatchTouchEvent", { type: "touchEnd", touchPoints: [] });

  await expect(source).toHaveText(targetName ?? "");
  await expect(target).toHaveText(sourceName ?? "");
});
