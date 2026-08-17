import type { Page } from "@playwright/test";

import { expect, generateSampleTeam, test } from "./fixtures";

/**
 * The turntable is eight pre-rendered frames hotlinked from the Inazugle CDN.
 * Every test stubs that CDN: the point is our loading, rotation and error
 * handling, not cloudfront's uptime.
 */
const PIXEL = Buffer.from(
  "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CYII=",
  "base64",
);

const FRAME_PATTERN = /_r\d(_fullbody)?\.(webp|png)$/;

/** Returns the frame URLs requested so far, in order. */
async function stubInazugleCdn(page: Page, { failFrames = false } = {}): Promise<string[]> {
  const frames: string[] = [];
  await page.route(/cloudfront\.net\//, (route) => {
    const url = route.request().url();
    if (FRAME_PATTERN.test(url)) {
      frames.push(url);
      if (failFrames) return route.abort("connectionreset");
    }
    return route.fulfill({
      body: PIXEL,
      contentType: "image/png",
      // The real CDN serves these cacheable; without that the browser refetches
      // every frame the turntable displays and the prefetch proves nothing.
      headers: { "Access-Control-Allow-Origin": "*", "Cache-Control": "public, max-age=3600" },
    });
  });
  return frames;
}

function viewer(page: Page) {
  return page.getByTestId("character-model-viewer");
}

function frameImage(page: Page) {
  return viewer(page).locator('img[data-inazugle-image="model"]');
}

/** Mark Evans — player 1, first row of the catalogue and always modelled. */
const PLAYER_URL = "/wiki/players/1";

async function openViewerFromWiki(page: Page) {
  await page.goto(PLAYER_URL);
  await expect(page.getByRole("heading", { name: "Mark Evans" })).toBeVisible();
  await page.getByRole("button", { name: "Voir le modèle" }).click();
  await expect(viewer(page)).toBeVisible();
}

test("the turntable loads its whole ring once, then rotates without refetching", async ({
  page,
}) => {
  const frames = await stubInazugleCdn(page);
  await openViewerFromWiki(page);

  const image = frameImage(page);
  await expect(image).toBeVisible();
  await expect(viewer(page).getByText("1 / 8")).toBeVisible();

  // The eight bust frames are prefetched up front — that is what lets rotation
  // stay instant and never fall back into a loading state.
  expect(frames).toHaveLength(8);
  expect(frames.every((url) => !url.includes("_fullbody"))).toBe(true);
  expect(new Set(frames).size).toBe(8);
  await expect(image).toHaveAttribute("src", /_r0\.webp$/);

  await viewer(page).getByRole("button", { name: "Tourner à droite" }).click();
  await expect(image).toHaveAttribute("src", /_r7\.webp$/);
  await expect(viewer(page).getByText("8 / 8")).toBeVisible();

  await viewer(page).getByRole("button", { name: "Tourner à gauche" }).click();
  await expect(image).toHaveAttribute("src", /_r0\.webp$/);
  await expect(viewer(page).getByText("1 / 8")).toBeVisible();

  // Arrow keys walk the same ring, in the direction the frames are rendered.
  await page.keyboard.press("ArrowRight");
  await expect(image).toHaveAttribute("src", /_r7\.webp$/);
  await page.keyboard.press("ArrowLeft");
  await expect(image).toHaveAttribute("src", /_r0\.webp$/);

  const reset = viewer(page).getByRole("button", { name: "Face" });
  await expect(reset).toBeDisabled();
  await page.keyboard.press("ArrowRight");
  await expect(reset).toBeEnabled();
  await reset.click();
  await expect(viewer(page).getByText("1 / 8")).toBeVisible();

  // The documented invariant: only a pose change re-prefetches. A full lap
  // therefore asks for no URL the prefetch did not already cover, and never
  // flashes the loader back in. (Whether a repeat hit leaves the HTTP cache is
  // the CDN's business, so the count of requests is deliberately not asserted.)
  expect(new Set(frames).size).toBe(8);
  await expect(image).toBeVisible();
  await expect(viewer(page).locator(".inazugle-loader")).toHaveCount(0);
});

test("dragging across the frame turns the model", async ({ page }) => {
  await stubInazugleCdn(page);
  await openViewerFromWiki(page);

  const image = frameImage(page);
  await expect(image).toBeVisible();
  const box = await image.boundingBox();
  expect(box).not.toBeNull();
  if (!box) return;

  const centerX = box.x + box.width / 2;
  const centerY = box.y + box.height / 2;
  await page.mouse.move(centerX, centerY);
  await page.mouse.down();
  // One frame per 14px of travel; three steps right lands on frame 6 of 8.
  await page.mouse.move(centerX + 42, centerY, { steps: 6 });
  await expect(viewer(page).getByText("6 / 8")).toBeVisible();
  await page.mouse.up();

  await expect(image).toHaveAttribute("src", /_r5\.webp$/);
});

test("the full-body pose fetches its own ring and restarts at the front", async ({ page }) => {
  const frames = await stubInazugleCdn(page);
  await openViewerFromWiki(page);
  await expect(frameImage(page)).toBeVisible();

  await viewer(page).getByRole("button", { name: "Tourner à droite" }).click();
  await expect(viewer(page).getByText("8 / 8")).toBeVisible();

  await viewer(page).getByRole("tab", { name: "Pied" }).click();
  await expect(viewer(page).getByRole("tab", { name: "Pied" })).toHaveAttribute(
    "aria-selected",
    "true",
  );
  await expect(frameImage(page)).toHaveAttribute("src", /_r0_fullbody\.webp$/);
  await expect(viewer(page).getByText("1 / 8")).toBeVisible();

  const fullBody = frames.filter((url) => url.includes("_fullbody"));
  expect(fullBody).toHaveLength(8);
  expect(new Set(fullBody).size).toBe(8);
});

test("a failing CDN is reported instead of showing an empty frame", async ({ page }) => {
  await stubInazugleCdn(page, { failFrames: true });
  await openViewerFromWiki(page);

  await expect(viewer(page).getByText("Impossible de charger les vues du modèle.")).toBeVisible();
  await expect(frameImage(page)).toHaveCount(0);
  await expect(viewer(page).getByRole("button", { name: "Tourner à droite" })).toBeDisabled();
  await expect(viewer(page).getByRole("button", { name: "Tourner à gauche" })).toBeDisabled();
  await expect(viewer(page).getByRole("button", { name: "Face" })).toBeDisabled();
});

test("the viewer links back to Inazugle and restores focus when dismissed", async ({ page }) => {
  await stubInazugleCdn(page);
  await openViewerFromWiki(page);

  await expect(viewer(page).getByRole("link", { name: "Ouvrir sur Inazugle" })).toHaveAttribute(
    "href",
    /^https:\/\/zukan\.inazuma\.jp\/fr\/chara_model_view\/\?q=[\w-]+$/,
  );

  const openButton = page.getByRole("button", { name: "Voir le modèle" });
  await page.keyboard.press("Escape");
  await expect(viewer(page)).toHaveCount(0);
  await expect(openButton).toBeFocused();

  await openButton.click();
  await expect(viewer(page)).toBeVisible();
  await viewer(page).getByRole("button", { name: "Fermer" }).first().click();
  await expect(viewer(page)).toHaveCount(0);
  await expect(openButton).toBeFocused();
});

test("the builder opens the same turntable from a squad slot", async ({ page }) => {
  await stubInazugleCdn(page);
  await page.goto("/");
  await generateSampleTeam(page);

  await page.locator('[data-slot-id="gk"]').click();
  const openButton = page.getByRole("button", { name: "Voir le modèle" });
  await openButton.click();

  await expect(viewer(page)).toBeVisible();
  await expect(frameImage(page)).toBeVisible();
  await expect(viewer(page).getByText("1 / 8")).toBeVisible();

  await page.keyboard.press("Escape");
  await expect(viewer(page)).toHaveCount(0);
  // The slot sheet stays open behind the viewer — Escape closes one layer only.
  await expect(openButton).toBeVisible();
});

test("the turntable opens zoomed in, and the zoom is adjustable within bounds", async ({
  page,
}) => {
  await stubInazugleCdn(page);
  await openViewerFromWiki(page);

  const image = frameImage(page);
  await expect(image).toBeVisible();

  // Inazugle's frames carry so much empty margin that the character sat at a
  // third of the viewer at scale 1. The default lifts it without cropping.
  const scaleOf = async () => {
    const transform = await image.evaluate((node) => getComputedStyle(node).transform);
    return Number(transform.match(/matrix\(([\d.]+)/)?.[1] ?? 0);
  };
  expect(await scaleOf()).toBeGreaterThan(1.2);

  const readout = viewer(page).locator("[data-model-zoom]");
  await expect(readout).toHaveText("100 %");

  const zoomIn = viewer(page).getByRole("button", { name: "Zoom avant" });
  const zoomOut = viewer(page).getByRole("button", { name: "Zoom arrière" });

  const base = await scaleOf();
  await zoomIn.click();
  await expect(readout).toHaveText("125 %");
  expect(await scaleOf()).toBeCloseTo(base * 1.25, 2);

  // Both ends stop rather than running away.
  for (let i = 0; i < 12; i++) {
    if (await zoomIn.isDisabled()) break;
    await zoomIn.click();
  }
  await expect(readout).toHaveText("300 %");
  await expect(zoomIn).toBeDisabled();

  for (let i = 0; i < 20; i++) {
    if (await zoomOut.isDisabled()) break;
    await zoomOut.click();
  }
  await expect(readout).toHaveText("50 %");
  await expect(zoomOut).toBeDisabled();
});

test("switching pose keeps the reader's zoom but rescales for the framing", async ({ page }) => {
  await stubInazugleCdn(page);
  await openViewerFromWiki(page);
  await expect(frameImage(page)).toBeVisible();

  const scaleOf = async () => {
    const transform = await frameImage(page).evaluate((node) => getComputedStyle(node).transform);
    return Number(transform.match(/matrix\(([\d.]+)/)?.[1] ?? 0);
  };

  await viewer(page).getByRole("button", { name: "Zoom avant" }).click();
  const bust = await scaleOf();

  await viewer(page).getByRole("tab", { name: "Pied" }).click();
  await expect(frameImage(page)).toHaveAttribute("src", /_fullbody\.webp$/);
  // The multiplier survives; the base differs because the two poses are framed
  // differently, so the number on screen stays put while the scale changes.
  await expect(viewer(page).locator("[data-model-zoom]")).toHaveText("125 %");
  expect(await scaleOf()).not.toBeCloseTo(bust, 2);
});

test("resetting returns both the angle and the zoom to their defaults", async ({ page }) => {
  await stubInazugleCdn(page);
  await openViewerFromWiki(page);
  await expect(frameImage(page)).toBeVisible();

  const reset = viewer(page).getByRole("button", { name: "Face" });
  await expect(reset).toBeDisabled();

  await viewer(page).getByRole("button", { name: "Zoom avant" }).click();
  await expect(reset).toBeEnabled();
  await reset.click();
  await expect(viewer(page).locator("[data-model-zoom]")).toHaveText("100 %");
  await expect(viewer(page).getByText("1 / 8")).toBeVisible();
  await expect(reset).toBeDisabled();
});

test("every control in the viewer shares one height", async ({ page }) => {
  await stubInazugleCdn(page);
  await openViewerFromWiki(page);
  await expect(frameImage(page)).toBeVisible();

  const heights = await viewer(page)
    .locator("button")
    .evaluateAll((nodes) => nodes.map((node) => Math.round(node.getBoundingClientRect().height)));
  expect(heights.length).toBeGreaterThan(6);
  expect(new Set(heights).size).toBe(1);
});
