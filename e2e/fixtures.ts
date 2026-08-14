import { test as base, type Page } from "@playwright/test";

export async function generateSampleTeam(page: Page) {
  await page.getByRole("button", { name: "Générer une équipe exemple" }).click();
  const wizard = page.getByRole("dialog", { name: "Assistant de composition" });
  await wizard.getByRole("button", { name: "Choisir le plan" }).click();
  await wizard.getByRole("button", { name: "Générer trois équipes" }).click();
  await wizard.getByRole("button", { name: "Choisir cette équipe" }).first().click();
}

export const test = base.extend({
  page: async ({ page }, use) => {
    await page.addInitScript(() => {
      window.localStorage.clear();
      window.localStorage.setItem("kizuna.locale", "fr");
    });
    await use(page);
  },
});

export { expect } from "@playwright/test";
