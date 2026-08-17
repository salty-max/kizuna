import type { Page } from "@playwright/test";

import { expect, generateSampleTeam, test } from "./fixtures";

declare global {
  interface Window {
    __drawerStates?: (string | null)[];
  }
}

/**
 * Watch `data-state` on the open drawer until it leaves the DOM.
 *
 * The observer holds its own reference to the node, so the last transition is
 * still recorded even though the element is removed right after.
 */
async function recordDrawerStates(page: Page): Promise<void> {
  await page.evaluate(() => {
    const panel = document.querySelector(".drawer-panel");
    if (!panel) throw new Error("no .drawer-panel to observe");
    window.__drawerStates = [panel.getAttribute("data-state")];
    new MutationObserver(() => {
      window.__drawerStates?.push(panel.getAttribute("data-state"));
    }).observe(panel, { attributes: true, attributeFilter: ["data-state"] });
  });
}

function observedDrawerStates(page: Page): Promise<(string | null)[]> {
  return page.evaluate(() => window.__drawerStates ?? []);
}

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

  // The drawer must animate out rather than blink away, which means observing a
  // state that is gone by the time any assertion could read it back. Recording
  // the transitions up front turns that race into a fact: reading the attribute
  // after the click sees `closing` or `null` depending on who wins.
  await recordDrawerStates(page);
  await drawer.getByRole("button", { name: "Fermer" }).click();
  await expect(drawer).toHaveCount(0);
  expect(await observedDrawerStates(page)).toContain("closing");
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

test("the slot editor keeps its actions reachable from anywhere in the sheet", async ({ page }) => {
  await page.goto("/");
  await generateSampleTeam(page);
  await page.locator('[data-slot-id="gk"]').click();

  const drawer = page.locator(".drawer-panel");
  const change = drawer.getByRole("button", { name: "Changer" });
  const clear = drawer.getByRole("button", { name: "Vider le slot" });
  await expect(change).toBeInViewport();
  await expect(clear).toBeInViewport();

  // The editor is several panels tall; swapping or clearing the player must not
  // require scrolling back up to find the control.
  const body = drawer.locator(".scroll-slim.overflow-y-auto");
  await body.evaluate((node) => node.scrollTo({ top: node.scrollHeight }));
  await expect(body).not.toHaveJSProperty("scrollTop", 0);
  await expect(change).toBeInViewport();
  await expect(clear).toBeInViewport();
});

test("the sheet header states the slot for assistive tech without repeating it on screen", async ({
  page,
}) => {
  await page.goto("/");
  await generateSampleTeam(page);
  await page.locator('[data-slot-id="gk"]').click();

  const drawer = page.locator(".drawer-panel");
  // The dialog is still named, so the heading has to exist — just not take up
  // the first third of the sheet with what the panel below already shows.
  const heading = drawer.getByRole("heading", { level: 2 }).first();
  await expect(heading).toHaveClass(/sr-only/);
  await expect(drawer).toHaveAttribute("aria-labelledby", /.+/);
});
