import { expect, test } from "./fixtures";

test("catalogue routes expose canonical and complete social metadata", async ({ page }) => {
  await page.goto("/wiki/equipment");

  await expect(page).toHaveTitle("Équipement — Kizuna");
  await expect(page.locator('link[rel="canonical"]')).toHaveAttribute(
    "href",
    "http://127.0.0.1:4173/wiki/equipment",
  );
  await expect(page.locator('meta[property="og:url"]')).toHaveAttribute(
    "content",
    "http://127.0.0.1:4173/wiki/equipment",
  );
  await expect(page.locator('meta[property="og:image"]')).toHaveAttribute(
    "content",
    "http://127.0.0.1:4173/social/kizuna-og.jpg",
  );
  await expect(page.locator('meta[name="twitter:card"]')).toHaveAttribute(
    "content",
    "summary_large_image",
  );
});
