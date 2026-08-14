import { readFile } from "node:fs/promises";

import { expect, generateSampleTeam, test } from "./fixtures";

test("the first-run screen offers manual and sample-team paths", async ({ page }) => {
  await page.goto("/");

  await expect(
    page.getByRole("heading", { name: "Construisez une équipe qui tient son plan de match." }),
  ).toBeVisible();

  await page.getByRole("button", { name: "Choisir mon premier joueur" }).click();
  await expect(page.getByRole("dialog", { name: "Rechercher un personnage…" })).toBeVisible();
  await page.getByRole("textbox", { name: "Rechercher un personnage…" }).press("Escape");
  await expect(page.getByRole("dialog", { name: "Slot" })).toHaveCount(0);

  await page.getByRole("button", { name: "Générer une équipe exemple" }).click();
  const wizard = page.getByRole("dialog", { name: "Assistant de composition" });
  await expect(wizard).toBeVisible();
  await expect(wizard.getByRole("button", { name: /PvP libre/ })).toHaveAttribute(
    "aria-pressed",
    "true",
  );
  await wizard.getByRole("button", { name: "Choisir le plan" }).click();
  await wizard.getByRole("button", { name: "Générer trois équipes" }).click();
  await expect(wizard.getByRole("button", { name: "Choisir cette équipe" })).toHaveCount(3);
  await wizard.getByRole("button", { name: "Choisir cette équipe" }).nth(1).click();
  await expect(page.getByLabel("Nom de l'équipe")).toHaveValue("Équipe exemple");
  await expect(page.getByText("11/11", { exact: true })).toBeVisible();
  await expect(page.getByRole("heading", { name: "Équipe complétée" })).toBeVisible();
  await expect(page.getByText("20 ajouts")).toBeVisible();
  await expect(page.getByText("20 places de ton nouvel effectif", { exact: false })).toBeVisible();
  await expect(page.getByText("Aucun joueur ajouté hors poste.")).toBeVisible();

  await page.getByText("Voir le choix joueur par joueur (20)").click();
  await expect(page.getByText(/Pour chaque place vide, Kizuna cherche d'abord/)).toBeVisible();
  await expect(page.getByText("meilleure puissance disponible pour ce rôle").first()).toBeVisible();

  await page.getByLabel("Nom de l'équipe").fill("Équipe retouchée");
  await expect(page.getByRole("heading", { name: "Équipe complétée" })).toHaveCount(0);
  await expect(page.getByRole("heading", { name: "Coup d'envoi" })).toHaveCount(0);
});

test("the whole roster can be cleared without losing the team setup", async ({ page }) => {
  await page.goto("/");
  await generateSampleTeam(page);
  await page.getByLabel("Nom de l'équipe").fill("Projet pressing");

  const clearButton = page.getByRole("button", { name: "Vider l'équipe", exact: true });
  await clearButton.click();

  const dialog = page.getByRole("alertdialog", { name: "Vider l'équipe ?" });
  await expect(dialog).toBeVisible();
  await expect(dialog.getByRole("button", { name: "Annuler" })).toBeFocused();
  await dialog.getByRole("button", { name: "Annuler" }).click();
  await expect(page.getByText("11/11", { exact: true })).toBeVisible();
  await expect(clearButton).toBeFocused();

  await clearButton.click();
  await dialog.getByRole("button", { name: "Vider l'équipe", exact: true }).click();

  await expect(page.getByRole("status").filter({ hasText: "L'effectif a été vidé." })).toHaveText(
    "L'effectif a été vidé. Les réglages de l'équipe sont conservés.",
  );
  await expect(page.getByLabel("Nom de l'équipe")).toHaveValue("Projet pressing");
  await expect(page.getByRole("button", { name: "GK — emplacement vide" })).toBeVisible();
  await expect(clearButton).toBeDisabled();
  await expect(page.getByRole("heading", { name: "Coup d'envoi" })).toBeVisible();
});

test("the desktop cockpit keeps the pitch, setup and analysis in view", async ({ page }) => {
  await page.goto("/");
  await generateSampleTeam(page);

  const visibleWorkspace = [
    page.getByRole("complementary", { name: "Construction" }),
    page.getByRole("heading", { name: "4-4-2 Diamant", exact: true }),
    page.getByRole("heading", { name: "Effectif", exact: true }),
    page.getByRole("complementary", { name: "Analyse" }),
    page.getByText("11/11", { exact: true }),
  ];
  for (const element of visibleWorkspace) await expect(element).toBeInViewport();

  const pageHeight = await page.evaluate(() => ({
    viewport: document.documentElement.clientHeight,
    content: document.documentElement.scrollHeight,
  }));
  expect(pageHeight.content).toBeLessThanOrEqual(pageHeight.viewport + 1);
});

test("player cards can be moved and swapped with drag and drop", async ({ page }) => {
  await page.goto("/");
  await generateSampleTeam(page);

  const source = page.locator('[data-slot-id="gk"]');
  const target = page.locator('[data-slot-id="df1"]');
  const sourceName = (await source.textContent())?.trim();
  const targetName = (await target.textContent())?.trim();
  const sourceBox = await source.boundingBox();
  const targetBox = await target.boundingBox();
  expect(sourceBox).not.toBeNull();
  expect(targetBox).not.toBeNull();
  if (!sourceBox || !targetBox) return;

  await page.mouse.move(sourceBox.x + sourceBox.width / 2, sourceBox.y + sourceBox.height / 2);
  await page.mouse.down();
  await page.mouse.move(targetBox.x + targetBox.width / 2, targetBox.y + targetBox.height / 2, {
    steps: 12,
  });
  await expect(target).toHaveAttribute("data-drop-target", "true");
  await page.mouse.up();

  await expect(source).toHaveText(targetName ?? "");
  await expect(target).toHaveText(sourceName ?? "");

  await page.getByRole("button", { name: "Annuler" }).click();
  await expect(source).toHaveText(sourceName ?? "");
  await expect(target).toHaveText(targetName ?? "");
  await page.getByRole("button", { name: "Rétablir" }).click();
  await expect(source).toHaveText(targetName ?? "");
  await expect(target).toHaveText(sourceName ?? "");

  const bench = page.locator('[data-slot-id="bench1"]');
  const manager = page.locator('[data-slot-id="manager1"]');
  const benchName = (await bench.textContent())?.trim();
  const managerName = (await manager.textContent())?.trim();
  const benchBox = await bench.boundingBox();
  const managerBox = await manager.boundingBox();
  expect(benchBox).not.toBeNull();
  expect(managerBox).not.toBeNull();
  if (!benchBox || !managerBox) return;

  await page.mouse.move(benchBox.x + benchBox.width / 2, benchBox.y + benchBox.height / 2);
  await page.mouse.down();
  await page.mouse.move(managerBox.x + managerBox.width / 2, managerBox.y + managerBox.height / 2, {
    steps: 12,
  });
  await expect(manager).toHaveAttribute("data-drop-target", "true");
  await page.mouse.up();

  await expect(bench).toHaveText(benchName ?? "");
  await expect(manager).toHaveText(managerName ?? "");
  await expect(page.getByRole("alert")).toContainText("Déplacement incompatible");
});

test("the complete team can be exported as a PNG poster", async ({ page }, testInfo) => {
  const pixel = Buffer.from(
    "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CYII=",
    "base64",
  );
  let failedOnePosterRequest = false;
  let posterRequests = 0;
  await page.route("https://images.weserv.nl/**", (route) => {
    const isPosterRequest = new URL(route.request().url()).searchParams.get("w") === "180";
    if (isPosterRequest) posterRequests += 1;
    if (isPosterRequest && !failedOnePosterRequest) {
      failedOnePosterRequest = true;
      return route.abort("connectionreset");
    }
    return route.fulfill({
      body: pixel,
      contentType: "image/png",
      headers: { "Access-Control-Allow-Origin": "*" },
    });
  });
  await page.goto("/");
  await generateSampleTeam(page);

  const downloadPromise = page.waitForEvent("download");
  await page.getByRole("button", { name: "Exporter", exact: true }).click();
  const download = await downloadPromise;
  const posterPath = testInfo.outputPath("team-poster.png");
  await download.saveAs(posterPath);
  const png = await readFile(posterPath);

  expect(download.suggestedFilename()).toBe("kizuna-equipe-exemple.png");
  expect(png.subarray(1, 4).toString()).toBe("PNG");
  expect(png.readUInt32BE(16)).toBe(1600);
  expect(png.readUInt32BE(20)).toBe(900);
  expect(posterRequests).toBe(21);
  await testInfo.attach("team poster", { path: posterPath, contentType: "image/png" });
  await expect(page.getByRole("status").filter({ hasText: "image" })).toHaveText(
    "L’image de l’équipe a été exportée.",
  );
});

test("a team can be built, shared, cleared and restored", async ({ page }) => {
  await page.goto("/");

  await page.getByLabel("Nom de l'équipe").fill("Onze E2E");
  const emptyKeeper = page.getByRole("button", { name: "GK — emplacement vide" });
  await expect(emptyKeeper).toHaveText("");
  await expect(emptyKeeper.getByRole("img", { name: "GK" })).toBeVisible();
  await emptyKeeper.click();

  const picker = page.getByRole("dialog", { name: "Rechercher un personnage…" });
  await expect(picker).toBeVisible();
  await expect(picker.getByRole("button", { name: "GK", exact: true })).toHaveAttribute(
    "aria-pressed",
    "true",
  );
  await picker.getByRole("textbox", { name: "Rechercher un personnage…" }).fill("Dvalin");
  await picker
    .getByRole("button", { name: /Dvalin.*Epsilon \+/ })
    .first()
    .click();

  await expect(page.getByRole("button", { name: /GK — Dvalin, Légendaire/ })).toBeVisible();
  await expect(page.getByRole("dialog", { name: "Dvalin" })).toHaveCount(0);

  await page.getByRole("button", { name: "Enregistrer" }).click();
  await expect(page.getByRole("status").filter({ hasText: "Équipe « Onze E2E »" })).toHaveText(
    "Équipe « Onze E2E » enregistrée.",
  );

  await page.getByRole("button", { name: "Partager" }).click();
  const shareCode = await page.locator("textarea[readonly]").inputValue();
  expect(shareCode).toMatch(/^KZ1\./);
  await page.getByRole("button", { name: "Fermer" }).click();

  await page.getByRole("button", { name: /GK — Dvalin, Légendaire/ }).click();
  await page.getByRole("button", { name: "Vider le slot" }).click();
  await expect(page.getByRole("button", { name: "GK — emplacement vide" })).toBeVisible();

  await page.getByRole("button", { name: "Mes équipes" }).click();
  await page.getByRole("button", { name: /^Onze E2E/ }).click();
  await expect(page.getByRole("status").filter({ hasText: "Équipe « Onze E2E »" })).toHaveText(
    "Équipe « Onze E2E » restaurée.",
  );
  await expect(page.getByRole("button", { name: /GK — Dvalin, Légendaire/ })).toBeVisible();

  await page.getByRole("button", { name: /GK — Dvalin, Légendaire/ }).click();
  await page.getByRole("button", { name: "Vider le slot" }).click();
  await expect(page.getByRole("button", { name: "GK — emplacement vide" })).toBeVisible();

  await page.getByRole("button", { name: "Importer" }).click();
  await page.getByRole("textbox", { name: "Code d'équipe à importer" }).fill(shareCode);
  await page.getByRole("button", { name: "Charger" }).click();

  await expect(page.getByRole("status").filter({ hasText: "Équipe « Onze E2E »" })).toHaveText(
    "Équipe « Onze E2E » importée.",
  );
  await expect(page.getByLabel("Nom de l'équipe")).toHaveValue("Onze E2E");
  await expect(page.getByRole("button", { name: /GK — Dvalin, Légendaire/ })).toBeVisible();
});

test("an invalid import is announced and the dialog restores focus", async ({ page }) => {
  await page.goto("/");

  const importButton = page.getByRole("button", { name: "Importer" });
  await importButton.click();

  const dialog = page.getByRole("dialog", { name: "Importer une équipe" });
  const field = dialog.getByRole("textbox", { name: "Code d'équipe à importer" });
  await field.fill("pas-un-code-kizuna");
  await dialog.getByRole("button", { name: "Charger" }).click();

  await expect(field).toHaveAttribute("aria-invalid", "true");
  await expect(dialog.getByRole("alert")).toHaveText("Code invalide ou illisible.");

  await field.press("Escape");
  await expect(dialog).toHaveCount(0);
  await expect(importButton).toBeFocused();
});

test("a transient data error can be retried", async ({ page }) => {
  let firstMetaRequest = true;
  await page.route("**/data/meta.json", async (route) => {
    if (firstMetaRequest) {
      firstMetaRequest = false;
      await route.fulfill({ status: 503, body: "Service unavailable" });
      return;
    }
    await route.continue();
  });

  await page.goto("/");
  await expect(
    page.getByRole("heading", { name: "Impossible de charger les données." }),
  ).toBeVisible();

  await page.getByRole("button", { name: "Réessayer" }).click();
  await expect(
    page.getByRole("heading", { name: "Construisez une équipe qui tient son plan de match." }),
  ).toBeVisible();
});

test("a local storage failure is surfaced instead of faking a save", async ({ page }) => {
  await page.addInitScript(() => {
    const nativeSetItem = Storage.prototype.setItem;
    Storage.prototype.setItem = function (key, value) {
      if (key === "kizuna.saved") throw new DOMException("Quota exceeded", "QuotaExceededError");
      return nativeSetItem.call(this, key, value);
    };
  });
  await page.goto("/");

  await page.getByLabel("Nom de l'équipe").fill("Équipe sans stockage");
  await page.getByRole("button", { name: "Enregistrer" }).click();

  await expect(page.getByRole("alert")).toHaveText(
    "Impossible d'enregistrer l'équipe dans ce navigateur.",
  );
  await page.getByRole("button", { name: "Mes équipes" }).click();
  await expect(page.getByText("Aucune équipe enregistrée.")).toBeVisible();
});

test("the tournament profile exposes its level-50 constraints", async ({ page }) => {
  await page.goto("/");

  await page.getByRole("combobox", { name: "Règles du match" }).click();
  await page.getByRole("option", { name: "Tournoi VR · Niv. 50" }).click();
  await page.getByRole("button", { name: "Composer" }).click();
  const wizard = page.getByRole("dialog", { name: "Assistant de composition" });
  await expect(wizard.getByRole("button", { name: /Tournoi VR/ })).toHaveAttribute(
    "aria-pressed",
    "true",
  );
  await wizard.getByRole("button", { name: "Choisir le plan" }).click();
  await wizard.getByRole("button", { name: "Générer trois équipes" }).click();
  await wizard.getByRole("button", { name: "Choisir cette équipe" }).first().click();

  await expect(page.getByText("11/11", { exact: true })).toBeVisible();
  await expect(page.getByText(/Le tournoi exige 5 joueurs saisonniers titulaires/)).toBeVisible();
  await expect(page.getByLabel("Limites de rareté")).toContainText("Héros 2/2");
  await expect(page.getByLabel("Limites de rareté")).toContainText("Basara 1/1");
});
