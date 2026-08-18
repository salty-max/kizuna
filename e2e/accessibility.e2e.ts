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

test("the theme switch mounts a theme and remembers the choice", async ({ page }) => {
  await page.goto("/");
  const html = page.locator("html");
  // The provider always mounts a concrete theme, never leaves it unset.
  await expect(html).toHaveAttribute("data-theme", /^(dark|light)$/);

  await page.getByRole("tab", { name: "Thème clair" }).click();
  await expect(html).toHaveAttribute("data-theme", "light");

  await page.reload();
  await expect(html).toHaveAttribute("data-theme", "light");

  // `system` has to stay reachable, or the choice can never go back to the OS.
  await page.getByRole("tab", { name: "Thème du système" }).click();
  await expect(html).toHaveAttribute("data-theme", /^(dark|light)$/);
});

test("both themes keep the panel bar and the primary action readable", async ({ page }) => {
  await page.goto("/");

  const contrast = async () =>
    page.evaluate(() => {
      const canvas = document.createElement("canvas");
      canvas.width = canvas.height = 1;
      const ctx = canvas.getContext("2d", { willReadFrequently: true })!;
      const paint = (color: string) => {
        ctx.fillStyle = "#ffffff";
        ctx.fillRect(0, 0, 1, 1);
        ctx.fillStyle = color;
        ctx.fillRect(0, 0, 1, 1);
        const [r, g, b] = ctx.getImageData(0, 0, 1, 1).data;
        return [r, g, b].map((v) => {
          const n = v / 255;
          return n <= 0.03928 ? n / 12.92 : Math.pow((n + 0.055) / 1.055, 2.4);
        });
      };
      const lum = (color: string) => {
        const [r, g, b] = paint(color);
        return 0.2126 * r + 0.7152 * g + 0.0722 * b;
      };
      const ratio = (a: string, b: string) => {
        const [hi, lo] = [lum(a), lum(b)].sort((x, y) => y - x);
        return (hi + 0.05) / (lo + 0.05);
      };
      const of = (selector: string) => {
        const el = document.querySelector(selector);
        if (!el) return 0;
        const style = getComputedStyle(el);
        return ratio(style.color, style.backgroundColor);
      };
      return { title: of(".panel-title"), primary: of(".btn-primary") };
    });

  for (const theme of ["Thème sombre", "Thème clair"]) {
    await page.getByRole("tab", { name: theme }).click();
    const { title, primary } = await contrast();
    // The blue is darker than the vermilion it replaced, so the near-black text
    // that used to sit on the bar would now read at 2.9:1.
    expect(title).toBeGreaterThan(4.5);
    expect(primary).toBeGreaterThan(4.5);
  }
});

test("wiki chrome stays legible on both themes", async ({ page }) => {
  await page.goto("/wiki/passives/cps10015");
  // The catalogue loads before the panel exists, so the probe has to wait for it.
  await expect(page.locator(".panel-title")).toBeVisible();
  await expect(page.locator("main span.text-ink-500").first()).toBeVisible();

  const contrast = () =>
    page.evaluate(() => {
      const canvas = document.createElement("canvas");
      canvas.width = canvas.height = 1;
      const ctx = canvas.getContext("2d", { willReadFrequently: true })!;
      const rgb = (color: string) => {
        ctx.fillStyle = "#ffffff";
        ctx.fillRect(0, 0, 1, 1);
        ctx.fillStyle = color;
        ctx.fillRect(0, 0, 1, 1);
        const [r, g, b] = ctx.getImageData(0, 0, 1, 1).data;
        return [r, g, b].map((v) => {
          const n = v / 255;
          return n <= 0.03928 ? n / 12.92 : Math.pow((n + 0.055) / 1.055, 2.4);
        });
      };
      const lum = (color: string) => {
        const [r, g, b] = rgb(color);
        return 0.2126 * r + 0.7152 * g + 0.0722 * b;
      };
      const against = (el: Element | null, backdrop: string) => {
        if (!el) return 0;
        const [hi, lo] = [lum(getComputedStyle(el).color), lum(backdrop)].sort((a, b) => b - a);
        return (hi + 0.05) / (lo + 0.05);
      };
      const pageBed = getComputedStyle(document.body).backgroundColor;
      const bar = getComputedStyle(document.querySelector(".panel-title")!).backgroundColor;
      return {
        // Breadcrumb separators used to sit two steps below the app's
        // minimum-AA tone, and the badges on the title bar spoke the page's
        // ink ramp instead of the bar's.
        separator: against(document.querySelector("main span.text-ink-500"), pageBed),
        badge: against(document.querySelector(".panel-title span span"), bar),
      };
    });

  for (const theme of ["Thème sombre", "Thème clair"]) {
    await page.getByRole("tab", { name: theme }).click();
    const { separator, badge } = await contrast();
    expect(separator).toBeGreaterThan(4.5);
    expect(badge).toBeGreaterThan(4.5);
  }
});
